# Handoff — 2026-11-08

## Where we are
v2 P0–P3 are implemented on `claude/dev-environment-setup-4an2ao`:
- Workbook upload → sheet picker → one chart per sheet, with chart tabs per project.
- Latvian number format and the country palette.
- Bars: vertical/horizontal, grouped/stacked, groups from merged cells, value labels, bar width.
- Lines: multi-series, markers, area fill, label thinning.
- Dot plot: highlight, EU reference.
- Year format toggle.
Not done: P4 (header block with figure number, title and source; PDF/CMYK), dot-plot rating bands, Latvian UI.

## Next steps
1. Show LaSER the screenshots and get answers to `docs/plan-v2.md` §8. Text stays as live `<text>` (the designer wants editable text and fonts).
2. P4: optional header block in the SVG (figure no., title, source, note), plus spacing to the PDF spec (y labels 0.7 mm above the line, 15 mm left inset).
3. Dot plot: rating bands (Ļoti vāji 0–4 …); highlight label collision polish.
4. Latvian UI, if the user confirms (plan Q4).

## Open questions (need the user / unverified)
- The palette is country-based, per the designer SVGs (LV #E6007E, EE #F29FC5 or #F088B6?, LT #575756). Waiting for LaSER to confirm. (2026-11-08)
- The mobile editor layout is dropped: the user prompts from a phone, but the tool is used on a PC. (2026-11-08)
- Should CI also run e2e on every push, or only lint and unit tests? It currently runs all of them. (2026-11-08)

## Recent sessions
- 2026-11-08: Built v2 P0–P3 (charts from every sheet, bar/line/dot types).
- 2026-11-08: Planned v2 from LaSER feedback (`docs/plan-v2.md`).
- 2026-11-08: Environment setup, then the skills and `.claude` expansion (gotchas, wrap-up, UI/UX, Matt Pocock, Ponytail).

## Suggested skills for the next session
- `preview`: see the app before and after any UI change.
- `prototype`, `frontend-ui`, `ui-ux-pro-max`: for the mobile editor layout.
- `wrap-up`: at the end.
