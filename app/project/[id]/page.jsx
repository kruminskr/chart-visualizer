'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChartControls from '@/components/ChartControls';
import ChartPreview from '@/components/ChartPreview';
import Header from '@/components/Header';

export default function ProjectPage() {
  const { id: projectId } = useParams();
  const svgRef = useRef(null);

  const [chartId, setChartId] = useState(null);
  const [project, setProject] = useState(null);

  // Chart state
  const [series, setSeries] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('mljrd. EUR');
  const [width, setWidth] = useState(165);
  const [height, setHeight] = useState(90);
  const [error, setError] = useState(null);

  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimerRef = useRef(null);
  const isLoadingRef = useRef(true);

  const widthMm = parseFloat(width) || 165;
  const heightMm = parseFloat(height) || 90;

  // ── Load project + chart on mount ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) return;
      const proj = await res.json();
      setProject(proj);

      if (proj.charts.length > 0) {
        const chart = proj.charts[0];
        setChartId(chart.id);
        setTitle(chart.title);
        setUnit(chart.unit);
        setWidth(chart.widthMm);
        setHeight(chart.heightMm);
        setChartType(chart.type ?? 'bar');

        if (Array.isArray(chart.dataJson) && chart.dataJson.length > 0) {
          const first = chart.dataJson[0];
          // Backward compat: old format is [{year, value}], new is [{name, data}]
          if (first && 'data' in first) {
            setSeries(chart.dataJson);
          } else {
            setSeries([{ name: '', data: chart.dataJson }]);
          }
        }
      }
      isLoadingRef.current = false;
    }
    load();
  }, [projectId]);

  // ── Autosave ────────────────────────────────────────────────────────────────
  const save = useCallback(async (payload) => {
    if (!chartId) return;
    setSaveStatus('saving');
    await fetch(`/api/projects/${projectId}/charts/${chartId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [projectId, chartId]);

  useEffect(() => {
    if (isLoadingRef.current || !chartId) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      save({ title, unit, widthMm, heightMm, type: chartType, dataJson: series ?? [] });
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [title, unit, widthMm, heightMm, chartType, series, chartId, save]);

  // ── Project title rename ────────────────────────────────────────────────────
  async function handleProjectRename(newTitle) {
    if (!newTitle.trim() || newTitle === project?.title) return;
    setProject(prev => ({ ...prev, title: newTitle }));
    await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
  }

  // ── Called by ChartControls after a successful file parse ──────────────────
  async function handleDataLoaded(parsedSeries, parsedTitle, file) {
    setSeries(parsedSeries);
    setTitle(parsedTitle);

    let currentChartId = chartId;

    if (!currentChartId) {
      const res = await fetch(`/api/projects/${projectId}/charts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsedTitle,
          unit,
          widthMm,
          heightMm,
          type: chartType,
          dataJson: parsedSeries,
        }),
      });
      const chart = await res.json();
      setChartId(chart.id);
      currentChartId = chart.id;
    }

    if (file && currentChartId) {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (uploadRes.ok) {
        const { path } = await uploadRes.json();
        await fetch(`/api/projects/${projectId}/charts/${currentChartId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataFileUrl: path }),
        });
      }
    }
  }

  // First series data for display checks
  const hasData = series && series.length > 0 && series[0].data.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header
        user={project ? { email: '' } : null}
        projectTitle={project?.title}
        onProjectRename={handleProjectRename}
        saveStatus={saveStatus}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChartControls
          series={series} title={title} unit={unit} width={width} height={height}
          error={error} svgRef={svgRef} chartType={chartType}
          setTitle={setTitle} setUnit={setUnit}
          setWidth={setWidth} setHeight={setHeight} setError={setError}
          setChartType={setChartType}
          onDataLoaded={handleDataLoaded}
        />

        <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          {hasData ? (
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
                  series={series}
                  unit={unit}
                  widthMm={widthMm}
                  heightMm={heightMm}
                  chartType={chartType}
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
    </div>
  );
}
