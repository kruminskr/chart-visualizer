---
name: frontend-ui
description: How to build and change the LaSER Charts app UI (dashboard, editor sidebar, auth pages) with React 19, Next.js 16 App Router, and Tailwind v4. Covers component conventions, the visual language of the tool, copy rules, accessibility, and the screenshot critique loop. Use for any UI/UX work outside the chart SVG itself.
---

# Frontend UI for LaSER Charts

The audience is researchers making publication-ready charts. The app is a **quiet, precise tool**: the chart is the hero, and the chrome stays out of its way. The only strong colour belongs to the data (`#E6007E`). The UI shell uses Tailwind grays.

## Stack conventions
- Next.js 16 App Router. Pages that read the session and DB are **server components** (`app/dashboard/page.jsx`). Interactive pieces are `'use client'` components in `components/` or co-located `*Client.jsx`.
- Server-side user: `getUser()` from `@/lib/auth` (handles the dev bypass). Never call `supabase.auth.getUser()` directly in new code.
- Route protection lives in `proxy.js` (Next 16's replacement for middleware). API routes check auth and ownership themselves.
- Tailwind v4 via `@import "tailwindcss"` in `app/globals.css`. There's no tailwind.config. Put theme tokens in CSS with `@theme` if needed.
- Path alias `@/` maps to the repo root.
- JavaScript (JSX), not TypeScript. Keep it that way unless asked.

## Design principles (adapted from Anthropic's frontend-design skill)
- **Restraint.** Spend boldness in one place: the chart canvas. Don't add gradients, decorative shadows, or a card for everything.
- **Structure is information.** Borders, dividers, and labels must encode something real (a group of controls, a state). They aren't decoration.
- **Copy:** write from the user's perspective, sentence case, active verbs. A button says what it does ("Export SVG", "New project"). Errors say what went wrong and how to fix it (see the parser messages). An empty state invites action ("Upload an Excel file to get started").
- **Motion:** only in response to user action (saving, loading, opening). No entrance animations.
- **Quality floor:** visible keyboard focus, labelled inputs, real `<button>`s, works at a 390 px phone width (dashboard grid, auth pages), and `prefers-reduced-motion` respected.

## Workflow
1. Read the components involved. Reuse the existing class patterns (`inputClass`/`labelClass` in `ChartControls`).
2. Make the change.
3. **Screenshot loop** (`preview` skill): `npm run screenshot -- --demo` (plus `--mobile` for responsive work). View the PNG, critique, and fix. Before finishing, remove one unnecessary element.
4. Check the console errors the screenshot script prints. Hydration mismatches count (e.g. relative times need `suppressHydrationWarning`).
5. Add or extend a Playwright test for new interactive behaviour (`e2e-testing` skill).
6. Send the user the final screenshot.
