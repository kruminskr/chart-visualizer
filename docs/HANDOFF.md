# Handoff — 2026-11-08

## Where we are
The dev environment is set up. There is a local Postgres with a dev auth bypass, Playwright screenshots, Vitest and e2e tests, and a `.claude/` folder with hooks, project skills, and skills vendored from upstream (Matt Pocock, Ponytail, ui-ux-pro-max, Vercel, Superpowers). The app itself is unchanged apart from fixes found by the new tests. Branch: `claude/dev-environment-setup-4an2ao`.

## Next steps
1. Make the chart editor usable on mobile. At 390 px the 256 px sidebar squeezes the chart to a thumbnail. Use `prototype` for 2–3 layout variants, then `frontend-ui` and `ui-ux-pro-max`.
2. Generate and commit a design system for the app shell (`ui-ux-pro-max --design-system --persist`). This needs the user's approval to run the script.
3. Run `ponytail-audit` once to get a baseline of bugs and bloat.

## Open questions (need the user / unverified)
- Series 2–4 colours in `lib/brandColors.js` are still placeholders until the client confirms them. (2026-11-08)
- Every page open fires an autosave PUT (`isLoadingRef` flips before state commits), which bumps `updatedAt`. Noticed but not fixed. (2026-11-08)
- Should CI also run e2e on every push, or only lint and unit tests? It currently runs all of them. (2026-11-08)

## Recent sessions
- 2026-11-08: Environment setup, then the skills and `.claude` expansion (gotchas, wrap-up, UI/UX, Matt Pocock, Ponytail).

## Suggested skills for the next session
- `preview`: see the app before and after any UI change.
- `prototype`, `frontend-ui`, `ui-ux-pro-max`: for the mobile editor layout.
- `wrap-up`: at the end.
