// 16px stroke icons for chart types (decorative: always paired with a text label).
const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true };

export function ChartIcon({ type, horizontal }) {
  if (type === 'line') return <svg {...base}><path d="M2 12l4-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === 'dot') {
    return (
      <svg {...base}>
        <path d="M2 8h12" opacity=".35" />
        <circle cx="4" cy="8" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="8" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (horizontal) return <svg {...base}><path d="M2 4h9M2 8h12M2 12h6" strokeLinecap="round" /></svg>;
  return <svg {...base}><path d="M4 14V8M8 14V3M12 14V6" strokeLinecap="round" /></svg>;
}
