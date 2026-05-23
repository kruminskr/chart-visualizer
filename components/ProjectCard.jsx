'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectCard({ project, onDelete, onRename }) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState('');
  const router = useRouter();

  function startRename(e) {
    e.stopPropagation();
    setDraft(project.title);
    setRenaming(true);
  }

  async function commitRename() {
    setRenaming(false);
    if (draft.trim() && draft !== project.title) {
      onRename(project.id, draft.trim());
    }
  }

  return (
    <div
      className="relative bg-white rounded-lg border border-gray-200 p-5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !renaming && router.push(`/project/${project.id}`)}
    >
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
          onClick={e => e.stopPropagation()}
          className="text-sm font-medium text-gray-800 border-b border-gray-400 bg-transparent focus:outline-none w-full"
        />
      ) : (
        <p className="text-sm font-medium text-gray-800 truncate">{project.title}</p>
      )}

      <p className="text-xs text-gray-400 mt-1">
        Edited {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
      </p>

      {hovered && !renaming && (
        <div className="absolute top-3 right-3 flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={startRename}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Rename
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
