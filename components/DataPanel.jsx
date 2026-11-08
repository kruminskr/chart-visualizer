'use client';

import { useState } from 'react';
import { formatNumber } from '@/utils/format';
import { toNumber } from '@/utils/excelParser';

/**
 * What the parser read, under the canvas: warnings, notes, and the table itself.
 * Untick a row or series to leave it out of the chart (e.g. a "Kopā" total row).
 * Values can be corrected in place; an empty cell means "no value".
 */
export default function DataPanel({ data, exclude = {}, onExclude, onSwap, onEditValue }) {
  const [open, setOpen] = useState(false);
  const rows = new Set(exclude.rows ?? []);
  const cols = new Set(exclude.series ?? []);
  const warnings = data.warnings ?? [];
  const toggle = (key, set, i) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i); else next.add(i);
    onExclude({ ...exclude, [key]: [...next].sort((a, b) => a - b) });
  };
  const decimals = Math.min(3, Math.max(0, ...data.series.flatMap(s => s.values.map(v => (v == null ? 0 : (String(v).split('.')[1] ?? '').length)))));
  const excludedCount = rows.size + cols.size;

  return (
    <section aria-label="Data" className="shrink-0 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-3 px-4 h-10">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Data
          <span className="text-xs text-gray-400">
            {data.categories.length} rows × {data.series.length} series{excludedCount ? ` · ${excludedCount} hidden` : ''}
          </span>
        </button>
        {warnings.length > 0 && (
          <span className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 truncate" title={warnings.join('\n')}>
            {warnings.length === 1 ? warnings[0] : `${warnings.length} notes about how the sheet was read`}
          </span>
        )}
        <button type="button" onClick={onSwap} className="ml-auto text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900">
          Swap rows / columns
        </button>
      </div>

      {open && (
        <div className="max-h-64 overflow-auto px-4 pb-3">
          {(warnings.length > 1 || data.notes?.length || data.unit) && (
            <ul className="text-xs text-gray-500 mb-2 flex flex-col gap-0.5">
              {warnings.length > 1 && warnings.map(w => <li key={w} className="text-amber-700">{w}</li>)}
              {data.unit && <li>Unit read from the sheet: <span className="text-gray-800">{data.unit}</span></li>}
              {data.notes?.map(n => <li key={n}>Note below the table: <span className="text-gray-800">{n}</span></li>)}
            </ul>
          )}
          <p className="text-xs text-gray-400 mb-1.5">Click a number to correct it (the Excel file is not changed). Untick a row or series to leave it out.</p>
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="sticky top-0 bg-white font-normal pr-4 py-1">Include</th>
                <th className="sticky top-0 bg-white font-normal pr-4 py-1">Label</th>
                {data.series.map((s, j) => (
                  <th key={j} className="sticky top-0 bg-white font-normal pr-4 py-1 whitespace-nowrap">
                    <label className="inline-flex items-center gap-1.5">
                      <input type="checkbox" className="accent-gray-900" checked={!cols.has(j)} onChange={() => toggle('series', cols, j)}
                        aria-label={`Include series ${s.name || j + 1}`} />
                      <span className={cols.has(j) ? 'line-through text-gray-300' : 'text-gray-700'}>{s.name || `Series ${j + 1}`}</span>
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c, i) => (
                <tr key={i} className={`border-t border-gray-100 ${rows.has(i) ? 'text-gray-300' : 'text-gray-800'}`}>
                  <td className="pr-4 py-1">
                    <input type="checkbox" className="accent-gray-900" checked={!rows.has(i)} onChange={() => toggle('rows', rows, i)}
                      aria-label={`Include row ${c.label}`} />
                  </td>
                  <td className="pr-4 py-1 whitespace-pre">{c.group ? <span className="text-gray-400">{c.group} / </span> : null}{c.label}</td>
                  {data.series.map((s, j) => (
                    <td key={j} className="pr-2 py-0.5">
                      <ValueCell value={s.values[i]} decimals={decimals} muted={cols.has(j) || rows.has(i)}
                        label={`${s.name || `Series ${j + 1}`}, ${c.label}`} onCommit={v => onEditValue(j, i, v)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** One editable number. Commits on blur or Enter; Escape or unreadable input restores the old value. */
function ValueCell({ value, decimals, muted, label, onCommit }) {
  const shown = value == null ? '' : formatNumber(value, decimals);
  const reset = e => { e.target.value = shown; };
  const commit = e => {
    const text = e.target.value.trim();
    if (text === shown) return;
    const next = text === '' ? null : toNumber(text);
    if (text !== '' && next == null) return reset(e);
    onCommit(next);
  };
  return (
    <input key={shown} defaultValue={shown} aria-label={label} placeholder="—" inputMode="decimal"
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { reset(e); e.target.blur(); } }}
      className={`w-20 rounded px-1.5 py-0.5 text-right tabular-nums bg-transparent border border-transparent hover:border-gray-200 focus:border-gray-400 focus:bg-white focus:outline-none placeholder:text-gray-300 ${muted ? 'text-gray-300' : ''}`} />
  );
}
