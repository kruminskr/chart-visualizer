'use client';

import { useRef } from 'react';
import { exportSVG } from '@/utils/svgExporter';
import { isYearLabel } from '@/utils/format';
import { SWATCHES, seriesColors } from '@/lib/palette';
import { dotDefaults } from '@/components/charts/DotPlot';

const inputClass = 'border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gray-500';
const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide';

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      <div className="flex rounded border border-gray-300 overflow-hidden text-sm" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={`flex-1 py-1.5 transition-colors ${value === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Swatches({ value, onChange, name }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={`Colour for ${name}`}>
      {SWATCHES.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} aria-checked={value === c} role="radio"
          className={`w-4 h-4 rounded-full border ${value === c ? 'ring-2 ring-offset-1 ring-gray-700' : 'border-gray-300'}`}
          style={{ background: c }} />
      ))}
    </div>
  );
}

export default function ChartControls({ chart, onChange, onFile, error, svgRef, disabled = false }) {
  const fileInputRef = useRef(null);
  const { type = 'bar', data, config = {}, title = '', unit = '', widthMm, heightMm } = chart ?? {};
  const set = patch => onChange({ ...patch });
  const setConfig = patch => onChange({ config: { ...config, ...patch } });
  const series = data?.series ?? [];
  const years = data?.categories?.length && data.categories.every(c => isYearLabel(c.label));

  function pick(file) {
    if (disabled || !file) return;
    onFile(file);
  }

  const colorNames = type === 'dot' ? (config.highlight ?? (data ? dotDefaults(data).highlight : [])) : series.map(s => s.name);
  const currentColors = seriesColors(colorNames, config.seriesColors);

  return (
    <aside className="flex flex-col gap-5 p-5 w-72 shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
        onDragOver={e => e.preventDefault()}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:border-gray-500"
      >
        <p className="text-xs text-gray-500">Drop an .xlsx here or click to upload</p>
        <p className="text-[11px] text-gray-400 mt-1">Each sheet can become a chart</p>
        <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" disabled={disabled}
          onChange={e => { pick(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2 leading-relaxed">{error}</p>}

      {data && (
        <>
          <Segmented label="Chart type" value={type} onChange={v => set({ type: v })}
            options={[['bar', 'Bar'], ['line', 'Line'], ['dot', 'Dot plot']]} />

          {type === 'bar' && (
            <div className="flex flex-col gap-3">
              <Segmented label="Orientation" value={config.orientation ?? 'vertical'} onChange={v => setConfig({ orientation: v })}
                options={[['vertical', 'Vertical'], ['horizontal', 'Horizontal']]} />
              {series.length > 1 && <Check label="Stack series" checked={!!config.stacked} onChange={v => setConfig({ stacked: v })} />}
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Value labels</span>
                <select className={inputClass} value={config.valueLabels ?? 'none'} onChange={e => setConfig({ valueLabels: e.target.value })}>
                  <option value="none">None</option>
                  <option value="inside">Inside bars</option>
                  <option value="outside">Outside bars</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Bar width ({Math.round((config.barWidth ?? 0.6) * 100)}%)</span>
                <input type="range" min="20" max="95" step="5" value={Math.round((config.barWidth ?? 0.6) * 100)}
                  onChange={e => setConfig({ barWidth: Number(e.target.value) / 100 })} aria-label="Bar width" />
              </label>
            </div>
          )}

          {type === 'line' && (
            <div className="flex flex-col gap-2">
              {series.length === 1 && <Check label="Fill area under line" checked={!!config.areaFill} onChange={v => setConfig({ areaFill: v })} />}
              <Check label="Point markers" checked={config.markers ?? series.length > 1} onChange={v => setConfig({ markers: v })} />
            </div>
          )}

          {type === 'dot' && (
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Highlighted</span>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1 border border-gray-200 rounded p-2">
                {data.categories.map(c => {
                  const hl = config.highlight ?? dotDefaults(data).highlight;
                  return (
                    <Check key={c.label} label={c.label} checked={hl.includes(c.label)}
                      onChange={v => setConfig({ highlight: v ? [...hl, c.label] : hl.filter(h => h !== c.label) })} />
                  );
                })}
              </div>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Reference marker</span>
                <select className={inputClass} value={(config.reference === undefined ? dotDefaults(data).reference : config.reference) ?? ''}
                  onChange={e => setConfig({ reference: e.target.value || null })}>
                  <option value="">None</option>
                  {data.categories.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
              </label>
            </div>
          )}

          {colorNames.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Colours</span>
              {colorNames.map((n, i) => (
                <div key={n || i} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 truncate">{n || `Series ${i + 1}`}</span>
                  <Swatches name={n} value={currentColors[i]} onChange={c => setConfig({ seriesColors: { ...config.seriesColors, [n]: c } })} />
                </div>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Chart title</span>
            <input className={inputClass} value={title} onChange={e => set({ title: e.target.value })} placeholder="Chart title" />
          </label>

          {type !== 'dot' && (
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Y-axis unit</span>
              <input className={inputClass} value={unit} onChange={e => set({ unit: e.target.value })} placeholder="e.g. mljrd. EUR" />
            </label>
          )}

          {years && type !== 'dot' && (
            <Segmented label="Year labels" value={config.yearFormat ?? (config.orientation === 'horizontal' && type === 'bar' ? 'full' : 'short')}
              onChange={v => setConfig({ yearFormat: v })} options={[['short', '2016 17 … 2026'], ['full', '2016 2017 …']]} />
          )}

          {type === 'bar' && (
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Decimals in labels</span>
              <select className={inputClass} value={config.decimals ?? 'auto'}
                onChange={e => setConfig({ decimals: e.target.value === 'auto' ? null : Number(e.target.value) })}>
                <option value="auto">Auto</option>
                {[0, 1, 2, 3].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          )}

          <div className="flex flex-col gap-1">
            <span className={labelClass}>Size (mm)</span>
            <div className="flex gap-2">
              <input type="number" min="20" aria-label="Width (mm)" className={`${inputClass} w-full`} value={widthMm}
                onChange={e => set({ widthMm: e.target.value })} />
              <span className="self-center text-gray-400">×</span>
              <input type="number" min="20" aria-label="Height (mm)" className={`${inputClass} w-full`} value={heightMm}
                onChange={e => set({ heightMm: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-1">
              {[77.5, 165].map(w => (
                <button key={w} type="button" onClick={() => set({ widthMm: w })}
                  className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">{String(w).replace('.', ',')} mm</button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-auto">
        <button disabled={!data} onClick={() => exportSVG(svgRef.current, title)}
          className="w-full py-2 px-4 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Export SVG
        </button>
      </div>
    </aside>
  );
}
