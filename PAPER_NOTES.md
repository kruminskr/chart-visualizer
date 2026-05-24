# Paper Technical Notes — LaSER Visualization Tool

---

## §3.2 — Sistēmas dizains: Architecture Layer Description

Use the following layer-by-layer description to sketch the architecture diagram and write its caption.

### Layer 1 — Browser (React client)
- All interactive UI runs as React 19 client components (`"use client"` directive). No server-side rendering for the editor itself.
- **SheetJS** (`xlsx`) parses the uploaded `.xlsx` file entirely in the browser: `FileReader` reads the file as `ArrayBuffer`, `XLSX.read()` decodes it, the parser scans rows directly on the sheet object. No file bytes ever leave the browser during parsing.
- **D3.js** is used for scale math only (`scaleBand`, `scaleLinear`, `line` generator). All SVG elements are declared as React JSX — `d3.select` and imperative DOM manipulation are never used.
- SVG export also runs 100% client-side (clone DOM node → serialize → Blob → download).
- Tailwind CSS v4 handles styling via the `@tailwindcss/postcss` PostCSS plugin.

### Layer 2 — Next.js App Router (server + routing)
- The root layout and dashboard page are **server components**: they read the session and fetch from the database without a client round-trip.
- **`proxy.js`** (Next.js 16 route-protection middleware): intercepts every request, reads the Supabase session from cookies, redirects unauthenticated users to `/login` and authenticated users away from `/login`/`/signup`.
- Page routing: `/` → redirect, `/login`, `/signup`, `/dashboard` (server), `/project/[id]` (client).

### Layer 3 — Next.js API Routes (server-side handlers)
Six route handlers, all server-side, all session-gated:

| Route | Methods | Purpose |
|---|---|---|
| `/api/projects` | GET, POST | List / create projects |
| `/api/projects/[id]` | GET, PUT, DELETE | Single project CRUD |
| `/api/projects/[id]/charts` | POST | Create chart within project |
| `/api/projects/[id]/charts/[chartId]` | PUT | Autosave chart state |
| `/api/upload` | POST | Receive `.xlsx`, store in Supabase Storage |
| `/api/users/sync` | POST | Upsert User row on first project creation |

Each handler: (1) reads session via Supabase server client, (2) returns 401 if no session, (3) verifies ownership, (4) delegates to Prisma.

### Layer 4 — Prisma ORM
- Singleton client (`lib/prisma.js`) using `globalThis` to survive Next.js hot-reload without exhausting connection pool.
- Schema: `User → Project (1:many) → Chart (1:many)`. `ProjectCollaborator` table exists for future sharing (schema only, no UI yet).
- Two connection strings: `DATABASE_URL` points to the **Transaction pooler** (port 6543, `?pgbouncer=true`) for all runtime queries — required for serverless compatibility. `DIRECT_URL` points to the **Session pooler** (port 5432) used only by `prisma db push` / migrations, which need a persistent connection.

### Layer 5 — PostgreSQL (Supabase)
- Hosted PostgreSQL on Supabase (AWS eu-west-1 region).
- `Chart.dataJson` stores the parsed series array as JSON, so the editor reloads instantly without re-parsing the Excel file.
- `Chart.dataFileUrl` stores the Supabase Storage path of the original `.xlsx`.

### Layer 6 — Supabase Storage
- Private bucket `chart-uploads`. Files are not publicly accessible.
- Upload path pattern: `{userId}/{timestamp}_{originalFilename}`.
- Uploads use the **service-role admin client** (`lib/supabase/admin.js`) server-side — the service key never reaches the browser. The admin client bypasses Supabase RLS policies.

### Layer 7 — Supabase Auth
- Email + password. Sessions stored in HTTP cookies, managed by `@supabase/ssr`.
- Supabase Auth `user.id` (UUID) is used directly as `User.id` in the Prisma schema — the two identity systems are kept in sync by an upsert on first project creation rather than a separate webhook.

---

## §3.3 — Realizētie diagrammu tipi

### Shared input pipeline and controls

Both chart types consume exactly the same data structure and share the same control panel — there are no type-specific inputs.

