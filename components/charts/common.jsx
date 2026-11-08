// Shared constants and pieces for all chart renderers. Units: 1 SVG user unit = 1 mm.
import { LABEL } from '@/lib/palette';

export const rnd = n => Math.round(n * 1000) / 1000;
export const PT = 25.4 / 72;
export const FONT = rnd(7 * PT);          // 7pt → 2.469mm
export const STROKE = rnd(0.25 * PT);     // 0.25pt grid → 0.088mm
export const LINE_1 = rnd(1 * PT);        // single line 1pt
export const LINE_MULTI = rnd(0.5 * PT);  // multi-line 0.5pt
export const LEGEND_DOT_R = 1;            // 2.83pt
export const LEGEND_H = 5;

export const FONT_PROPS = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: FONT,
  fill: LABEL,
};

// Montserrat Regular average advance widths (em). Good enough for layout; text stays editable.
const WIDE = /[MWmw@%]/;
const NARROW = /[il.,:;'|!1 ]/;
export function textWidth(s, size = FONT) {
  let em = 0;
  for (const ch of String(s)) {
    if (NARROW.test(ch)) em += 0.32;
    else if (WIDE.test(ch)) em += 0.85;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) em += 0.68;
    else em += 0.58;
  }
  return em * size;
}

/** Multi-line text (labels may contain "\n"). */
export function Lines({ text, x, y, dy = 0, lineHeight = FONT * 1.2, ...props }) {
  const parts = String(text).split('\n');
  if (parts.length === 1) return <text x={x} y={y} dy={dy} {...props}>{text}</text>;
  // dy goes on the first tspan: a tspan's own dy would override the parent's.
  return (
    <text x={x} y={y} {...props}>
      {parts.map((p, i) => <tspan key={i} x={x} dy={i === 0 ? dy : rnd(lineHeight)}>{p}</tspan>)}
    </text>
  );
}

/** Legend entries right-aligned at the top: dot + name in the series colour. */
export function legendLayout(entries, rightX) {
  const GAP = 1.2, ENTRY_GAP = 4;
  let x = rightX;
  const out = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const w = textWidth(entries[i].name);
    x -= w;
    out.unshift({ ...entries[i], textX: rnd(x), dotX: rnd(x - GAP - LEGEND_DOT_R) });
    x -= GAP + LEGEND_DOT_R * 2 + ENTRY_GAP;
  }
  return out;
}

export function Legend({ entries, rightX, y = 2.5 }) {
  return (
    <g data-role="legend">
      {legendLayout(entries, rightX).map(e => (
        <g key={e.name}>
          {e.marker === 'tick'
            ? <rect x={rnd(e.dotX - 0.3)} y={rnd(y - 1.4)} width={0.6} height={2.8} fill={e.color} />
            : <circle cx={e.dotX} cy={y} r={LEGEND_DOT_R} fill={e.color} />}
          <text x={e.textX} y={y} dy="0.35em" {...FONT_PROPS} fill={e.textColor ?? e.color}>{e.name}</text>
        </g>
      ))}
    </g>
  );
}

/** Tick count that keeps labels apart on an axis of this length (mm). */
export const tickCount = (lengthMm, spacingMm = 7) => Math.max(2, Math.min(8, Math.floor(lengthMm / spacingMm)));

export const FontImport = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');`}</style>
);
