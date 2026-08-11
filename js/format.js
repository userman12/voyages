/** Formatting helpers — no dependencies. */

const DAY_MS = 86400000;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** ISO date -> days since epoch (projected calendar, see README). */
export function dayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS;
}

export function formatDay(day, { short = false } = {}) {
  const dt = new Date(Math.round(day) * DAY_MS);
  const m = MONTHS[dt.getUTCMonth()];
  if (short) return `${m.slice(0, 3)} ${dt.getUTCFullYear()}`;
  return `${dt.getUTCDate()} ${m} ${dt.getUTCFullYear()}`;
}

export function formatMonth(day) {
  const dt = new Date(Math.round(day) * DAY_MS);
  return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export function formatDurationDays(days) {
  const y = Math.floor(days / 365.25);
  const rest = Math.round(days - y * 365.25);
  const mo = Math.floor(rest / 30.44);
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (mo) parts.push(`${mo} ${mo === 1 ? 'month' : 'months'}`);
  if (!parts.length) parts.push(`${Math.round(days)} days`);
  return parts.join(' and ');
}

export function formatKm(km) {
  return Math.round(km).toLocaleString('en-GB');
}
