'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChartList from '@/components/ChartList';
import Inspector from '@/components/Inspector';
import ChartPreview from '@/components/ChartPreview';
import SheetPicker from '@/components/SheetPicker';
import Header from '@/components/Header';
import { parseFile, normalizeData, isAcceptedFile, transposeData, applyExclusions } from '@/utils/excelParser';
import DataPanel from '@/components/DataPanel';
import { exportSVG } from '@/utils/svgExporter';
import { takePendingFile } from '@/utils/pendingFile';

const num = (v, d) => parseFloat(v) || d;

function fromApi(c) {
  return {
    id: c.id,
    type: c.type ?? 'bar',
    title: c.title ?? '',
    unit: c.unit ?? '',
    widthMm: c.widthMm,
    heightMm: c.heightMm,
    data: normalizeData(c.dataJson, c.title),
    config: c.configJson ?? {},
  };
}

const payload = c => ({
  title: c.title, unit: c.unit, type: c.type,
  widthMm: num(c.widthMm, 165), heightMm: num(c.heightMm, 90),
  dataJson: c.data ?? [], configJson: c.config ?? {},
});

function defaultHeight(type, data) {
  if (type === 'dot') return data.series.length === 1 ? 25 : 12 * data.series.length + 14;
  return 90;
}

function chartFromSheet(sheet) {
  const { type, config } = sheet.suggested;
  return {
    type, title: sheet.title, unit: sheet.data.unit ?? '',
    widthMm: 165, heightMm: defaultHeight(type, sheet.data),
    data: sheet.data, config: { ...config, sheetName: sheet.name },
  };
}

