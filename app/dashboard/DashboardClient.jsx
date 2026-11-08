'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';
import { isAcceptedFile } from '@/utils/excelParser';
import { setPendingFile } from '@/utils/pendingFile';

const titleFromFile = name => name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim() || 'Untitled Project';

export default function DashboardClient({ initialProjects }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleNewProject(title = 'Untitled Project', file = null) {
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

  // Shortcut: drop a spreadsheet anywhere → a new project named after it, opened on that file.
  function handleDrop(file) {
    if (!isAcceptedFile(file.name)) {
      setError('Please drop an Excel (.xlsx, .xls), OpenDocument (.ods) or CSV file.');
      return;
    }
    setError(null);
    handleNewProject(titleFromFile(file.name), file);
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
    <main
      className="flex-1 p-8 overflow-auto"
      onDragOver={e => { if (!creating && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleDrop(f); }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
          <button
            onClick={() => handleNewProject()}
            disabled={creating}
            className="py-2 px-4 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {creating ? 'Creating…' : '+ New Project'}
          </button>
        </div>

        {error && <p role="alert" className="mb-4 text-xs text-red-700 bg-red-50 rounded-md p-2.5">{error}</p>}

        {projects.length === 0 ? (
          <div className="text-center text-gray-400 mt-24">
            <p className="text-base">No projects yet.</p>
            <p className="text-sm mt-1">Create your first project to get started.</p>
          </div>
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

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-gray-900/10 flex items-center justify-center">
          <p className="rounded-lg bg-white px-5 py-3 text-sm text-gray-800 shadow-lg ring-1 ring-gray-200">Drop the file to create a project from it</p>
        </div>
      )}
    </main>
  );
}