- **Shared data pipeline:** `.xlsx` upload → `excelParser.js` → `series: [{name, data: [{year, value}]}]` array → passed identically to `BarChart` or `LineChart` component. Switching chart type does not re-parse or re-fetch data.
- **Shared controls (ChartControls.jsx):** chart type toggle (Bar | Line), chart title text input, Y-axis unit text input, width (mm) numeric input, height (mm) numeric input, file upload dropzone, Export SVG button.
- **Shared visual constants:** left margin 10mm, right 5mm, top 5mm, bottom 8mm; Montserrat Regular 7pt (= 2.469mm) for all labels; grid stroke 0.25pt (= 0.088mm); year label rule (first + last = 4-digit, middle years = 2-digit); no axis spines; brand color palette from `lib/brandColors.js` (`#FF00AA`, `#1B3A6B`, `#00A878`, `#F5A623`).
- **Multi-series legend:** both chart types append a 7mm legend strip below the chart area when `series.length > 1`. SVG height is extended by 7mm to accommodate it — the declared `heightMm` always refers to the data area only. Legend entries: colored 3×2mm rectangle + series name in the shared font.

### Joslu diagramma (BarChart.jsx)

- Uses D3 `scaleBand` with `padding(0.4)` to divide the X-axis into year slots with gaps.
- **Single series:** each bar occupies the full `xScale.bandwidth()` of its slot. Bar color: `BRAND_COLORS[0]` (`#FF00AA`).
- **Multi-series:** a second inner `scaleBand` (padding 0.05) subdivides each year slot into one sub-slot per series. Each bar's X position is `slotX + innerScale(seriesIndex)`, width is `innerScale.bandwidth()`. Colors cycle through the brand palette by series index.
- Bar height is computed as `innerH − yScale(value)`, so bars grow upward from the baseline.
- X-axis tick marks are centered on each slot's midpoint (`xScale(year) + xScale.bandwidth() / 2`).

### Līniju diagramma (LineChart.jsx)

- Uses D3 `scaleBand` with `padding(0)` solely to determine the center X position of each year: `cx = xScale(year) + xScale.bandwidth() / 2`. This keeps X positioning identical to the bar chart when the same data is viewed in both modes.
- One `<path>` per series, generated by `d3.line()` with `.x(d => cx(d.year)).y(d => yScale(d.value))`. Stroke width = `STROKE × 3` (0.75pt) for legibility against the grid.
- Circular dot markers at each data point: `<circle r={1}/>` (1mm radius), filled with the series color. Dots make individual values readable on short series.
- The line chart has no bar-specific concepts (no slot gaps, no inner scale, no bar height calculation). All other visual elements — grid lines, Y labels, unit label, X ticks, X labels, legend — are identical to the bar chart.

---

## §3.4 — SVG eksporta realizācija

### Export pipeline (`utils/svgExporter.js`)

```
1. cloneNode(true)           deep-clone the live <svg> DOM node
2. setAttribute xmlns        ensure standalone SVG namespace declaration
3. inject <style>            find or create <style>; prepend Montserrat @import
4. XMLSerializer             serialize clone to SVG string
5. new Blob(...)             wrap string in image/svg+xml blob
6. createObjectURL           create temporary in-memory URL
7. <a>.click()               trigger browser download dialog
8. revokeObjectURL           free object URL immediately after click
```

**Why clone:** mutating the live SVG would cause a visible flash and break React's DOM ownership. The clone is a detached DOM tree — changes to it do not affect the rendered chart.

**Why inject `@import` explicitly:** the `<style>` tag with the Google Fonts `@import` is already present in the rendered SVG (inserted by the chart components themselves). The exporter checks whether "Montserrat" is already in the style content before inserting — it is idempotent. The `@import` ensures the font loads when the SVG is opened as a standalone file in a browser or vector editor (Inkscape, Illustrator).

### mm-to-SVG-unit math

The SVG coordinate system is declared in physical millimetres:

```jsx
<svg
  width={`${widthMm}mm`}
  height={`${svgHeight}mm`}
  viewBox={`0 0 ${widthMm} ${svgHeight}`}
>
```

Because `viewBox` and the `width`/`height` attributes use the same numeric value (e.g. `width="165mm"` with `viewBox="0 0 165 90"`), 1 user unit = 1mm. No px-to-mm conversion is needed at render time.

Font and stroke sizes are converted once at module load time:

| Constant | Formula | Result |
|---|---|---|
| `FONT` | `7 × (25.4 / 72)` | 2.469mm (7pt) |
| `STROKE` | `0.25 × (25.4 / 72)` | 0.088mm (0.25pt) |
| `DOT_R` | `1` | 1mm (literal) |

