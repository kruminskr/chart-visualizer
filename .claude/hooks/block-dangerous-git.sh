#!/bin/bash
# PreToolUse(Bash): block destructive git commands before they run.
# Adapted from mattpocock/skills misc/git-guardrails-claude-code (MIT).
# Normal `git push` stays allowed (the workflow pushes to the session branch);
# history rewrites and commands that silently discard work are blocked.
COMMAND=$(jq -r '.tool_input.command // empty')

DANGEROUS_PATTERNS=(
  'git push.*(--force|-f( |$)|--force-with-lease)'
  'git push.*(origin|upstream) +(main|master)( |$)'
  'git reset --hard'
  'git clean -[a-zA-Z]*f'
  'git branch -D'
  'git checkout +(--|\.)( |$)'
  'git checkout( .*)? -- '
  'git restore( |$)'
  'git stash (drop|clear)'
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    if [[ "$pattern" == *restore* ]] && echo "$COMMAND" | grep -qE 'git restore --staged( |$)' && ! echo "$COMMAND" | grep -q -- '--worktree'; then
      continue  # unstaging is safe
    fi
    echo "BLOCKED: '$COMMAND' matches '$pattern' (destructive git). Use git diff + manual edits, or git stash, instead. If it is truly needed, ask the user to run it." >&2
    exit 2
  fi
done

# `git checkout <path>` discards uncommitted edits to that file without warning.
# Block when any non-flag argument is an existing file (branch switches pass).
if [[ "$COMMAND" =~ git[[:space:]]+checkout[[:space:]]+(.*) ]]; then
  cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true
  for arg in ${BASH_REMATCH[1]%%[;&|]*}; do
    [[ "$arg" == -* ]] && continue
    if [ -f "$arg" ]; then
      echo "BLOCKED: 'git checkout $arg' would discard uncommitted changes to $arg. Use git diff + manual edits, or git stash." >&2
      exit 2
    fi
  done
fi
exit 0
