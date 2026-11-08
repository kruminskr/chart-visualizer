'use client';

import { useState } from 'react';

const TYPE_LABEL = {
  bar: c => `${c.stacked ? 'Stacked' : 'Bar'}${c.orientation === 'horizontal' ? ', horizontal' : ''}`,
  line: c => (c.areaFill ? 'Line, filled' : 'Line'),
  dot: () => 'Dot plot',
};

/** Choose which sheets of an uploaded workbook become charts. */
export default function SheetPicker({ fileName, sheets, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(() => sheets.filter(s => !s.error).map(s => s.name));
  const toggle = name => setSelected(sel => (sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]));

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="sheet-picker-title">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 id="sheet-picker-title" className="text-base font-semibold text-gray-800">Create charts from {fileName}</h2>
          <p className="text-xs text-gray-500 mt-1">One chart per selected sheet. You can change the chart type afterwards.</p>
        </div>
        <ul className="overflow-y-auto px-6 py-3 flex flex-col gap-1">
          {sheets.map(s => (
            <li key={s.name}>
              <label className={`flex items-start gap-3 rounded px-2 py-2 ${s.error ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}>
                <input type="checkbox" className="mt-1" disabled={!!s.error} checked={selected.includes(s.name)} onChange={() => toggle(s.name)} />
                <span className="min-w-0">
                  <span className="block text-sm text-gray-800">
                    <span className="text-gray-400 mr-2">{s.name}</span>{s.title || 'Untitled sheet'}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {s.error
                      ? s.error
                      : `${TYPE_LABEL[s.suggested.type](s.suggested.config)} · ${s.data.categories.length} rows · ${s.data.series.length} series`}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="py-2 px-4 text-sm rounded text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="button" disabled={selected.length === 0} onClick={() => onConfirm(sheets.filter(s => selected.includes(s.name)))}
            className="py-2 px-4 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40">
            Create {selected.length} {selected.length === 1 ? 'chart' : 'charts'}
          </button>
        </div>
      </div>
    </div>
  );
}
