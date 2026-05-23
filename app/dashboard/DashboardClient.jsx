'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';

export default function DashboardClient({ initialProjects }) {
  const [projects, setProjects] = useState(initialProjects);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function handleNewProject() {
    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Project' }),
    });
    const project = await res.json();
    router.push(`/project/${project.id}`);
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
          <button
            onClick={handleNewProject}
            disabled={creating}
            className="py-2 px-4 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {creating ? 'Creating…' : '+ New Project'}
          </button>
        </div>

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
    </main>
  );
}
