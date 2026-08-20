import * as THREE from 'three';
import { LAND, SEAS, ISLES, DOTS } from '../data/landmasses.js';
import { PPD, clamp, lerp } from './geo.js';
import { C, buildDefs, shipMarkup, decorItems } from './cartography.js';

/**
 * Globe view — the same chart, wrapped on an actual sphere and rendered by
 * WebGL through Three.js.
 *
 * The previous globe was still plain SVG: an orthographic projection redrawn
 * by hand, which meant rebuilding a couple of thousand DOM nodes on every
 * rotation step. That is what made it laggy — not the amount of geometry,
 * the DOM churn. The fix here is not "optimise the redraw", it is "stop
 * redrawing": the land, relief, trees and sea are painted ONCE onto a single
 * equirectangular texture (literally the same drawing code as the flat map,
 * just unsquashed) and wrapped on a sphere; from then on rotating the globe
 * is one GPU-side quaternion update, not a redraw.
 *
 * Ship, pins and towns stay separate: they are small billboard sprites
 * rasterised once from the same SVG symbols and repositioned each frame —
 * cheap, because repositioning a sprite is just setting a vector, not
 * rebuilding markup.
 */

const D2R = Math.PI / 180;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const R_SPHERE = 100;   // world-unit sphere radius; arbitrary, everything else is relative to it
const FOV_DEG = 42;
const CAM_CLOSE = 320;  // camera distance at maximum zoom-in
const CAM_WIDE = 580;   // camera distance at maximum zoom-out
/** Callers speak in degrees across the width, like the flat map does. */
const DEG_WIDE = 200;
const DEG_CLOSE = 40;

/**
 * Texture size: a power of two (required for mipmapping on WebGL1 — an
 * NPOT texture silently falls back to no mipmaps there, which is both
 * slower to sample at a distance and visibly aliased). 4096 is close to
 * WORLD_W (360*PPD=5040, the flat map's own density) without the extra
 * ~34% of texels that density would cost for no visible gain at the
 * globe's short, always-zoomed-out viewing range.
 */
const TEX_W = 4096;
const TEX_H = TEX_W / 2;
/** Symbols are drawn at the flat map's own size (PPD); scale them to match. */
const TEX_SYM_SCALE = TEX_W / (360 * PPD);

/* --------------------------------------------------------- lat/lon <-> 3D
 * One convention, used everywhere below: lon 0 / lat 0 sits on +Z (so it
 * faces the camera, which is fixed on the +Z axis); lat 90 sits on +Y (north
 * up); lon 90 sits on +X (east is screen-right when centred on lon 0).
 * sin/cos are periodic, so an unwrapped stop longitude like -400 lands in
 * exactly the same place as -40 — the sphere needs no tile system.
 * ------------------------------------------------------------------------- */
function unitVec(lat, lon) {
  const la = lat * D2R, lo = lon * D2R;
  const cl = Math.cos(la);
  return new THREE.Vector3(cl * Math.sin(lo), Math.sin(la), cl * Math.cos(lo));
}

/**
 * Rotating the world to centre it on (lon0, lat0) is two rotations composed
 * as qLat * qLon: yaw around Y by -lon0 brings that meridian to the X=0
 * plane, then pitch around X by +lat0 lifts that point onto +Z. Verified
 * algebraically (see the self-check at the bottom of this file) rather than
 * assumed, because a sign error here silently points the camera anywhere.
 */
function worldQuaternion(lon0, lat0, out = new THREE.Quaternion()) {
  const qY = _q1.setFromAxisAngle(_AXIS_Y, -lon0 * D2R);
  const qX = _q2.setFromAxisAngle(_AXIS_X, lat0 * D2R);
  return out.multiplyQuaternions(qX, qY);
}
const _AXIS_Y = new THREE.Vector3(0, 1, 0);
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();

/* --------------------------------------------------------------- geometry
 * A custom sphere, not THREE.SphereGeometry: this way the UV assigned to
 * each vertex is defined in the same breath as the vertex position, so the
 * texture painted below is guaranteed to line up — no separate convention to
 * keep in sync.
 * ------------------------------------------------------------------------- */
