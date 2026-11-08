'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChartControls from '@/components/ChartControls';
import ChartPreview from '@/components/ChartPreview';
import SheetPicker from '@/components/SheetPicker';
import Header from '@/components/Header';
import { parseFile, normalizeData } from '@/utils/excelParser';

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
    type, title: sheet.title, unit: '',
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
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload an .xlsx file.');
      return;
    }
    const result = await parseFile(file);
    const usable = result.sheets.filter(s => !s.error);
    if (usable.length === 0) {
      setError(result.error);
      return;
    }
    setError(null);
    if (usable.length === 1) await applySheets(file, usable);
    else setPicker({ file, sheets: result.sheets });
  }

  async function applySheets(file, sheets) {
    setPicker(null);
    const created = [];
    let replaceId = null;
    for (const [i, sheet] of sheets.entries()) {
      const fields = chartFromSheet(sheet);
      // The first sheet fills the active chart if it is empty, or replaces its data on a single-sheet upload.
      if (i === 0 && active && (!active.data || sheets.length === 1)) {
        replaceId = active.id;
        const keep = active.data ? { type: active.type, config: { ...active.config, sheetName: sheet.name } } : {};
        setCharts(list => list.map(c => (c.id === active.id ? { ...c, ...fields, ...keep, id: c.id, widthMm: c.widthMm } : c)));
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

  const widthMm = num(active?.widthMm, 165);
  const heightMm = num(active?.heightMm, 90);
  const hasData = active?.data?.series?.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header user={project ? { email: '' } : null} projectTitle={project?.title} onProjectRename={handleProjectRename} saveStatus={saveStatus} />

      <div className="flex flex-1 overflow-hidden">
        <ChartControls chart={active ?? {}} onChange={updateActive} onFile={handleFile} error={error} svgRef={svgRef} disabled={!loaded} />

        <main className="flex-1 flex flex-col overflow-hidden">
          {charts.length > 0 && (
            <nav className="flex gap-1 px-6 pt-4 overflow-x-auto shrink-0" aria-label="Charts">
              {charts.map((c, i) => (
                <div key={c.id} className={`group flex items-center rounded-t border border-b-0 text-xs ${c.id === activeId ? 'bg-white border-gray-200 text-gray-900' : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-800'}`}>
                  <button type="button" onClick={() => setActiveId(c.id)} className="pl-3 pr-1 py-2 max-w-56 truncate" aria-current={c.id === activeId}>
                    {c.title || `Chart ${i + 1}`}
                  </button>
                  <button type="button" onClick={() => deleteChart(c.id)} aria-label={`Delete ${c.title || `chart ${i + 1}`}`}
                    className="px-2 py-2 text-gray-300 hover:text-red-500">×</button>
                </div>
              ))}
            </nav>
          )}

          <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto bg-white border-t border-gray-200">
            {hasData ? (
              <div className="w-full max-w-4xl">
                {active.title && (
                  <p className="mb-3 text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif', color: '#595959' }}>{active.title}</p>
                )}
                <div className="bg-white shadow-sm rounded-lg p-6 ring-1 ring-gray-100">
                  <ChartPreview svgRef={svgRef} type={active.type} data={active.data}
                    config={{ ...active.config, unit: active.unit }} widthMm={widthMm} heightMm={heightMm} />
                </div>
              </div>
            ) : !loaded ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-base">Upload an Excel file to get started</p>
                <p className="text-xs mt-1">Each sheet with a title row, a header row and data becomes a chart</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {picker && (
        <SheetPicker fileName={picker.file.name} sheets={picker.sheets}
          onConfirm={sel => applySheets(picker.file, sel)} onCancel={() => setPicker(null)} />
      )}
    </div>
  );
}
