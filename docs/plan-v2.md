# LaSER Charts v2 — plan

Status: **draft for decisions** (2026-11-08). No code written yet. Sections marked ❓ need an answer before or during implementation (see "Decisions" at the end).

## 1. What LaSER asked for

Feedback from LaSER after using the MVP (translated). Their attachments are mapped to the screenshots and SVGs they sent:

| # | Request | Example | Their data (`vizualizacijas_dati.xlsx`) | Designer SVG |
|---|---|---|---|---|
| R1 | Upload **one workbook**; each **sheet becomes one chart** | — | 7 sheets | — |
| R2 | Bar chart with **several series** (grouped) | 16. attēls (Baltic companies 2019–2024) | sheet `1` | `_16.svg` |
| R3 | **Stacked** bars | Baltic defence investment vs PT/HU/CZ/FI | sheet `2` | — |
| R4 | Bar chart **vertical and horizontal** | 11. attēls (licensed companies), 7. attēls (association members) | sheets `3`, `4` | `_11.svg`, `_07.svg` |
| R5 | Line chart with **several lines** | 17. attēls (industry turnover) | sheet `5` | `_17.svg` |
| R6 | Line chart: **fill under the line** as a checkbox | 1. attēls (conflicts 1946–2024) | sheet `6` | `_09_bez_teksta-52.svg` |
| R7 | **Dot plot** ("hard to make in Excel"; they wondered about an AI tool) | Sovereignty index (data in Excel); 25. attēls R&D (data *not* in Excel) | sheet `7` | `_25.svg` |

Also, from you: **you prompt from a phone, but LaSER (and you) use the tool on a PC.** The editor is desktop-first. A mobile editor layout is not a goal.

## 2. What the designer's files tell us (the target)

From the 9 Illustrator SVGs:

- **Sizes:** the viewBoxes are in pt. 467.72 pt = **165 mm** and 219.69 pt = **77.5 mm**, so our width presets are exactly right. Heights vary per chart (45–256 pt).
- **Text is converted to outlines** (paths, no `<text>`, no font). Our export uses `<text>` + a Google Fonts `@import`. Illustrator/InDesign ignore `@import`, so Montserrat only works if it is installed on the PC. ❓ D1
- **Colours are tied to countries, not to series order:**
  - Latvija `#E6007E` (magenta)
  - Igaunija light pink: `#F29FC5` in 16/17, `#F088B6` in 07/09 ❓ D2
  - Lietuva `#575756` (dark grey)
  - Other countries: grey `#C6C6C6` / `#9D9D9C`
  - EU average: `#1D1D1B` / black
  - Area fill: `#FCE5F1` (magenta tint)
  - Background band in the dot plot: `#F2F2F2`
  - Our placeholder palette (navy / teal / amber in `lib/brandColors.js`) is wrong and must go. The stacked example (green / magenta / blue) is a one-off. ❓ D2
