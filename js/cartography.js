import { LAND, SEAS, ISLES, DOTS } from '../data/landmasses.js';
import { RANGES, FORESTS, SEA_CREATURES, COMPASS_ROSES } from '../data/relief.js';
import { projX, projY, PPD } from './geo.js';

/**
 * Drawing the map: all vector, all generated here.
 * No external assets, no raster textures.
 * Values follow STYLE-GUIDE.md — palette, stroke weights and lighting rules.
 */

export const C = {
  paper100: '#F4E9D2',
  paper200: '#E8D8B4',
  paper300: '#D3BC91',
  ochre400: '#C89A54',
  ochre600: '#A2703A',
  sea900: '#0E3A47',
  sea700: '#17505F',
  sea500: '#2C8790',
  sea300: '#5AB2AC',
  brick500: '#B3462F',
  brick700: '#8A3221',
  gold500: '#D9A441',
  gold300: '#F0C87A',
  ink900: '#2B1F14',
  ink600: '#5A4632'
};

const D2R = Math.PI / 180;
const f = (n) => (Math.round(n * 100) / 100).toString();

/** Deterministic PRNG: the map is identical on every load. */
function rng(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------- land or sea */

function inPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const inAny = (lon, lat, set) => set.some((p) => inPoly(lon, lat, p));
const inDot = (lon, lat) => DOTS.some(([dl, da, r]) =>
  ((lon - dl) / r) ** 2 + ((lat - da) / r) ** 2 <= 1);

/** True if the coordinate falls on dry land. */
export function isLand(lon, lat) {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (inDot(l, lat)) return true;
  if (inAny(l, lat, ISLES)) return true;
  return inAny(l, lat, LAND) && !inAny(l, lat, SEAS);
}

/** Approximate distance from the coast, in degrees: samples in growing rings. */
export function coastGap(lon, lat, max = 6) {
  if (isLand(lon, lat)) return 0;
  const cs = Math.max(Math.cos(lat * D2R), 0.2);
  for (let r = 1; r <= max; r++) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (isLand(lon + (Math.cos(a) * r) / cs, lat + Math.sin(a) * r)) return r;
    }
  }
  return max + 1;
}

/* ---------------------------------------------------------------- paths */

