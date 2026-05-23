'use client';

import { forwardRef } from 'react';
import { scaleBand, scaleLinear, line } from 'd3';
import { formatYearLabel } from '@/utils/chartHelpers';
import { BRAND_COLORS } from '@/lib/brandColors';

const ML = 10;
const MR = 5;
const MT = 5;
const MB = 8;

const PT = 25.4 / 72;
const FONT = 7 * PT;
const STROKE = 0.25 * PT;
const DOT_R = 1; // mm

const rnd = n => Math.round(n * 1000) / 1000;

const FONT_PROPS = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: FONT,
  fill: '#808080',
};

const LEGEND_H = 7;
const LEGEND_RECT_W = 3;
const LEGEND_RECT_H = 2;

const LineChart = forwardRef(function LineChart({ series, unit, widthMm, heightMm }, ref) {
  if (!series || series.length === 0) return null;

  const isMulti = series.length > 1;
  const svgHeight = isMulti ? heightMm + LEGEND_H : heightMm;

  const innerW = widthMm - ML - MR;
  const innerH = heightMm - MT - MB;

  const years = series[0].data.map(d => String(d.year));
  const total = years.length;

  // scaleBand for consistent X positioning with BarChart
  const xScale = scaleBand()
    .domain(years)
    .range([0, innerW])
    .padding(0);

  const cx = year => rnd(xScale(String(year)) + xScale.bandwidth() / 2);

  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const yScale = scaleLinear()
    .domain([0, Math.max(...allValues)])
    .range([innerH, 0])
    .nice();

  const yTicks = yScale.ticks();
  const ceiling = yScale.domain()[1];

  const lineGen = line()
    .x(d => cx(d.year))
    .y(d => rnd(yScale(d.value)));

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

        {/* Lines + dots per series */}
        {series.map((s, si) => {
          const color = BRAND_COLORS[si % BRAND_COLORS.length];
          return (
            <g key={`series-${si}`}>
              <path
                d={lineGen(s.data)}
                fill="none"
                stroke={color}
                strokeWidth={STROKE * 3}
              />
              {s.data.map(d => (
                <circle
                  key={`dot-${si}-${d.year}`}
                  cx={cx(d.year)}
                  cy={rnd(yScale(d.value))}
                  r={DOT_R}
                  fill={color}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis ticks */}
        {years.map(year => (
          <line
            key={`xtick-${year}`}
            x1={cx(parseInt(year))} x2={cx(parseInt(year))}
            y1={innerH} y2={innerH + 1.5}
            stroke="#B3B3B3" strokeWidth={STROKE}
          />
        ))}

        {/* X-axis year labels */}
        {years.map((year, i) => (
          <text
            key={`xlabel-${year}`}
            x={cx(parseInt(year))}
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
          const entryW = 28;
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

export default LineChart;