- **Strokes:** grid 0.25 pt `#B3B3B3` ✔ (already). Single line 1 pt. Multi-line 0.5 pt with point markers. Labels `gray` (#808080) ✔.
- **Legend:** dots of r = 2.83 pt (1 mm) **above** the plot, right-aligned, with the text in the series colour. We currently draw rectangles below the plot.
- **Value labels:** inside the bar end in white (16, 11), or outside in grey (07).
- **Numbers use a decimal comma** ("0,5", "1,6"). We currently print "0.5". This is a bug in every chart today.
- **Year labels:** 16/17/11 show all years in full 4 digits (6–9 categories). Only the dense 1946–2024 axis uses 1946, 52, 58 … 2024. That conflicts with the rule in CLAUDE.md ("middle years always 2 digits"). ❓ D3
- **Title / source / figure number** ("17. attēls", bold title, "Avots: …") are in some exported files (09_kopa) and absent in others (07, 11). ❓ D4

## 3. Data: how a sheet becomes a chart

Their workbook shows real-world mess that the parser must handle:

- **A1 = title** (long text), **next row = header**, then data. ✔ (current parser)
- **Helper blocks below the data:** sheets 2 and 7 have Excel scatter-plot tricks (X/Y rows, band coordinates) under the table. Rule: **the table ends at the first fully empty row**, and everything below is ignored.
- **First column = categories:** years (1–4) *or* text (countries, associations). The current parser requires years 1900–2100. That must become "any category".
- **Line breaks in labels:** `Baltijas\r\nvalstis` must stay a 2-line axis label.
- **Merged cells as groups:** sheet 4 has `Latvija` merged over 4 rows. That gives grouped categories (7. attēls: the country label coloured, sub-bars per association).
- **Sparse stacked data:** sheet 2 has Lietuva/Igaunija/Latvija values in one row only, and `Pārējās` (others) elsewhere. Stacked bars must treat empty cells as 0, not as errors.
- **Sheet names are just "1" … "7".** The sheet picker must show the A1 title, not only the sheet name.

**Auto-detected chart type (suggestion only, the user can change it):**

| Shape | Suggest |
|---|---|
| Years + 1 series, many rows (>20) | Line (+ fill) |
| Years + several series | Grouped vertical bars (or multi-line) |
| Text categories + 1 series | Horizontal bars |
| Merged first column | Horizontal bars, grouped by category |
| Sparse rows that sum per category | Stacked bars |
| Wide table: entity per row × ≥3 numeric columns (sheet 7) | Dot plot |

## 4. Chart types (target spec)

### 4.1 Bar chart
- **Orientation:** vertical | horizontal.
- **Mode:** single | grouped (several series side by side) | stacked.
- **Category groups** (horizontal only, from merged cells): group label on the left in the group colour, thin separators between groups (07).
- **Value labels:** off | inside (white) | outside (grey). Lv number format, configurable decimals.
- **Legend:** top-right dots, shown automatically when there are 2+ series.
- Stacked: segment labels inside, optional total above. ❓ D5 (flags under the bars, as in the screenshot: probably out of scope)

### 4.2 Line chart
- 1…n lines. 1 line = 1 pt with no markers. n lines = 0.5 pt with point markers (per 17).
- **Fill under the line:** checkbox (single line only; `#FCE5F1`).
- Legend as above. Y-axis decimals in lv format.
- Dense year axes: automatic label thinning (every k-th year, always first and last), per 1. attēls.

### 4.3 Dot plot (new) — R7
This is the strongest case for building it in. It is the chart they say is hardest in Excel, and it is fully rule-based.
- **Data:** one row per entity (country), one column per dimension (Klimats, Ekonomika …). One dimension → a single strip (25. attēls). Several → one strip per dimension (sovereignty index).
- **Highlight:** pick entities to highlight (default: Latvija, Lietuva, Igaunija, coloured per country, labelled above the dot). All others are grey dots with multiply blending, so overlaps darken as in the original.
- **Reference:** pick one row (e.g. "EU" / "Vidēji ES-27") and draw it as a vertical tick, labelled.
- **Optional bands:** named ranges on the axis (Ļoti vāji 0–4 …) with dashed separators.
- **Out of scope for v2:** the callout boxes with flags and per-country notes. These are editorial annotation, better added by the designer. ❓ D6
- **"Data not in Excel"** (25. attēls): we provide a **downloadable Excel template per chart type**. For a quick chart, an optional **paste-a-table** box (copy cells from anywhere, paste, done) avoids Excel entirely.
- **On "use an AI tool instead":** I'd advise against an AI generating the chart itself. Output must be identical every time and pixel-exact to the brand spec, which a deterministic renderer guarantees and an AI does not. AI *can* help with data entry: pasting a table from a PDF or web page into the template. That can be a later add-on.

## 5. Architecture changes

Kept to what the features need:

1. **Workbook-level upload** (R1): parse all sheets client-side, then a picker of `[sheet title, detected shape, suggested type]`. "Create charts" makes one `Chart` per selected sheet. Prisma: add `Chart.sheetName String?`. Store the file once per upload and reference it from each chart (the existing `dataFileUrl`).
2. **Project page shows all charts.** Today it opens only `charts[0]`. The editor gets a chart list (left rail), and each chart has its own settings and autosave.
3. **Normalised data shape** for every type: `{ title, categories: [{label, group?}], series: [{name, values: number|null[]}] }`. It is stored in `dataJson`. Old `[{name,data:[{year,value}]}]` charts are migrated on load (already partly handled).
4. **Config** in `configJson`: `{ type, orientation, mode, valueLabels, decimals, areaFill, highlight[], reference, bands[], seriesColors{}, header{figureNo,title,source,note}, yMin/yMax? }`. No new tables.
5. **Renderer split:** pure `layout*()` functions (data + config + size → shapes with rounded mm coordinates) and thin JSX components. Shared parts: `formatNumberLv`, `colorFor(seriesName)`, `Legend`, `GridY/X`, `CategoryAxis`. Pure layout = unit-testable and reusable by text-to-outline export.
6. **Palette module:** country → colour map (LV/EE/LT/EU/other) plus an ordered fallback, and a per-series colour override chosen **from the brand palette only** (no free hex picker).

## 6. Phases

Each phase ships on its own with tests and screenshots.

| Phase | Content | Size |
|---|---|---|
| **P0 Foundations** | lv number format; country palette; parser v2 (table block, text categories, merged groups, line breaks, sparse cells); workbook → sheet picker → one chart per sheet; chart list in project; real workbook as golden fixtures | L |
| **P1 Bars** | legend/labels to designer spec; grouped colours; stacked; horizontal; horizontal grouped-by-category (07) | L |
| **P2 Lines** | multi-line spec (0.5 pt + markers + legend); area-fill checkbox; dense-axis thinning | M |
| **P3 Dot plot** | new type: strips, highlight, reference tick, bands, labels; Excel template | L |
| **P4 Export fidelity** | optional header block (figure no., title, source, note); text-as-outlines option (if D1 says yes); visual diff vs designer SVGs | M |
| **P5 Later** | paste-a-table input; Excel templates for all types; AI-assisted data import; callouts | — |

Order rationale: P0 unblocks everything and fixes bugs visible in every chart today (decimal comma, colours). Bars and lines are the most-used. The dot plot is the biggest single win for LaSER, but needs P0's parser.

## 7. How we'll verify

- **Golden data tests:** each sheet of their workbook must produce the expected normalised data (Vitest).
- **Spec tests per type** (Playwright): mm size, palette by country, 0.088 grid, lv decimals, ≤3 decimals in coordinates, legend position.
- **Visual check against the designer SVGs:** render the same data at the same size, screenshot both, overlay. Each phase sends you before/after screenshots.

## 8. Decisions needed

**From LaSER** (questions to send, see the draft reply below): D1 text as outlines? · D2 official palette and which Igaunija pink · D3 year-label rule · D4 title/source inside the SVG? · D5 stacked: totals/flags? · D6 callouts in or out · which program opens the SVGs (Illustrator / InDesign / Word)?

**From you** (see chat): scope and order of phases, workbook/fixtures in git, UI language, whether to reply to LaSER now.

## 9. Draft reply to LaSER (Latvian)

> Paldies, viss izklausās ļoti labi un ir realizējams. Īss plāns:
>
> 1. **Viens Excel fails → grafiks no katras lapas.** Augšupielādējot failu, programma parādīs visas lapas ar nosaukumiem, un jūs izvēlēsieties, no kurām taisīt grafikus. Katrai lapai programma ieteiks grafika veidu.
> 2. **Stabiņi:** vairākas sērijas blakus, sakrautie stabiņi, vertikālā un horizontālā versija (arī grupēta pa valstīm kā 7. attēlā).
> 3. **Līnijas:** vairākas līnijas vienā grafikā un ķeksītis "aizkrāsot laukumu zem līnijas".
> 4. **Punktu diagramma** (kā 25. attēlā un suverenitātes indeksā): to labprāt uztaisīšu programmā, nevis ar AI rīku. Tā rezultāts vienmēr būs vienāds un precīzi atbilstošs jūsu stilam. Datiem, kas nav Excelī, sagatavošu Excel veidni (vai iespēju datus vienkārši iekopēt).
>
> Daži jautājumi, lai trāpītu precīzi:
> 1. Kurā programmā atverat SVG failus (Illustrator, InDesign, Word)? Vai tekstam SVG jābūt pārvērstam līknēs (kā maketētājas failos), vai pietiek ar Montserrat fontu?
> 2. Vai ir oficiāla krāsu palete? Failos Igaunijai redzu divus rozā toņus (#F29FC5 un #F088B6). Kuru lietot?
> 3. Gadu nosaukumi: 16. un 17. attēlā visi gadi ir ar 4 cipariem, bet 1. attēlā vidējie ir saīsināti (52, 58…). Vai pareizi saprotu, ka saīsina tikai tad, ja gadu ir daudz?
> 4. Vai SVG failā jābūt arī attēla numuram, virsrakstam un avotam, vai tos pievienojat maketā?
> 5. Punktu diagrammas skaidrojošie lodziņi ar karogiem: vai pietiktu, ja programma uztaisa pašu diagrammu, un lodziņus pievieno maketētāja?
>
> SVG failus jau saņēmu, tie ļoti noderēs precizitātei.