/** lat/lon polygon -> SVG path, with a tile offset in degrees. */
function polyPath(poly, offset) {
  let d = '';
  for (let i = 0; i < poly.length; i++) {
    const x = projX(poly[i][0] + offset);
    const y = projY(poly[i][1]);
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
}

function dotsPath(offset) {
  let d = '';
  for (const [lon, lat, r] of DOTS) {
    const cx = projX(lon + offset);
    const cy = projY(lat);
    const rx = Math.max(r * PPD, 3);
    const ry = Math.max(r * PPD * 0.88, 3);
    // ellipse as two arcs, so it stays within a single path
    d += `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0`
       + `a${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0Z`;
  }
  return d;
}

const landPath = (o) => LAND.map((p) => polyPath(p, o)).join('');

/**
 * Land outline excluding the vertical sides of the polar caps.
 * A polygon touching the pole closes along the ±180 meridians: that side is
 * not a coastline, and it is exactly where two tiles meet, so drawing it
 * would produce a vertical seam across the middle of the map.
 */
function landOutline(o) {
  return LAND.map((poly) => {
    const isCap = poly.some(([, lat]) => lat <= -89 || lat >= 89);
    if (!isCap) return polyPath(poly, o);
    const coast = poly.filter(([, lat]) => lat > -89 && lat < 89);
    if (coast.length < 2) return '';
    return coast.map(([lon, lat], i) =>
      `${i ? 'L' : 'M'}${f(projX(lon + o))} ${f(projY(lat))}`).join('');
  }).join('');
}
const seaPath = (o) => SEAS.map((p) => polyPath(p, o)).join('');
const islePath = (o) => ISLES.map((p) => polyPath(p, o)).join('') + dotsPath(o);

/* ------------------------------------------------------------- symbols */

/**
 * Relief in 3/4: left face lit, right face shaded, light from upper-left.
 * Anchored bottom-centre, per the style guide.
 */
function mountainSymbol(id, w, h, snow) {
  const ridge = w * 0.14;
  return `
  <symbol id="${id}" overflow="visible">
    <path d="M${-w} 0 Q${-w * 0.5} ${-h * 0.45} 0 ${-h} L${ridge} 0 Z"
          fill="${C.ochre400}"/>
    <path d="M${ridge} 0 L0 ${-h} Q${w * 0.55} ${-h * 0.42} ${w} 0 Z"
          fill="${C.ochre600}"/>
    <path d="M${-w} 0 Q${-w * 0.5} ${-h * 0.45} 0 ${-h} L${ridge} 0 Z"
          fill="${C.paper100}" opacity=".28"/>
    ${snow ? `<path d="M${-w * 0.3} ${-h * 0.66} Q${-w * 0.1} ${-h * 0.82} 0 ${-h}
          Q${w * 0.14} ${-h * 0.8} ${w * 0.31} ${-h * 0.64}
          Q${w * 0.16} ${-h * 0.72} ${w * 0.05} ${-h * 0.62}
          Q${-w * 0.12} ${-h * 0.74} ${-w * 0.3} ${-h * 0.66} Z"
          fill="${C.paper100}"/>` : ''}
    <path d="M${-w} 0 Q${-w * 0.5} ${-h * 0.45} 0 ${-h} Q${w * 0.55} ${-h * 0.42} ${w} 0"
          fill="none" stroke="${C.ink900}" stroke-width="1.6"
          stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M0 ${-h} L${ridge} 0" fill="none" stroke="${C.ink900}"
          stroke-width="1" opacity=".5"/>
  </symbol>`;
}

function treeSymbols() {
  return `
  <symbol id="sym-conifer" overflow="visible">
    <path d="M-0.9 0 L-0.9 -3 L0.9 -3 L0.9 0 Z" fill="${C.ochre600}"/>
    <path d="M0 -15 Q4.6 -8 6 -2.6 Q3 -3.6 0 -3.4 Q-3 -3.6 -6 -2.6 Q-4.6 -8 0 -15 Z"
          fill="${C.ochre400}" stroke="${C.ink900}" stroke-width="1.3"
          stroke-linejoin="round"/>
    <path d="M0 -15 Q4.6 -8 6 -2.6 Q3 -3.6 0 -3.4 Z" fill="${C.ink900}" opacity=".16"/>
  </symbol>
  <symbol id="sym-palm" overflow="visible">
    <path d="M0 0 Q1.4 -6 0.4 -11" fill="none" stroke="${C.ink900}"
          stroke-width="1.6" stroke-linecap="round"/>
    <g fill="${C.ochre400}" stroke="${C.ink900}" stroke-width="1.1" stroke-linejoin="round">
      <path d="M0.4 -11 Q-5 -14 -7.6 -10.4 Q-3.6 -11.6 0.4 -11 Z"/>
      <path d="M0.4 -11 Q5.6 -14.4 8 -10.6 Q4 -11.8 0.4 -11 Z"/>
      <path d="M0.4 -11 Q-2.4 -16.4 -6 -16.6 Q-2 -14.6 0.4 -11 Z"/>
      <path d="M0.4 -11 Q3.4 -16.6 7 -16.4 Q3 -14.4 0.4 -11 Z"/>
    </g>
  </symbol>`;
}

/** Port town: facades in elevation, roofs in 3/4. */
function townSymbol() {
  return `
  <symbol id="sym-town" overflow="visible">
    <g stroke="${C.ink900}" stroke-width="1.5" stroke-linejoin="round">
      <path d="M-13 0 L-13 -8 L-4 -8 L-4 0 Z" fill="${C.paper200}"/>
      <path d="M-13 -8 L-8.5 -12.5 L0.5 -12.5 L-4 -8 Z" fill="${C.brick500}"/>
      <path d="M-4 -8 L-4 -12.5 L0.5 -12.5" fill="none" opacity=".55"/>
      <path d="M2 0 L2 -13 L10 -13 L10 0 Z" fill="${C.paper200}"/>
      <path d="M2 -13 L6 -17 L14 -17 L10 -13 Z" fill="${C.brick500}"/>
      <path d="M10 -13 L10 -17 L14 -17" fill="none" opacity=".55"/>
      <path d="M-6.5 -18 L-6.5 -8" stroke-width="1.2"/>
    </g>
    <path d="M-6.5 -18 L-1.5 -16.6 L-6.5 -15.2 Z" fill="${C.gold500}"
          stroke="${C.ink900}" stroke-width="1"/>
  </symbol>`;
}

function creatureSymbols() {
  return `
  <symbol id="sym-serpent" overflow="visible">
    <g fill="${C.ink600}" stroke="${C.ink900}" stroke-width="1.6" stroke-linejoin="round">
      <path d="M-34 0 Q-27 -12 -20 0 Z"/>
      <path d="M-14 0 Q-8 -10 -2 0 Z"/>
      <path d="M4 0 Q9 -8 14 0 Z"/>
      <path d="M20 0 Q24 -18 33 -20 Q28 -13 28 -4 Q28 -1 26 0 Z"/>
      <path d="M33 -20 Q40 -23 41 -17 Q36 -15 32 -16 Z"/>
    </g>
    <circle cx="36.5" cy="-19.5" r="1.3" fill="${C.paper100}"/>
  </symbol>
  <symbol id="sym-whale" overflow="visible">
    <g fill="${C.ink600}" stroke="${C.ink900}" stroke-width="1.6" stroke-linejoin="round">
      <path d="M-26 0 Q-22 -13 -6 -14 Q12 -15 22 -4 Q14 0 -26 0 Z"/>
      <path d="M22 -4 Q31 -13 34 -6 Q30 -4 27 -1 Q31 2 33 6 Q28 8 22 -1 Z"/>
    </g>
    <path d="M-8 -14 Q-9 -24 -3 -28 Q-7 -22 -5 -14" fill="none"
          stroke="${C.ink900}" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="-16" cy="-8" r="1.4" fill="${C.paper100}"/>
  </symbol>
  <symbol id="sym-kraken" overflow="visible">
    <g fill="none" stroke="${C.ink900}" stroke-width="2.4" stroke-linecap="round">
      <path d="M-30 0 Q-26 -16 -34 -24"/>
      <path d="M-14 0 Q-12 -22 -20 -32"/>
      <path d="M2 0 Q4 -24 -2 -34"/>
      <path d="M16 0 Q20 -20 30 -26"/>
      <path d="M28 0 Q34 -10 44 -12"/>
    </g>
    <path d="M-22 0 Q-14 -14 0 -14 Q14 -14 20 0 Z" fill="${C.ink600}"
          stroke="${C.ink900}" stroke-width="1.8" stroke-linejoin="round"/>
    <circle cx="-7" cy="-7" r="1.6" fill="${C.paper100}"/>
    <circle cx="6" cy="-7" r="1.6" fill="${C.paper100}"/>
  </symbol>`;
}

function compassSymbol() {
  const pts = (n, len, wide) => {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const b = a + Math.PI / n;
      const c = a - Math.PI / n;
      d += `M0 0 L${f(Math.cos(c) * wide)} ${f(Math.sin(c) * wide)} `
         + `L${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)} `
         + `L${f(Math.cos(b) * wide)} ${f(Math.sin(b) * wide)} Z`;
    }
    return d;
  };
  return `
  <symbol id="sym-compass" overflow="visible">
    <g stroke="${C.ink900}" stroke-width="1.2" fill="none" opacity=".85">
      <circle r="46"/><circle r="39"/><circle r="21"/>
    </g>
    <path d="${pts(8, 34, 7)}" fill="${C.paper200}" stroke="${C.ink900}" stroke-width="1.2"/>
    <path d="${pts(4, 46, 9)}" fill="${C.gold500}" stroke="${C.ink900}" stroke-width="1.4"/>
    <path d="M0 0 L-6.4 -14 L0 -46 Z" fill="${C.brick500}"/>
    <circle r="3.4" fill="${C.ink900}"/>
    <text x="0" y="-52" text-anchor="middle" font-size="13" font-weight="600"
          font-family="var(--font-sans)" fill="${C.ink900}">N</text>
  </symbol>`;
}

