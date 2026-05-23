'use client';

import { useRef, useState, useEffect } from 'react';
import BarChart from '@/components/BarChart';
import LineChart from '@/components/LineChart';

const MM_TO_PX = 96 / 25.4;

export default function ChartPreview({ svgRef, series, unit, widthMm, heightMm, chartType }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const containerPx = entries[0].contentRect.width;
      const svgPx = widthMm * MM_TO_PX;
      setScale(Math.min(1, containerPx / svgPx));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [widthMm]);

  const svgW = widthMm * MM_TO_PX;
  const svgH = heightMm * MM_TO_PX;
  const Chart = chartType === 'line' ? LineChart : BarChart;

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ width: svgW * scale, height: svgH * scale }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: svgW,
            height: svgH,
          }}
        >
          <Chart
            ref={svgRef}
            series={series}
            unit={unit}
            widthMm={widthMm}
            heightMm={heightMm}
          />
        </div>
      </div>
    </div>
  );
}
