// LaSER brand palette (from the designer's PDF spec + reference SVGs).
// Colours are tied to countries, not to series order.
export const MAGENTA = '#E6007E'; // C0 M100 Y0 K0
export const GRID = '#B3B3B3';    // K30
export const LABEL = '#808080';   // K50
export const DARK = '#575756';
export const LIGHT_PINK = '#F29FC5'; // shortcut: LaSER to confirm vs #F088B6, then lock
export const OTHER = '#C6C6C6';
export const BAND = '#F2F2F2';
export const BLACK = '#1D1D1B';

const COUNTRY = [
  [/^(latvija|latvia|lv)$/i, MAGENTA],
  [/^(igaunija|estonia|ee)$/i, LIGHT_PINK],
  [/^(lietuva|lithuania|lt)$/i, DARK],
  [/^(eu|es|es-27|eu-27|vidēji es(-27)?|es vidēji)$/i, BLACK],
  [/^(pārējās|pārējie|citas|citi|other|others)$/i, GRID],
];

// Fallback order for series that are not countries.
export const SERIES_ORDER = [MAGENTA, DARK, LIGHT_PINK, '#9D9D9C', GRID];

// Swatches offered in the editor (no free hex picker: stay on brand).
export const SWATCHES = [MAGENTA, LIGHT_PINK, DARK, '#9D9D9C', GRID, OTHER, BLACK];

export function countryColor(name) {
  const key = String(name ?? '').trim();
  return COUNTRY.find(([re]) => re.test(key))?.[1] ?? null;
}

/** Colour for series i. Explicit override > country match > next unused fallback. */
export function seriesColors(names, overrides = {}) {
  const used = new Set();
  const out = names.map(n => overrides[n] ?? countryColor(n));
  out.forEach(c => c && used.add(c));
  const free = SERIES_ORDER.filter(c => !used.has(c));
  let k = 0;
  return out.map(c => c ?? free[k++ % Math.max(free.length, 1)] ?? MAGENTA);
}

// Exact tints used by the designer (the generic mix is off by one step for these).
const DESIGNER_TINTS = { [`${MAGENTA}@0.1`]: '#FCE5F1' };

/** Mix a hex colour with white (amount 0..1 of the colour). */
export function tint(hex, amount) {
  const exact = DESIGNER_TINTS[`${hex.toUpperCase()}@${amount}`];
  if (exact) return exact;
  const n = parseInt(hex.slice(1), 16);
  const ch = s => Math.round(255 - (255 - ((n >> s) & 255)) * amount);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('').toUpperCase();
}
