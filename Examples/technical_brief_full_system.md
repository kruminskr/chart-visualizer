# LaSER Visualization Tool — Full System Technical Brief

## Context

A working client-side prototype already exists. It is a React + Vite app that:
- Accepts .xlsx uploads
- Parses Excel data into [{year, value}] pairs
- Renders a branded vertical bar chart as SVG using D3.js
- Lets the user configure title, Y-axis unit, width (mm), height (mm)
- Exports the chart as a downloadable .svg file with embedded Montserrat font

This brief describes what to build on top of that prototype to make it a
full multi-user web application. Do not rewrite what already works — extend it.

---

## What Is Being Added

1. A backend (Next.js API routes)
2. A database (PostgreSQL via Supabase)
3. User authentication (Supabase Auth)
4. Project saving and loading
5. Multi-device access to shared projects
6. File storage for uploaded Excel files (Supabase Storage)
7. A line chart mode (second chart type, same data model)
8. Multiple data series support (grouped bars, multiple lines)

---

## Migration: Vite → Next.js

The existing Vite prototype should be migrated to Next.js (App Router).
This is necessary because:
- API routes live in the same project as the frontend
- No separate Express server to manage
- Vercel deployment is trivial
- Claude Code has strong Next.js knowledge

### Migration steps
- Move all files from src/ into app/ and components/ following Next.js App Router conventions
- All existing React components (BarChart, ChartControls, ChartPreview, App) 
  become client components — add "use client" directive at the top of each
- Replace Vite config with next.config.js
- Keep D3, SheetJS, Tailwind — all are compatible with Next.js
- Tailwind CSS v4 config moves to next.config.js postcss setup

---

## Tech Stack — Full System

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Frontend | React 19, D3.js, SheetJS, Tailwind CSS v4 |
| Backend | Next.js API Routes (route.js files) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth (email + password) |
| File storage | Supabase Storage |
| Hosting | Vercel (frontend + API) + Supabase (DB + storage) |
| Environment | .env.local for all secrets |

---

## Environment Variables Required

Create a .env.local file. Never commit this to git.

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_supabase_postgres_connection_string
```

---

## Database Schema (Prisma)

Create this schema in prisma/schema.prisma.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  createdAt    DateTime  @default(now())
  projects     Project[] @relation("ProjectOwner")
  sharedWith   ProjectCollaborator[]
}

model Project {
  id            String    @id @default(uuid())
  title         String
  ownerId       String
  owner         User      @relation("ProjectOwner", fields: [ownerId], references: [id])
  charts        Chart[]
  collaborators ProjectCollaborator[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ProjectCollaborator {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  role      String   @default("editor") // "editor" or "viewer"
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
}

model Chart {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  type        String   @default("bar") // "bar" or "line"
  title       String
  unit        String   @default("")
  widthMm     Float    @default(165)
  heightMm    Float    @default(90)
  dataFileUrl String   // Supabase Storage URL to the original .xlsx file
  dataJson    Json     // parsed data stored as JSON for quick reload
  configJson  Json     // any extra config: colors, series names, etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Notes on schema decisions
- dataJson stores the parsed [{year, value, series?}] array so the chart 
  can reload without re-parsing Excel every time
- configJson is a flexible blob for settings that may change as the product 
  evolves — do not add individual columns for every chart setting
- ProjectCollaborator supports future team sharing; for now only owners 
  will exist, but the table should be created now
- User.id is a UUID that matches the Supabase Auth user ID — use the same 
  ID from Supabase Auth as the primary key so they stay in sync

---

## Authentication

Use Supabase Auth. Do not build a custom auth system.

### What to implement
- Sign up page: email + password
- Log in page: email + password
- Log out button in the app header
- Protected routes: if user is not logged in, redirect to /login
- Persist session across page refreshes using Supabase client-side session

### Supabase Auth setup
- Install @supabase/supabase-js and @supabase/ssr
- Create a Supabase client utility:
  - lib/supabase/client.js — browser client (createBrowserClient)
  - lib/supabase/server.js — server client (createServerClient, uses cookies)
- Use middleware.js at the project root to protect all routes except 
  /login and /signup

### Pages to create
- /login — email + password form, link to /signup
- /signup — email + password form, link to /login
- / (root) — redirects to /dashboard if logged in, to /login if not

### After signup
- Create a matching User record in the database using the Supabase Auth 
  user ID as the User.id
- Do this in a Supabase Auth webhook or in the signup API route

---

## File Structure — Full System

```
/app
  /login
    page.jsx                  — login form
  /signup
    page.jsx                  — signup form
  /dashboard
    page.jsx                  — project list
  /project/[id]
    page.jsx                  — chart editor (the existing prototype UI)
  /api
    /projects
      route.js                — GET (list), POST (create)
    /projects/[id]
      route.js                — GET, PUT (update), DELETE
    /projects/[id]/charts
      route.js                — GET, POST
    /projects/[id]/charts/[chartId]
      route.js                — GET, PUT, DELETE
    /upload
      route.js                — POST: receive xlsx, store in Supabase Storage, return URL

