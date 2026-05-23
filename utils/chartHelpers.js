/**
 * Year label rule: first and last year in full 4-digit form, all middle years as 2-digit.
 * For ≤2 years, all labels are 4-digit (every year is first or last).
 */
export function formatYearLabel(year, index, total) {
  if (total <= 2 || index === 0 || index === total - 1) return String(year);
  return String(year).slice(-2);
}
