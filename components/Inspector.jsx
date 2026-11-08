'use client';

import { isYearLabel } from '@/utils/format';
import { SWATCHES, seriesColors } from '@/lib/palette';
import { dotDefaults } from '@/components/charts/DotPlot';
import { defaultBarWidth } from '@/components/charts/BarChart';
import { ChartIcon } from '@/components/ChartIcons';

const inputClass = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-500';
const labelClass = 'text-xs text-gray-500';

function Section({ title, children }) {
  return (
    <section className="px-4 py-4 border-b border-gray-100 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className={labelClass}>{label}</span>}
      <div className="flex rounded-md bg-gray-100 p-0.5 text-sm" role="group" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={`flex-1 py-1 rounded transition-colors ${value === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
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
      <input type="checkbox" className="accent-gray-900" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Swatches({ value, onChange, name }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={`Colour for ${name}`}>
      {SWATCHES.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={c} aria-checked={value === c} role="radio"
          className={`w-4 h-4 rounded-full ${value === c ? 'ring-2 ring-offset-1 ring-gray-900' : 'ring-1 ring-black/10'}`}
          style={{ background: c }} />
      ))}
    </div>
  );
}

const TYPES = [['bar', 'Bars'], ['line', 'Lines'], ['dot', 'Dots']];

/** Right panel: settings of the active chart, grouped by what they change. */
export default function Inspector({ chart, onChange }) {
  const { type = 'bar', data, config = {}, title = '', unit = '', widthMm, heightMm } = chart;
  const setConfig = patch => onChange({ config: { ...config, ...patch } });
  const series = data.series;
  const years = data.categories.every(c => isYearLabel(c.label));
  const horizontal = type === 'bar' && config.orientation === 'horizontal';
  const dot = type === 'dot' ? dotDefaults(data) : null;
  const highlight = config.highlight ?? dot?.highlight ?? [];
  const colorNames = type === 'dot' ? highlight : series.map(s => s.name);
  const currentColors = seriesColors(colorNames, config.seriesColors);
  const barWidth = config.barWidth ?? defaultBarWidth(config, data);

  return (
    <aside aria-label="Chart settings" className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
      <Section title="Chart">
        <Field label="Name (file name; not drawn in the SVG)">
          <input className={inputClass} value={title} onChange={e => onChange({ title: e.target.value })} placeholder="Chart title" />
        </Field>
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Type</span>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Chart type">
            {TYPES.map(([v, text]) => (
              <button key={v} type="button" onClick={() => onChange({ type: v })} aria-pressed={type === v}
                className={`flex flex-col items-center gap-1 rounded-md border py-2 text-xs transition-colors ${type === v ? 'border-gray-900 text-gray-900 bg-gray-50' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800'}`}>
                <ChartIcon type={v} />
                {text}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {type === 'bar' && (
        <Section title="Layout">
          <Segmented label="Orientation" value={config.orientation ?? 'vertical'} onChange={v => setConfig({ orientation: v })}
            options={[['vertical', 'Vertical'], ['horizontal', 'Horizontal']]} />
          {series.length > 1 && <Check label="Stack series" checked={!!config.stacked} onChange={v => setConfig({ stacked: v })} />}
          <Field label="Order">
            <select className={inputClass} value={config.sort ?? 'none'} onChange={e => setConfig({ sort: e.target.value })}>
              <option value="none">As in Excel</option>
              <option value="desc">Largest first</option>
            </select>
          </Field>
          <Field label={`Bar width · ${Math.round(barWidth * 100)}%`}>
            <input type="range" min="20" max="95" step="5" value={Math.round(barWidth * 100)} className="accent-gray-900"
              onChange={e => setConfig({ barWidth: Number(e.target.value) / 100 })} aria-label="Bar width" />
          </Field>
        </Section>
      )}

      {type === 'line' && (
        <Section title="Layout">
          {series.length === 1 && <Check label="Fill area under line" checked={!!config.areaFill} onChange={v => setConfig({ areaFill: v })} />}
          <Check label="Point markers" checked={config.markers ?? series.length > 1} onChange={v => setConfig({ markers: v })} />
        </Section>
      )}

      {type === 'dot' && (
        <Section title="Highlight">
          <div className="max-h-44 overflow-y-auto flex flex-col gap-1 rounded-md border border-gray-200 p-2">
            {data.categories.map(c => (
              <Check key={c.label} label={c.label} checked={highlight.includes(c.label)}
                onChange={v => setConfig({ highlight: v ? [...highlight, c.label] : highlight.filter(h => h !== c.label) })} />
            ))}
          </div>
          <Field label="Reference marker (e.g. EU average)">
            <select className={inputClass} value={(config.reference === undefined ? dot.reference : config.reference) ?? ''}
              onChange={e => setConfig({ reference: e.target.value || null })}>
              <option value="">None</option>
              {data.categories.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Label for the other dots">
            <input className={inputClass} value={config.otherLabel ?? 'Citas valstis'} onChange={e => setConfig({ otherLabel: e.target.value })} />
          </Field>
        </Section>
      )}

      {type !== 'dot' && (
        <Section title="Labels">
          <Field label="Value labels">
            <select className={inputClass} value={config.valueLabels ?? 'none'} onChange={e => setConfig({ valueLabels: e.target.value })}>
              <option value="none">None</option>
              {type === 'bar' ? (
                <>
                  <option value="inside">Inside bars</option>
                  <option value="outside">Outside bars</option>
                </>
              ) : (
                <>
                  <option value="ends">First and last</option>
                  <option value="all">All points</option>
                </>
              )}
            </select>
          </Field>
          <Field label="Decimals">
            <select className={inputClass} value={config.decimals ?? 'auto'}
              onChange={e => setConfig({ decimals: e.target.value === 'auto' ? null : Number(e.target.value) })}>
              <option value="auto">Auto</option>
              {[0, 1, 2, 3].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          {!horizontal && (
            <Field label="Axis unit (top right)">
              <input className={inputClass} value={unit} onChange={e => onChange({ unit: e.target.value })} placeholder="e.g. mljrd. EUR, %" />
            </Field>
          )}
          {years && (
            <Segmented label="Years" value={config.yearFormat ?? (horizontal ? 'full' : 'short')}
              onChange={v => setConfig({ yearFormat: v })} options={[['short', '2016 17 … 2026'], ['full', '2016 2017 …']]} />
          )}
        </Section>
      )}

      {colorNames.length > 0 && (
        <Section title="Colours">
          {colorNames.map((n, i) => (
            <div key={n || i} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600 truncate">{n || `Series ${i + 1}`}</span>
              <Swatches name={n} value={currentColors[i]} onChange={c => setConfig({ seriesColors: { ...config.seriesColors, [n]: c } })} />
            </div>
          ))}
        </Section>
      )}

      <Section title="Size (mm)">
        <div className="flex items-center gap-2">
          <input type="number" min="20" step="0.5" aria-label="Width (mm)" className={inputClass} value={widthMm}
            onChange={e => onChange({ widthMm: e.target.value })} />
          <span className="text-gray-400" aria-hidden="true">×</span>
          <input type="number" min="10" step="0.5" aria-label="Height (mm)" className={inputClass} value={heightMm}
            onChange={e => onChange({ heightMm: e.target.value })} />
        </div>
        <div className="flex gap-1.5">
          <span className={`${labelClass} self-center mr-1`}>Column</span>
          {[77.5, 165].map(w => (
            <button key={w} type="button" onClick={() => onChange({ widthMm: w })} aria-pressed={parseFloat(widthMm) === w}
              className={`text-xs px-2 py-1 rounded-md border ${parseFloat(widthMm) === w ? 'border-gray-900 text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {String(w).replace('.', ',')}
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}