All D3-computed coordinates are rounded to 3 decimal places before being written to SVG attributes: `rnd = n => Math.round(n * 1000) / 1000`. This prevents SVG path data and coordinate attributes from accumulating floating-point noise over repeated scale evaluations.

### Filename sanitization — FR-20 (diakritisko zīmju normalizācija)

```js
function sanitizeFilename(str) {
  return str
    .normalize('NFKD')        // decompose accented chars: ā → a + combining macron
    .replace(/\p{M}/gu, '')   // strip all Unicode combining marks (category M)
    .replace(/[^\w\s-]/g, '') // remove anything not a word char, whitespace, or hyphen
    .replace(/\s+/g, '_')     // collapse whitespace to underscores
    .slice(0, 100);           // cap at 100 characters
}
```

`NFKD` decomposition separates base letters from their diacritics as distinct Unicode code points. The regex `/\p{M}/gu` then removes every code point in the Unicode "Mark" category (combining diacritical marks), which covers Latvian characters: `ā ē ī ū č š ž ģ ķ ļ ņ` all strip to their ASCII base letters. Example: chart title `"Aizsardzības izdevumi"` produces filename `"Aizsardzibas_izdevumi.svg"`.

---

## Functional Requirements — Revised Table

The table below reflects the system **as actually implemented** (Phases 1–5 complete, Phase 6 / Vercel deployment pending). Requirements that are out of scope per the project brief are marked accordingly.

| ID | Requirement | Implemented | Notes |
|---|---|---|---|
| **Authentication** | | | |
| FR-01 | User registration via email and password | ✅ | `/signup` page, Supabase Auth |
| FR-02 | User login via email and password | ✅ | `/login` page |
| FR-03 | User logout | ✅ | Header button, Supabase `signOut()` |
| FR-04 | Session persistence across page refreshes | ✅ | Cookies via `@supabase/ssr` |
| FR-05 | Protected routes — unauthenticated users redirected to `/login` | ✅ | `proxy.js` (Next.js 16 middleware) |
| FR-06 | Authenticated users redirected away from `/login`/`/signup` | ✅ | `proxy.js` |
| **Project Management** | | | |
| FR-07 | Create new project from dashboard | ✅ | POST `/api/projects`, navigates to editor |
| FR-08 | List all user projects on dashboard with last-edited date | ✅ | Server component, `date-fns` formatting |
| FR-09 | Rename project via inline edit in editor header | ✅ | Click title → input → blur/Enter commits |
| FR-10 | Delete project with cascade to charts | ✅ | Prisma `onDelete: Cascade` |
| FR-11 | Each project persists across sessions and devices | ✅ | PostgreSQL via Supabase |
| **Data Input** | | | |
| FR-12 | Upload `.xlsx` file via click or drag-and-drop | ✅ | `ChartControls.jsx` dropzone |
| FR-13 | Auto-detect data start row (year 1900–2100 in col A, numeric in col B) | ✅ | `excelParser.js` rows 1–10 scan |
| FR-14 | Extract chart title from cell A1 if string length > 10 | ✅ | `excelParser.js` |
| FR-15 | Support multi-series: columns B, C, D… as separate series; row above data start as series names | ✅ | `excelParser.js` |
| FR-16 | Validate data: non-numeric year or value shows error; minimum 2 data points required | ✅ | `excelParser.js` error returns |
| FR-17 | Store original `.xlsx` file in cloud storage | ✅ | Supabase Storage, `chart-uploads` bucket |
| FR-18 | Backward-compatible loading of old single-series DB records `[{year, value}]` | ✅ | Detected by `'data' in first` at load time |
| **Chart Rendering** | | | |
| FR-19 | Render vertical bar chart with D3 band scale | ✅ | `BarChart.jsx` |
| FR-20 | Render line chart with D3 line generator and dot markers | ✅ | `LineChart.jsx` |
| FR-21 | Toggle chart type (Bar / Line) — persisted to database | ✅ | `ChartControls.jsx` segmented control |
| FR-22 | Multi-series bar chart: grouped bars per year, one bar per series | ✅ | `BarChart.jsx` inner `scaleBand` |
| FR-23 | Multi-series line chart: one path per series, color-coded | ✅ | `LineChart.jsx` |
| FR-24 | Legend below chart for multi-series (colored rectangle + series name) | ✅ | Both chart components, +7mm SVG height |
| FR-25 | Brand color series 1: `#FF00AA` | ✅ | `lib/brandColors.js` |
| FR-26 | Font: Montserrat Regular 7pt via Google Fonts | ✅ | `@import` in `<style>` tag |
| FR-27 | Grid lines only — no axis spines | ✅ | Both chart components |
| FR-28 | Year labels: first and last = 4 digits; middle years = 2 digits | ✅ | `chartHelpers.js` `formatYearLabel()` |
| FR-29 | All SVG coordinates in mm (1 user unit = 1mm); D3 values rounded to 3 decimal places | ✅ | `viewBox` in mm, `rnd()` helper |
| **Chart Configuration** | | | |
| FR-30 | Edit chart title (freeform text) | ✅ | `ChartControls.jsx` input |
| FR-31 | Edit Y-axis unit label | ✅ | `ChartControls.jsx` input |
| FR-32 | Edit chart width in mm (default 165mm) | ✅ | `ChartControls.jsx` numeric input |
| FR-33 | Edit chart height in mm (default 90mm) | ✅ | `ChartControls.jsx` numeric input |
| **Persistence** | | | |
| FR-34 | Autosave all chart configuration after 1 second of inactivity | ✅ | `useEffect` debounce, PUT `/api/projects/[id]/charts/[chartId]` |
| FR-35 | Save status indicator in header ("Saving…" / "Saved") | ✅ | `saveStatus` state → `Header.jsx` |
| FR-36 | Reload chart from database on page load (no re-upload required) | ✅ | `dataJson` column stores parsed series |
| **Export** | | | |
| FR-37 | Export chart as `.svg` file | ✅ | `svgExporter.js` |
| FR-38 | Exported SVG embeds Montserrat `@import` for standalone font loading | ✅ | Injected into cloned `<style>` before serialization |
| FR-39 | Exported SVG uses physical mm dimensions | ✅ | `width`/`height` attributes in mm, `viewBox` in mm units |
| FR-40 | Filename derived from chart title; diacritics normalized to ASCII (NFKD + Unicode Mark strip) | ✅ | `sanitizeFilename()` in `svgExporter.js` |
| **Out of scope** | | | |
| — | PDF / CMYK export | ❌ | Requires server-side rendering + ICC profile |
| — | PNG / JPG raster export | ❌ | Not in current brief |
| — | Third chart type | ❌ | Awaiting client specification |
| — | Collaborator / team sharing UI | ❌ | DB schema exists; no API or UI |
| — | Password reset | ❌ | Can be enabled via Supabase dashboard |
| — | Email verification on signup | ❌ | Disabled in Supabase for development |
| — | Real-time collaborative editing | ❌ | Out of scope |

