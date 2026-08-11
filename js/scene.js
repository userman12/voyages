import { projX, projY, PPD, clamp, lerp } from './geo.js';
import {
  C, buildDefs, landLayer, decorLayer, townsLayer, seaBackdrop, shipMarkup
} from './cartography.js';

const NS = 'http://www.w3.org/2000/svg';
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Degrees of longitude visible across the width, at both zoom extremes. */
const WIDE_DEG = 400;
const CLOSE_DEG = 16;

export class Scene {
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

    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'map');
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

    // camera state: centre in map coordinates + pixels per map unit
    this.cx = 0;
    this.cy = 0;
    this.s = 1;

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    this._bindInput();

    this.buildWorld([0]);
    this.setView(-40, 20, WIDE_DEG);
  }

  /* ------------------------------------------------------------- world */

  /**
   * Draws the world map. A circumnavigation exceeds 360°, so the map is tiled
   * beside itself as many times as needed: this keeps the route a single line
   * instead of jumping from one edge to the other.
   */
  buildWorld(tiles) {
    if (this._tiles && this._tiles.join() === tiles.join()) return;
    this._tiles = tiles.slice();

    const pad = 40 * PPD;
    const x0 = projX(tiles[0] * 360 - 180) - pad;
    const x1 = projX(tiles[tiles.length - 1] * 360 + 180) + pad;
    const y0 = projY(92);
    const y1 = projY(-92);

    // real bounds of the map: used to limit zoom and panning
    this.bounds = {
      x0: projX(tiles[0] * 360 - 180),
      x1: projX(tiles[tiles.length - 1] * 360 + 180),
      y0: projY(90),
      y1: projY(-90)
    };

    this.staticLayer.innerHTML =
      seaBackdrop(x0, y0, x1 - x0, y1 - y0) +
      tiles.map((k) => landLayer(k * 360)).join('') +
      tiles.map((k) => decorLayer(k * 360)).join('');
  }

  /* ------------------------------------------------------------ camera */

  _resize() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.svg.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`);
    this.svg.setAttribute('width', this.w);
    this.svg.setAttribute('height', this.h);
    this._apply();
  }

  /** Scale matching a given number of degrees visible across the width. */
  _scaleFor(deg) {
    return this.w / (deg * PPD);
  }

  /**
   * Minimum zoom: the one that fits the whole map inside the window.
   * With a fixed value the map could end up smaller than the screen and slide
   * around inside it like a sticker.
   */
  get minScale() {
    if (!this.bounds) return this._scaleFor(WIDE_DEG);
    const b = this.bounds;
    const fitW = this.w / (b.x1 - b.x0);
    const fitH = this.h / (b.y1 - b.y0);
    // Fits fully across the width, but without shrinking to a strip: on tall
    // screens it must still fill much of the height, otherwise it goes back to
    // looking like an image pasted in the middle of the screen.
    return Math.max(fitW, fitH * 0.68);
  }

  get maxScale() { return Math.max(this._scaleFor(CLOSE_DEG), this.minScale * 1.2); }

  setView(lon, lat, deg) {
    this.cx = projX(lon);
    this.cy = projY(lat);
    this.s = clamp(this._scaleFor(deg), this.minScale, this.maxScale);
    this._apply();
  }

  _apply() {
    this.s = clamp(this.s, this.minScale, this.maxScale);
    this._clampCenter();
    const tx = this.w / 2 - this.cx * this.s;
    const ty = this.h / 2 - this.cy * this.s;
    this.camera.setAttribute('transform', `translate(${tx} ${ty}) scale(${this.s})`);
    this._syncActorScale();
  }

  /**
   * Ship and markers do not fully follow the zoom: partly compensated, they
   * stay readable from afar without becoming huge close up.
   */
  _syncActorScale() {
    const ref = this._scaleFor(70);
    // the ship compensates only partly, so it stays tied to the map
    this.actorScale = 0.9 * Math.pow(ref / this.s, 0.55);
    // markers keep a constant on-screen size instead: they are signage
    this.markerScale = 1.6 / this.s;
    if (this.shipGroup) this._placeShip();
    if (this.markerGroup) {
      for (const m of this.markerGroup.children) {
        m.setAttribute('transform',
          `translate(${m.dataset.x} ${m.dataset.y}) scale(${this.markerScale.toFixed(4)})`);
      }
    }
  }

  flyTo({ lat, lon, deg = 60, duration = 1600 }) {
    const target = {
      cx: projX(lon), cy: projY(lat),
      s: clamp(this._scaleFor(deg), this.minScale, this.maxScale)
    };
    if (this.reducedMotion || duration < 40) {
      Object.assign(this, target);
      this.tween = null;
      this._apply();
      return;
    }
    this.tween = {
      from: { cx: this.cx, cy: this.cy, s: this.s },
      to: target, t: 0, duration: duration / 1000
    };
  }

  /** Frames the whole route, leaving room for panels and labels. */
  fitRoute(route, { duration = 1800, padX = 0.16, padY = 0.26, insetRight = 0, insetBottom = 0 } = {}) {
    let lo = Infinity, hi = -Infinity, top = Infinity, bot = -Infinity;
    for (let i = 0; i < route.lats.length; i++) {
      const x = projX(route.lons[i]);
      const y = projY(route.lats[i]);
      if (x < lo) lo = x;
      if (x > hi) hi = x;
      if (y < top) top = y;
      if (y > bot) bot = y;
    }
    const wNeed = (hi - lo) / (1 - padX) || 1;
    const hNeed = (bot - top) / (1 - padY) || 1;
    // the band taken by the panels is not usable space for the route
    const raw = Math.min((this.w - insetRight) / wNeed, (this.h - insetBottom) / hNeed);
    const s = clamp(raw, this.minScale, this.maxScale);
    const deg = this.w / (s * PPD);
    // centre shifted, so content sits beside the panels rather than under them
    const lon = ((lo + hi) / 2 + insetRight / 2 / s) / PPD;
    const lat = -((top + bot) / 2 + insetBottom / 2 / s) / (PPD * 0.88);
    this.flyTo({ lat, lon, deg, duration });
  }

  setFollow(v) {
    this.follow = v;
    if (v) this.tween = null;
  }

  resetView() {
    this.flyTo({ lat: 20, lon: -40, deg: WIDE_DEG, duration: 1400 });
  }

  /* ----------------------------------------------------------- input */

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
        dragging = true;
        lastX = e.clientX; lastY = e.clientY;
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
        if (pinchDist > 0) {
          userTook();
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          this._zoomAt(mid, d / pinchDist);
        }
        pinchDist = d;
        return;
      }
      if (!dragging) return;
      userTook();
      this.cx -= (e.clientX - lastX) / this.s;
      this.cy -= (e.clientY - lastY) / this.s;
      lastX = e.clientX; lastY = e.clientY;
      this._apply();
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
      const r = this.host.getBoundingClientRect();
      this._zoomAt([e.clientX - r.left, e.clientY - r.top], Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
  }

  /** Zoom keeping the point under the pointer fixed. */
  _zoomAt(screenPt, factor) {
    const before = this._toMap(screenPt);
    this.s = clamp(this.s * factor, this.minScale, this.maxScale);
    const after = this._toMap(screenPt);
    this.cx += before.x - after.x;
    this.cy += before.y - after.y;
    this._apply();
  }

  _toMap([px, py]) {
    const tx = this.w / 2 - this.cx * this.s;
    const ty = this.h / 2 - this.cy * this.s;
    return { x: (px - tx) / this.s, y: (py - ty) / this.s };
  }

  _clampCenter() {
    const b = this.bounds;
    if (!b) return;
    const halfW = this.w / (2 * this.s);
    const halfH = this.h / (2 * this.s);
    // when the map is smaller than the window on an axis, it stays centred
    this.cx = (b.x1 - b.x0) <= halfW * 2
      ? (b.x0 + b.x1) / 2
      : clamp(this.cx, b.x0 + halfW, b.x1 - halfW);
    this.cy = (b.y1 - b.y0) <= halfH * 2
      ? (b.y0 + b.y1) / 2
      : clamp(this.cy, b.y0 + halfH, b.y1 - halfH);
  }

  /* ------------------------------------------------------------- route */

  setRoute(route) {
    this.clearRoute();
    this.route = route;
    if (!route) return;

    // tiles needed to hold the route without edge jumps
    const lons = route.lons;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < lons.length; i++) {
      if (lons[i] < lo) lo = lons[i];
      if (lons[i] > hi) hi = lons[i];
    }
    const k0 = Math.floor((lo - 30 + 180) / 360);
    const k1 = Math.floor((hi + 30 + 180) / 360);
    const tiles = [];
    for (let k = k0; k <= k1; k++) tiles.push(k);
    this.buildWorld(tiles);

    // track geometry and cumulative lengths in pixels
    const n = route.lats.length;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    const cum = new Float64Array(n);
    let d = '';
    for (let i = 0; i < n; i++) {
      xs[i] = projX(lons[i]);
      ys[i] = projY(route.lats[i]);
      if (i) cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
      d += `${i ? 'L' : 'M'}${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`;
    }
    this.pathXs = xs;
    this.pathYs = ys;
    this.pathCum = cum;
    this.pathLen = cum[n - 1] || 1;

    const accent = route.voyage.accent || C.brick500;

    const mk = (cls, attrs) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
      return p;
    };

    // route still to sail: ink dashes
    this.futurePath = mk('route-future', {
      stroke: C.ink900, 'stroke-width': 3.4, 'stroke-dasharray': '11 9', opacity: 0.8
    });
    // route already sailed: solid stroke, revealed with dashoffset
    this.pastShadow = mk('route-past-shadow', {
      stroke: C.paper100, 'stroke-width': 7, opacity: 0.5
    });
    this.pastPath = mk('route-past', { stroke: accent, 'stroke-width': 4.2 });

    for (const p of [this.pastShadow, this.pastPath]) {
      p.style.strokeDasharray = `${this.pathLen} ${this.pathLen}`;
      p.style.strokeDashoffset = this.pathLen;
    }
    this.routeLayer.append(this.futurePath, this.pastShadow, this.pastPath);

    // towns at the stops
    const towns = document.createElementNS(NS, 'g');
    towns.setAttribute('class', 'layer-towns');
    towns.innerHTML = townsLayer(route);
    this.routeLayer.appendChild(towns);
    this.townsGroup = towns;

    this._buildMarkers(route);
    this._buildShip();
    this.setProgress(0);
  }

  _buildMarkers(route) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'layer-markers');
    this.actorLayer.appendChild(g);
    this.markerGroup = g;

    route.stops.forEach((stop) => {
      const m = document.createElementNS(NS, 'g');
      m.dataset.x = projX(stop.mapLon).toFixed(1);
      m.dataset.y = projY(stop.lat).toFixed(1);
      m.innerHTML = `<use href="#sym-pin" class="mk-pin"/><use href="#sym-x" class="mk-x"/>`;
      m.setAttribute('class', 'marker');
      g.appendChild(m);
    });
  }

  _buildShip() {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'ship');
    // The bob goes on an inner group: in SVG a CSS transform replaces the
    // transform attribute, and applied here it would wipe position and rotation.
    g.innerHTML = `
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
    this.actorLayer.appendChild(g);
    this.shipGroup = g;
    this.shipBob = g.querySelector('.ship-bob');
    this.wake = g.querySelector('.ship-wake');
  }

  clearRoute() {
    this.routeLayer.innerHTML = '';
    this.actorLayer.innerHTML = '';
    this.markerGroup = null;
    this.shipGroup = null;
    this.route = null;
  }

  /** Position, heading and distance at the current fraction. */
  _sampleAt(p) {
    const { tps } = this.route;
    let lo = 0, hi = tps.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tps[mid] < p) lo = mid + 1;
      else hi = mid;
    }
    const i1 = Math.max(1, lo);
    const i0 = i1 - 1;
    const t0 = tps[i0], t1 = tps[i1];
    const f = t1 > t0 ? (p - t0) / (t1 - t0) : 0;

    const x = lerp(this.pathXs[i0], this.pathXs[i1], f);
    const y = lerp(this.pathYs[i0], this.pathYs[i1], f);
    const len = lerp(this.pathCum[i0], this.pathCum[i1], f);

    // heading: first following sample that is not coincident
    let dx = 0, dy = 0;
    for (let k = i1; k < this.pathXs.length; k++) {
      dx = this.pathXs[k] - x; dy = this.pathYs[k] - y;
      if (dx * dx + dy * dy > 4) break;
    }
    if (dx === 0 && dy === 0) {
      for (let k = i0; k >= 0; k--) {
        dx = x - this.pathXs[k]; dy = y - this.pathYs[k];
        if (dx * dx + dy * dy > 4) break;
      }
    }
    const moving = this.pathCum[i1] - this.pathCum[i0] > 0.4 && t1 > t0;
    return { x, y, dx, dy, len, moving };
  }

  setProgress(p) {
    this.progress = clamp(p, 0, 1);
    if (!this.route) return;
    const s = this._sampleAt(this.progress);
    this.shipSample = s;

    const drawn = this.pathLen * (s.len / this.pathLen);
    for (const path of [this.pastShadow, this.pastPath]) {
      path.style.strokeDashoffset = String(this.pathLen - drawn);
    }

    this._placeShip();

    if (this.markerGroup) {
      this.route.stops.forEach((stop, i) => {
        const m = this.markerGroup.children[i];
        if (!m) return;
        const reached = this.progress + 1e-6 >= stop.tp;
        m.classList.toggle('is-reached', reached);
        m.classList.toggle('is-current', reached && this.progress < (this.route.stops[i + 1]?.tp ?? 2));
      });
    }
  }

  /**
   * The ship always stays upright: it mirrors when heading west and tilts
   * slightly. Rotating it 180° would turn it upside down, and an upside-down
   * illustration immediately breaks the 3/4 perspective.
   */
  _placeShip() {
    if (!this.shipGroup || !this.shipSample) return;
    const { x, y, dx, dy } = this.shipSample;
    const flip = dx < 0 ? -1 : 1;
    const tilt = clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI, -18, 18);
    const sc = this.actorScale || 1;
    this.shipGroup.setAttribute(
      'transform',
      `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(flip * sc).toFixed(3)} ${sc.toFixed(3)}) rotate(${tilt.toFixed(1)})`
    );
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

    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const e = easeInOut(tw.t);
      this.cx = lerp(tw.from.cx, tw.to.cx, e);
      this.cy = lerp(tw.from.cy, tw.to.cy, e);
      this.s = lerp(tw.from.s, tw.to.s, e);
      if (tw.t >= 1) this.tween = null;
      this._apply();
    } else if (this.follow && this.shipSample) {
      const k = 1 - Math.exp(-(this.reducedMotion ? 14 : 2.4) * dt);
      this.cx = lerp(this.cx, this.shipSample.x, k);
      this.cy = lerp(this.cy, this.shipSample.y, k);
      this._apply();
    }

    if (this.wake) {
      this.wake.style.opacity = this.shipSample && this.shipSample.moving ? '1' : '0';
    }
    if (this.shipBob && !this.reducedMotion) {
      // gentle bob, 2.4 s cycle per style guide §3.15
      const bob = Math.sin(this.time * 2.6) * 1.4;
      const roll = Math.sin(this.time * 1.9) * 1.2;
      this.shipBob.style.transform = `translateY(${bob.toFixed(2)}px) rotate(${roll.toFixed(2)}deg)`;
    }
  }

  /** Screen coordinates of a map point, for the HTML labels. */
  project(lat, lon, out = {}) {
    const tx = this.w / 2 - this.cx * this.s;
    const ty = this.h / 2 - this.cy * this.s;
    out.x = projX(lon) * this.s + tx;
    out.y = projY(lat) * this.s + ty;
    out.visible = out.x > -60 && out.x < this.w + 60 && out.y > -40 && out.y < this.h + 40;
    return out;
  }

  /** Equivalent longitude in the visible tile, for stop labels. */
  mapLonFor(stop) {
    return stop.mapLon;
  }

  dispose() {
    window.removeEventListener('resize', this._resize);
    this.svg.remove();
  }
}
