'use client';

import { forwardRef } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import { formatYearLabel } from '@/utils/chartHelpers';
import { BRAND_COLORS } from '@/lib/brandColors';

const ML = 10;
const MR = 5;
const MT = 5;
const MB = 8;

const PT = 25.4 / 72;
const FONT = 7 * PT;
const STROKE = 0.25 * PT;

const rnd = n => Math.round(n * 1000) / 1000;

const FONT_PROPS = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: FONT,
  fill: '#808080',
};

// Extra SVG height reserved for the legend when multi-series
const LEGEND_H = 7;
const LEGEND_RECT_W = 3;
const LEGEND_RECT_H = 2;

const BarChart = forwardRef(function BarChart({ series, unit, widthMm, heightMm }, ref) {
  if (!series || series.length === 0) return null;

  const isMulti = series.length > 1;
  const svgHeight = isMulti ? heightMm + LEGEND_H : heightMm;

  const innerW = widthMm - ML - MR;
  const innerH = heightMm - MT - MB;

  // Years from first series (all series share the same years)
  const years = series[0].data.map(d => String(d.year));
  const total = years.length;

  const xScale = scaleBand()
    .domain(years)
    .range([0, innerW])
    .padding(0.4);

  // Inner band scale for grouping series within each year slot
  const innerScale = scaleBand()
    .domain(series.map((_, i) => String(i)))
    .range([0, xScale.bandwidth()])
    .padding(0.05);

  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const yScale = scaleLinear()
    .domain([0, Math.max(...allValues)])
    .range([innerH, 0])
    .nice();

  const yTicks = yScale.ticks();
  const ceiling = yScale.domain()[1];

  return (
    <svg
      ref={ref}
      width={`${widthMm}mm`}
      height={`${svgHeight}mm`}
      viewBox={`0 0 ${widthMm} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');`}</style>

      <g transform={`translate(${ML},${MT})`}>

        {/* Grid lines */}
        {yTicks.map(t => (
          <line
            key={`grid-${t}`}
            x1={-ML} x2={innerW + MR}
            y1={rnd(yScale(t))} y2={rnd(yScale(t))}
            stroke="#B3B3B3" strokeWidth={STROKE}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map(t => (
          <text
            key={`ylabel-${t}`}
            x={rnd(-ML + 0.5)} y={rnd(yScale(t))}
            dy="0.35em"
            textAnchor="start"
            {...FONT_PROPS}
          >
            {t}
          </text>
        ))}

        {/* Unit label */}
        {unit && (
          <text
            x={innerW + MR - 0.5} y={rnd(yScale(ceiling))}
            dy="0.35em"
            textAnchor="end"
            {...FONT_PROPS}
          >
            {unit}
          </text>
        )}

        {/* Bars */}
        {series.map((s, si) =>
          s.data.map(d => {
            const slotX = rnd(xScale(String(d.year)));
            const barX = rnd(slotX + (isMulti ? innerScale(String(si)) : 0));
            const barW = rnd(isMulti ? innerScale.bandwidth() : xScale.bandwidth());
            return (
              <rect
                key={`bar-${si}-${d.year}`}
                x={barX}
                y={rnd(yScale(d.value))}
                width={barW}
                height={rnd(innerH - yScale(d.value))}
                fill={BRAND_COLORS[si % BRAND_COLORS.length]}
              />
            );
          })
        )}

        {/* X-axis ticks */}
        {years.map(year => {
          const cx = rnd(xScale(year) + xScale.bandwidth() / 2);
          return (
            <line
              key={`xtick-${year}`}
              x1={cx} x2={cx}
              y1={innerH} y2={innerH + 1.5}
              stroke="#B3B3B3" strokeWidth={STROKE}
            />
          );
        })}

        {/* X-axis year labels */}
        {years.map((year, i) => (
          <text
            key={`xlabel-${year}`}
            x={rnd(xScale(year) + xScale.bandwidth() / 2)}
            y={innerH + 2}
            dy="0.72em"
            textAnchor="middle"
            {...FONT_PROPS}
          >
            {formatYearLabel(parseInt(year), i, total)}
          </text>
        ))}

        {/* Legend (multi-series only) */}
        {isMulti && (() => {
          const entryW = 28; // mm per legend entry
          const totalW = series.length * entryW;
          const startX = (innerW - totalW) / 2;
          const legendY = innerH + MB + 1;
          return series.map((s, i) => (
            <g key={`legend-${i}`} transform={`translate(${rnd(startX + i * entryW)},${rnd(legendY)})`}>
              <rect width={LEGEND_RECT_W} height={LEGEND_RECT_H} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
              <text
                x={LEGEND_RECT_W + 1.5}
                y={LEGEND_RECT_H / 2}
                dy="0.35em"
                textAnchor="start"
                {...FONT_PROPS}
              >
                {s.name || `Series ${i + 1}`}
              </text>
            </g>
          ));
        })()}

      </g>
    </svg>
  );
});

export default BarChart;