/components
  BarChart.jsx                — existing, unchanged
  LineChart.jsx               — new: line chart SVG component
  ChartControls.jsx           — extended with chart type toggle, series controls
  ChartPreview.jsx            — existing, unchanged
  ProjectCard.jsx             — new: card shown in dashboard
  Header.jsx                  — new: top nav with logo, user email, logout

/lib
  /supabase
    client.js                 — browser Supabase client
    server.js                 — server Supabase client
  prisma.js                   — Prisma client singleton

/utils
  chartHelpers.js             — existing, unchanged
  excelParser.js              — existing, extended for multi-series
  svgExporter.js              — existing, unchanged

/prisma
  schema.prisma               — schema defined above

middleware.js                 — route protection
.env.local                    — secrets (not committed)
```

---

## API Routes

All API routes require an authenticated user. Check the session at the 
top of every route handler and return 401 if no valid session exists.

### GET /api/projects
Returns all projects owned by or shared with the current user.
Response: array of { id, title, createdAt, updatedAt, chartCount }

### POST /api/projects
Creates a new project.
Body: { title: string }
Response: the created project object

### GET /api/projects/[id]
Returns a single project with all its charts.
Only accessible if the user is the owner or a collaborator.

### PUT /api/projects/[id]
Updates project title.
Body: { title: string }

### DELETE /api/projects/[id]
Deletes project and all its charts. Cascades via Prisma.
Only the owner can delete.

### POST /api/projects/[id]/charts
Creates a new chart within a project.
Body: { type, title, unit, widthMm, heightMm, dataFileUrl, dataJson, configJson }

### PUT /api/projects/[id]/charts/[chartId]
Updates chart configuration. Called on every save action.
Body: any subset of chart fields

### POST /api/upload
Receives a multipart form upload of an .xlsx file.
Stores the file in Supabase Storage under the path: 
  uploads/{userId}/{timestamp}_{originalFilename}
Returns: { url: string } — the public or signed Supabase Storage URL

---

## Dashboard Page (/dashboard)

This is the home screen after login. Shows all the user's projects.

### What it displays
- A grid of ProjectCard components
- Each card shows: project title, last updated date, number of charts
- A "New Project" button that creates a project and navigates to /project/[id]
- An empty state message when the user has no projects yet

### ProjectCard component
- Shows title, last edited date
- Click → navigate to /project/[id]
- Three-dot menu or hover actions: Rename, Delete

### New Project flow
1. User clicks "New Project"
2. POST /api/projects with a default title ("Untitled Project")
3. Navigate to /project/[id] immediately
4. User can rename from within the editor

---

## Chart Editor Page (/project/[id])

This is the existing prototype UI, extended with save/load and chart type.

### On page load
- Fetch the project and its charts from GET /api/projects/[id]
- If the project has an existing chart, load it: populate all controls 
  from the saved configJson, reload the data from dataJson
- If the project has no chart yet, show the empty upload state

### Save behavior
- Autosave: after any control change, debounce 1000ms, then call 
  PUT /api/projects/[id]/charts/[chartId]
- Show a subtle "Saving..." / "Saved" indicator in the header
- Do not require a manual save button (but one can exist as a fallback)

### Chart type toggle
- Add a toggle above the chart preview: "Bar" | "Line"
- Switching type re-renders the chart with the same data
- The selected type is saved in the chart's type field

### Header additions
- Project title (editable inline — click to edit, blur to save)
- Back arrow → /dashboard
- User email + logout button

---

## Multiple Data Series

This extends both the Excel parser and the chart components.

### Excel format for multiple series

The parser should support this column layout:
```
Row 1:  Chart title (string in A1)
Row 2:  Headers — "Gads" | Series1Name | Series2Name | Series3Name...
Row 3+: Data — year | value1 | value2 | value3...
```

Example:
```
Gads    Latvija    Lietuva    Igaunija
2016    0.55       0.85       0.46
2017    0.62       0.92       0.51
...
```

### Parser changes (excelParser.js)
- After detecting the header row, read all columns from B onwards as series
- Return structure:
```js
{
  title: string,
  series: [
    { name: "Latvija", data: [{year: 2016, value: 0.55}, ...] },
    { name: "Lietuva", data: [{year: 2016, value: 0.85}, ...] },
    ...
  ]
}
```
- Maintain backward compatibility: if only one data column exists, 
  wrap it in the same series array structure

### Color palette for multiple series
The brand color for series 1 is confirmed: #FF00AA (magenta).
Colors for series 2, 3, 4+ are not yet confirmed by the client.
For now use these placeholders — they will be replaced after the client meeting:
- Series 1: #FF00AA (confirmed brand magenta)
- Series 2: #1B3A6B (dark navy — placeholder)
- Series 3: #00A878 (teal — placeholder)
- Series 4: #F5A623 (amber — placeholder)

Store the color array in a constants file (lib/brandColors.js) so it 
is easy to update in one place after the client confirms the palette.

### BarChart changes for grouped bars
- When multiple series exist, render grouped bars side by side per year
- Group width = available slot per year
- Bar width = groupWidth / numberOfSeries, with a small gap between bars
- Each bar colored by series index from the brandColors array
- A legend appears below the chart: colored rectangle + series name
- Legend font: Montserrat Regular 7pt, same gray as axis labels

### LineChart component (new)
- Same props interface as BarChart (series array, dimensions, unit, title)
- Renders one SVG path per series using d3.line()
- Each path colored by series index from brandColors
- Dots at each data point (circle r=1mm)
- Same grid lines, axis labels, margins, font as BarChart
- Same legend as grouped bar chart

---

## Supabase Storage Setup

Bucket name: chart-uploads
Access: private (files accessed via signed URLs, not public)

### Upload flow
1. User drops an .xlsx file in the UI
2. File is sent to POST /api/upload as multipart form data
3. Server stores it in Supabase Storage
4. Server returns the storage path
5. Chart record stores this path in dataFileUrl
6. When reloading a project, the file can be re-downloaded via a signed URL 
   if needed (though dataJson already has the parsed data)

### Signed URL generation
Generate signed URLs server-side with a 1-hour expiry when the user 
needs to re-download the original Excel file. Do not expose the service 
role key to the client.

---

## Prisma Setup Instructions

```bash
npm install prisma @prisma/client
npx prisma init
# paste schema above into prisma/schema.prisma
# set DATABASE_URL in .env.local to Supabase connection string
npx prisma db push        # creates tables in Supabase
npx prisma generate       # generates Prisma client
```

Prisma client singleton (lib/prisma.js):
```js
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Routing and Navigation Flow

