'use client';

import { forwardRef } from 'react';
import { scaleLinear } from 'd3';
import { countryColor, seriesColors, OTHER, BAND, BLACK, GRID } from '@/lib/palette';

const OTHER_DOT = '#DADADA'; // designer: multiply-blended so overlaps darken slightly
import { formatNumber, decimalsForStep } from '@/utils/format';
import { rnd, FONT, STROKE, FONT_PROPS, LEGEND_H, Legend, FontImport, textWidth, tickCount } from './common';

const MR = 5;
const DOT_R = 1.84; // 5.22pt, as in the designer's file
const TICK = 1.5;

const DEFAULT_HIGHLIGHT = /^(latvija|latvia|lietuva|lithuania|igaunija|estonia)$/i;
const DEFAULT_REFERENCE = /^(eu|es|es-27|eu-27|vidēji es(-27)?)$/i;

export function dotDefaults(data) {
  const labels = data.categories.map(c => c.label);
  return {
    highlight: labels.filter(l => DEFAULT_HIGHLIGHT.test(l)),
    reference: labels.find(l => DEFAULT_REFERENCE.test(l)) ?? null,
  };
}

/**
 * Dot plot: one strip per series (dimension), one dot per category (country).
 * config: highlight [labels], reference label | null, seriesColors (per highlighted label), otherLabel.
 */
const DotPlot = forwardRef(function DotPlot({ data, config = {}, widthMm, heightMm }, ref) {
  const { categories, series } = data;
  const defs = dotDefaults(data);
  const highlight = config.highlight ?? defs.highlight;
  const reference = config.reference === undefined ? defs.reference : config.reference;
  const hlColors = seriesColors(highlight, config.seriesColors);
  const colorOf = label => hlColors[highlight.indexOf(label)] ?? countryColor(label);
  const rows = series;
  const single = rows.length === 1;

  const all = rows.flatMap(s => s.values).filter(v => v != null);
  const xTmp = scaleLinear().domain([Math.min(0, ...all), Math.max(...all)]).nice();
  const ticks = xTmp.ticks(tickCount(widthMm, 12));
  const tickDec = decimalsForStep(ticks[1] - ticks[0]);

  const rowLabelW = single ? 0 : Math.max(...rows.map(s => textWidth(s.name))) + 3;
  const topLabels = single ? FONT + 2.5 : 0;
  const MT = LEGEND_H + topLabels;
  const MB = TICK + 1 + FONT * 1.2;
  const innerW = widthMm - rowLabelW - MR - DOT_R;
  const rowH = (heightMm - MT - MB) / rows.length;
  const bandH = Math.min(rowH * (single ? 1 : 0.75), DOT_R * 2 + 2.6);
  const x = scaleLinear().domain(xTmp.domain()).range([DOT_R, innerW]);

  const order = categories.map((c, i) => i)
    .sort((a, b) => (highlight.includes(categories[a].label) ? 1 : 0) - (highlight.includes(categories[b].label) ? 1 : 0));

  const legend = [
    ...(single ? [] : highlight.map(h => ({ name: h, color: colorOf(h) }))),
    ...(reference && !single ? [{ name: reference, color: BLACK, marker: 'tick' }] : []),
    { name: config.otherLabel ?? 'Citas valstis', color: OTHER, textColor: OTHER },
  ];

  // Labels above the strip (single row): highlighted + reference, pushed apart if they overlap.
  const labelItems = single ? [
    ...highlight.map(h => ({ name: h, color: colorOf(h), ci: categories.findIndex(c => c.label === h) })),
    ...(reference ? [{ name: reference, color: BLACK, ci: categories.findIndex(c => c.label === reference) }] : []),
  ].filter(l => l.ci >= 0 && rows[0].values[l.ci] != null)
    .map(l => ({ ...l, cx: x(rows[0].values[l.ci]), w: textWidth(l.name) }))
    .sort((a, b) => a.cx - b.cx) : [];
  let prevRight = -Infinity;
  for (const l of labelItems) {
    l.lx = Math.max(l.cx - l.w / 2, prevRight + 1.2);
    prevRight = l.lx + l.w;
  }

  const bottom = MT + rowH * rows.length;

  return (
    <svg ref={ref} width={`${widthMm}mm`} height={`${heightMm}mm`} viewBox={`0 0 ${widthMm} ${heightMm}`} xmlns="http://www.w3.org/2000/svg">
      <FontImport />
      <Legend entries={legend} rightX={widthMm - MR} />
      <g transform={`translate(${rnd(rowLabelW)},0)`}>
        {rows.map((s, ri) => {
          const cy = MT + rowH * ri + rowH / 2;
          return (
            <g key={`r${ri}`} data-role="strip">
              <rect x={0} y={rnd(cy - bandH / 2)} width={rnd(innerW + DOT_R)} height={rnd(bandH)} fill={BAND} />
              {!single && <text x={rnd(-rowLabelW)} y={rnd(cy)} dy="0.35em" {...FONT_PROPS}>{s.name}</text>}
              {order.map(ci => {
                const v = s.values[ci];
                const label = categories[ci].label;
                if (v == null || label === reference) return null;
                const hl = highlight.includes(label);
                return (
                  <circle key={ci} cx={rnd(x(v))} cy={rnd(cy)} r={DOT_R}
                    fill={hl ? colorOf(label) : OTHER_DOT}
                    {...(hl ? { stroke: '#FFFFFF', strokeWidth: 0.1 } : { style: { mixBlendMode: 'multiply' } })}
                    data-label={label} />
                );
              })}
              {reference && s.values[categories.findIndex(c => c.label === reference)] != null && (
                <rect x={rnd(x(s.values[categories.findIndex(c => c.label === reference)]) - 0.3)} y={rnd(cy - bandH / 2 - 0.6)}
                  width={0.6} height={rnd(bandH + 1.2)} fill={BLACK} data-role="reference" />
              )}
            </g>
          );
        })}
        {labelItems.map(l => (
          <g key={`l${l.name}`}>
            <text x={rnd(l.lx)} y={rnd(MT - 1.2)} {...FONT_PROPS} fill={l.color}>{l.name}</text>
          </g>
        ))}
        {ticks.map(t => (
          <g key={`t${t}`}>
            <line x1={rnd(x(t))} x2={rnd(x(t))} y1={rnd(bottom - (rowH - bandH) / 2)} y2={rnd(bottom - (rowH - bandH) / 2 + TICK)} stroke={GRID} strokeWidth={STROKE} />
            <text x={rnd(x(t))} y={rnd(bottom - (rowH - bandH) / 2 + TICK + 1)} dy="0.8em" textAnchor="middle" {...FONT_PROPS}>{formatNumber(t, tickDec)}</text>
          </g>
        ))}
      </g>
    </svg>
  );
});

export default DotPlot;
