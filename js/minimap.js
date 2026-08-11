import { LAND, ISLES } from '../data/landmasses.js';

/**
 * Route previews for the chooser cards.
 * Simple equirectangular projection onto a 360×180 box.
 */

const X = (lon) => (lon + 180).toFixed(1);
const Y = (lat) => (90 - lat).toFixed(1);

function polyPath(poly) {
  let d = `M${X(poly[0][0])} ${Y(poly[0][1])}`;
  for (let i = 1; i < poly.length; i++) d += `L${X(poly[i][0])} ${Y(poly[i][1])}`;
  return d + 'Z';
}

let worldCache = null;

/** World silhouette, computed once and reused by every card. */
export function worldPath() {
  if (worldCache) return worldCache;
  worldCache = [...LAND, ...ISLES].map(polyPath).join('');
  return worldCache;
}

/** Expedition track, cut where it crosses the antimeridian. */
export function routePath(voyage) {
  const pts = [];
  for (const w of voyage.waypoints) {
    if (w.via) for (const [la, lo] of w.via) pts.push([lo, la]);
    pts.push([w.lon, w.lat]);
  }

  let d = '';
  let prev = null;
  for (const [lon, lat] of pts) {
    // a longitude jump beyond 180° is the seam, not real movement
    if (prev && Math.abs(lon - prev[0]) > 180) prev = null;
    d += `${prev ? 'L' : 'M'}${X(lon)} ${Y(lat)}`;
    prev = [lon, lat];
  }
  return d;
}

/** Start and end points, for the dots on the preview. */
export function routeEnds(voyage) {
  const wps = voyage.waypoints;
  const a = wps[0];
  const b = wps[wps.length - 1];
  return { start: [X(a.lon), Y(a.lat)], end: [X(b.lon), Y(b.lat)] };
}