```
/                   → redirect to /dashboard (if logged in) or /login
/login              → login form
/signup             → signup form
/dashboard          → project list (protected)
/project/[id]       → chart editor (protected)
```

Middleware.js should protect all routes except /login and /signup.
If the user is not authenticated and tries to access /dashboard or 
/project/[id], redirect to /login.
If the user is authenticated and tries to access /login or /signup, 
redirect to /dashboard.

---

## UI Components to Build

### Header.jsx
- Left: App name / logo ("LaSER Charts")
- Center (on editor page): editable project title
- Right: user email, logout button
- On dashboard: just app name + user info, no project title

### ProjectCard.jsx
- White card with subtle shadow
- Project title (bold)
- "Last edited X days ago" (use date-fns for formatting)
- On hover: show delete and rename actions
- Click anywhere else → navigate to editor

### Empty states
- Dashboard with no projects: "No projects yet. Create your first project."
- Editor with no data: "Upload an Excel file to get started."

### Loading states
- Dashboard loading projects: skeleton cards (3 placeholder cards with 
  animated gray blocks)
- Editor loading saved chart: spinner centered in preview area

---

## What Is Explicitly Not Included in This Phase

Do not build these yet — they require client input or are lower priority:

- PDF / CMYK export (requires server-side rendering + ICC profile)
- Social media raster export (PNG/JPG at specific dimensions)
- Third chart type (type unknown — waiting for client meeting)
- Team workspaces / organization accounts
- Real-time collaborative editing
- Password reset flow (can be added later)
- Email verification on signup (can be disabled in Supabase for now)

---

## Definition of Done

The system is complete when:

1. A user can sign up, log in, and log out
2. Logged-in user sees their project dashboard
3. User can create a new project, upload an Excel file, see the bar chart
4. User can switch between bar and line chart modes
5. User can upload a multi-series Excel file and see grouped bars / multiple lines
6. All chart configuration is autosaved
7. User can close the browser, reopen, log in, and see their project exactly 
   as they left it
8. A second user can be given access to the project and open it from 
   their own device
9. SVG export still works exactly as in the prototype
10. The app is deployed to Vercel and accessible via a URL

---

## Key Constraints Carried Over From Prototype

These are non-negotiable and must not be changed during migration:

- All SVG units in mm/pt (1 user unit = 1mm in viewBox)
- Bar color series 1: #FF00AA
- Font: Montserrat Regular via Google Fonts
- Grid stroke: 0.25pt converted to mm
- Year labels: first + last = 4 digits, middle = 2 digits
- No axis spines — grid lines only
- Floating point coordinates rounded to 3 decimal places
