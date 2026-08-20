import { LAND, SEAS, ISLES, DOTS } from '../data/landmasses.js';
import { PPD, clamp, lerp } from './geo.js';
import { C, buildDefs, shipMarkup, decorItems } from './cartography.js';

/**
 * Globe view — the same chart, projected onto a sphere.
 *
 * Nothing here is 3D in the rendering sense: it is the same SVG artwork, the
 * same symbols and the same palette as the flat map, run through an
 * orthographic projection instead of an equirectangular one. That keeps the
 * drawn style intact and keeps the project free of dependencies.
 *
 * Back-hemisphere points are pushed out onto the limb rather than dropped, so
 * a continent crossing the edge closes along the rim instead of being cut by
 * a straight chord across its own middle.
 */

const NS = 'http://www.w3.org/2000/svg';
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const f = (n) => (Math.round(n * 10) / 10).toString();

/**
 * Zoom limits, as globe radius relative to the smaller viewport side.
 * Deliberately a short range: past a certain point a sphere stops reading as
 * one and you are just looking at a curved patch — that is what the flat chart
 * is for. The globe stays a globe.
 */
const ZOOM_MIN = 0.38;
const ZOOM_MAX = 0.62;
/** Callers speak in degrees across the width; these anchor the two ends. */
const DEG_WIDE = 200;
const DEG_CLOSE = 40;

/* ----------------------------------------------------------- projection */

/**
 * Orthographic projection about a rotation centre.
 * Returns screen offsets from the globe centre plus `cosc`, the cosine of the
 * angular distance from that centre: positive on the near hemisphere.
 */
function makeProjector(lon0, lat0, R) {
  const sinLat0 = Math.sin(lat0 * D2R);
  const cosLat0 = Math.cos(lat0 * D2R);
  return (lat, lon) => {
    const la = lat * D2R;
    const dl = (lon - lon0) * D2R;
    const sinLa = Math.sin(la);
    const cosLa = Math.cos(la);
    const cosDl = Math.cos(dl);
    const cosc = sinLat0 * sinLa + cosLat0 * cosLa * cosDl;
    const x = R * cosLa * Math.sin(dl);
    const y = -R * (cosLat0 * sinLa - sinLat0 * cosLa * cosDl);
    return { x, y, cosc };
  };
}

/* ------------------------------------------------------------- geometry */

/**
 * Land rings as flat [lat, lon, …] arrays, built once.
 * `capless` drops the vertices a polar cap uses to close along ±180°: on the
 * sphere those are not coastline, and stroking them draws a seam.
 */
let ringCache = null;

function rings() {
  if (ringCache) return ringCache;
  const pack = (poly) => {
    const a = new Float64Array(poly.length * 2);
    for (let i = 0; i < poly.length; i++) { a[i * 2] = poly[i][1]; a[i * 2 + 1] = poly[i][0]; }
    return a;
  };
  const capless = (poly) => {
    const kept = poly.filter(([, lat]) => lat > -89 && lat < 89);
    return kept.length >= 2 ? pack(kept) : null;
  };

  // archipelago dots become small circles on the sphere
  const dotRings = DOTS.map(([lon, lat, r]) => {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const cs = Math.max(Math.cos(lat * D2R), 0.2);
      pts.push([lon + (Math.cos(a) * r) / cs, lat + Math.sin(a) * r]);
    }
    return pack(pts);
  });

  ringCache = {
    land: LAND.map(pack),
    landOutline: LAND.map(capless).filter(Boolean),
    isles: ISLES.map(pack),
    dots: dotRings,
    seas: SEAS.map(pack)
  };
  return ringCache;
}

/**
 * One ring as an SVG path. Points behind the horizon are pushed radially out
 * to the limb, which traces the rim in the right direction because it follows
 * the ring's own order. Rings entirely on the far side are skipped.
 */
