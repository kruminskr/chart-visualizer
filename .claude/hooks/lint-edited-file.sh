#!/bin/bash
# PostToolUse hook: lint a JS/JSX file right after Claude edits it.
# Exit 2 feeds lint errors back to Claude so it fixes them immediately.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.js|*.jsx|*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"
[ -x node_modules/.bin/eslint ] || exit 0

if ! out=$(node_modules/.bin/eslint --no-warn-ignored "$file" 2>&1); then
  echo "ESLint errors in $file:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