---

## §3.x — Implementācijas izaicinājumi un risinājumi (War Stories)

These are the four hardest concrete problems hit during development, each documented with what failed, what was tried, and what resolved it. Use any two or three as a "Realizācijas izaicinājumi" subsection.

---

### War Story 1 — Framework version surprise: `middleware.js` → `proxy.js` (Next.js 16)

**What failed.** Route protection was written following the official Supabase SSR documentation and every Next.js tutorial: a `middleware.js` file at the project root exporting a function named `middleware`. When the auth gate was tested — navigating to `/dashboard` without being logged in — it simply loaded the page. The session check was never running.

**What was tried.** The first assumption was a bug in the session-reading logic inside the middleware function. The Supabase client setup was checked, the cookie handling was reviewed, `console.log` was added at the top of the function to confirm it was being called. It was not.

**What worked.** Checking the Next.js 16 changelog revealed a breaking change: the middleware entry point was renamed from `middleware.js` to `proxy.js`, and the exported function must be named `proxy` (not `middleware`). The fix was a file rename and export rename — two lines changed. The entire session checking logic was correct from the start; the problem was that the function was never being invoked.

**Lesson for the thesis.** Dependency version mismatches between framework documentation and the installed version are a category of bug that does not produce a clear error message — the code is syntactically valid and the app runs without complaint; it simply does not do what it should. Version-specific breaking changes require checking release notes, not just docs.

---

### War Story 2 — Prisma 7 removed database connection fields from schema

