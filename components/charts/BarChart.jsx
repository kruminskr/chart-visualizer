'use client';

import { forwardRef } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import { seriesColors, countryColor, GRID } from '@/lib/palette';
import { formatNumber, formatCategory, decimalsForStep, autoDecimals } from '@/utils/format';
import { rnd, FONT, STROKE, FONT_PROPS, LEGEND_H, Legend, Lines, FontImport, textWidth, tickCount } from './common';

const MR = 5;          // right margin (designer spec: 5mm)
const LABEL_GAP = 1.5; // baseline → category label (spec: 1.5mm)

/**
 * Bar chart. config: orientation 'vertical'|'horizontal', stacked, valueLabels 'none'|'inside'|'outside',
 * barWidth 0.2–0.95 (share of the category slot), decimals (null = auto), yearFormat, seriesColors, unit.
 */
const BarChart = forwardRef(function BarChart({ data, config = {}, widthMm, heightMm }, ref) {
  const { categories, series } = data;
  const horizontal = config.orientation === 'horizontal';
  const stacked = !!config.stacked && series.length > 1;
  const valueLabels = config.valueLabels ?? 'none';
  const barWidth = config.barWidth ?? 0.6;
  const names = series.map(s => s.name);
  const colors = seriesColors(names, config.seriesColors);
  const grouped = categories.some(c => c.group);
  // Single series with category groups (or country categories): colour each bar by its group/country.
  const barColor = (si, ci) => {
    if (series.length === 1) {
      const c = categories[ci];
      return (config.seriesColors?.[names[0]]) ?? countryColor(c.group) ?? (grouped ? colors[0] : countryColor(c.label)) ?? colors[0];
    }
    return colors[si];
  };
  const showLegend = series.length > 1 && config.legend !== false;
  const top = showLegend ? LEGEND_H : 0;

  const all = series.flatMap(s => s.values).filter(v => v != null);
  const totals = categories.map((_, ci) => series.reduce((a, s) => a + (s.values[ci] ?? 0), 0));
  const max = stacked ? Math.max(...totals) : Math.max(...all);
  const min = stacked ? 0 : Math.min(0, ...all);
  const segCount = categories.map((_, ci) => series.filter(s => s.values[ci] != null).length);
  const valueDecimals = config.decimals ?? autoDecimals(all);

  const cats = categories.map((c, i) => String(i));
  const yearFormat = config.yearFormat ?? (horizontal ? 'full' : 'short');
  const catLabel = i => formatCategory(categories[i].label, i, categories.length, yearFormat);

  // Segments: one rect per (series, category) with start/end in value space.
  const segments = [];
  categories.forEach((_, ci) => {
    let acc = 0;
    series.forEach((s, si) => {
      const v = s.values[ci];
      if (v == null) return;
      const from = stacked ? acc : 0;
      const to = stacked ? acc + v : v;
      if (stacked) acc += v;
      segments.push({ si, ci, v, from, to });
    });
  });

  const legend = showLegend && (
    <Legend entries={names.map((n, i) => ({ name: n || `Series ${i + 1}`, color: colors[i] }))} rightX={widthMm - MR} />
  );

  if (!horizontal) {
    // ── Vertical ─────────────────────────────────────────────────────────
    const MB = LABEL_GAP + FONT * 1.2 * Math.max(...categories.map(c => c.label.split('\n').length)) + 0.5;
    const MT = top + FONT + 1;
    const nTicks = tickCount(heightMm - MT - MB);
    const tmpY = scaleLinear().domain([min, max]).nice(nTicks);
    const ticks = tmpY.ticks(nTicks);
    const tickDec = decimalsForStep(ticks[1] - ticks[0]);
    const ML = Math.max(8, Math.min(15, Math.max(...ticks.map(t => textWidth(formatNumber(t, tickDec)))) + 4));
    const innerW = widthMm - ML - MR;
    const innerH = heightMm - MT - MB;
    const y = scaleLinear().domain(tmpY.domain()).range([innerH, 0]);
    const x = scaleBand().domain(cats).range([0, innerW]).paddingInner(1 - barWidth).paddingOuter((1 - barWidth) / 2);
    const inner = scaleBand().domain(series.map((_, i) => String(i))).range([0, x.bandwidth()]).padding(0.04);

    return (
      <svg ref={ref} width={`${widthMm}mm`} height={`${heightMm}mm`} viewBox={`0 0 ${widthMm} ${heightMm}`} xmlns="http://www.w3.org/2000/svg">
        <FontImport />
        {legend}
        <g transform={`translate(0,${rnd(MT)})`}>
          {ticks.map(t => (
            <g key={`t${t}`}>
              <line x1={0} x2={widthMm} y1={rnd(y(t))} y2={rnd(y(t))} stroke={GRID} strokeWidth={STROKE} />
              <text x={0} y={rnd(y(t) - 0.7)} {...FONT_PROPS}>{formatNumber(t, tickDec)}</text>
            </g>
          ))}
          {config.unit && (
            <text x={rnd(widthMm)} y={rnd(y(ticks.at(-1)) - 0.7)} textAnchor="end" {...FONT_PROPS}>{config.unit}</text>
          )}
          <g transform={`translate(${rnd(ML)},0)`}>
            {segments.map(({ si, ci, v, from, to }) => {
              const bx = x(String(ci)) + (stacked || series.length === 1 ? 0 : inner(String(si)));
              const bw = stacked || series.length === 1 ? x.bandwidth() : inner.bandwidth();
              const y0 = y(Math.max(from, to)), y1 = y(Math.min(from, to));
              const h = y1 - y0;
              const fill = barColor(si, ci);
              const label = formatNumber(v, valueDecimals);
              const fits = h >= FONT + 1.2 && textWidth(label) <= bw + 0.4;
              let lbl = null;
              if (valueLabels !== 'none') {
                if (valueLabels === 'inside' && fits) {
                  lbl = <text x={rnd(bx + bw / 2)} y={rnd(stacked ? y0 + h / 2 : y0 + 0.8)} dy={stacked ? '0.35em' : '0.8em'} textAnchor="middle" {...FONT_PROPS} fill="#FFFFFF">{label}</text>;
                } else if (!stacked) {
                  lbl = <text x={rnd(bx + bw / 2)} y={rnd(y0 - 0.7)} textAnchor="middle" {...FONT_PROPS}>{label}</text>;
                }
              }
              return (
                <g key={`b${si}-${ci}`}>
                  <rect x={rnd(bx)} y={rnd(y0)} width={rnd(bw)} height={rnd(h)} fill={fill} />
                  {lbl}
                </g>
              );
            })}
            {stacked && valueLabels !== 'none' && totals.map((t, ci) => segCount[ci] > 1 && (
              <text key={`tot${ci}`} x={rnd(x(String(ci)) + x.bandwidth() / 2)} y={rnd(y(t) - 0.7)} textAnchor="middle" {...FONT_PROPS}>{formatNumber(t, valueDecimals)}</text>
            ))}
            {categories.map((c, ci) => (
              <Lines key={`c${ci}`} text={catLabel(ci)} x={rnd(x(String(ci)) + x.bandwidth() / 2)} y={rnd(innerH + LABEL_GAP)} dy="0.8em" textAnchor="middle" {...FONT_PROPS} />
            ))}
          </g>
        </g>
      </svg>
    );
  }

  // ── Horizontal ─────────────────────────────────────────────────────────
  const groupW = grouped ? Math.max(...categories.map(c => textWidth(c.group ?? ''))) + 3 : 0;
  const labelW = Math.max(...categories.map(c => Math.max(...c.label.split('\n').map(l => textWidth(l))))) + 2;
  const ML = groupW + labelW;
  const valueW = valueLabels === 'outside' || stacked ? textWidth(formatNumber(max, valueDecimals)) + 1.5 : 0;
  const MT = top + 0.5;
  const innerW = widthMm - ML - Math.max(valueW, 1);
  const innerH = heightMm - MT - 0.5;
  const yb = scaleBand().domain(cats).range([0, innerH]).paddingInner(1 - barWidth).paddingOuter((1 - barWidth) / 2);
  const xs = scaleLinear().domain([min, max]).range([0, innerW]);
  const inner = scaleBand().domain(series.map((_, i) => String(i))).range([0, yb.bandwidth()]).padding(0.04);
  // Group boundaries (first category index of each group after the first).
  const groupStarts = categories.map((c, i) => (i > 0 && c.group !== categories[i - 1].group ? i : null)).filter(i => i != null);

  return (
    <svg ref={ref} width={`${widthMm}mm`} height={`${heightMm}mm`} viewBox={`0 0 ${widthMm} ${heightMm}`} xmlns="http://www.w3.org/2000/svg">
      <FontImport />
      {legend}
      <g transform={`translate(0,${rnd(MT)})`}>
        {grouped && groupStarts.map(i => {
          const gy = rnd((yb(String(i - 1)) + yb.bandwidth() + yb(String(i))) / 2);
          return <line key={`gs${i}`} x1={0} x2={widthMm} y1={gy} y2={gy} stroke={GRID} strokeWidth={STROKE} />;
        })}
        {grouped && categories.map((c, i) => (i === 0 || c.group !== categories[i - 1].group) && (
          <text key={`g${i}`} x={0} y={rnd(yb(String(i)) + yb.bandwidth() / 2)} dy="0.35em" {...FONT_PROPS} fill={countryColor(c.group) ?? FONT_PROPS.fill}>{c.group}</text>
        ))}
        {categories.map((c, ci) => (
          <Lines key={`c${ci}`} text={catLabel(ci)} x={rnd(groupW)} y={rnd(yb(String(ci)) + yb.bandwidth() / 2 - (c.label.split('\n').length - 1) * FONT * 0.6)} dy="0.35em" {...FONT_PROPS} />
        ))}
        <line x1={rnd(ML + xs(0))} x2={rnd(ML + xs(0))} y1={0} y2={rnd(innerH)} stroke={GRID} strokeWidth={STROKE} />
        <g transform={`translate(${rnd(ML)},0)`}>
          {segments.map(({ si, ci, v, from, to }) => {
            const by = yb(String(ci)) + (stacked || series.length === 1 ? 0 : inner(String(si)));
            const bh = stacked || series.length === 1 ? yb.bandwidth() : inner.bandwidth();
            const x0 = xs(Math.min(from, to)), x1 = xs(Math.max(from, to));
            const w = x1 - x0;
            const label = formatNumber(v, valueDecimals);
            const fits = w >= textWidth(label) + 1.6 && bh >= FONT * 0.9;
            let lbl = null;
            if (valueLabels === 'inside' && fits) {
              lbl = <text x={rnd(stacked ? x0 + w / 2 : x1 - 0.8)} y={rnd(by + bh / 2)} dy="0.35em" textAnchor={stacked ? 'middle' : 'end'} {...FONT_PROPS} fill="#FFFFFF">{label}</text>;
            } else if (valueLabels !== 'none' && !stacked) {
              lbl = <text x={rnd(x1 + 0.8)} y={rnd(by + bh / 2)} dy="0.35em" {...FONT_PROPS}>{label}</text>;
            }
            return (
              <g key={`b${si}-${ci}`}>
                <rect x={rnd(x0)} y={rnd(by)} width={rnd(w)} height={rnd(bh)} fill={barColor(si, ci)} />
                {lbl}
              </g>
            );
          })}
          {stacked && valueLabels !== 'none' && totals.map((t, ci) => segCount[ci] > 1 && (
            <text key={`tot${ci}`} x={rnd(xs(t) + 0.8)} y={rnd(yb(String(ci)) + yb.bandwidth() / 2)} dy="0.35em" {...FONT_PROPS}>{formatNumber(t, valueDecimals)}</text>
          ))}
        </g>
      </g>
    </svg>
  );
});

export default BarChart;
