// Number and label formatting (Latvian conventions: decimal comma, space thousands).
const nf = new Map();

export function formatNumber(n, decimals = 0) {
  if (n == null || Number.isNaN(n)) return '';
  if (!nf.has(decimals)) {
    nf.set(decimals, new Intl.NumberFormat('lv-LV', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  }
  return nf.get(decimals).format(n);
}

/** Decimals needed to print ticks with this step (0.2 → 1, 5 → 0). */
export function decimalsForStep(step) {
  if (!step || step >= 1) return 0;
  return Math.min(3, Math.ceil(-Math.log10(step) - 1e-9));
}

/** Decimals for value labels: 0 if all integers, else 1. */
export function autoDecimals(values) {
  return values.every(v => v == null || Number.isInteger(v)) ? 0 : 1;
}

export const isYearLabel = s => /^\d{4}$/.test(String(s));

/**
 * Category label. Years in 'short' format: first and last in full, the rest 2 digits (2016 17 … 2026).
 * 'full': always as written.
 */
export function formatCategory(label, index, total, yearFormat = 'short') {
  const s = String(label);
  if (yearFormat !== 'short' || !isYearLabel(s) || total <= 2 || index === 0 || index === total - 1) return s;
  return s.slice(-2);
}

/** Indexes of category labels to show on a dense axis: every k-th, always first and last. */
export function thinLabels(total, maxLabels = 14) {
  if (total <= maxLabels) return Array.from({ length: total }, (_, i) => i);
  const k = Math.ceil((total - 1) / (maxLabels - 1));
  const idx = [];
  for (let i = 0; i < total - 1; i += k) idx.push(i);
  if (total - 1 - idx.at(-1) < k / 2) idx.pop(); // avoid crowding the last label
  idx.push(total - 1);
  return idx;
}
