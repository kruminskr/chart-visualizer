# Handoff — 2026-11-08 (end of research session)

## Where we are
Branch `claude/dev-environment-setup-4an2ao` (pushed; CI green; **not merged to main**, so not live on Vercel production). The app is a working v2:
- **Input:** upload .xlsx/.xls/.ods/.csv → the parser (`utils/excelParser.js`) finds the table on each sheet → sheet picker → one chart per sheet. It handles titles and units, gaps, 1–2 header rows, years across columns (auto-swap), %, dates, hidden rows, and Latvian CSV encodings. Everything it skips becomes a warning.
- **Editor:** three panes. Left: chart list. Centre: artboard canvas with Fit/100%/200% zoom, Export SVG, and a data panel (warnings, untick rows/series, swap rows/columns). Right: inspector.
- **Charts:** bars (vertical/horizontal, grouped/stacked, groups from merged cells, sort, bar width, value labels), lines (multi, markers, area fill, first/last value labels, label thinning), dot plot (highlight, EU reference, single- and multi-strip). Latvian number format, country palette, year format toggle.
- **Verified against the designer's SVGs** (`docs/svg-comparison.md`): sizes, colours, strokes and fonts match.

## Next steps
0. **Waiting on the user's decisions from `docs/research-ux-hosting.md`** (UX: "workbook in → set out" with a check grid, ZIP export, simple editor with "More options", replace workbook while keeping adjustments; hosting: recommended option B = Neon + Better Auth (or Cloudflare Access) + Vercel Pro or Netlify, and drop Supabase Storage). Build whatever they pick, UX quick wins first.
1. Send `docs/laser-questions.md` (Latvian, ready). Record the answers there and update `docs/plan-v2.md`.
2. Work that needs no LaSER input: a paste-a-table input (same parser); Excel templates per chart type; export all charts as a zip; duplicate a chart; wrapping long category labels and long legends; negative values in stacked/horizontal bars; undo.
3. After LaSER answers: lock the country colours, an optional header block (figure no., title, source, note), CMYK/PDF if needed, dot-plot rating bands, group order, Latvian UI.
4. Merge the branch to `main` when the user wants it live (Vercel deploys main; branches get preview URLs). No DB migration is needed: the schema is unchanged and config lives in `configJson`.

## Open questions
- Current hosting has two problems (2026-11-08, see research doc §2.2): Vercel Hobby is non-commercial only, and Supabase Free pauses after ~7 idle days. Supabase Storage holds uploads that nothing reads.
- All LaSER questions: `docs/laser-questions.md` (colours, CMYK, header block, "0" vs "0,0", group order, rating bands, missing 9. attēls data, UI language).
- **LaSER's reference files (workbook, 9 designer SVGs, PDF spec) are not in git** (`Examples/*.xlsx|svg|pdf` are gitignored on purpose). To re-run the SVG comparison, the user must upload them again or decide to commit them. (2026-11-08)
- Should CI keep running e2e on every push? It takes about 1,5 min and is currently fine. (2026-11-08)

## Recent sessions
- 2026-11-08: Research only: UX deep dive (Datawrapper/Flourish/think-cell patterns, concept mockups in `docs/img/`) and hosting/auth/DB options → `docs/research-ux-hosting.md`.
- 2026-11-08: Parser v3 + data panel; three-pane editor; SVG comparison vs designer files + fixes; LaSER questions file.
- 2026-11-08: Built v2 chart types (bar/line/dot, one chart per sheet); planned v2 from LaSER feedback.
- 2026-11-08: Environment setup (local Postgres + dev auth bypass, Playwright, Vitest, CI) and the `.claude` setup (skills, hooks, gotchas, wrap-up).

## Suggested skills for the next session
- `preview`: screenshot before and after any visible change, and send it to the user (they are on a phone).
- `chart-spec` + the `chart-spec-reviewer` agent: any change to the renderers.
- `e2e-testing` / `tdd`: new features. `tests/parser-cases.test.js` for any parser change.
- `frontend-ui`, `ui-ux-pro-max`, `prototype`: UI work (desktop-first).
- `ship`, then `wrap-up` at the end.
