/**
 * Relief and map decorations.
 *
 * As with the coastlines, this is an original and deliberately approximate
 * drawing: its job is to give the map the grain of a hand-drawn atlas, not to
 * be exact. Ranges are [lon, lat] polylines; the little symbols are scattered
 * along them with pseudorandom but deterministic variation.
 */

/** Mountain ranges: `h` is the relative height of the symbols. */
export const RANGES = [
  { name: 'Andes',                h: 1.00, points: [[-72, 9], [-75, 2], [-77, -6], [-73, -16], [-69, -24], [-70, -33], [-71, -41], [-73, -50]] },
  { name: 'Rocky Mountains',      h: 0.86, points: [[-128, 60], [-122, 53], [-117, 46], [-112, 41], [-107, 36]] },
  { name: 'Sierra Madre',         h: 0.70, points: [[-107, 27], [-103, 22], [-99, 19], [-96, 16]] },
  { name: 'Appalachians',         h: 0.52, points: [[-84, 34], [-80, 37], [-77, 40], [-72, 44]] },
  { name: 'Alaska',               h: 0.78, points: [[-152, 62], [-146, 62], [-140, 61]] },
  { name: 'Alps',                 h: 0.74, points: [[6, 45.8], [9, 46.5], [12, 47], [15, 47.2]] },
  { name: 'Pyrenees',             h: 0.58, points: [[-1.5, 42.9], [0.5, 42.7], [2, 42.4]] },
  { name: 'Carpathians',          h: 0.56, points: [[19, 49], [23, 48], [25, 45.5]] },
  { name: 'Scandinavia',          h: 0.62, points: [[6, 60], [11, 63], [15, 66], [19, 68.5]] },
  { name: 'Urals',                h: 0.54, points: [[59, 52], [59, 58], [62, 64], [66, 67]] },
  { name: 'Caucasus',             h: 0.72, points: [[40, 43.5], [43, 43], [47, 41.5]] },
  { name: 'Zagros',               h: 0.68, points: [[46, 34], [50, 31], [54, 28.5], [57, 27]] },
  { name: 'Himalaya',             h: 1.00, points: [[73, 35], [78, 33], [83, 30], [88, 28], [93, 28], [96, 29]] },
  { name: 'Tian Shan',            h: 0.80, points: [[72, 41], [78, 42], [84, 43], [89, 44]] },
  { name: 'Altai',                h: 0.72, points: [[86, 48], [91, 49.5], [96, 51]] },
  { name: 'Atlas',                h: 0.64, points: [[-8, 31], [-4, 32], [0, 34], [6, 36]] },
  { name: 'Ethiopian Highlands',  h: 0.66, points: [[36, 8], [38, 11], [39, 14]] },
  { name: 'Drakensberg',          h: 0.58, points: [[28, -30], [29.5, -28], [31, -25]] },
  { name: 'Great Dividing Range', h: 0.56, points: [[151, -33], [152, -28], [149, -23], [146, -19]] },
  { name: 'Southern Alps',        h: 0.66, points: [[167.5, -45], [169.5, -44], [172, -42.5]] },
  { name: 'Japan',                h: 0.60, points: [[136, 36], [138, 36.5], [140, 38]] },
  { name: 'Kamchatka',            h: 0.62, points: [[158, 53], [159, 56], [160, 58]] },
  { name: 'Sumatra',              h: 0.58, points: [[97, 3], [100, 0], [103, -3], [105, -5.5]] },
  { name: 'New Guinea',           h: 0.70, points: [[135, -4], [140, -5], [145, -6.5]] },
  { name: 'Kunlun',               h: 0.74, points: [[80, 36], [86, 36], [92, 35]] }
];

/** Wooded areas: [lon, lat, radius in degrees, density 0-1, type] */
export const FORESTS = [
  [-62, -4, 15, 1.00, 'palm'],    // Amazon
  [-72, -8, 7, 0.7, 'palm'],
  [22, 0, 11, 0.95, 'palm'],      // Congo basin
  [104, 3, 7, 0.9, 'palm'],       // South-East Asia
  [113, 0, 6, 0.8, 'palm'],       // Borneo
  [140, -5, 6, 0.8, 'palm'],      // New Guinea
  [-98, 55, 19, 0.85, 'conifer'], // Canadian taiga
  [-130, 55, 8, 0.7, 'conifer'],
  [60, 60, 20, 0.9, 'conifer'],   // West Siberian taiga
  [100, 60, 22, 0.9, 'conifer'],
  [15, 62, 9, 0.7, 'conifer'],    // Scandinavia
  [30, -5, 7, 0.6, 'palm'],       // East Africa
  [-50, -25, 8, 0.6, 'palm'],     // Atlantic forest
  [10, 48, 7, 0.55, 'conifer'],   // Central Europe
  [133, -25, 9, 0.35, 'palm'],    // Australian interior, sparse
  [78, 22, 9, 0.5, 'palm']        // central India
];

/**
 * Sea decorations, in the spirit of old charts.
 * type: 'serpent' | 'whale' | 'kraken'
 */
export const SEA_CREATURES = [
  { type: 'serpent', lon: -41, lat: 41, heading: 0.6, scale: 1.0 },
  { type: 'whale',   lon: -28, lat: -33, heading: -0.4, scale: 1.1 },
  { type: 'kraken',  lon: -150, lat: -22, heading: 0.2, scale: 1.0 },
  { type: 'serpent', lon: 72, lat: -28, heading: 2.4, scale: 0.9 },
  { type: 'whale',   lon: 165, lat: 24, heading: 1.2, scale: 0.95 },
  { type: 'serpent', lon: -155, lat: 38, heading: -1.1, scale: 0.85 }
];

/** Compass roses: a few, in open sea where they do not clash with the routes. */
export const COMPASS_ROSES = [
  { lon: -33, lat: 8, size: 13 },
  { lon: 88, lat: -32, size: 12 },
  { lon: -128, lat: 12, size: 12 }
];