**What failed.** After installing Prisma and running `npx prisma db push`, the Prisma schema validator rejected the `schema.prisma` file with a cryptic schema validation error. The datasource block used `url` and `directUrl` fields, which is the standard pattern shown in all Prisma documentation for Supabase:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**What was tried.** The error message did not mention version compatibility — it said the schema fields were invalid, which looked like a syntax error. The connection string format was double-checked, `.env` file quoting was verified, and the field names were confirmed against the Prisma docs. All of this was correct.

**What worked.** The installed version was Prisma 7 (the latest at the time). Prisma 7 changed the datasource configuration format in a breaking way that made `url` and `directUrl` unrecognised fields. The fix was to downgrade to Prisma 5 (`npm install prisma@5 @prisma/client@5`), which uses the documented configuration and is stable for production use.

**Lesson for the thesis.** "Latest" is not always "correct." When a library's error message describes a configuration problem but the configuration matches the documentation exactly, the first check should be whether the installed version matches the version the documentation was written for.

---

### War Story 3 — Supabase database connections require two separate URLs for two different purposes

**What failed.** After resolving the Prisma schema issue, `npx prisma db push` began timing out. The connection string being used was the direct database hostname (`db.{project-ref}.supabase.co:5432`), which is the simplest format shown in Supabase's "connect" panel.

**What was tried.** The connection string format was checked against Prisma's docs. Password special characters were ruled out. The Supabase project was confirmed to be unpaused.

**What worked.** The direct connection port (5432 on the project-specific hostname) was blocked by a network-level firewall in the development environment. Supabase provides two connection pooler modes as alternatives: the **Transaction pooler** (port 6543 on a shared hostname, with `?pgbouncer=true` appended to the URL) intended for short-lived serverless connections, and the **Session pooler** (port 5432 on the same shared hostname) intended for persistent connections like migrations. Prisma's migration tool needs a persistent connection, so `DIRECT_URL` must point to the Session pooler. The runtime API routes use the Transaction pooler. The `?pgbouncer=true` parameter is additionally required on the Transaction pooler URL to disable Prisma's prepared statements, which PgBouncer in Transaction mode does not support. The final configuration required two distinct connection strings in two distinct environment files: `DATABASE_URL` (Transaction pooler) and `DIRECT_URL` (Session pooler) in `.env` for the Prisma CLI, and the same values duplicated in `.env.local` for the Next.js runtime.

**Lesson for the thesis.** Serverless infrastructure introduces connection constraints that do not exist in traditional server deployments. The same database may need different connection parameters depending on whether the caller is a migration tool (needs persistent connection, Session pooler) or a short-lived API handler (needs pooled connection, Transaction pooler). This is not documented in one place — it requires reading Supabase, Prisma, and PgBouncer documentation together.

---

### War Story 4 — Autosave firing during initial page load (the `isLoadingRef` problem)

**What failed.** After implementing autosave, every time the chart editor page loaded an existing project from the database, the network panel showed an immediate PUT request to the autosave endpoint — before the user had made any change. In some cases this caused the chart to revert to a partially-populated state because the save was triggered before all state variables had been set from the DB response.

**What the problem was.** The autosave mechanism is a `useEffect` that fires whenever any of the chart state variables change (`title`, `unit`, `widthMm`, `series`, `chartType`, etc.). When the page loads and fetches the chart from the database, it calls `setTitle()`, `setSeries()`, `setUnit()` and so on in sequence. Each of these calls is a state change, and each one schedules the autosave debounce. The debounce timer resets on each change, but the first to "settle" could trigger a PUT with only partial state.

**What worked.** A `useRef` (not `useState` — a ref does not cause re-renders) named `isLoadingRef` is set to `true` at initialization. The autosave `useEffect` returns early if `isLoadingRef.current` is true. After the initial `fetch()` in the load `useEffect` completes and all `setState` calls have been made, `isLoadingRef.current` is set to `false`. Refs update synchronously, so by the time React batches the state updates and re-renders, the ref is already false and the autosave is no longer suppressed — but only for genuine user-driven changes from that point on.

**Lesson for the thesis.** Autosave and data loading interact in non-obvious ways when both are driven by the same state variables. The loading guard pattern (`isLoadingRef`) is a standard solution but is not documented as such in React or Next.js guides — it surfaces only from experience with this specific class of problem.

---

## §3.x — Arhitektūras izmaiņas izstrādes gaitā (Architectural Pivots)

### Pivot 1 — From a static SPA (Vite) to a full-stack framework (Next.js)

