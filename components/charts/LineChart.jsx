'use client';

import { forwardRef } from 'react';
import { scalePoint, scaleLinear, line, area } from 'd3';
import { seriesColors, tint, GRID } from '@/lib/palette';
import { formatNumber, formatCategory, decimalsForStep, thinLabels, autoDecimals } from '@/utils/format';
import { rnd, FONT, STROKE, LINE_1, LINE_MULTI, FONT_PROPS, LEGEND_H, Legend, FontImport, textWidth, tickCount } from './common';

const MR = 5;
const LABEL_GAP = 1.5;
const MARKER_R = 0.6;

/**
 * Line chart. config: areaFill (single series), markers (default: on when several lines),
 * valueLabels 'none'|'ends'|'all' (above the points, in the line colour), yearFormat, decimals, seriesColors, unit.
 */
const LineChart = forwardRef(function LineChart({ data, config = {}, widthMm, heightMm }, ref) {
  const { categories, series } = data;
  const names = series.map(s => s.name);
  const colors = seriesColors(names, config.seriesColors);
  const multi = series.length > 1;
  const showLegend = multi && config.legend !== false;
  const markers = config.markers ?? multi;
  const fill = !!config.areaFill && !multi;
  const strokeW = multi ? LINE_MULTI : LINE_1;

  const all = series.flatMap(s => s.values).filter(v => v != null);
  const valueLabels = config.valueLabels ?? 'none';
  const valueDecimals = config.decimals ?? autoDecimals(all);
  const MT = (showLegend ? LEGEND_H : 0) + FONT + 1;
  const MB = LABEL_GAP + FONT * 1.2 + 0.5;
  const nTicks = tickCount(heightMm - MT - MB);
  const tmpY = scaleLinear().domain([Math.min(0, ...all), Math.max(...all)]).nice(nTicks);
  const ticks = tmpY.ticks(nTicks);
  const tickDec = decimalsForStep(ticks[1] - ticks[0]);

  const ML = Math.max(8, Math.min(15, Math.max(...ticks.map(t => textWidth(formatNumber(t, tickDec)))) + 4));
  const innerW = widthMm - ML - MR;
  const innerH = heightMm - MT - MB;

  const x = scalePoint().domain(categories.map((_, i) => String(i))).range([0, innerW]).padding(0.25);
  const y = scaleLinear().domain(tmpY.domain()).range([innerH, 0]);
  const px = i => rnd(x(String(i)));
  const py = v => rnd(y(v));
  // Thin dense axes, then drop any label that would collide with its neighbour (first and last always stay).
  const yearFormat = config.yearFormat ?? 'short';
  const candidates = thinLabels(categories.length);
  const labelOf = (i, k) => formatCategory(categories[i].label, k, candidates.length, yearFormat);
  const boxes = candidates.map((i, k) => ({ i, k, x: x(String(i)), w: textWidth(labelOf(i, k)) }));
  const last = boxes.at(-1);
  const kept = [];
  for (const b of boxes) {
    const prev = kept.at(-1);
    const clashes = (a, c) => a && Math.abs(c.x - a.x) < (a.w + c.w) / 2 + 1;
    if (b === last) { while (kept.length > 1 && clashes(kept.at(-1), b)) kept.pop(); kept.push(b); }
    else if (!clashes(prev, b) && !clashes(b, last)) kept.push(b);
  }

  const lineGen = line().defined(d => d != null).x((_, i) => px(i)).y(d => py(d));
  const areaGen = area().defined(d => d != null).x((_, i) => px(i)).y0(py(Math.max(0, tmpY.domain()[0]))).y1(d => py(d));

  return (
    <svg ref={ref} width={`${widthMm}mm`} height={`${heightMm}mm`} viewBox={`0 0 ${widthMm} ${heightMm}`} xmlns="http://www.w3.org/2000/svg">
      <FontImport />
      {showLegend && <Legend entries={names.map((n, i) => ({ name: n || `Series ${i + 1}`, color: colors[i] }))} rightX={widthMm - MR} />}
      <g transform={`translate(0,${rnd(MT)})`}>
        {ticks.map(t => (
          <g key={`t${t}`}>
            <line x1={0} x2={widthMm} y1={py(t)} y2={py(t)} stroke={GRID} strokeWidth={STROKE} />
            <text x={0} y={rnd(y(t) - 0.7)} {...FONT_PROPS}>{formatNumber(t, tickDec)}</text>
          </g>
        ))}
        {config.unit && (
          <text x={rnd(widthMm)} y={rnd(y(ticks.at(-1)) - 0.7)} textAnchor="end" {...FONT_PROPS}>{config.unit}</text>
        )}
        <g transform={`translate(${rnd(ML)},0)`}>
          {fill && <path d={areaGen(series[0].values)} fill={tint(colors[0], 0.1)} data-role="area" />}
          {series.map((s, si) => (
            <g key={`s${si}`}>
              <path d={lineGen(s.values)} fill="none" stroke={colors[si]} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
              {markers && s.values.map((v, i) => v != null && (
                <circle key={i} cx={px(i)} cy={py(v)} r={MARKER_R} fill={colors[si]} />
              ))}
              {valueLabels !== 'none' && s.values.map((v, i) => {
                const defined = s.values.map((d, k) => (d != null ? k : null)).filter(k => k != null);
                if (v == null || (valueLabels === 'ends' && i !== defined[0] && i !== defined.at(-1))) return null;
                return (
                  <text key={`v${i}`} x={px(i)} y={rnd(y(v) - 1.4)} textAnchor="middle" {...FONT_PROPS} fill={colors[si]} data-role="value">
                    {formatNumber(v, valueDecimals)}
                  </text>
                );
              })}
            </g>
          ))}
          {kept.map(({ i, k }) => (
            <text key={`c${i}`} x={px(i)} y={rnd(innerH + LABEL_GAP)} dy="0.8em" textAnchor="middle" {...FONT_PROPS}>
              {labelOf(i, k)}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
});

export default LineChart;
