import { dayOf } from './format.js';

/* Route geometry. No external dependencies. */

export const EARTH_KM = 6371;
/** Pixels per degree of longitude in map space. */
export const PPD = 14;
/** Vertical squash: gives the map its 3/4 ground plane. */
export const Y_SQUASH = 0.88;
/** Width of one full turn, in map units. */
export const WORLD_W = 360 * PPD;

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------ projection */

export const projX = (lon) => lon * PPD;
export const projY = (lat) => -lat * PPD * Y_SQUASH;

/** lat/lon -> unit vector, for correct spherical maths. */
export function toVec(lat, lon) {
  const la = lat * D2R, lo = lon * D2R;
  const c = Math.cos(la);
  return [c * Math.cos(lo), Math.sin(la), c * Math.sin(lo)];
}

export function toLatLon(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return {
    lat: Math.asin(clamp(v[1] / n, -1, 1)) * R2D,
    lon: Math.atan2(v[2], v[0]) * R2D
  };
}

/** Great-circle distance, in km. */
export function arcKm(a, b) {
  const na = Math.hypot(a[0], a[1], a[2]) || 1;
  const nb = Math.hypot(b[0], b[1], b[2]) || 1;
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (na * nb);
  return Math.acos(clamp(dot, -1, 1)) * EARTH_KM;
}

/* -------------------------------------------------- spherical Catmull-Rom */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dist3 = (a, b) => Math.hypot(...sub(a, b));
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * Centripetal Catmull-Rom segment (Barry-Goldman).
 * Centripetal parameterisation avoids overshoot at the ends: without it the
 * route would leave port in the wrong direction before correcting.
 */
function crPoint(p0, p1, p2, p3, t) {
  const knot = (ti, a, b) => ti + Math.sqrt(dist3(a, b)) || ti + 1e-4;
  const t0 = 0;
  const t1 = knot(t0, p0, p1);
  const t2 = knot(t1, p1, p2);
  const t3 = knot(t2, p2, p3);
  if (t2 - t1 < 1e-9) return p1.slice();
  const tt = lerp(t1, t2, t);

  const safe = (a, b) => (Math.abs(b - a) < 1e-9 ? 1e-9 : b - a);
  const A1 = mix3(p0, p1, (tt - t0) / safe(t0, t1));
  const A2 = mix3(p1, p2, (tt - t1) / safe(t1, t2));
  const A3 = mix3(p2, p3, (tt - t2) / safe(t2, t3));
  const B1 = mix3(A1, A2, (tt - t0) / safe(t0, t2));
  const B2 = mix3(A2, A3, (tt - t1) / safe(t1, t3));
  return mix3(B1, B2, (tt - t1) / safe(t1, t2));
}

/** Samples a control polyline with a smooth curve on the sphere. */
function smoothChain(ctrl, samplesFor) {
  const p = ctrl.map(([la, lo]) => toVec(la, lo));
  if (p.length === 2) {
    // only two points: direct interpolation along the arc
    const n = samplesFor(arcAngleDeg(p[0], p[1]));
    const out = [];
    for (let i = 0; i <= n; i++) out.push(normalize(mix3(p[0], p[1], i / n)));
    return out;
  }
  const ext = [p[0], ...p, p[p.length - 1]];
  const out = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const seg = arcAngleDeg(ext[i], ext[i + 1]);
    const n = samplesFor(seg);
    for (let j = 0; j < n; j++) {
      out.push(normalize(crPoint(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], j / n)));
    }
  }
  out.push(normalize(p[p.length - 1]));
  return out;
}

