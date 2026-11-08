'use client';

import { useRef } from 'react';
import { ChartIcon } from '@/components/ChartIcons';

const fmtMm = v => String(parseFloat(v) || '').replace('.', ',');

/** Left rail: every chart in the project, plus "Add from Excel". */
export default function ChartList({ charts, activeId, onSelect, onDelete, onFile, disabled }) {
  const inputRef = useRef(null);
  return (
    <nav aria-label="Charts" className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Charts</h2>
        <span className="text-xs text-gray-400">{charts.length}</span>
      </div>

      <ul className="flex-1 overflow-y-auto py-2">
        {charts.map((c, i) => {
          const active = c.id === activeId;
          const name = c.title || `Chart ${i + 1}`;
          return (
            <li key={c.id} className="group relative px-2">
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full text-left flex gap-2.5 rounded-md px-2.5 py-2 pr-8 transition-colors ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className={`mt-0.5 shrink-0 ${active ? 'text-[#E6007E]' : 'text-gray-400'}`}>
                  <ChartIcon type={c.type} horizontal={c.config?.orientation === 'horizontal'} />
                </span>
                <span className="min-w-0">
                  <span className="text-sm leading-snug line-clamp-2" title={name}>{name}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {c.config?.sheetName ? `Sheet ${c.config.sheetName} · ` : ''}{fmtMm(c.widthMm)} × {fmtMm(c.heightMm)} mm
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                aria-label={`Delete ${name}`}
                className="absolute right-3 top-2 p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600 hover:bg-red-50"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8.5h5l.5-8.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="p-3 border-t border-gray-100">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full py-2 px-3 text-sm rounded-md border border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40"
        >
          + Add charts from Excel
        </button>
        <p className="text-[11px] text-gray-400 mt-1.5 text-center">or drop an .xlsx anywhere</p>
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" disabled={disabled}
          onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
      </div>
    </nav>
  );
}