The project began as a pure client-side prototype: Vite + React with no server, no API, no authentication. The entire application ran in the browser — Excel was parsed in-browser, charts were rendered in-browser, SVG was exported in-browser. This was intentionally minimal.

When the scope expanded to include authentication and database persistence, the choices were: (a) keep Vite and add a separate Express or Fastify API server as a second process; (b) migrate to Next.js App Router, which collocates API route handlers with the frontend in a single project. Option (a) would have required maintaining two separate deployments (frontend on a CDN, API on a server), managing CORS between them, and separately configuring session cookies across origins. Next.js was chosen because the API routes (`app/api/**`) run in the same project, share the same environment variables, and deploy as a single unit to Vercel. The tradeoff was a non-trivial migration: all component imports needed updating to Next.js path aliases, Tailwind's PostCSS configuration changed (from the Vite plugin to `@tailwindcss/postcss`), and every component using browser APIs or hooks needed a `"use client"` directive added.

### Pivot 2 — D3 for mathematics only, not DOM manipulation

D3's conventional usage pattern is imperative DOM manipulation: `d3.select(ref).append('g').call(d3.axisLeft(yScale))`. D3 directly writes to and manages DOM nodes. Inside a React component, this creates a conflict: React's virtual DOM reconciliation assumes it owns all DOM mutations inside a component's subtree. Using D3's DOM API alongside React causes React to lose track of D3-generated nodes, which can produce double rendering, memory leaks, or elements that disappear on re-render.

The decision was made early to treat D3 as a mathematics library only. D3's scale functions (`scaleBand`, `scaleLinear`), tick generator (`.ticks()`), and line path generator (`line()`) are called to compute numbers and path strings. Those results are then passed to standard React JSX elements (`<rect>`, `<path>`, `<text>`, `<line>`). D3 never touches the DOM. This keeps components as pure functions of their props — the same props always produce the same SVG output — and makes the SVG directly serializable from the React-rendered DOM node without any additional transformation step.

### Pivot 3 — Store parsed data as JSON, not as rendered output

An early design considered storing the rendered SVG string in the database (`Chart.svgContent`). This would make reloading trivial: fetch the string, display it. The problem is that a stored SVG is frozen at the moment of creation. If the chart rendering code is updated later — a color change, a margin adjustment, a font size correction — existing charts would continue to display the old output. Updating them would require re-uploading the original Excel file or re-triggering a render.

The implemented approach stores the parsed data as JSON (`Chart.dataJson`: the series array) and the configuration parameters separately (`Chart.widthMm`, `Chart.heightMm`, `Chart.type`, `Chart.title`, `Chart.unit`). When the editor loads a project, it fetches these values and passes them to the chart component, which recomputes the SVG live. The chart is always rendered by the current version of the code. The storage overhead is small: a 10-year single-series dataset serializes to under 1 KB of JSON.

---

## §5.x — Ko mainītu, sākot no jauna (If Starting Over)

Three concrete things that would be done differently, suitable for a conclusions section.

### 1. Use a lighter database layer instead of Prisma

Prisma added overhead without proportional payback at this scale. The schema has four tables and a small set of straightforward queries. The friction points were real: Prisma 7's breaking schema change required a version downgrade, the CLI's refusal to read `.env.local` required maintaining a separate `.env` file, and the connection pooler configuration (`?pgbouncer=true`, two separate URLs, Transaction vs. Session mode) required reading documentation from three separate sources. A lightweight alternative — `postgres.js` with raw SQL, or Drizzle ORM which has simpler connection string handling and no CLI/env quirks — would have reduced setup time significantly. Prisma's value proposition (type-safe query builder, migration history, studio GUI) is better realized in larger teams with complex evolving schemas.

### 2. Synchronize the User record at registration time, not lazily on first project creation