/** Wave mark: two soft arcs, the vocabulary of the sea. */
function waveSymbol() {
  return `
  <symbol id="sym-wave" overflow="visible">
    <path d="M-11 0 Q-5.5 -5 0 0 T11 0" fill="none" stroke="${C.sea300}"
          stroke-width="2" stroke-linecap="round" opacity=".55"/>
  </symbol>
  <symbol id="sym-wave2" overflow="visible">
    <path d="M-9 0 Q-4.5 -4.4 0 0 T9 0" fill="none" stroke="${C.sea300}"
          stroke-width="1.8" stroke-linecap="round" opacity=".5"/>
    <path d="M-5 6 Q-1.6 2.6 2 6" fill="none" stroke="${C.sea300}"
          stroke-width="1.6" stroke-linecap="round" opacity=".38"/>
  </symbol>`;
}

/** Caravel in 3/4, facing right. Anchored at the waterline. */
export function shipMarkup() {
  return `
  <g id="ship-art">
    <ellipse cx="2" cy="3" rx="26" ry="5" fill="${C.ink900}" opacity=".14"/>
    <g stroke="${C.ink900}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
      <path d="M-24 -4 Q-26 -12 -20 -13 L-19 -6 Z" fill="${C.ochre600}"/>
      <path d="M-24 -4 L23 -5 Q27 -5 26 -1 Q22 7 12 8 L-10 8 Q-19 7 -22 1 Z"
            fill="${C.ochre400}"/>
      <path d="M-24 -4 L23 -5 Q27 -5 26 -1 L-23 0 Z" fill="${C.paper200}"/>
      <path d="M26 -1 Q22 7 12 8 L20 1 Z" fill="${C.ink900}" opacity=".18" stroke="none"/>
    </g>
    <g stroke="${C.ink900}" stroke-width="1.8" stroke-linecap="round">
      <path d="M-8 -5 L-8 -34"/>
      <path d="M9 -5 L9 -27"/>
      <path d="M23 -5 L34 -11" stroke-width="1.5"/>
    </g>
    <g stroke="${C.ink900}" stroke-width="1.8" stroke-linejoin="round">
      <path d="M-8 -32 Q7 -28 6 -19 Q-2 -22 -8 -21 Z" fill="${C.paper100}"/>
      <path d="M-8 -19 Q9 -15 8 -6 Q-2 -9 -8 -8 Z" fill="${C.paper100}"/>
      <path d="M9 -25 Q20 -21 19 -14 Q13 -16 9 -15 Z" fill="${C.paper200}"/>
    </g>
    <path d="M-8 -32 Q0 -30 3 -25 Q-3 -25 -8 -24 Z" fill="${C.ink900}" opacity=".08"/>
    <path d="M-8 -34 L-1 -32 L-8 -30 Z" fill="${C.brick500}"
          stroke="${C.ink900}" stroke-width="1.2" stroke-linejoin="round"/>
  </g>`;
}

