import { useRef, useState } from 'react';
import ChartControls from './components/ChartControls';
import ChartPreview from './components/ChartPreview';

export default function App() {
  const svgRef = useRef(null);

  const [data, setData] = useState(null);
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('mljrd. EUR');
  const [width, setWidth] = useState(165);
  const [height, setHeight] = useState(90);
  const [error, setError] = useState(null);

  const widthMm = parseFloat(width) || 165;
  const heightMm = parseFloat(height) || 90;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <ChartControls
        data={data} title={title} unit={unit} width={width} height={height} error={error} svgRef={svgRef}
        setData={setData} setTitle={setTitle} setUnit={setUnit}
        setWidth={setWidth} setHeight={setHeight} setError={setError}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        {data ? (
          <div className="w-full max-w-4xl">
            {title && (
              <p
                className="mb-3 text-sm font-medium"
                style={{ fontFamily: 'Montserrat, sans-serif', color: '#595959' }}
              >
                {title}
              </p>
            )}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <ChartPreview
                svgRef={svgRef}
                data={data}
                unit={unit}
                widthMm={widthMm}
                heightMm={heightMm}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-base">Upload an Excel file to get started</p>
            <p className="text-xs mt-1">Accepts .xlsx with Year / Value columns</p>
          </div>
        )}
      </main>
    </div>
  );
}
