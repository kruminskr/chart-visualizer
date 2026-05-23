import { useRef, useState, useEffect } from 'react';
import BarChart from './BarChart';

const MM_TO_PX = 96 / 25.4; // 3.7795 px per mm at 96 DPI

export default function ChartPreview({ svgRef, data, unit, widthMm, heightMm }) {
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

  return (
    <div ref={containerRef} className="w-full">
      {/* Outer div reserves scaled space so layout isn't collapsed */}
      <div style={{ width: svgW * scale, height: svgH * scale }}>
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: svgW,
            height: svgH,
          }}
        >
          <BarChart
            ref={svgRef}
            data={data}
            unit={unit}
            widthMm={widthMm}
            heightMm={heightMm}
          />
        </div>
      </div>
    </div>
  );
}