export default function ProjectPage() {
  const { id: projectId } = useParams();
  const svgRef = useRef(null);

  const [project, setProject] = useState(null);
  const [charts, setCharts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(null); // { file, sheets }
  const [saveStatus, setSaveStatus] = useState('idle');
  const [zoom, setZoom] = useState('fit');
  const [dragging, setDragging] = useState(false);
  const lastSaved = useRef({}); // id → JSON of the last saved payload
  const timer = useRef(null);

  const active = charts.find(c => c.id === activeId) ?? null;

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false; // StrictMode double-invokes effects; ignore stale responses
    (async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (cancelled || !res.ok) return;
      const proj = await res.json();
      if (cancelled) return;
      const list = proj.charts.map(fromApi);
      list.forEach(c => { lastSaved.current[c.id] = JSON.stringify(payload(c)); });
      setProject(proj);
      setCharts(list);
      setActiveId(list[0]?.id ?? null);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Autosave: any chart whose payload differs from the last save ─────────
  const saveDirty = useCallback(async (list) => {
    const dirty = list.filter(c => JSON.stringify(payload(c)) !== lastSaved.current[c.id]);
    if (dirty.length === 0) return;
    setSaveStatus('saving');
    await Promise.all(dirty.map(async c => {
      const body = JSON.stringify(payload(c));
      const res = await fetch(`/api/projects/${projectId}/charts/${c.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
      });
      if (res.ok) lastSaved.current[c.id] = body;
    }));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [projectId]);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveDirty(charts), 1000);
    return () => clearTimeout(timer.current);
  }, [charts, loaded, saveDirty]);

  const updateActive = patch => setCharts(list => list.map(c => (c.id === activeId ? { ...c, ...patch } : c)));

  // ── Create / delete ─────────────────────────────────────────────────────
  async function createChart(fields) {
    const res = await fetch(`/api/projects/${projectId}/charts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(fields)),
    });
    const saved = await res.json();
    const chart = { ...fields, id: saved.id };
    lastSaved.current[chart.id] = JSON.stringify(payload(chart));
    return chart;
  }

  async function deleteChart(id) {
    if (!window.confirm('Delete this chart?')) return;
    await fetch(`/api/projects/${projectId}/charts/${id}`, { method: 'DELETE' });
    delete lastSaved.current[id];
    setCharts(list => {
      const next = list.filter(c => c.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  // ── Upload ──────────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!isAcceptedFile(file.name)) {
      setError('Please upload an Excel (.xlsx, .xls), OpenDocument (.ods) or CSV file.');
      return;
    }
    const result = await parseFile(file);
    const usable = result.sheets.filter(s => !s.error);
    if (usable.length === 0) {
      setError(result.error);
      return;
    }
    setError(null);
    if (project?.title === 'Untitled Project') handleProjectRename(file.name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim());
    if (usable.length === 1) await applySheets(file, usable);
    else setPicker({ file, sheets: result.sheets });
  }

  async function applySheets(file, sheets) {
    setPicker(null);
    const created = [];
    let replaceId = null;
    for (const [i, sheet] of sheets.entries()) {
      const fields = chartFromSheet(sheet);
      // The first sheet fills the active chart only if it is empty; otherwise every sheet becomes a new chart
      // (replacing an existing chart's data on upload surprised users).
      if (i === 0 && active && !active.data?.series?.length) {
        replaceId = active.id;
        setCharts(list => list.map(c => (c.id === active.id ? { ...c, ...fields, id: c.id, widthMm: c.widthMm } : c)));
      } else {
        created.push(await createChart(fields));
      }
    }
    if (created.length) {
      setCharts(list => [...list, ...created]);
      setActiveId(replaceId ?? created[0].id);
    }

    // Keep the original workbook once, referenced by every chart made from it.
    const form = new FormData();
    form.append('file', file);
    const up = await fetch('/api/upload', { method: 'POST', body: form });
    if (up.ok) {
      const { path } = await up.json();
      const ids = [replaceId, ...created.map(c => c.id)].filter(Boolean);
      await Promise.all(ids.map(id => fetch(`/api/projects/${projectId}/charts/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataFileUrl: path }),
      })));
    }
  }

  async function handleProjectRename(newTitle) {
    if (!newTitle.trim() || newTitle === project?.title) return;
    setProject(prev => ({ ...prev, title: newTitle }));
    await fetch(`/api/projects/${projectId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }),
    });
  }

  // A file dropped on the dashboard opens as soon as its new (empty) project has loaded.
  useEffect(() => {
    const file = loaded && takePendingFile();
    if (file) Promise.resolve(file).then(handleFile);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps -- once per load; takePendingFile() empties the slot

  const widthMm = num(active?.widthMm, 165);
  const heightMm = num(active?.heightMm, 90);
  const hasData = active?.data?.series?.length > 0;
  const shown = hasData ? applyExclusions(active.data, active.config?.exclude) : null;

  // Drop a spreadsheet anywhere on the page.
  const dropProps = {
    onDragOver: e => { if (loaded && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } },
    onDragLeave: e => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) setDragging(false); },
    onDrop: e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); },
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" {...dropProps}>
      <Header user={project ? { email: '' } : null} projectTitle={project?.title} onProjectRename={handleProjectRename} saveStatus={saveStatus} />

      <div className="flex flex-1 min-h-0">
        <ChartList charts={charts} activeId={activeId} onSelect={setActiveId} onDelete={deleteChart} onFile={handleFile} disabled={!loaded} />

        <main className="flex-1 min-w-0 flex flex-col">
          {hasData && (
            <div className="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 bg-white">
              <p className="flex-1 min-w-0 truncate text-sm text-gray-700" title={active.title}>{active.title || 'Untitled chart'}</p>
              <div className="flex rounded-md bg-gray-100 p-0.5 text-xs" role="group" aria-label="Zoom">
                {[['fit', 'Fit'], [1, '100%'], [2, '200%']].map(([v, t]) => (
                  <button key={t} type="button" onClick={() => setZoom(v)} aria-pressed={zoom === v}
                    className={`px-2 py-1 rounded ${zoom === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>{t}</button>
                ))}
              </div>
              <button type="button" onClick={() => exportSVG(svgRef.current, active.title)}
                className="py-1.5 px-3 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700">
                Export SVG
              </button>
            </div>
          )}

          {error && <p role="alert" className="m-4 mb-0 text-xs text-red-700 bg-red-50 rounded-md p-2.5">{error}</p>}

          <div className="relative flex-1 min-h-0 bg-[#F4F4F5]">
            {hasData ? (
              <ChartPreview svgRef={svgRef} type={active.type} data={shown} zoom={zoom}
                config={{ ...active.config, unit: active.unit }} widthMm={widthMm} heightMm={heightMm} />
            ) : !loaded ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <p className="text-base text-gray-700">Upload an Excel file to get started</p>
                  <p className="text-sm text-gray-500 mt-1">Each sheet with a title, a header row and data becomes a chart. Drop the file here (.xlsx, .xls, .ods or .csv) or use “Add charts from a file”.</p>
                </div>
              </div>
            )}
          </div>

          {hasData && (
            <DataPanel data={active.data} exclude={active.config?.exclude}
              onEditValue={(j, i, v) => updateActive({ data: { ...active.data, series: active.data.series.map((s, k) => (k === j ? { ...s, values: s.values.map((x, n) => (n === i ? v : x)) } : s)) } })}
              onExclude={exclude => updateActive({ config: { ...active.config, exclude } })}
              onSwap={() => updateActive({ data: transposeData(active.data), config: { ...active.config, exclude: undefined, highlight: undefined, reference: undefined } })} />
          )}
        </main>

        {hasData && <Inspector chart={{ ...active, data: shown }} onChange={updateActive} />}
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-gray-900/10 flex items-center justify-center">
          <p className="rounded-lg bg-white px-5 py-3 text-sm text-gray-800 shadow-lg ring-1 ring-gray-200">Drop the file to create charts</p>
        </div>
      )}

      {picker && (
        <SheetPicker fileName={picker.file.name} sheets={picker.sheets}
          onConfirm={sel => applySheets(picker.file, sel)} onCancel={() => setPicker(null)} />
      )}
    </div>
  );
}
