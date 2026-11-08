'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Header({ user, projectTitle, onProjectRename, saveStatus }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const router = useRouter();

  async function handleLogout() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Dev auth bypass has no real Supabase session to end.
    }
    router.push('/login');
    router.refresh();
  }

  function startEdit() {
    setDraft(projectTitle ?? '');
    setEditing(true);
  }

  function commitEdit() {
    setEditing(false);
    onProjectRename?.(draft);
  }

  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : '';

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-5 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/dashboard" className="text-sm font-semibold text-gray-800 tracking-wide uppercase hover:text-gray-600 shrink-0">
          LaSER Charts
        </Link>

        {projectTitle !== undefined && (
          <>
            <span className="text-gray-300 shrink-0">/</span>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                className="text-sm text-gray-800 border-b border-gray-400 bg-transparent focus:outline-none min-w-0 w-48"
              />
            ) : (
              <button
                onClick={startEdit}
                className="text-sm text-gray-600 hover:text-gray-900 truncate max-w-xs text-left"
                title="Click to rename"
              >
                {projectTitle}
              </button>
            )}
          </>
        )}

        {saveLabel && (
          <span className="text-xs text-gray-400 shrink-0">{saveLabel}</span>
        )}
      </div>

      {user && (
        <div className="flex items-center gap-3 shrink-0">
          {user.email && <span className="text-xs text-gray-400">{user.email}</span>}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
