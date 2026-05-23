import { forwardRef } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import { formatYearLabel } from '../utils/chartHelpers';

// Margins in mm (= viewBox user units, 1 unit = 1mm)
const ML = 10; // left — Y-axis label space
const MR = 5;  // right — unit label space
const MT = 5;  // top
const MB = 8;  // bottom — X-axis label + tick space

// Convert pt → mm so font/stroke values are in the same unit system as the viewBox.
// Avoids renderers misinterpreting pt inside a mm-unit coordinate space.
const PT = 25.4 / 72;          // 1pt in mm
const FONT = 7 * PT;           // 7pt → 2.469mm
const STROKE = 0.25 * PT;      // 0.25pt → 0.088mm

// Eliminate D3 floating-point noise (e.g. 46.199999999999996 → 46.2)
const rnd = n => Math.round(n * 1000) / 1000;

const FONT_PROPS = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: FONT,
  fill: '#808080',
};

const BarChart = forwardRef(function BarChart({ data, unit, widthMm, heightMm }, ref) {
  if (!data || data.length === 0) return null;

  const innerW = widthMm - ML - MR;
  const innerH = heightMm - MT - MB;

  const xScale = scaleBand()
    .domain(data.map(d => String(d.year)))
    .range([0, innerW])
    .padding(0.4);

  const yScale = scaleLinear()
    .domain([0, Math.max(...data.map(d => d.value))])
    .range([innerH, 0])
    .nice();

  const yTicks = yScale.ticks();
  const ceiling = yScale.domain()[1];
  const total = data.length;

  return (
    <svg
      ref={ref}
      width={`${widthMm}mm`}
      height={`${heightMm}mm`}
      viewBox={`0 0 ${widthMm} ${heightMm}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');`}</style>

      <g transform={`translate(${ML},${MT})`}>

        {/* Horizontal grid lines — span full SVG width */}
        {yTicks.map(t => (
          <line
            key={`grid-${t}`}
            x1={-ML} x2={innerW + MR}
            y1={rnd(yScale(t))} y2={rnd(yScale(t))}
            stroke="#B3B3B3" strokeWidth={STROKE}
          />
        ))}

        {/* Y-axis labels — left-aligned at SVG left edge.
            dy="0.35em" offsets baseline so cap-height centers on grid line,
            which is more reliable across renderers than dominant-baseline. */}
        {yTicks.map(t => (
          <text
            key={`ylabel-${t}`}
            x={rnd(-ML + 0.5)} y={rnd(yScale(t))}
            dy="-0.2em"
            textAnchor="start"
            {...FONT_PROPS}
          >
            {t}
          </text>
        ))}

        {/* Unit label — top right, co-aligned with topmost Y label */}
        {unit && (
          <text
            x={innerW + MR - 0.5} y={rnd(yScale(ceiling))}
            dy="-0.2em"
            textAnchor="end"
            {...FONT_PROPS}
          >
            {unit}
          </text>
        )}

        {/* Bars */}
        {data.map(d => (
          <rect
            key={`bar-${d.year}`}
            x={rnd(xScale(String(d.year)))}
            y={rnd(yScale(d.value))}
            width={rnd(xScale.bandwidth())}
            height={rnd(innerH - yScale(d.value))}
            fill="#FF00AA"
          />
        ))}

        {/* X-axis tick marks at bar centers */}
        {data.map(d => {
          const cx = rnd(xScale(String(d.year)) + xScale.bandwidth() / 2);
          return (
            <line
              key={`xtick-${d.year}`}
              x1={cx} x2={cx}
              y1={innerH} y2={innerH + 1.5}
              stroke="#B3B3B3" strokeWidth={STROKE}
            />
          );
        })}

        {/* X-axis year labels */}
        {data.map((d, i) => (
          <text
            key={`xlabel-${d.year}`}
            x={rnd(xScale(String(d.year)) + xScale.bandwidth() / 2)}
            y={innerH + 2}
            dy="0.72em"
            textAnchor="middle"
            {...FONT_PROPS}
          >
            {formatYearLabel(d.year, i, total)}
          </text>
        ))}

      </g>
    </svg>
  );
});

export default BarChart;