function ringPath(ring, project, R) {
  const n = ring.length / 2;
  let anyVisible = false;
  for (let i = 0; i < n; i++) {
    if (project(ring[i * 2], ring[i * 2 + 1]).cosc > 0) { anyVisible = true; break; }
  }
  if (!anyVisible) return '';

  let d = '';
  let lastAz = 0;
  for (let i = 0; i < n; i++) {
    const p = project(ring[i * 2], ring[i * 2 + 1]);
    let { x, y } = p;
    if (p.cosc <= 0) {
      const r = Math.hypot(x, y);
      if (r > 1e-6) { lastAz = Math.atan2(y, x); }
      x = Math.cos(lastAz) * R;
      y = Math.sin(lastAz) * R;
    } else {
      lastAz = Math.atan2(y, x);
    }
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
}

const ringsPath = (set, project, R) => set.map((r) => ringPath(r, project, R)).join('');

/** A polyline split into runs of visible points; used for routes. */
function polylineRuns(lats, lons, project, from, to) {
  const runs = [];
  let cur = '';
  for (let i = from; i <= to; i++) {
    const p = project(lats[i], lons[i]);
    if (p.cosc > 0) {
      cur += `${cur ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`;
    } else if (cur) {
      runs.push(cur); cur = '';
    }
  }
  if (cur) runs.push(cur);
  return runs.join('');
}

/* ------------------------------------------------------------------ view */

export class Globe {
  constructor(host, { reducedMotion = false } = {}) {
    this.host = host;
    this.reducedMotion = reducedMotion;
    this.route = null;
    this.progress = 0;
    this.follow = true;
    this.tween = null;
    this.onUserInteract = null;
    this.time = 0;
    this._last = performance.now();

    // rotation centre and zoom
    this.lon0 = -40;
    this.lat0 = 18;
    this.zoom = ZOOM_MIN;
    this._builtAt = null;

    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'map globe');
    this.svg.setAttribute('xmlns', NS);
    host.appendChild(this.svg);
    this.svg.innerHTML = buildDefs();

    this.camera = document.createElementNS(NS, 'g');
    this.camera.setAttribute('class', 'camera');
    this.svg.appendChild(this.camera);

    this.staticLayer = document.createElementNS(NS, 'g');
    this.routeLayer = document.createElementNS(NS, 'g');
    this.routeLayer.setAttribute('class', 'layer-route');
    this.actorLayer = document.createElementNS(NS, 'g');
    this.actorLayer.setAttribute('class', 'layer-actors');
    this.camera.append(this.staticLayer, this.routeLayer, this.actorLayer);

    this.items = decorItems(0);

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    this._bindInput();
    this._render(true);
  }

  /* ---------------------------------------------------------- geometry */

  get R() { return Math.min(this.w, this.h) * this.zoom; }
  /** Kept for parity with the flat view: pixels per map unit. */
  get s() { return (this.R * D2R) / PPD; }
  get cx() { return this.lon0; }
  get cy() { return this.lat0; }

  _resize() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    this.svg.setAttribute('width', this.w);
    this.svg.setAttribute('height', this.h);
    this.camera.setAttribute('transform', `translate(${this.w / 2} ${this.h / 2})`);
    this._render(true);
  }

  /* ------------------------------------------------------------ camera */

  setRotation(lon, lat) {
    this.lon0 = lon;
    this.lat0 = clamp(lat, -82, 82);
  }

  /** Degrees of longitude across the width, so callers can share flat-map units. */
  _zoomForDeg(deg) {
    const t = clamp(
      (Math.log(DEG_WIDE) - Math.log(clamp(deg, 1, 360)))
      / (Math.log(DEG_WIDE) - Math.log(DEG_CLOSE)), 0, 1);
    return lerp(ZOOM_MIN, ZOOM_MAX, t);
  }

  flyTo({ lat, lon, deg = 60, duration = 1600 }) {
    const target = { lon, lat: clamp(lat, -82, 82), zoom: this._zoomForDeg(deg) };
    if (this.reducedMotion || duration < 40) {
      this.setRotation(target.lon, target.lat);
      this.zoom = target.zoom;
      this.tween = null;
      this._render(true);
      return;
    }
    // take the short way round
    let from = this.lon0;
    while (target.lon - from > 180) from += 360;
    while (target.lon - from < -180) from -= 360;
    this.tween = {
      from: { lon: from, lat: this.lat0, zoom: this.zoom },
      to: target, t: 0, duration: duration / 1000
    };
  }

  fitRoute(route, { duration = 1800, insetRight = 0, insetBottom = 0 } = {}) {
    // Centre on the ship, not on the route's centroid: a round-the-world track
    // has no centre that shows all of it, and the centroid of one can sit at
    // the antipode of the departure, hiding the ship behind the globe.
    const here = (this.route === route && this.shipSample)
      || { lat: route.lats[0], lon: route.lons[0] };

    // widest angular reach from there decides the zoom
    const p = makeProjector(here.lon, here.lat, 1);
    let maxAng = 0;
    for (let i = 0; i < route.lats.length; i++) {
      maxAng = Math.max(maxAng, Math.acos(clamp(p(route.lats[i], route.lons[i]).cosc, -1, 1)));
    }
    const span = clamp(maxAng * R2D * 2.2, DEG_CLOSE, DEG_WIDE);
    this.flyTo({ lat: here.lat, lon: here.lon, deg: span, duration });
    this._inset = { insetRight, insetBottom };
  }

  setFollow(v) {
    this.follow = v;
    if (v) this.tween = null;
  }

  resetView() { this.flyTo({ lat: 18, lon: -40, deg: 200, duration: 1400 }); }

  /* ------------------------------------------------------------- input */

  _bindInput() {
    const svg = this.svg;
    let dragging = false;
    let lastX = 0, lastY = 0;
    const pointers = new Map();
    let pinchDist = 0;

    const userTook = () => {
      this.tween = null;
      if (this.follow) {
        this.follow = false;
        if (this.onUserInteract) this.onUserInteract();
      }
    };

    svg.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        svg.setPointerCapture(e.pointerId);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
    });

    svg.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchDist > 0) { userTook(); this._zoomBy(d / pinchDist); }
        pinchDist = d;
        return;
      }
      if (!dragging) return;
      userTook();
      // a drag turns the globe: one radius of travel is roughly a quarter turn
      const k = 90 / this.R;
      this.setRotation(this.lon0 - (e.clientX - lastX) * k, this.lat0 + (e.clientY - lastY) * k);
      lastX = e.clientX; lastY = e.clientY;
      this._render();
    });

    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) dragging = false;
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      userTook();
      this._zoomBy(Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
  }

  _zoomBy(factor) {
    this.zoom = clamp(this.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    this._render(true);
  }

  /* ------------------------------------------------------------ drawing */

  /** Rebuilds the static hemisphere. `force` ignores the rotation threshold. */
  _render(force = false) {
    if (!this.w) return;
    const b = this._builtAt;
    if (!force && b && Math.abs(b.lon - this.lon0) < 0.12
        && Math.abs(b.lat - this.lat0) < 0.12 && b.zoom === this.zoom) {
      this._drawActors();
      return;
    }
    this._builtAt = { lon: this.lon0, lat: this.lat0, zoom: this.zoom };

    const R = this.R;
    const project = makeProjector(this.lon0, this.lat0, R);
    this._project = project;
    const g = rings();

    const landD = ringsPath(g.land, project, R) + ringsPath(g.isles, project, R)
                + ringsPath(g.dots, project, R);
    const outlineD = ringsPath(g.landOutline, project, R) + ringsPath(g.isles, project, R)
                   + ringsPath(g.dots, project, R);
    const seasD = ringsPath(g.seas, project, R);

    // coastal halo, the same bands as the flat chart
    const halo = [
      [31, C.sea700, 0.5, '9 8'],
      [23, C.sea700, 1, null],
      [15, C.sea500, 1, null],
      [8, C.sea300, 0.85, null]
    ].map(([w, col, op, dash]) => `<path d="${outlineD}" fill="none" stroke="${col}"
        stroke-width="${w}" stroke-linejoin="round" opacity="${op}"
        ${dash ? `stroke-dasharray="${dash}"` : ''}/>`).join('');

    const symScale = (R * D2R) / PPD;
    const use = (it, extra = '') => {
      const p = project(it.lat, it.lon);
      if (p.cosc <= 0.02) return '';
      // symbols shrink toward the limb: the sphere turning away from the eye
      const sc = it.s * symScale * (0.62 + 0.38 * p.cosc);
      return `<use href="#${it.sym}" x="${f(p.x)}" y="${f(p.y)}"
        transform-origin="${f(p.x)} ${f(p.y)}" transform="scale(${f(sc)})"
        ${it.opacity != null ? `opacity="${it.opacity}"` : ''} ${extra}/>`;
    };
    const layer = (cls, list) => `<g class="${cls}">${list.map((i) => use(i)).join('')}</g>`;

    const slab = Math.max(4, R * 0.022);
    const cid = 'globe-disc';

    this.staticLayer.innerHTML = `
      <defs>
        <clipPath id="${cid}"><circle r="${f(R)}"/></clipPath>
        <clipPath id="globe-seas"><path d="${seasD}"/></clipPath>
      </defs>
      <circle cy="${f(slab)}" r="${f(R)}" fill="${C.ink900}" opacity=".35"/>
      <g clip-path="url(#${cid})">
        <circle r="${f(R)}" fill="${C.sea900}"/>
        <g opacity=".5" filter="url(#soft)">
          <ellipse cx="${f(-R * 0.4)}" cy="${f(-R * 0.3)}" rx="${f(R * 0.5)}" ry="${f(R * 0.35)}" fill="${C.sea700}"/>
          <ellipse cx="${f(R * 0.35)}" cy="${f(R * 0.25)}" rx="${f(R * 0.55)}" ry="${f(R * 0.4)}" fill="${C.sea700}"/>
        </g>
        ${layer('layer-waves', this.items.waves)}
        ${halo}
        <g transform="translate(0 ${f(slab * 0.8)})" opacity=".2"><path d="${landD}" fill="${C.ink900}"/></g>
        <path d="${landD}" fill="${C.paper200}"/>
        <path d="${outlineD}" fill="none" stroke="${C.paper300}" stroke-width="7"
              stroke-linejoin="round" opacity=".75"/>
        <path d="${landD}" fill="${C.paper200}"/>
        <g clip-path="url(#globe-seas)">
          <path d="${seasD}" fill="${C.sea500}"/>
          <path d="${seasD}" fill="none" stroke="${C.sea300}" stroke-width="14" opacity=".7"/>
        </g>
        <path d="${outlineD}" fill="none" stroke="${C.ink900}" stroke-width="2.4"
              stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${seasD}" fill="none" stroke="${C.ink900}" stroke-width="1.8"
              stroke-linejoin="round"/>
        ${layer('layer-relief', this.items.mtn)}
        ${layer('layer-trees', this.items.trees)}
        ${layer('layer-decor', this.items.decor)}
        ${layer('layer-decor', this.items.roses)}
        <circle r="${f(R - 2)}" fill="none" stroke="${C.ink900}" stroke-width="3" opacity=".18"/>
      </g>
      <circle r="${f(R)}" fill="none" stroke="${C.ink900}" stroke-width="3"/>`;

    this._drawActors();
  }

  /* ------------------------------------------------------- route + ship */

  setRoute(route) {
    this.clearRoute();
    this.route = route;
    if (!route) return;

    // cumulative great-circle length, so progress maps onto the drawn track
    const n = route.lats.length;
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const a = route.lats[i - 1] * D2R, b = route.lats[i] * D2R;
      const dl = (route.lons[i] - route.lons[i - 1]) * D2R;
      const c = clamp(Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dl), -1, 1);
      cum[i] = cum[i - 1] + Math.acos(c);
    }
    this.pathCum = cum;
    this.pathLen = cum[n - 1] || 1;

    this.routeLayer.innerHTML = `
      <path class="route-future" fill="none" stroke="${C.ink900}" stroke-width="3.4"
            stroke-dasharray="11 9" opacity=".8" stroke-linecap="round" stroke-linejoin="round"
            vector-effect="non-scaling-stroke"/>
      <path class="route-past-shadow" fill="none" stroke="${C.paper100}" stroke-width="7"
            opacity=".5" stroke-linecap="round" stroke-linejoin="round"
            vector-effect="non-scaling-stroke"/>
      <path class="route-past" fill="none" stroke="${route.voyage.accent || C.brick500}"
            stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"
            vector-effect="non-scaling-stroke"/>
      <g class="layer-towns"></g>`;
    this.futurePath = this.routeLayer.querySelector('.route-future');
    this.pastShadow = this.routeLayer.querySelector('.route-past-shadow');
    this.pastPath = this.routeLayer.querySelector('.route-past');
    this.townsGroup = this.routeLayer.querySelector('.layer-towns');

    const markers = document.createElementNS(NS, 'g');
    markers.setAttribute('class', 'layer-markers');
    for (let i = 0; i < route.stops.length; i++) {
      const m = document.createElementNS(NS, 'g');
      m.setAttribute('class', 'marker');
      m.innerHTML = `<use href="#sym-pin" class="mk-pin"/><use href="#sym-x" class="mk-x"/>`;
      markers.appendChild(m);
    }
    this.actorLayer.appendChild(markers);
    this.markerGroup = markers;

    const ship = document.createElementNS(NS, 'g');
    ship.setAttribute('class', 'ship');
    ship.innerHTML = `
      <g class="ship-bob">
        <g class="ship-wake">
          <path d="M-30 0 Q-40 -5 -52 -4" fill="none" stroke="${C.sea300}"
                stroke-width="3" stroke-linecap="round" opacity=".8"/>
          <path d="M-30 5 Q-42 8 -55 6" fill="none" stroke="${C.sea300}"
                stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
          <path d="M-28 -4 Q-38 -10 -48 -11" fill="none" stroke="${C.sea300}"
                stroke-width="2" stroke-linecap="round" opacity=".4"/>
        </g>
        ${shipMarkup()}
      </g>`;
    this.actorLayer.appendChild(ship);
    this.shipGroup = ship;
    this.shipBob = ship.querySelector('.ship-bob');
    this.wake = ship.querySelector('.ship-wake');

    this.setProgress(0);
  }

  clearRoute() {
    this.routeLayer.innerHTML = '';
    this.actorLayer.innerHTML = '';
    this.markerGroup = null;
    this.shipGroup = null;
    this.route = null;
  }

  /** Ship position and heading at the current fraction, in lat/lon. */
  _sampleAt(p) {
    const { tps, lats, lons } = this.route;
    let lo = 0, hi = tps.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tps[mid] < p) lo = mid + 1;
      else hi = mid;
    }
    const i1 = Math.max(1, lo);
    const i0 = i1 - 1;
    const t0 = tps[i0], t1 = tps[i1];
    const fr = t1 > t0 ? (p - t0) / (t1 - t0) : 0;
    const lat = lerp(lats[i0], lats[i1], fr);
    const lon = lerp(lons[i0], lons[i1], fr);
    const moving = this.pathCum[i1] - this.pathCum[i0] > 1e-4 && t1 > t0;
    return { lat, lon, i0, i1, fr, moving };
  }

  setProgress(p) {
    this.progress = clamp(p, 0, 1);
    if (!this.route) return;
    this.shipSample = this._sampleAt(this.progress);

    if (this.markerGroup) {
      this.route.stops.forEach((stop, i) => {
        const m = this.markerGroup.children[i];
        if (!m) return;
        const reached = this.progress + 1e-6 >= stop.tp;
        m.classList.toggle('is-reached', reached);
        m.classList.toggle('is-current', reached && this.progress < (this.route.stops[i + 1]?.tp ?? 2));
      });
    }
    this._drawActors();
  }

  /** Redraws everything that moves: route, towns, markers, ship. */
  _drawActors() {
    if (!this.route || !this._project) return;
    const project = this._project;
    const R = this.R;
    const { lats, lons } = this.route;
    const s = this.shipSample || this._sampleAt(this.progress);

    // the track is split at the horizon rather than dash-offset: on a sphere
    // the visible length changes as it turns, so a fixed dash length cannot work
    this.pastPath.setAttribute('d', polylineRuns(lats, lons, project, 0, s.i0)
      + (s.i0 < s.i1 ? polylineRuns([lats[s.i0], s.lat], [lons[s.i0], s.lon], project, 0, 1) : ''));
    this.pastShadow.setAttribute('d', this.pastPath.getAttribute('d'));
    this.futurePath.setAttribute('d', polylineRuns(lats, lons, project, s.i1, lats.length - 1));

    const symScale = (R * D2R) / PPD;

    this.townsGroup.innerHTML = this.route.stops.map((stop) => {
      const p = project(stop.lat, stop.mapLon);
      if (p.cosc <= 0.02) return '';
      const sc = 0.6 * symScale * (0.62 + 0.38 * p.cosc);
      return `<use href="#sym-town" x="${f(p.x)}" y="${f(p.y)}"
        transform-origin="${f(p.x)} ${f(p.y)}" transform="scale(${f(sc)})" opacity=".95"/>`;
    }).join('');

    if (this.markerGroup) {
      this.route.stops.forEach((stop, i) => {
        const m = this.markerGroup.children[i];
        if (!m) return;
        const p = project(stop.lat, stop.mapLon);
        const on = p.cosc > 0.02;
        m.style.display = on ? '' : 'none';
        if (on) m.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)}) scale(1.6)`);
      });
    }

    if (this.shipGroup) {
      const p = project(s.lat, s.lon);
      const on = p.cosc > 0.02;
      this.shipGroup.style.display = on ? '' : 'none';
      if (on) {
        // heading from the projected tangent, so it turns with the globe
        const j = Math.min(s.i1 + 2, lats.length - 1);
        const q = project(lats[j], lons[j]);
        let dx = q.x - p.x, dy = q.y - p.y;
        if (dx * dx + dy * dy < 1) { dx = 1; dy = 0; }
        const flip = dx < 0 ? -1 : 1;
        const tilt = clamp(Math.atan2(dy, Math.abs(dx)) * R2D, -18, 18);
        const sc = 1.5 * symScale * (0.62 + 0.38 * p.cosc);
        this.shipGroup.setAttribute('transform',
          `translate(${f(p.x)} ${f(p.y)}) scale(${(flip * sc).toFixed(3)} ${sc.toFixed(3)}) rotate(${tilt.toFixed(1)})`);
      }
    }
  }

  setRouteOpacity(v) {
    this.routeLayer.style.opacity = String(v);
    this.actorLayer.style.opacity = String(v);
  }

  /* ------------------------------------------------------------- frame */

  update() {
    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 0.1);
    this._last = now;
    this.time += dt;

    let moved = false;

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const e = easeInOut(tw.t);
      this.setRotation(lerp(tw.from.lon, tw.to.lon, e), lerp(tw.from.lat, tw.to.lat, e));
      this.zoom = lerp(tw.from.zoom, tw.to.zoom, e);
      if (tw.t >= 1) this.tween = null;
      moved = true;
    } else if (this.follow && this.shipSample) {
      // Gradual turn: the globe eases toward the ship rather than tracking it,
      // so following a voyage reads as the world slowly rolling underneath.
      const k = 1 - Math.exp(-(this.reducedMotion ? 14 : 0.9) * dt);
      let target = this.shipSample.lon;
      while (target - this.lon0 > 180) target -= 360;
      while (target - this.lon0 < -180) target += 360;
      this.setRotation(lerp(this.lon0, target, k), lerp(this.lat0, this.shipSample.lat, k));
      moved = true;
    } else if (!this.route && !this.reducedMotion) {
      // idle: a slow drift, so the globe reads as a globe before anything starts
      this.setRotation(this.lon0 + dt * 1.8, this.lat0);
      moved = true;
    }

    if (moved) this._render();

    if (this.wake) {
      this.wake.style.opacity = this.shipSample && this.shipSample.moving ? '1' : '0';
    }
    if (this.shipBob && !this.reducedMotion) {
      const bob = Math.sin(this.time * 2.6) * 1.4;
      const roll = Math.sin(this.time * 1.9) * 1.2;
      this.shipBob.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${roll.toFixed(2)}deg)`;
    }
  }

  /** Screen coordinates of a point, for the HTML labels. Hidden on the far side. */
  project(lat, lon, out = {}) {
    const p = makeProjector(this.lon0, this.lat0, this.R)(lat, lon);
    out.x = this.w / 2 + p.x;
    out.y = this.h / 2 + p.y;
    // Near the limb a label sits at a grazing angle and, once clamped into the
    // viewport, piles up against the edge — so drop it before it gets there.
    out.visible = p.cosc > 0.12
      && out.x > -40 && out.x < this.w + 40
      && out.y > -40 && out.y < this.h + 40;
    return out;
  }

  mapLonFor(stop) { return stop.mapLon; }

  dispose() {
    window.removeEventListener('resize', this._resize);
    this.svg.remove();
  }
}
