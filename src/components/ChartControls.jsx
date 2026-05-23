import { useRef } from 'react';
import { parseFile } from '../utils/excelParser';
import { exportSVG } from '../utils/svgExporter';

export default function ChartControls({
  data, title, unit, width, height, error, svgRef,
  setData, setTitle, setUnit, setWidth, setHeight, setError,
}) {
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload an .xlsx file.');
      return;
    }
    const result = await parseFile(file);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setData(result.data);
      setTitle(result.title);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const inputClass = 'border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500';
  const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide';

  return (
    <aside className="flex flex-col gap-5 p-5 w-64 shrink-0 border-r border-gray-200 bg-white h-screen overflow-y-auto">
      <h1 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">LaSER Chart</h1>

      {/* File upload */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:border-gray-500"
      >
        <p className="text-xs text-gray-500">
          {data ? '✓ File loaded — drop or click to replace' : 'Drop .xlsx here or click to upload'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2 leading-relaxed">{error}</p>
      )}

      {/* Chart title */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Chart title</span>
        <input
          className={inputClass}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Chart title"
        />
      </label>

      {/* Y-axis unit */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Y-axis unit</span>
        <input
          className={inputClass}
          value={unit}
          onChange={e => setUnit(e.target.value)}
          placeholder="e.g. mljrd. EUR"
        />
      </label>

      {/* Width */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Width (mm)</span>
        <input
          type="number"
          min="20"
          className={inputClass}
          value={width}
          onChange={e => setWidth(e.target.value)}
        />
      </label>

      {/* Height */}
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Height (mm)</span>
        <input
          type="number"
          min="30"
          className={inputClass}
          value={height}
          onChange={e => setHeight(e.target.value)}
        />
      </label>

      <div className="mt-auto">
        <button
          disabled={!data}
          onClick={() => exportSVG(svgRef.current, title)}
          className="w-full py-2 px-4 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Export SVG
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {parseFloat(width) || 165}mm × {parseFloat(height) || 90}mm
        </p>
      </div>
    </aside>
  );
}
