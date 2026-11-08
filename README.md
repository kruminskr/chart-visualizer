# LaSER Charts

Web tool for LaSER researchers: upload an Excel file, get a brand-exact, publication-ready chart (bar or line), and export it as an mm-based SVG.

**Stack:** Next.js 16 (App Router) · React 19 · D3 (math only) · SheetJS · Tailwind CSS v4 · Supabase Auth + Storage · PostgreSQL via Prisma · Vercel.

## Quick start (local, no Supabase account needed)

Requires Node 22+ and a local PostgreSQL 16.

```bash
npm run setup:dev   # installs deps, creates .env.local, starts local Postgres (Debian/Ubuntu), pushes schema
npm run dev         # http://localhost:3000 — signed in automatically as dev@laser.local
```

`.env.local` defaults to `DEV_AUTH_BYPASS=true` and a local database. To use real Supabase instead, fill in the Supabase keys and pooler URLs (see `.env.example`) and set `DEV_AUTH_BYPASS=false`. The bypass never runs in production builds.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `dev:bg` / `dev:stop` | Dev server (foreground / background) |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run screenshot -- --demo` | Screenshot of the editor with sample data |
| `npm run build` | Production build |
| `npm run db:push` / `db:studio` | Prisma schema push / studio |

## Chart specification

See `CLAUDE.md` and `.claude/skills/chart-spec/SKILL.md`. Highlights: mm units, series 1 `#E6007E`, Montserrat embedded, 0.25 pt grid lines, no axis spines, 4/2/4-digit year labels.