function buildSphereGeometry(radius, segLon = 64, segLat = 32) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let j = 0; j <= segLat; j++) {
    const vRow = j / segLat;           // 0 at the north pole, 1 at the south
    const lat = 90 - vRow * 180;
    for (let i = 0; i <= segLon; i++) {
      const uRow = i / segLon;         // 0 at lon -180, 1 at lon +180
      const lon = uRow * 360 - 180;
      const p = unitVec(lat, lon).multiplyScalar(radius);
      pos.push(p.x, p.y, p.z);
      // texture.flipY defaults to true, which samples uv.y=1 at the top of
      // the source canvas — so the north pole (top of the painted texture)
      // needs uv.y=1, i.e. 1-vRow.
      uv.push(uRow, 1 - vRow);
    }
  }
  const row = segLon + 1;
  for (let j = 0; j < segLat; j++) {
    for (let i = 0; i < segLon; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/* ---------------------------------------------------------------- texture
 * Equirectangular painter: the same land/sea/relief drawing as
 * js/cartography.js, but with a plain linear projection (no squash, no
 * tiling — a sphere already wraps) instead of the flat chart's projX/projY.
 * ------------------------------------------------------------------------- */
const f = (n) => (Math.round(n * 10) / 10).toString();
const TEX_PPD = PPD * TEX_SYM_SCALE;
const equX = (lon) => (lon + 180) * TEX_PPD;
const equY = (lat) => (90 - lat) * TEX_PPD;

function eqPolyPath(poly) {
  let d = '';
  for (let i = 0; i < poly.length; i++) {
    d += `${i ? 'L' : 'M'}${f(equX(poly[i][0]))} ${f(equY(poly[i][1]))}`;
  }
  return d + 'Z';
}
function eqDotsPath() {
  let d = '';
  for (const [lon, lat, r] of DOTS) {
    const cx = equX(lon), cy = equY(lat), rr = Math.max(r * TEX_PPD, 3);
    d += `M${f(cx - rr)} ${f(cy)}a${f(rr)} ${f(rr)} 0 1 0 ${f(rr * 2)} 0`
       + `a${f(rr)} ${f(rr)} 0 1 0 ${f(-rr * 2)} 0Z`;
  }
  return d;
}
const eqUse = ({ lon, lat, sym, s = 1, opacity }) => {
  const x = equX(lon), y = equY(lat), sc = s * TEX_SYM_SCALE;
  return `<use href="#${sym}" x="${f(x)}" y="${f(y)}" transform-origin="${f(x)} ${f(y)}"
    transform="scale(${f(sc)})" ${opacity != null ? `opacity="${opacity}"` : ''}/>`;
};

function buildWorldSVG() {
  const { waves, mtn, trees, decor, roses } = decorItems(0);
  const outer = LAND.map(eqPolyPath).join('') + ISLES.map(eqPolyPath).join('') + eqDotsPath();
  const seas = SEAS.map(eqPolyPath).join('');
  const halo = [
    [31, C.sea700, 0.5, '9 8'], [23, C.sea700, 1, null],
    [15, C.sea500, 1, null], [8, C.sea300, 0.85, null]
  ].map(([w, col, op, dash]) => `<path d="${outer}" fill="none" stroke="${col}"
      stroke-width="${f(w * TEX_SYM_SCALE)}" stroke-linejoin="round" opacity="${op}"
      ${dash ? `stroke-dasharray="${f(9 * TEX_SYM_SCALE)} ${f(8 * TEX_SYM_SCALE)}"` : ''}/>`).join('');
  const layer = (list) => list.map(eqUse).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TEX_W}" height="${TEX_H}"
      viewBox="0 0 ${TEX_W} ${TEX_H}">
    ${buildDefs()}
    <rect width="${TEX_W}" height="${TEX_H}" fill="${C.sea900}"/>
    ${layer(waves)}
    ${halo}
    <path d="${outer}" fill="${C.paper200}"/>
    <path d="${outer}" fill="none" stroke="${C.paper300}" stroke-width="${f(7 * TEX_SYM_SCALE)}" stroke-linejoin="round" opacity=".75"/>
    <path d="${outer}" fill="${C.paper200}"/>
    <clipPath id="tex-seas"><path d="${seas}"/></clipPath>
    <g clip-path="url(#tex-seas)">
      <path d="${seas}" fill="${C.sea500}"/>
      <path d="${seas}" fill="none" stroke="${C.sea300}" stroke-width="${f(14 * TEX_SYM_SCALE)}" opacity=".7"/>
    </g>
    <path d="${outer}" fill="none" stroke="${C.ink900}" stroke-width="${f(2.4 * TEX_SYM_SCALE)}" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${seas}" fill="none" stroke="${C.ink900}" stroke-width="${f(1.8 * TEX_SYM_SCALE)}" stroke-linejoin="round"/>
    ${layer(mtn)}
    ${layer(trees)}
    ${layer(decor)}
    ${layer(roses)}
  </svg>`;
}

/** A tiny wake, baked separately so it can be shown or hidden on its own. */
function wakeSVG(h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-h} ${-h} ${2 * h} ${2 * h}">
    <g fill="none" stroke="${C.sea300}" stroke-linecap="round">
      <path d="M-30 0 Q-40 -5 -52 -4" stroke-width="3" opacity=".8"/>
      <path d="M-30 5 Q-42 8 -55 6" stroke-width="2.4" opacity=".55"/>
      <path d="M-28 -4 Q-38 -10 -48 -11" stroke-width="2" opacity=".4"/>
    </g>
  </svg>`;
}
function shipSVG(h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-h} ${-h} ${2 * h} ${2 * h}">${shipMarkup()}</svg>`;
}
function symbolSVG(id, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-h} ${-h} ${2 * h} ${2 * h}">
    ${buildDefs()}<use href="#${id}"/></svg>`;
}

/** Rasterises an SVG string to a canvas via the browser's own SVG decoder. */
function rasterize(svg, w, h) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/** Downscales for GPUs with a smaller max texture size than the source. */
function clampToGPU(canvas, maxSize) {
  if (canvas.width <= maxSize) return canvas;
  const scale = maxSize / canvas.width;
  const out = document.createElement('canvas');
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

/* Painted once and shared for the page's whole life: rebuilding this is by
 * far the most expensive step (thousands of symbols), and nothing about it
 * depends on which voyage is showing. */
let worldTexPromise = null;
function getWorldTexture(maxTexSize) {
  if (!worldTexPromise) {
    worldTexPromise = rasterize(buildWorldSVG(), TEX_W, TEX_H)
      .then((canvas) => clampToGPU(canvas, maxTexSize))
      .then((canvas) => Object.assign(new THREE.CanvasTexture(canvas), { needsUpdate: true }));
  }
  return worldTexPromise;
}

const SHIP_H = 40, PIN_H = 16, TOWN_H = 22, OVERSAMPLE = 4;
let spriteTexPromise = null;
function getSpriteTextures() {
  if (!spriteTexPromise) {
    const shot = (svg, h) => rasterize(svg, h * 2 * OVERSAMPLE, h * 2 * OVERSAMPLE)
      .then((c) => Object.assign(new THREE.CanvasTexture(c), { needsUpdate: true }));
    spriteTexPromise = Promise.all([
      shot(shipSVG(SHIP_H), SHIP_H),
      shot(wakeSVG(SHIP_H), SHIP_H),
      shot(symbolSVG('sym-pin', PIN_H), PIN_H),
      shot(symbolSVG('sym-x', PIN_H), PIN_H),
      shot(symbolSVG('sym-town', TOWN_H), TOWN_H)
    ]).then(([ship, wake, pin, x, town]) => ({ ship, wake, pin, x, town }));
  }
  return spriteTexPromise;
}

/** Disposes every geometry/material under a group, never the (shared) textures. */
function disposeGroup(group) {
  group.traverse((obj) => {
    obj.geometry?.dispose();
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material].filter(Boolean);
    for (const m of mats) m.dispose();
  });
  group.clear();
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

    this.lon0 = -40;
    this.lat0 = 18;
    this.zoomT = 0;   // 0 = wide, 1 = close

    const r = host.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map';
    host.appendChild(this.canvas);

    // Antialiasing multiplies fill-rate cost (typically 4x the samples) for a
    // scene whose detail already comes from a baked texture, not sharp
    // geometric edges — a poor trade on integrated/software GPUs, which is
    // exactly where this project's "no lag" goal is hardest to hit.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.w, this.h, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV_DEG, this.w / this.h, 1, 4000);
    this.camera.position.set(0, 0, CAM_WIDE);
    this.camera.lookAt(0, 0, 0);

    this.world = new THREE.Group();
    this.scene.add(this.world);

    const sphereGeo = buildSphereGeometry(R_SPHERE);
    const sphereMat = new THREE.MeshBasicMaterial({ color: C.sea900, side: THREE.DoubleSide });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.world.add(this.sphere);

    // cartoon ink rim: a slightly larger sphere, seen from inside its back
    // face, gives the flat map's hand-inked outline circle for free
    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(R_SPHERE * 1.012, 32, 20),
      new THREE.MeshBasicMaterial({ color: C.ink900, side: THREE.BackSide })
    );
    this.world.add(rim);

    this.routeGroup = new THREE.Group();
    this.actorGroup = new THREE.Group();
    this.world.add(this.routeGroup, this.actorGroup);

    getWorldTexture(this.renderer.capabilities.maxTextureSize).then((tex) => {
      sphereMat.map = tex;
      sphereMat.color.set(0xffffff);
      sphereMat.needsUpdate = true;
    });

    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    this._bindInput();
    this._renderFrame();
  }

  /* ------------------------------------------------------------ camera */

  get camDist() { return lerp(CAM_WIDE, CAM_CLOSE, this.zoomT); }

  setRotation(lon, lat) {
    this.lon0 = lon;
    this.lat0 = clamp(lat, -82, 82);
  }

  /** Degrees of longitude across the width, so callers share flat-map units. */
  _tForDeg(deg) {
    return clamp(
      (Math.log(DEG_WIDE) - Math.log(clamp(deg, 1, 360)))
      / (Math.log(DEG_WIDE) - Math.log(DEG_CLOSE)), 0, 1);
  }

  flyTo({ lat, lon, deg = 60, duration = 1600 }) {
    const target = { lon, lat: clamp(lat, -82, 82), t: this._tForDeg(deg) };
    if (this.reducedMotion || duration < 40) {
      this.setRotation(target.lon, target.lat);
      this.zoomT = target.t;
      this.tween = null;
      return;
    }
    let from = this.lon0;
    while (target.lon - from > 180) from += 360;
    while (target.lon - from < -180) from -= 360;
    this.tween = { from: { lon: from, lat: this.lat0, t: this.zoomT }, to: target, t: 0, duration: duration / 1000 };
  }

  fitRoute(route, { duration = 1800, insetRight = 0, insetBottom = 0 } = {}) {
    // Centre on the ship, not on the route's centroid: a round-the-world
    // track has no centre that shows all of it, and the centroid of one can
    // sit at the antipode of the departure, hiding the ship behind the globe.
    const here = (this.route === route && this.shipSample) || { lat: route.lats[0], lon: route.lons[0] };
    const hereVec = unitVec(here.lat, here.lon);
    let maxAng = 0;
    for (let i = 0; i < route.lats.length; i++) {
      const dot = clamp(hereVec.dot(unitVec(route.lats[i], route.lons[i])), -1, 1);
      maxAng = Math.max(maxAng, Math.acos(dot));
    }
    const span = clamp((maxAng * 180 / Math.PI) * 2.2, DEG_CLOSE, DEG_WIDE);
    this._setInset(insetRight, insetBottom);
    this.flyTo({ lat: here.lat, lon: here.lon, deg: span, duration });
  }

  /**
   * Shifts what the camera frames, without distorting the sphere, to keep
   * the globe clear of the panel — the same job insetRight/insetBottom do
   * for the flat map's orthographic camera, done here with an off-axis
   * perspective frustum (the standard technique for tiled/shifted
   * rendering) since simply zooming out would still leave the ship
   * centred underneath the panel rather than actually clear of it.
   */
  _setInset(insetRight, insetBottom) {
    this._insetR = insetRight;
    this._insetB = insetBottom;
    this._applyInset();
  }

  _applyInset() {
    const ir = this._insetR || 0, ib = this._insetB || 0;
    if (ir <= 0 && ib <= 0) { this.camera.clearViewOffset(); }
    else {
      // The real canvas becomes the sub-window [ir, ib, w, h] of a virtual
      // frame (w+ir) x (h+ib); that virtual frame's own centre — where the
      // sphere naturally renders — then lands at the centre of the *visible*
      // (non-obscured) area of the real canvas instead of the canvas's own
      // centre.
      this.camera.setViewOffset(this.w + ir, this.h + ib, ir, ib, this.w, this.h);
    }
    // setViewOffset()/clearViewOffset() stage the change; this is what
    // actually bakes it into projectionMatrix.
    this.camera.updateProjectionMatrix();
  }

  setFollow(v) {
    this.follow = v;
    if (v) this.tween = null;
  }

  resetView() { this.flyTo({ lat: 18, lon: -40, deg: 200, duration: 1400 }); }

  /* ------------------------------------------------------------- input */

  _bindInput() {
    const el = this.canvas;
    let dragging = false, lastX = 0, lastY = 0, lastT = 0;
    const pointers = new Map();
    let pinchDist = 0;

    const userTook = () => {
      this.tween = null;
      this._spin = null;
      if (this.follow) { this.follow = false; this.onUserInteract?.(); }
    };

    el.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 1) {
        dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
        this._spin = null;
        el.setPointerCapture(e.pointerId);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, [e.clientX, e.clientY]);

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchDist > 0) { userTook(); this._zoomBy((d - pinchDist) * 0.003); }
        pinchDist = d;
        return;
      }
      if (!dragging) return;
      userTook();
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 1 / 240);
      // fixed drag sensitivity: degrees per pixel dragged, independent of zoom
      const k = 0.28;
      const dLon = -(e.clientX - lastX) * k;
      const dLat = (e.clientY - lastY) * k;
      this.setRotation(this.lon0 + dLon, this.lat0 + dLat);
      // low-pass filtered velocity, for momentum on release — smoothed so a
      // single jittery final move (common right before pointerup) doesn't
      // launch the globe off in a direction the drag didn't actually go
      const vLon = dLon / dt, vLat = dLat / dt;
      this._dragVel = this._dragVel
        ? { lon: lerp(this._dragVel.lon, vLon, 0.5), lat: lerp(this._dragVel.lat, vLat, 0.5) }
        : { lon: vLon, lat: vLat };
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    });

    const release = (e) => {
      if (dragging && pointers.size === 1 && this._dragVel) {
        // flick to spin: only longitude carries momentum — a globe coasting
        // in latitude too reads as tumbling rather than turning
        const v = this._dragVel;
        if (Math.abs(v.lon) > 12) this._spin = { lon: v.lon };
      }
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) { dragging = false; this._dragVel = null; }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      userTook();
      this._zoomBy(-e.deltaY * 0.0006);
    }, { passive: false });
  }

  _zoomBy(delta) {
    this.zoomT = clamp(this.zoomT + delta, 0, 1);
  }

  _resize() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    this._applyInset();
    this.renderer.setSize(this.w, this.h, false);
  }

  /* ------------------------------------------------------- route + ship */

  setRoute(route) {
    this.clearRoute();
    this.route = route;
    if (!route) return;

    const n = route.lats.length;
    const points = new Array(n);
    for (let i = 0; i < n; i++) points[i] = unitVec(route.lats[i], route.lons[i]).multiplyScalar(R_SPHERE * 1.004);

    const flat = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { flat[i * 3] = points[i].x; flat[i * 3 + 1] = points[i].y; flat[i * 3 + 2] = points[i].z; }

    // Two lines sharing the same points, split at the ship by draw range —
    // cheap to advance (an integer, not a rebuild). The split snaps to the
    // nearest sampled point rather than the exact fraction between two: with
    // samples every ~1° or closer this is imperceptible on a sphere this
    // size, and it avoids inserting a vertex into the buffer every frame.
    const pastGeo = new THREE.BufferGeometry();
    pastGeo.setAttribute('position', new THREE.BufferAttribute(flat.slice(), 3));
    const futureGeo = new THREE.BufferGeometry();
    futureGeo.setAttribute('position', new THREE.BufferAttribute(flat.slice(), 3));
    futureGeo.computeBoundingSphere();

    this.pastLine = new THREE.Line(pastGeo,
      new THREE.LineBasicMaterial({ color: route.voyage.accent || C.brick500, transparent: true }));
    this.futureLine = new THREE.Line(futureGeo,
      new THREE.LineDashedMaterial({ color: C.ink900, dashSize: 2.2, gapSize: 1.8, transparent: true, opacity: 0.8 }));
    this.futureLine.computeLineDistances();
    this.routeGroup.add(this.pastLine, this.futureLine);
    this._lastCutIndex = -1;

    this.markerSprites = route.stops.map(() => null);
    this.townSprites = route.stops.map(() => null);
    this.shipSprite = null;
    this.wakeSprite = null;

    getSpriteTextures().then((tex) => this._buildActors(route, tex));

    this.setProgress(0);
  }

  _buildActors(route, tex) {
    if (this.route !== route) return; // superseded by a later setRoute() call

    const mkSprite = (map, world, tint) => {
      const mat = new THREE.SpriteMaterial({ map, transparent: true, depthTest: true, color: tint ?? 0xffffff });
      const s = new THREE.Sprite(mat);
      // These billboards sit under a rotating parent group and the ship's
      // mirror trick negates scale.x — both throw off the default bounding-
      // sphere frustum check for a handful of objects it isn't worth
      // debugging: skip it, there are at most a few dozen of these.
      s.frustumCulled = false;
      world.add(s);
      return s;
    };

    route.stops.forEach((stop, i) => {
      const pos = unitVec(stop.lat, stop.mapLon).multiplyScalar(R_SPHERE * 1.006);
      const town = mkSprite(tex.town, this.actorGroup);
      town.position.copy(pos);
      town.scale.setScalar(this._angularSize(TOWN_H * 2, 0.6));
      this.townSprites[i] = town;

      const g = new THREE.Group();
      g.position.copy(unitVec(stop.lat, stop.mapLon).multiplyScalar(R_SPHERE * 1.008));
      this.actorGroup.add(g);
      const pin = mkSprite(tex.pin, g);
      const cross = mkSprite(tex.x, g);
      const size = this._angularSize(PIN_H * 2, 1.4);
      pin.scale.setScalar(size);
      cross.scale.setScalar(size);
      cross.visible = false;
      this.markerSprites[i] = { group: g, pin, cross };
    });

    this.wakeSprite = mkSprite(tex.wake, this.actorGroup);
    this.wakeSprite.visible = false;
    this.shipSprite = mkSprite(tex.ship, this.actorGroup);

    this._drawActors();
  }

  /**
   * World-unit size for a sprite, from its raster half-height and a scale
   * factor. The flat map's sprites read clearly because that view is
   * orthographic and zoom-independent; on a perspective globe the same
   * "physical" size (arc length in world units) reads much smaller, since
   * the camera only ever sees a fraction of the sphere. SPRITE_BOOST is an
   * empirical legibility correction, tuned by eye against screenshots —
   * there is no formula that derives it, only "does it read at a glance".
   */
  _angularSize(rasterH, s) {
    const SPRITE_BOOST = 6;
    return (rasterH / (2 * PPD)) * R_SPHERE * D2R * s * SPRITE_BOOST;
  }

  clearRoute() {
    disposeGroup(this.routeGroup);
    disposeGroup(this.actorGroup);
    this.pastLine = this.futureLine = null;
    this.shipSprite = this.wakeSprite = null;
    this.markerSprites = this.townSprites = null;
    this.route = null;
  }

  /** Ship position and heading fraction at the current progress, in lat/lon. */
  _sampleAt(p) {
    const { tps, lats, lons } = this.route;
    let lo = 0, hi = tps.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tps[mid] < p) lo = mid + 1; else hi = mid;
    }
    const i1 = Math.max(1, lo);
    const i0 = i1 - 1;
    const t0 = tps[i0], t1 = tps[i1];
    const fr = t1 > t0 ? (p - t0) / (t1 - t0) : 0;
    const lat = lerp(lats[i0], lats[i1], fr);
    const lon = lerp(lons[i0], lons[i1], fr);
    const moving = this.route.cumKm[i1] - this.route.cumKm[i0] > 0.4 && t1 > t0;
    return { lat, lon, i0, i1, fr, moving };
  }

  setProgress(p) {
    this.progress = clamp(p, 0, 1);
    if (!this.route) return;
    this.shipSample = this._sampleAt(this.progress);

    if (this.markerSprites) {
      this.route.stops.forEach((stop, i) => {
        const m = this.markerSprites[i];
        if (!m) return;
        const reached = this.progress + 1e-6 >= stop.tp;
        const current = reached && this.progress < (this.route.stops[i + 1]?.tp ?? 2);
        m.pin.visible = !reached || current;
        m.cross.visible = reached;
        m.pin.material.opacity = reached && !current ? 0.3 : 1;
      });
    }
    this._drawActors();
  }

  _drawActors() {
    if (!this.route) return;
    const s = this.shipSample || this._sampleAt(this.progress);

    if (this.pastLine) {
      const cut = s.fr > 0.5 ? s.i1 : s.i0;
      if (cut !== this._lastCutIndex) {
        this._lastCutIndex = cut;
        this.pastLine.geometry.setDrawRange(0, cut + 1);
        this.futureLine.geometry.setDrawRange(cut, this.route.lats.length - cut);
      }
    }

    if (this.shipSprite) {
      const pos = unitVec(s.lat, s.lon).multiplyScalar(R_SPHERE * 1.01);
      this.shipSprite.position.copy(pos);
      this.shipSprite.scale.setScalar(this._angularSize(SHIP_H * 2, 1));

      const j = Math.min(s.i1 + 3, this.route.lats.length - 1);
      const ahead = unitVec(this.route.lats[j], this.route.lons[j]).multiplyScalar(R_SPHERE * 1.01);
      const [dx, dy] = this._screenDelta(pos, ahead);
      const flip = dx < 0 ? -1 : 1;
      const tilt = clamp(Math.atan2(dy, Math.abs(dx) || 1e-6), -18 * D2R, 18 * D2R);
      this.shipSprite.scale.x *= flip;
      this.shipSprite.material.rotation = -tilt * flip;

      if (this.wakeSprite) {
        this.wakeSprite.visible = s.moving;
        this.wakeSprite.position.copy(pos);
        this.wakeSprite.scale.copy(this.shipSprite.scale).divideScalar(flip);
        this.wakeSprite.material.rotation = this.shipSprite.material.rotation;
      }
    }
  }

  /**
   * Screen-pixel delta between two world points, for heading math. Relies on
   * world/camera matrices already being current for this frame (update()
   * refreshes them once, before any of this runs) — calling
   * updateMatrixWorld() here too used to mean a full scene-graph traversal
   * per sprite, per frame, on top of the one update() already did.
   */
  _screenDelta(a, b) {
    const pa = a.clone().applyMatrix4(this.world.matrixWorld).project(this.camera);
    const pb = b.clone().applyMatrix4(this.world.matrixWorld).project(this.camera);
    return [(pb.x - pa.x) * this.w / 2, -(pb.y - pa.y) * this.h / 2];
  }

  setRouteOpacity(v) {
    this.routeGroup.visible = this.actorGroup.visible = v > 0.01;
    if (this.pastLine) this.pastLine.material.opacity = v;
    if (this.futureLine) this.futureLine.material.opacity = v * 0.8;
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
      this.setRotation(lerp(tw.from.lon, tw.to.lon, e), lerp(tw.from.lat, tw.to.lat, e));
      this.zoomT = lerp(tw.from.t, tw.to.t, e);
      if (tw.t >= 1) this.tween = null;
    } else if (this.follow && this.shipSample) {
      // Gradual turn: the globe eases toward the ship rather than tracking
      // it, so following a voyage reads as the world slowly rolling under.
      const k = 1 - Math.exp(-(this.reducedMotion ? 14 : 0.9) * dt);
      let target = this.shipSample.lon;
      while (target - this.lon0 > 180) target -= 360;
      while (target - this.lon0 < -180) target += 360;
      this.setRotation(lerp(this.lon0, target, k), lerp(this.lat0, this.shipSample.lat, k));
    } else if (this._spin && !this.reducedMotion) {
      // Coasts after a flick, decaying exponentially — the drag itself
      // stops exactly where the pointer does, but a dead stop on release
      // is what made this feel stiff to turn; friction is tuned so a firm
      // flick glides for roughly a second, not a lazy Susan.
      const friction = 2.6;
      this.setRotation(this.lon0 + this._spin.lon * dt, this.lat0);
      this._spin.lon *= Math.exp(-friction * dt);
      if (Math.abs(this._spin.lon) < 2) this._spin = null;
    } else if (!this.route && !this.reducedMotion) {
      this.setRotation(this.lon0 + dt * 1.8, this.lat0);
    }

    worldQuaternion(this.lon0, this.lat0, this.world.quaternion);
    this.camera.position.set(0, 0, this.camDist);
    // Refreshed once here, not once per pin/sprite: this used to be the
    // single biggest cost on screens with many stops, since ui.js calls
    // project() per visible pin every frame and each call was re-walking
    // the whole scene graph on its own.
    this.world.updateMatrixWorld();
    this.camera.updateMatrixWorld();

    if (this.route) this._drawActors();

    if (this.shipSprite && !this.reducedMotion) {
      // bob along the point's own local "up" (its surface normal) — the
      // sphere has no single global up the way the flat map's screen-space
      // translateY did
      const normal = this.shipSprite.position.clone().normalize();
      const bob = Math.sin(this.time * 2.6) * 0.35;
      this._shipBase ??= this.shipSprite.position.clone();
      if (this.shipSample) this._shipBase.copy(unitVec(this.shipSample.lat, this.shipSample.lon)).multiplyScalar(R_SPHERE * 1.01);
      this.shipSprite.position.copy(this._shipBase).addScaledVector(normal, bob);
      if (this.wakeSprite) this.wakeSprite.position.copy(this.shipSprite.position);
    }

    this._renderFrame();
  }

  _renderFrame() {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Screen coordinates of a point, for the HTML pin labels. Called once per
   * visible stop, every frame — reads the matrices update() already
   * refreshed this frame rather than recomputing them itself.
   */
  project(lat, lon, out = {}) {
    const local = unitVec(lat, lon).multiplyScalar(R_SPHERE);
    const normal = local.clone().normalize();
    const world = local.applyMatrix4(this.world.matrixWorld);
    const ndc = world.project(this.camera);
    out.x = (ndc.x * 0.5 + 0.5) * this.w;
    out.y = (1 - (ndc.y * 0.5 + 0.5)) * this.h;
    // the camera sits fixed on the world's own +Z axis, so a point's local
    // (pre-rotation) normal dotted with +Z says whether it faces the camera
    out.visible = normal.z > 0.12 && ndc.z < 1
      && out.x > -40 && out.x < this.w + 40 && out.y > -40 && out.y < this.h + 40;
    return out;
  }

  mapLonFor(stop) { return stop.mapLon; }

  dispose() {
    window.removeEventListener('resize', this._resize);
    disposeGroup(this.routeGroup);
    disposeGroup(this.actorGroup);
    this.sphere.geometry.dispose();
    this.sphere.material.dispose();
    this.world.children.forEach((c) => { c.geometry?.dispose(); c.material?.dispose(); });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

/* ---------------------------------------------------------------- checks
 * Non-trivial trigonometry (worldQuaternion) gets one runnable check: after
 * rotating to centre on a handful of sample points, each must land on the
 * +Z axis at the sphere's radius. Run with `node --input-type=module -e
 * "import('./js/globe.js')"` or open the app with ?selftest=globe.
 * ------------------------------------------------------------------------- */
export function __selfTestWorldQuaternion() {
  const q = new THREE.Quaternion();
  const cases = [[0, 0], [40, -74], [-30, 160], [80, 10], [-70, -150]];
  for (const [lat, lon] of cases) {
    worldQuaternion(lon, lat, q);
    const p = unitVec(lat, lon).applyQuaternion(q);
    const ok = Math.abs(p.x) < 1e-9 && Math.abs(p.y) < 1e-9 && Math.abs(p.z - 1) < 1e-9;
    if (!ok) throw new Error(`worldQuaternion(${lon}, ${lat}) -> (${p.x}, ${p.y}, ${p.z}), expected (0, 0, 1)`);
  }
  return true;
}

if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('selftest') === 'globe') {
  console.log('globe self-test:', __selfTestWorldQuaternion() ? 'pass' : 'fail');
}