The current implementation upserts the Prisma `User` row inside the POST `/api/projects` handler. This works but is architecturally wrong — user account creation and project creation are unrelated operations, and their coupling is a workaround for a missed step in Phase 2. The correct approach is a Supabase Auth webhook (a database trigger on `auth.users` insertion, or a server action called from the signup page's success callback) that creates the `User` row synchronously when the account is registered. The lazy upsert approach has a latent bug: if a user signs up but navigates somewhere other than creating a project first, their `User` row is never created, and any future operation that requires it (e.g., being added as a collaborator) will fail with a foreign key constraint.

### 3. Add an explicit data preview step before the chart renders

The Excel parser auto-detects the data start row by scanning the first 10 rows for a numeric year in column A and a numeric value in column B. This heuristic works for well-structured files but is fragile for files with merged header cells, blank separator rows, or multi-line headers. A "confirm your data" step — showing the detected column assignments and a preview of the first few parsed rows before the chart renders — would catch misdetections before they produce a confusingly wrong chart. RAWGraphs implements exactly this pattern (data input → column mapping → preview) and it is one of the most usable aspects of that tool's workflow.

---

## §4.x — Kvantitatīvie mērījumi (Measurements to Gather)

These are measurements you need to take yourself and report in the paper. Instructions are given for each.

### Measurement 1 — End-to-end task time: upload to SVG export

**What to measure.** Median time from opening the tool to having a downloaded SVG file with correct LaSER visual identity, for a single-series chart with a known `.xlsx` file. Repeat 5 times, discard the slowest, report the median.

**How to measure.** Use a phone stopwatch. Start timing when you click "New Project." Stop when the SVG file appears in your Downloads folder.

**Also measure for RAWGraphs** (rawgraphs.io): same starting point (a fresh browser tab), same `.xlsx` file exported as `.csv` first (RAWGraphs does not accept `.xlsx`), same end state (exported SVG). Count the number of distinct user actions (clicks + form inputs) required in each tool.

**Expected result.** Your tool should be 3–5 steps (new project → upload → done). RAWGraphs requires: convert to CSV → upload → select chart type → map columns → configure visual options → adjust colors to LaSER brand → export. Colors in particular cannot be set to `#FF00AA` precisely in RAWGraphs without editing the exported SVG manually.

### Measurement 2 — SVG file size comparison

**What to measure.** File size (bytes) of the exported SVG for the same dataset from: (a) your tool, (b) RAWGraphs, (c) if available, a chart exported directly from Excel.

**How to measure.** Export the SVG, right-click the file → Properties → Size. Report in KB rounded to one decimal place.

**Why it matters.** Smaller SVG files import more cleanly into InDesign and Illustrator, load faster in web pages, and are easier to post-process in a text editor. Your tool's SVG is hand-authored with minimal elements; RAWGraphs output includes generator metadata, style blocks, and sometimes base64-encoded raster fallbacks.

### Measurement 3 — Lines of code by layer

**Actual counts from the codebase** (exclude config files, `node_modules`, generated Prisma client):

| Layer | Key files | Approx. LOC |
|---|---|---|
| Chart rendering | `BarChart.jsx`, `LineChart.jsx`, `ChartPreview.jsx` | ~420 |
| UI / pages | `page.jsx` (editor), `DashboardClient.jsx`, `Header.jsx`, `ProjectCard.jsx`, `ChartControls.jsx`, login/signup pages | ~770 |
| API routes | 6 route handlers in `app/api/` | ~240 |
| Utilities | `excelParser.js`, `svgExporter.js`, `chartHelpers.js` | ~145 |
| Database / auth config | `prisma/schema.prisma`, `lib/` (Prisma singleton, 3 Supabase clients, brandColors), `proxy.js` | ~155 |
| **Total** | | **~1730** |

Note: chart rendering (420 lines) and export utilities (145 lines) together account for one third of the codebase — consistent with the tool's primary value being rendering correctness rather than infrastructure.

### Measurement 4 — Page load / time-to-interactive

**What to measure.** In Chrome DevTools → Network tab, hard-reload the dashboard page (`Ctrl+Shift+R` to bypass cache). Record "DOMContentLoaded" and "Finish" times shown in the Network tab footer.

**NFR-05 check.** If your NFR table includes a "time-to-interactive under 100ms" requirement, note that this was specified for the client-side rendering step (D3 computing scales and React rendering SVG elements), not full page load. The full page load includes the Supabase session check and Prisma database query, which add network round-trip latency (~100–400ms depending on geography). Clarify in the paper whether the NFR refers to the rendering step only or the full load.

**How to isolate rendering time.** In the editor page, open the browser console and wrap the `ChartPreview` render in `console.time('render') / console.timeEnd('render')`. Or use the React DevTools Profiler tab — record a profile, upload a file, and check the "Render duration" for the `BarChart` or `LineChart` commit. This will be in the 5–30ms range for a 10–20 year dataset — well under 100ms.
