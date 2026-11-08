# Gotchas

Things that already cost a session time. Each entry follows one format. **When** is the situation that should make you stop. **Do** is the check or action. **Else** is what goes wrong if you skip it. Add entries with the `gotchas` skill. Merge or remove entries when they no longer apply. Keep this file short: it is loaded into every session.

## Git & environment
- **When** you want to undo an edit to one file. **Do** use `git diff <file>` and then fix it by hand, or `git stash`. **Else** `git checkout <file>` throws away all uncommitted work in that file. On 2026-11-08 this wiped the package.json changes. `git checkout -- <file>` and `git restore` are now blocked by a hook.
- **When** `git push` returns 403 "Claude doesn't have GitHub access". **Do** stop retrying and ask the user to reconnect GitHub or install the Claude GitHub App. **Else** retries change nothing.
- **When** you add or upgrade `@playwright/test`. **Do** keep it pinned to the exact version of the pre-installed browsers (`1.63.0`, `/opt/pw-browsers`). Never run `playwright install`. **Else** the browser executable is not found.
- **When** you run a Prisma CLI command. **Do** use `npm run db:push` / `db:studio` (these wrap `dotenv -e .env.local`). **Else** Prisma reads only `.env`, finds no `DATABASE_URL`, and fails.
- **When** the DB-backed pages return 500 at the start of a session. **Do** run `npm run setup:dev`. It starts Postgres with `service postgresql start`, as root through `su postgres`. **Else** you debug app code for a stopped database.

## Tooling versions
- **When** you change the ESLint packages. **Do** stay on ESLint 9. `eslint-config-next` plugins do not support ESLint 10. **Else** you get ERESOLVE on install and plugin crashes.
- **When** you want to lint. **Do** use `npm run lint` (`eslint .`). **Else** you try `next lint`, which Next 16 removed.
- **When** you run downloaded skill scripts (for example ui-ux-pro-max `search.py`). **Do** expect the auto-mode classifier to ask the user first, and tell the user what it does (that script is local Python with only the standard library). **Else** the call is denied and nothing explains why.
- **When** you need to widen `permissions.allow` in `.claude/settings.json`. **Do** propose the exact lines and let the user add them. **Else** auto mode denies it as self-modification. Adding hooks with the Edit tool worked; editing the file through a Bash or Python script did not.

## App behaviour
- **When** a client component loads data in `useEffect`. **Do** add a `cancelled` flag in the cleanup and block user input until `loaded`. **Else** React StrictMode loads twice in dev, and a late response overwrites the user's edits (the bug in `app/project/[id]/page.jsx`).
- **When** you render relative times ("5 minutes ago") in an SSR client component. **Do** add `suppressHydrationWarning` to the element, or render the time on the client only. **Else** you get a hydration-mismatch console error.
- **When** you add a pt-derived or D3-computed value to the SVG. **Do** wrap it in `rnd()`, including constants. **Else** the export contains `0.08819444444444444`, which breaks the spec. The e2e export test catches this.
- **When** Playwright uploads a file on the editor page. **Do** wait for "Upload an Excel file to get started" first. The input stays disabled until the project has loaded. **Else** the upload is ignored without an error.
- **When** you run a throwaway Playwright script from the scratchpad. **Do** write it as `.cjs` with `require('playwright')`. **Else** ESM `import` fails with ERR_MODULE_NOT_FOUND, because only CommonJS resolves the pre-installed copy.
- **When** you render multi-line SVG labels with `<tspan>`. **Do** put the `dy` on the first tspan (the `Lines` helper does this). **Else** the tspan's own dy overrides the parent's and the label shifts up.
