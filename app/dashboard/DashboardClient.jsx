'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';
import { ACCEPTED_FILES, isAcceptedFile } from '@/utils/excelParser';
import { setPendingFile } from '@/utils/pendingFile';

const titleFromFile = name => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Untitled Project';

export default function DashboardClient({ initialProjects }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const router = useRouter();

  async function createProject(title, file) {
    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      setCreating(false);
      setError('Could not create the project. Please try again.');
      return;
    }
    const project = await res.json();
    if (file) setPendingFile(file);
    router.push(`/project/${project.id}`);
  }

  function handleFile(file) {
    if (!isAcceptedFile(file.name)) {
      setError('Please choose an Excel (.xlsx, .xls), OpenDocument (.ods) or CSV file.');
      return;
    }
    setError(null);
    createProject(titleFromFile(file.name), file);
  }

  async function handleDelete(id) {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  async function handleRename(id, newTitle) {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title: newTitle } : p));
  }

  return (
    <main className="flex-1 p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div
          className={`rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors ${dragging ? 'border-[#E6007E] bg-[#FCE5F1]/40' : 'border-gray-300 bg-white'}`}
          onDragOver={e => { if (!creating && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <h2 className="text-lg font-semibold text-gray-900">Make charts from an Excel file</h2>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
            Drop the file here. Every sheet with a table becomes a chart in the LaSER style, and you choose which ones to keep.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={creating}
            className="mt-5 py-2 px-4 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {creating ? 'Opening…' : 'Choose a file'}
          </button>
          <p className="text-xs text-gray-400 mt-2">.xlsx, .xls, .ods or .csv</p>
          <input ref={inputRef} type="file" accept={ACCEPTED_FILES} className="hidden" aria-label="Excel file"
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
          {error && <p role="alert" className="mt-4 text-xs text-red-700 bg-red-50 rounded-md p-2.5 inline-block">{error}</p>}
        </div>

        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Recent projects</h2>
          <button
            type="button"
            onClick={() => createProject('Untitled Project')}
            disabled={creating}
            className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40"
          >
            + Empty project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">No projects yet. Your first file will appear here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