/* --------------------------------------------------------------- defs */

export function buildDefs() {
  return `
  <defs>
    <filter id="paper" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0" result="g"/>
      <feComponentTransfer in="g" result="t">
        <feFuncA type="linear" slope="0.07"/>
      </feComponentTransfer>
      <feComposite in="t" in2="SourceGraphic" operator="atop"/>
    </filter>

    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>

    ${mountainSymbol('sym-mtn-a', 17, 30, false)}
    ${mountainSymbol('sym-mtn-b', 13, 21, false)}
    ${mountainSymbol('sym-mtn-c', 21, 40, true)}
    ${mountainSymbol('sym-mtn-d', 15, 26, true)}
    ${treeSymbols()}
    ${townSymbol()}
    ${creatureSymbols()}
    ${compassSymbol()}
    ${waveSymbol()}

    <symbol id="sym-pin" overflow="visible">
      <circle r="9" fill="${C.paper100}" stroke="${C.ink900}" stroke-width="2.4"/>
      <circle r="3.4" fill="${C.ink600}"/>
    </symbol>
    <symbol id="sym-x" overflow="visible">
      <path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="${C.brick700}" stroke-width="6.5"
            stroke-linecap="round"/>
      <path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="${C.brick500}" stroke-width="3.6"
            stroke-linecap="round"/>
    </symbol>
  </defs>`;
}

