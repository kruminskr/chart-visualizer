'use client';

import { useRef, useState, useEffect } from 'react';
import BarChart from '@/components/charts/BarChart';
import LineChart from '@/components/charts/LineChart';
import DotPlot from '@/components/charts/DotPlot';

const MM_TO_PX = 96 / 25.4; // CSS px per mm: zoom 1 = the chart's real printed size on a 96dpi screen
export const RENDERERS = { bar: BarChart, line: LineChart, dot: DotPlot };
const PAD = 48;

/**
 * Artboard: shows exactly the exported SVG, with its bounds marked.
 * zoom: 'fit' (fill the canvas, max 3×) or a number (1 = actual size). The SVG keeps its mm size; only CSS scales it.
 */
export default function ChartPreview({ svgRef, type, data, config, widthMm, heightMm, zoom = 'fit' }) {
  const containerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const Chart = RENDERERS[type] ?? BarChart;
  const w = widthMm * MM_TO_PX, h = heightMm * MM_TO_PX;
  const fit = box.w ? Math.min(3, (box.w - PAD * 2) / w, (box.h - PAD * 2 - 24) / h) : 1;
  const scale = zoom === 'fit' ? Math.max(0.1, fit) : zoom;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      <div className="min-h-full min-w-full flex items-center justify-center" style={{ padding: PAD }}>
        <figure className="m-0">
          <div className="bg-white shadow-sm ring-1 ring-gray-300" style={{ width: w * scale, height: h * scale }} data-role="artboard">
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: w, height: h }}>
              <Chart ref={svgRef} data={data} config={config} widthMm={widthMm} heightMm={heightMm} />
            </div>
          </div>
          <figcaption className="mt-2 text-[11px] text-gray-400 tabular-nums">
            {String(widthMm).replace('.', ',')} × {String(heightMm).replace('.', ',')} mm · {Math.round(scale * 100)}%
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
