# Handoff — 2026-11-08

## Where we are
The dev environment is set up. There is a local Postgres with a dev auth bypass, Playwright screenshots, Vitest and e2e tests, and a `.claude/` folder with hooks, project skills, and skills vendored from upstream (Matt Pocock, Ponytail, ui-ux-pro-max, Vercel, Superpowers). The app itself is unchanged apart from fixes found by the new tests. Branch: `claude/dev-environment-setup-4an2ao`.

## Next steps
1. Get the decisions in `docs/plan-v2.md` §8 (user + LaSER), then start **P0 Foundations** (lv decimal comma, country palette, parser v2, workbook → one chart per sheet).
2. P1 bars → P2 lines → P3 dot plot → P4 export fidelity, per the plan.
3. LaSER's reference files (workbook + 9 designer SVGs) are NOT in the repo yet (`Examples/*.xlsx|svg` are gitignored). Ask the user to commit them or re-upload them.

## Open questions (need the user / unverified)
- The palette is country-based, per the designer SVGs (LV #E6007E, EE #F29FC5 or #F088B6?, LT #575756). Waiting for LaSER to confirm. (2026-11-08)
- The mobile editor layout is dropped: the user prompts from a phone, but the tool is used on a PC. (2026-11-08)
- Every page open fires an autosave PUT (`isLoadingRef` flips before state commits), which bumps `updatedAt`. Noticed but not fixed. (2026-11-08)
- Should CI also run e2e on every push, or only lint and unit tests? It currently runs all of them. (2026-11-08)

## Recent sessions
- 2026-11-08: Planned v2 from LaSER feedback (`docs/plan-v2.md`).
- 2026-11-08: Environment setup, then the skills and `.claude` expansion (gotchas, wrap-up, UI/UX, Matt Pocock, Ponytail).

## Suggested skills for the next session
- `preview`: see the app before and after any UI change.
- `prototype`, `frontend-ui`, `ui-ux-pro-max`: for the mobile editor layout.
- `wrap-up`: at the end.