/* -------------------------------------------------------- strati mappa */

/**
 * Land for one tile: coastal halo, shadow slab, fill, outline.
 * The halo is drawn underneath and the land covers half of it, leaving the
 * bands parallel to the shore — the mark that makes an old chart recognisable.
 */
export function landLayer(offset) {
  const land = landPath(offset);
  const isles = ISLES.map((p) => polyPath(p, offset)).join('');
  const dots = dotsPath(offset);
  const seas = seaPath(offset);
  const outer = land + isles + dots;
  const outline = landOutline(offset) + isles + dots;

  // The halo must be proportional to the landmass: a continental halo on a
  // small island would turn it into a set of concentric targets.
  const halo = (d, scale, dashed, bands) => (bands || [
    [31, C.sea700, 0.5, dashed ? '9 8' : null],
    [23, C.sea700, 1, null],
    [15, C.sea500, 1, null],
    [8, C.sea300, 0.85, null]
  ]).map(([w, col, op, dash]) => `<path d="${d}" fill="none" stroke="${col}"
      stroke-width="${f(w * scale)}" stroke-linejoin="round" opacity="${op}"
      ${dash ? `stroke-dasharray="${dash}"` : ''}/>`).join('');

  return `
  <g class="layer-land">
    ${halo(landOutline(offset), 1, true)}
    ${halo(isles, 0.45, false)}
    ${halo(dots, 1, false, [[13, C.sea700, 1, null], [7, C.sea500, 0.9, null]])}
    <g transform="translate(0 9)" opacity=".2">
      <path d="${outer}" fill="${C.ink900}"/>
    </g>
    <path d="${outer}" fill="${C.paper200}"/>
    <path d="${outline}" fill="none" stroke="${C.paper300}" stroke-width="7"
          stroke-linejoin="round" opacity=".75"/>
    <path d="${outer}" fill="${C.paper200}"/>
    <clipPath id="clip-seas-${offset}"><path d="${seas}"/></clipPath>
    <g clip-path="url(#clip-seas-${offset})">
      <path d="${seas}" fill="${C.sea500}"/>
      <path d="${seas}" fill="none" stroke="${C.sea300}" stroke-width="14" opacity=".7"/>
    </g>
    <path d="${outline}" fill="none" stroke="${C.ink900}" stroke-width="2.4"
          stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${seas}" fill="none" stroke="${C.ink900}" stroke-width="1.8"
          stroke-linejoin="round"/>
  </g>`;
}

