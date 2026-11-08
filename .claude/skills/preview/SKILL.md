---
name: preview
description: See the running LaSER Charts app in a real browser. Start the dev server, take Playwright screenshots (desktop, mobile, or with sample chart data loaded), look at them, and send them to the user. Use whenever a UI or chart change has to be checked visually, the user asks "show me", or before reporting UI work as done.
---

# Preview the app

The user usually works from a phone, so **a screenshot is how they see your work**. Run this loop after any visible change.

## 1. Make sure the environment is up
The SessionStart hook already ran `scripts/dev-setup.sh` (deps, local Postgres, `.env.local` with `DEV_AUTH_BYPASS=true`). If anything looks off, run it again. It is idempotent:
```bash
npm run setup:dev
```

## 2. Start the dev server (in the background)
```bash
npm run dev:bg          # starts it, or says it's already running; waits for /api/health
scripts/dev-server.sh logs 80   # server logs (compile errors, API stack traces)
npm run dev:stop
```
With the dev bypass you're signed in as `dev@laser.local`. `/login` and `/signup` redirect to `/dashboard`.

## 3. Screenshot
```bash
npm run screenshot                        # /dashboard
npm run screenshot -- --demo              # new project + sample .xlsx uploaded → chart editor with a bar chart
npm run screenshot -- /project/<id>       # any path
npm run screenshot -- --demo --mobile     # iPhone 14 viewport
npm run screenshot -- /dashboard --full --out dash.png
```
PNGs go to `screenshots/` (gitignored). The script prints the path, the final URL, and any **browser console errors**. Treat console errors as bugs.

## 4. Look at it, then show the user
- Open the PNG with the **Read** tool to view it yourself. Critique it: alignment, spacing, overflow, truncation, and anything that breaks the chart spec (`chart-spec` skill).
- Send the final before/after images with **SendUserFile** (`display: "render"`). Don't send every intermediate image.

## Custom interactions
For flows the script doesn't cover, write a short throwaway Playwright script in the scratchpad (not the repo). Use `require('playwright')`, `chromium.launch()`, and `baseURL http://localhost:3000`. Follow the reconnaissance-then-action pattern: navigate, wait for the UI, screenshot or `page.content()`, then pick selectors (prefer `getByRole`/`getByText`/`getByPlaceholder`). Use `e2e/helpers.js` and `tests/fixtures/workbooks.js` for project creation and in-memory .xlsx files.

Notes:
- Playwright 1.63.0 and Chromium are pre-installed. Never run `playwright install`.
- The first request to each route compiles it (a few seconds). Later requests are fast.
