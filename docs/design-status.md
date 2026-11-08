# Design status: UI/UX (2026-11-08)

Where the design of the tool stands, what is decided, and what waits on LaSER. Screens are in [`img/screens/`](img/screens/). The research behind it is in [`research-ux-hosting.md`](research-ux-hosting.md).

## Who it's for
- **Users:** researchers (3 at LaSER, plus external researchers for single papers; ~5 users, 10 at most). They make the charts themselves to see how the paper will look, then hand the SVGs to the designer, who lays out the paper (PDF + print).
- **Use pattern:** in bursts around each report, a few times a month. So the tool must be self-explanatory every time.
- **Device:** a PC (desktop-first). The user prompts from a phone, but the tool is not designed for phones.
- **Goal:** every researcher produces charts in one standard (LaSER style), with only minor adjustments.

## The current flow
| # | Screen | What happens | Image |
|---|---|---|---|
| 1 | Sign in | Supabase email login (skipped in local dev) | — |
| 2 | Dashboard | "Projects" + "+ New Project". Project cards. *Hidden shortcut:* drop an Excel file on the page → a new project named after the file | `01-dashboard.png` |
| 3 | Empty project | "Upload an Excel file to get started"; "+ Add charts from a file" or drop anywhere. An "Untitled Project" is renamed after the uploaded file | `02-empty-project.png` |
| 4 | Sheet picker | Shown when the file has several sheets. Each sheet: title, suggested chart type, size. Non-data sheets are greyed out with the reason. "Create N charts" | `03-sheet-picker.png` |
| 5 | Editor | **Left:** chart list with live thumbnails and a ⚠ count of parser notes. **Centre:** the chart at real mm size, Fit/100%/200%, "Export SVG" (the active chart). **Right:** settings for the chart type. **Bottom:** Data panel | `04-editor.png` |
| 6 | Data panel | Parser notes, the table as read, untick rows/series, **edit values in place**, swap rows/columns | `05-editor-data-panel.png` |
| 7 | Rename | Click the project name in the top bar. Everything autosaves | — |

Adding more files to a project: every sheet becomes a **new** chart. A single-sheet upload only fills the open chart if that chart is empty.

## Chart types
See [`img/screens/00-chart-gallery.png`](img/screens/00-chart-gallery.png).
- **Bars:** single, grouped (several series), stacked, horizontal, horizontal grouped by country (merged cells). Order: as in Excel / largest first. Bar width. Value labels inside/outside.
- **Lines:** single, filled area, several lines with markers. Value labels first-and-last / all points (labels of close lines are kept apart).
- **Dot plot:** single strip or several strips, highlighted countries, reference marker (EU / ES-27), "other countries" label.
- **Everywhere:** Latvian number format, country colours, year format (2016 17 … 2026 / all 4 digits), free width × height in mm with 77,5 / 165 presets.

## Decided
- **Keep the three-pane editor** (chart list | chart | settings). No wizard: with ~5 charts per upload and repeat users, it adds clicks without adding clarity.
- **No marketing-style UI** (user, 2026-11-08): no hero drop box, no big explanatory headlines. Plain heading + primary button. Shortcuts may exist but stay invisible until used. (Recorded in the `frontend-ui` skill.)
- **Excel is the only input** for now (no paste-a-table). **SVG to the designer is the only output** for now (no PNG/PDF).
- **Size:** 77,5 / 165 mm are the designer's convention, not a hard rule. Free width and height stay.
- **Editing values in the tool** is wanted (built). The Excel file isn't changed.
- **Text stays editable** in the SVG (designer). Montserrat must be installed where the SVG is opened.

## Built in this round
- Chart list thumbnails + ⚠ note count.
- Editable values in the Data panel.
- Project named after the uploaded file. Drop-a-file shortcut on the dashboard.
- Fixes: upload adds a chart instead of replacing; line labels don't overlap; bar/line label settings don't leak between types; CSV separator detection; year-only header row.

## Ideas waiting on LaSER's answers
| Idea | Depends on | Mockup |
|---|---|---|
| **F2: overview of all charts** after upload, with warnings and "Download all (ZIP)" | Q1 (how many charts per file) | [`img/mock-review.png`](img/mock-review.png) |
| **F3: simple settings panel** with ~4 common controls and the rest under "More options" | Q5 (which settings they really change) | [`img/mock-edit.png`](img/mock-edit.png) |
| Re-upload keeps each chart's settings (matched by sheet name) | Q2 (fix numbers in Excel or in the tool) | — |
| Shared team space vs personal projects; external researchers see only their project | Q3, Q4 | — |
| Lock colours to the country palette | Q6 (and round-1 Q1/Q2) | — |
| Latvian UI | round-1 Q10 | — |

Questions: [`laser-questions.md`](laser-questions.md), "2. kārta" (ready in Latvian). The user sends them with `img/v3-*.png` (or the newer `img/screens/`) and the two mockups.

## Known limits
- Numbers edited in the tool are lost if the same sheet is uploaded again.
- With 3+ lines bunched together, a middle value label can sit on a neighbouring line.
- Export is one chart at a time.