/** Relief, vegetation, towns, sea monsters and compass roses for one tile. */
export function decorLayer(offset) {
  const rnd = rng(1492 + offset);
  const out = [];
  const at = (lon, lat, sym, s = 1, extra = '') =>
    `<use href="#${sym}" x="${f(projX(lon + offset))}" y="${f(projY(lat))}"
       transform-origin="${f(projX(lon + offset))} ${f(projY(lat))}"
       ${s !== 1 ? `transform="scale(${f(s)})"` : ''} ${extra}/>`;

  // --- waves, offshore only
  const waves = [];
  for (let lat = -76; lat <= 78; lat += 4.4) {
    const cs = Math.max(Math.cos(lat * D2R), 0.3);
    const step = 4.4 / cs;
    for (let lon = -180; lon < 180; lon += step) {
      const jLat = lat + (rnd() - 0.5) * 3.4;
      const jLon = lon + (rnd() - 0.5) * step * 0.8;
      const keep = rnd();
      const s = 0.75 + rnd() * 0.5;
      const alt = rnd() < 0.42;
      if (keep < 0.34) continue;
      if (coastGap(jLon, jLat, 3) <= 2) continue;
      waves.push(at(jLon, jLat, alt ? 'sym-wave2' : 'sym-wave', s));
    }
  }
  out.push(`<g class="layer-waves">${waves.join('')}</g>`);

  // --- relief along the ranges
  const mtn = [];
  for (const range of RANGES) {
    const pts = range.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [lo0, la0] = pts[i];
      const [lo1, la1] = pts[i + 1];
      const seg = Math.hypot(lo1 - lo0, la1 - la0);
      const n = Math.max(2, Math.round(seg * 0.75));
      for (let j = 0; j < n; j++) {
        const t = (j + rnd() * 0.8) / n;
        const lon = lo0 + (lo1 - lo0) * t + (rnd() - 0.5) * 3.2;
        const lat = la0 + (la1 - la0) * t + (rnd() - 0.5) * 2.4;
        const r = rnd();
        if (!isLand(lon, lat)) continue;
        const high = range.h > 0.75 || Math.abs(lat) > 48;
        const sym = high
          ? (r < 0.55 ? 'sym-mtn-c' : 'sym-mtn-d')
          : (r < 0.5 ? 'sym-mtn-a' : 'sym-mtn-b');
        mtn.push({ lat, el: at(lon, lat, sym, 0.7 + range.h * 0.5) });
      }
    }
  }
  // sorted north to south: what lies lower overlaps what lies higher
  mtn.sort((a, b) => b.lat - a.lat);
  out.push(`<g class="layer-relief">${mtn.map((m) => m.el).join('')}</g>`);

  // --- vegetation
  const trees = [];
  for (const [lon0, lat0, radius, density, type] of FORESTS) {
    const attempts = Math.round(radius * radius * 0.9 * density);
    for (let i = 0; i < attempts; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * radius;
      const lat = lat0 + Math.sin(a) * r;
      const cs = Math.max(Math.cos(lat * D2R), 0.2);
      const lon = lon0 + (Math.cos(a) * r) / cs;
      const s = 0.75 + rnd() * 0.5;
      if (!isLand(lon, lat)) continue;
      trees.push({ lat, el: at(lon, lat, type === 'conifer' ? 'sym-conifer' : 'sym-palm', s) });
    }
  }
  trees.sort((a, b) => b.lat - a.lat);
  out.push(`<g class="layer-trees">${trees.map((t) => t.el).join('')}</g>`);

  // --- sea decorations
  const decor = SEA_CREATURES.map((c) => {
    const sym = c.type === 'serpent' ? 'sym-serpent' : c.type === 'whale' ? 'sym-whale' : 'sym-kraken';
    return at(c.lon, c.lat, sym, c.scale * 1.5, 'opacity=".62"');
  }).join('');
  const roses = COMPASS_ROSES.map((c) =>
    at(c.lon, c.lat, 'sym-compass', c.size / 12, 'opacity=".5"')).join('');
  out.push(`<g class="layer-decor">${decor}${roses}</g>`);

  return out.join('');
}

/** Port towns at the expedition's stops. */
export function townsLayer(route) {
  return route.stops
    .filter((s) => !s.via || true)
    .map((s) => `<use href="#sym-town" x="${f(projX(s.mapLon))}" y="${f(projY(s.lat))}"
        transform-origin="${f(projX(s.mapLon))} ${f(projY(s.lat))}"
        transform="scale(0.6)" opacity=".95"/>`)
    .join('');
}

/** Backdrop: colour field and broad current zones. */
export function seaBackdrop(x, y, w, h) {
  return `
  <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${C.sea900}"/>
  <g opacity=".5" filter="url(#soft)">
    <ellipse cx="${f(x + w * 0.3)}" cy="${f(y + h * 0.35)}" rx="${f(w * 0.28)}" ry="${f(h * 0.2)}" fill="${C.sea700}"/>
    <ellipse cx="${f(x + w * 0.72)}" cy="${f(y + h * 0.6)}" rx="${f(w * 0.3)}" ry="${f(h * 0.22)}" fill="${C.sea700}"/>
    <ellipse cx="${f(x + w * 0.5)}" cy="${f(y + h * 0.85)}" rx="${f(w * 0.35)}" ry="${f(h * 0.16)}" fill="${C.sea700}"/>
  </g>`;
}
