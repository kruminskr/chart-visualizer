---
name: e2e-testing
description: Write and run tests for LaSER Charts. Vitest for pure utils, Playwright end-to-end tests against the dev server with the dev auth bypass and local Postgres. Use when adding a feature, fixing a bug (write the failing test first), or when a test fails.
---

# Testing

| Layer | Tool | Location | Command |
|---|---|---|---|
| Pure logic (`utils/`, scale math) | Vitest (node env) | `tests/**/*.test.js` | `npm test` |
| Full app in Chromium | Playwright | `e2e/**/*.spec.js` | `npm run test:e2e` |
| Lint | ESLint (next/core-web-vitals) | — | `npm run lint` |

Run a single test: `npx vitest run tests/excelParser.test.js`, `npx playwright test -g "autosave"`.

## How e2e works
- `playwright.config.mjs` starts `npm run dev` with `DEV_AUTH_BYPASS=true` (it reuses a server that's already running) and waits on `/api/health`.
- Tests share one local DB and one dev user, so `workers: 1`. Each test creates its own project via `createProject(page)` and never assumes an empty dashboard.
- Excel input is built in memory by `tests/fixtures/workbooks.js`, so no binary fixtures get committed. Add new shapes there and use them from both Vitest and Playwright.
- `uploadFixture(page, fixtures.single())` uploads and returns the chart `<svg>` locator.

## Rules
- Bug fix → reproduce it with a failing test first, then fix.
- Don't use `waitForTimeout` in tests. Wait on UI state or network (`page.waitForResponse`) instead.
- To check flakiness, run `npx playwright test --repeat-each 5` before saying a new test is stable.
- Never skip or loosen a test to get green. If the spec test fails, the chart is wrong.
- Keep parsing and math pure (like `parseWorkbook`) so it can be unit-tested without a browser.
- Pass `--trace off` (the default in config). Use `--trace on` only to debug one failing test. Failure screenshots and `error-context.md` land in `test-results/`.

## Spec assertions already covered (`e2e/chart-editor.spec.js`)
mm width/height/viewBox · series-1 `#E6007E` · grid stroke 0.088 · year-label rule · export contains Montserrat, no `px`, ≤3 decimals · autosave persists across reload. Extend these whenever chart rendering changes.
