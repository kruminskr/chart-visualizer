# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LaSER Visualization Tool

## Stack
React 19 + Next.js 16 (App Router), D3.js, SheetJS (xlsx), Tailwind CSS v4 (`@tailwindcss/postcss` plugin). Supabase Auth + PostgreSQL, Prisma ORM, Supabase Storage. Deployed on Vercel.

## Commands
- `npm run setup:dev` — idempotent local setup: deps, local Postgres, `.env.local`, `prisma db push` (runs automatically via SessionStart hook in cloud sessions)
- `npm run dev` — Next.js dev server (http://localhost:3000); `npm run dev:bg` / `npm run dev:stop` to run it in the background (logs: `scripts/dev-server.sh logs`)
- `npm run screenshot -- [path] [--demo] [--mobile] [--full]` — Playwright PNG of the running app into `screenshots/` (`--demo` uploads sample data → chart editor)
- `npm run lint` — ESLint (flat config, `eslint-config-next/core-web-vitals`)
- `npm test` — Vitest unit tests (`tests/`)
- `npm run test:e2e` — Playwright e2e (`e2e/`), auto-starts/reuses the dev server
- `npm run build` — production build
- `npm run db:push` / `npm run db:studio` — Prisma against `.env.local`

## Local development (no Supabase needed)
`.env.local` (created from `.env.example`) sets `DEV_AUTH_BYPASS=true` and points Prisma at a local Postgres (`laser_dev`). In that mode `lib/auth.js#getUser()` and `proxy.js` treat every request as the fixed user `dev@laser.local`, and `/api/upload` writes to `.dev-uploads/` instead of Supabase Storage. The bypass is hard-disabled when `NODE_ENV=production` (any `next build`/Vercel deploy). Always use `getUser()` from `@/lib/auth` server-side — never call `supabase.auth.getUser()` directly.

## Working style for this repo
The user mostly prompts from a phone. After any visible change: run the app, screenshot it (`preview` skill), look at the PNG, and send it with SendUserFile. Finish work with the `ship` skill (lint + unit + e2e, commit, push, short summary). Project skills live in `.claude/skills/` (`preview`, `e2e-testing`, `chart-spec`, `frontend-ui`, `ship`); review agents in `.claude/agents/` (`chart-spec-reviewer`, `ui-reviewer`). A PostToolUse hook lints every edited JS/JSX file.

## Directory structure
- `app/` — Next.js App Router pages and layouts
- `components/` — React components (all have `"use client"` since they use hooks or browser APIs)
- `utils/` — pure client-side utilities (excelParser, svgExporter, chartHelpers)
- `lib/` — server-side singletons (Prisma client, Supabase clients, `auth.js` user helper)
- `prisma/` — database schema
- `proxy.js` — Next 16 route protection (replaces middleware)
- `tests/` — Vitest unit tests + in-memory `.xlsx` fixtures (`tests/fixtures/workbooks.js`)
- `e2e/` — Playwright specs + helpers
- `scripts/` — dev setup, background dev server, screenshot tool

## Architecture
Data flows: file upload → SheetJS parses Excel → D3 scales/generators → SVG render via React JSX → downloadable export.

D3 is used for math only (`scaleBand`, `scaleLinear`, `.nice()`, `.ticks()`). All SVG elements are React JSX — never use `d3.select(ref).call(axis)`.

SVG viewBox is in mm units (1 user unit = 1mm). Font/stroke values are converted from pt to mm at definition time: `7pt → 7*(25.4/72) = 2.469mm`.

## Non-negotiable SVG constraints
- All measurements in mm/pt — never px
- Bar color series 1: #E6007E (never substitute)
- Font: Montserrat via Google Fonts `@import`, embedded in SVG export
- Grid stroke-width: 0.25pt converted to mm (0.088mm)
- Year labels: first and last = 4 digits, all middle years = 2 digits
- No axis spines — grid lines only
- All D3-computed coordinates rounded to 3 decimal places (`Math.round(n * 1000) / 1000`)
