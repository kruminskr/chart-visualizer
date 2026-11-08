---
name: ship
description: Finish a change in LaSER Charts. Run lint, unit tests, and e2e tests, screenshot UI changes, then commit and push to the working branch and post a phone-friendly summary. Use when a task is done, or when the user says ship/commit/push/wrap up.
---

# Ship a change

1. **Checks** (all must pass; if one fails, fix the cause and don't weaken the test):
   ```bash
   npm run lint && npm test && npm run test:e2e
   ```
   If chart output changed, also run `npm run build` (it catches server/client boundary mistakes).
2. **Visual proof** for UI or chart changes: `npm run screenshot -- --demo` (and `--mobile` if layout changed). View it, then send it with SendUserFile.
3. **Review the diff**: `git diff`. Look for leftover debug code, `console.log`, secrets, files under `screenshots/` or `test-results/`, and `.env*` (only `.env.example` is committed).
4. **Commit** with a conventional message (`feat:`, `fix:`, `chore:`, `test:`, `docs:`) and push to the session's designated branch: `git push -u origin <branch>`.
5. **Summary for the phone**: short bullets on what changed, how it was verified (with test counts), anything left open or needing the user's decision. Keep it skimmable.

Don't open a PR unless the user asks.
