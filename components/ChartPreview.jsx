'use client';

import { useRef, useState, useEffect } from 'react';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import DotPlot from '@/components/charts/DotPlot';

const MM_TO_PX = 96 / 25.4;
const RENDERERS = { bar: BarChart, line: LineChart, dot: DotPlot };

/** Scales the mm-sized SVG to fit its container (CSS transform only, the SVG keeps its mm size). */
export default function ChartPreview({ svgRef, type, data, config, widthMm, heightMm }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      setScale(Math.min(2, entries[0].contentRect.width / (widthMm * MM_TO_PX)));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [widthMm]);

  const Chart = RENDERERS[type] ?? BarChart;
  const w = widthMm * MM_TO_PX, h = heightMm * MM_TO_PX;

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ width: w * scale, height: h * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: w, height: h }}>
          <Chart ref={svgRef} data={data} config={config} widthMm={widthMm} heightMm={heightMm} />
        </div>
      </div>
    </div>
  );
}
