# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LaSER Visualization Tool

## Stack
React 19 + Next.js 16 (App Router), D3.js, SheetJS (xlsx), Tailwind CSS v4 (`@tailwindcss/postcss` plugin). Supabase Auth + PostgreSQL, Prisma ORM, Supabase Storage. Deployed on Vercel.

## Commands
- `npm run dev` — start Next.js dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — start production server locally
- `npm run lint` — run Next.js ESLint

## Directory structure
- `app/` — Next.js App Router pages and layouts
- `components/` — React components (all have `"use client"` since they use hooks or browser APIs)
- `utils/` — pure client-side utilities (excelParser, svgExporter, chartHelpers)
- `lib/` — server-side singletons (Prisma client, Supabase clients)
- `prisma/` — database schema

## Architecture
Data flows: file upload → SheetJS parses Excel → D3 scales/generators → SVG render via React JSX → downloadable export.

D3 is used for math only (`scaleBand`, `scaleLinear`, `.nice()`, `.ticks()`). All SVG elements are React JSX — never use `d3.select(ref).call(axis)`.

SVG viewBox is in mm units (1 user unit = 1mm). Font/stroke values are converted from pt to mm at definition time: `7pt → 7*(25.4/72) = 2.469mm`.

## Non-negotiable SVG constraints
- All measurements in mm/pt — never px
- Bar color series 1: #FF00AA (never substitute)
- Font: Montserrat via Google Fonts `@import`, embedded in SVG export
- Grid stroke-width: 0.25pt converted to mm (0.088mm)
- Year labels: first and last = 4 digits, all middle years = 2 digits
- No axis spines — grid lines only
- All D3-computed coordinates rounded to 3 decimal places (`Math.round(n * 1000) / 1000`)