function normalize(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function arcAngleDeg(a, b) {
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  return Math.acos(dot) * R2D;
}

/* -------------------------------------------------------- route model */

/**
 * Builds the sampled path of an expedition.
 *
 * Time is the driving parameter: `tp` is the fraction of the total voyage
 * duration. Stays in port are two overlapping samples with different `tp`, so
 * the ship holds still while the date moves on.
 *
 * Longitudes are "unwrapped": they rise or fall continuously even past ±180°,
 * so a circumnavigation stays a single line on the map.
 */
export function buildRoute(voyage) {
  const wps = voyage.waypoints;
  const arrive = wps.map((w) => dayOf(w.date));
  const depart = wps.map((w) => dayOf(w.departDate || w.date));
  const t0 = arrive[0];
  const tEnd = arrive[wps.length - 1];
  const span = Math.max(1, tEnd - t0);
  const norm = (d) => clamp((d - t0) / span, 0, 1);

  const lats = [];
  const lons = [];
  const tps = [];
  const legIndex = [];

  // unwrapped longitude: always take the shortest step
  let unwrapRef = wps[0].lon;
  const unwrap = (lon) => {
    let l = lon;
    while (l - unwrapRef > 180) l -= 360;
    while (l - unwrapRef < -180) l += 360;
    unwrapRef = l;
    return l;
  };

  const push = (lat, lon, tp, leg) => {
    lats.push(lat);
    lons.push(lon);
    tps.push(tp);
    legIndex.push(leg);
  };

  const stopLons = [unwrap(wps[0].lon)];
  push(wps[0].lat, stopLons[0], norm(arrive[0]), 0);

  for (let i = 0; i < wps.length - 1; i++) {
    const from = wps[i];
    const to = wps[i + 1];
    const ctrl = [[from.lat, stopLons[i]]];
    for (const [la, lo] of to.via || []) ctrl.push([la, unwrap(lo)]);
    const toLon = unwrap(to.lon);
    ctrl.push([to.lat, toLon]);
    stopLons.push(toLon);

    const tA = norm(depart[i]);
    const tB = norm(arrive[i + 1]);

    // spherical sampling ignores the unwrapping, so work on relative
    // longitudes and add the offset back afterwards
    const base = ctrl[0][1];
    const rel = ctrl.map(([la, lo]) => [la, lo - base]);
    const pts = smoothChain(rel, (deg) => Math.max(6, Math.min(160, Math.round(deg * 1.6))));

    if (pts.length <= 1) {
      push(to.lat, toLon, tB, i);
      continue;
    }

    // unwrap along the sampling too
    let ref = 0;
    for (let j = 1; j < pts.length; j++) {
      const { lat, lon } = toLatLon(pts[j]);
      let l = lon;
      while (l - ref > 180) l -= 360;
      while (l - ref < -180) l += 360;
      ref = l;
      push(lat, base + l, lerp(tA, tB, j / (pts.length - 1)), i);
    }
  }

  // cumulative distances, computed on the sphere
  const n = lats.length;
  const cumKm = new Float64Array(n);
  for (let j = 1; j < n; j++) {
    cumKm[j] = cumKm[j - 1] + arcKm(toVec(lats[j - 1], lons[j - 1]), toVec(lats[j], lons[j]));
  }

  const stops = wps.map((w, i) => ({
    index: i,
    tp: norm(arrive[i]),
    tpDepart: norm(depart[i]),
    arriveDay: arrive[i],
    departDay: depart[i],
    mapLon: stopLons[i],
    ...w
  }));

  return {
    voyage,
    lats,
    lons: Float64Array.from(lons),
    tps: Float64Array.from(tps),
    legIndex,
    cumKm,
    totalKm: cumKm[n - 1] || 0,
    stops,
    startDay: t0,
    endDay: tEnd,
    totalDays: span
  };
}

/** Index of the last stop reached at a given voyage fraction. */
export function stopIndexAt(route, progress) {
  let idx = 0;
  for (let i = 0; i < route.stops.length; i++) {
    if (progress + 1e-6 >= route.stops[i].tp) idx = i;
  }
  return idx;
}

export function dayAt(route, progress) {
  return route.startDay + progress * route.totalDays;
}

/** Kilometres covered and sailing state at a given fraction. */
export function sampleRoute(route, progress) {
  const { tps, cumKm } = route;
  const p = clamp(progress, 0, 1);
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
  const km = lerp(cumKm[i0], cumKm[i1], f);
  const moving = t1 > t0 && cumKm[i1] - cumKm[i0] > 0.5;
  return { km, moving, index: i0 };
}

export { formatDay, formatMonth, formatDurationDays, formatKm, dayOf } from './format.js';
