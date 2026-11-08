# Research: simpler UX + cheaper hosting (2026-11-08)

Goal from the user: the tool must be usable by almost anyone at LaSER. They give it a workbook, the tool produces a **standard set** of charts, and they adjust only where needed. Hosting must be cheap, reliable, and easy, and Supabase may be more than we need. This doc only covers research and options. **Nothing is built yet.** Decisions are at the end.

---

## Part 1 — UX

### 1.1 What the current flow costs a first-time user
Walked through it in the browser (screenshots `flow-1-empty`, `flow-2-picker`, `flow-3-editor`, `demo`):

| # | Friction | Why it matters for "anyone" |
|---|---|---|
| U1 | **Four steps before the first chart:** Dashboard → "+ New Project" → empty editor named "Untitled Project" → upload → sheet picker. | The user has to understand "project" first. Their mental model is "my report's Excel file". |
| U2 | **The output is one chart at a time.** "Export SVG" downloads only the active chart. A 20-chart report = 20 clicks and 20 file names. | A *set* is the core job, and it has no button. |
| U3 | **No overview of the set.** The left list is text only. You can't see all the charts at once to spot the one that looks wrong. | Checking is the main task once auto-detection is good. |
| U4 | **Every setting is visible at once** (~12 controls plus colour swatches and mm inputs). | Standard charts need 3–4 choices. The rest are expert knobs, and the colour swatches let users break the brand. |
| U5 | **Data warnings are hidden** in a collapsed bar at the bottom. | Warnings are the one thing a non-expert *must* see ("2 empty cells read as 0"). |
| U6 | **Updating data = start again.** If the Excel changes, they upload again and redo all their adjustments. | Reports are revised many times before print. |
| U7 | UI is in English; LaSER works in Latvian. | ⏳ Waiting on LaSER Q10, so not proposed here. |

What already works well and stays: auto-detected chart type per sheet, the sheet picker (shows titles, skips non-data sheets with a reason), brand-exact rendering, mm presets.

### 1.2 How comparable tools handle "anyone can make a standard chart"
- **Datawrapper** (newsrooms; the closest match for "non-designers, strict house style"). It uses a linear **stepper**: Upload data → Check & describe → Visualize → Publish. You start with the *data*, not a project. The Check step shows the parsed table with problems marked. Visual style comes from an organisation **theme** set once by an admin, so reporters never pick colours or fonts. Inside Visualize, options are split into tabs (Refine / Annotate / Layout) so beginners see only a few at a time. [Academy: upload](https://www.datawrapper.de/academy/upload-data), [Reuters newsroom guide](https://reuters-graphics.github.io/newsroom-datawrapper-guide/getting-started/making-your-first-chart), [org themes](https://datawrapper.readthedocs.io/en/stable/user-guide/advanced/organization.html).
- **Flourish:** template-first. Its **company themes** keep styling consistent across a team, and some template settings cannot be changed at all. [Company themes](https://helpcenter.flourish.studio/hc/en-us/articles/8761537958415-Company-themes), [Enterprise branding](https://helpcenter.flourish.studio/hc/en-us/articles/8761521654543-Enterprise-branding).
- **think-cell** (PowerPoint add-in, standard in consulting). Each chart has its own Excel-like **datasheet**, and the corporate **style file** fixes colours, fonts and number formats for everyone. Users only type numbers. A chart stays linked to its data, so updating the numbers updates the chart. [Benefits](https://www.think-cell.com/en/product/benefits).

**The common pattern:**
1. **Brand lives in one place, not in each chart.** Users can't drift from it.
2. **Start from the data.**
3. **Auto-detect, then let the user correct.** Defaults should be right most of the time.
4. **Progressive disclosure:** a few obvious choices up front, the rest behind "More".
5. **The data stays linked:** new numbers flow into existing charts without redoing work.

We already do 1 and 3 well (the brand is in code, and types are auto-detected). We miss 2, 4, 5, and batch output.

### 1.3 Proposal: "workbook in → set out" (three screens)
Mockups: [`img/mock-review.png`](img/mock-review.png), [`img/mock-edit.png`](img/mock-edit.png). These are concept sketches with fake bars, not the real renderer. Current UI for comparison: [`img/current-editor.png`](img/current-editor.png).

1. **Home = one big drop zone** ("Drop the report's Excel file here") with recent workbooks below. Dropping a file creates the project automatically, **named after the file**. No "New Project" button and no "Untitled Project". (Fixes U1.)
2. **Check screen = grid of all charts as thumbnails** (real renderer, small), one card per sheet: title, type, size and a ⚠ badge when the parser had to guess. The primary button is **"Download all (ZIP)"** with tidy file names (`01_Uznemumu-skaits.svg`). Most users can stop here. (Fixes U2, U3, U5.)
3. **Edit one chart, only if needed:** big preview, **4 controls** (type as picture buttons, size as "Half page / Full width", numbers on bars, order), the warning box right there, Prev/Next to go through the set, and **"More options"** for decimals, height, axis unit, year format and colours. (Fixes U4.)
4. **"Replace workbook…"** on the check screen re-reads the file and **keeps each chart's adjustments**, matched by sheet name. New sheets become new charts. Removed sheets are flagged. (Fixes U6. This is the think-cell idea, and the biggest time saver for repeated report revisions.)

Optional later: a "Paste a table" input on the home screen (already in the plan), and an admin-only brand page if LaSER's palette ever needs changing without a developer.

**Effort (rough):** 1 = S, 2 = M (ZIP needs a small library such as `fflate`, ~8 kB, and thumbnails reuse `ChartPreview`), 3 = S–M (mostly moving existing Inspector controls behind a disclosure), 4 = M (merge logic plus tests). This is all client-side, needs no DB schema change, and works on any hosting.

Nothing here depends on open LaSER answers, except the colour controls under "More" (Q1/Q2) and the UI language (Q10).

---

## Part 2 — Hosting, database, auth, storage

### 2.1 What we actually need
- **Users:** a handful of LaSER staff (≤ 20), known in advance. No public sign-up needed.
- **Data:** projects + charts as JSON. Kilobytes per chart, megabytes in total for years.
- **File storage:** **none.** `app/api/upload/route.js` saves the original workbook to Supabase Storage, but nothing ever reads it back. Everything the charts need is in `dataJson`. We can delete the upload step.
- **Compute:** small. Parsing and rendering run in the browser, and the server only does CRUD.
- **Commercial use** (it's a tool for a company), EU data location preferred (Latvian org, GDPR), and it must not break after a quiet month.

### 2.2 Two problems with the current setup
1. **Vercel Hobby (free) is non-commercial only.** The Terms say Hobby is "only for your personal or non-commercial use". A tool built for and used by LaSER is commercial, so the compliant Vercel plan is Pro ($20/month per seat). [Vercel ToS](https://vercel.com/terms), [fair use](https://vercel.com/docs/limits/fair-use-guidelines), [Hobby plan](https://vercel.com/docs/plans/hobby-plan).
2. **Supabase Free pauses a project after ~7 days without activity.** LaSER uses the tool in bursts around reports. After a quiet week, login and the DB stop working until someone clicks "restore" in the Supabase dashboard. Data is kept, but the tool is down. Pro ($25/month) removes pausing. [Supabase pausing FAQ](https://supabase.com/kb/faqs/platform/free-project-pausing) (could not open it from this sandbox; the 7-day figure is consistent across several 2026 write-ups, e.g. [this one](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe)).

So "current stack, done properly" = **~$45/month**. "Current stack, free" = a ToS problem plus weekly outages.

### 2.3 Building blocks
**Database (Postgres, so Prisma and all code stay the same):**
| Option | Free tier | Idle behaviour | Notes |
|---|---|---|---|
| Supabase | 500 MB | **Pauses after ~7 days; manual restore** | What we have |
| **Neon** | 1 GB/project, 100 CU-h/month, EU (Frankfurt) region | Scales to zero after 5 min and **wakes automatically** on the next query (sub-second to ~1 s) | Swap = change `DATABASE_URL`. [Neon free plan FAQ](https://neon.com/faqs/free-plan-limits-and-quotas) |
| Render Postgres | 1 GB | **Deleted after 30 days** | Not viable. [Render free](https://render.com/free) |
| Railway | $5/month floor, usage-metered | Always on | A DB alone can cost more than $5. [overview](https://livemy.app/blog/railway-pricing) |
| Postgres on our own VPS | — | Always on | We own backups |

**Auth (only "who are you" + an allowlist):**
| Option | Effort | Notes |
|---|---|---|
| Supabase Auth | done | Pauses with the project |
| **Better Auth, email one-time code** (or magic link) | M | A library in our app with sessions stored in our own Postgres. No passwords. Needs an email sender (Resend's free tier is plenty for 20 users) and a verified sender domain. Auth.js is now maintained by the Better Auth team, and Better Auth is the recommended default for new projects. [comparison](https://makerkit.dev/blog/tutorials/better-auth-vs-clerk) |
| **Cloudflare Access, email PIN** | S | Zero auth code: Cloudflare puts a login screen in front of the whole site, and only allowlisted emails get a 6-digit code. Free up to 50 users. The app reads the user's email from a header Cloudflare signs. Requires the domain's DNS on Cloudflare. [Cloudflare blog](https://blog.cloudflare.com/teams-plans) |
| Shared password | XS | Too weak: no per-user projects, and nobody can be removed |

**App hosting (Next.js 16):**
| Option | Price | Commercial on free? | Notes |
|---|---|---|---|
| Vercel Hobby | $0 | **No** | Current |
| Vercel Pro | $20/month/seat | Yes | Zero migration; best Next.js support; preview URLs |
| **Netlify Free** | $0 (300 credits/month, the site pauses if exceeded) | **Yes** | Preview URLs. Next.js runs through their adapter; `proxy.js` needs testing. [Netlify credit plans](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/) |
| Cloudflare Workers (+D1) | $0 | Yes | Next.js via OpenNext. Free-plan limits (10 ms CPU, 50 subrequests) and a Prisma → D1 switch make it the biggest migration. [Workers limits](https://developers.cloudflare.com/workers/platform/limits) |
| **Hetzner VPS + Coolify** (EU) | ~€4–8/month all-in (app + Postgres + backups) | Yes | Cheapest always-on option, with data in Germany/Finland. Coolify gives a Vercel-like git-push deploy. We own OS updates, backups and uptime. [cost analysis](https://dev.to/devtoolpicks/vercel-vs-hetzner-in-2026-which-is-actually-worth-it-for-solo-developers-2og8) |

### 2.4 Three packaged options
| | **A. Pay for current** | **B. Lean managed** (recommended) | **C. One EU server** |
|---|---|---|---|
| App | Vercel Pro | Vercel Pro **or** Netlify Free | Hetzner + Coolify |
| DB | Supabase Pro | Neon Free (EU) | Postgres on the box |
| Auth | Supabase Auth | Better Auth email code (or Cloudflare Access) | Better Auth email code |
| Storage | Supabase Storage | none (removed) | none |
| Cost/month | ~$45 | **$0 (Netlify) / $20 (Vercel)** | ~€5–8 |
| Migration | none | DB URL swap + replace auth (~1 session) | DB + auth + deploy setup (~1–2 sessions) |
| Ops burden | none | none | updates, backups, monitoring |
| Reliability risk | low | low (Neon cold start ~1 s) | depends on us |

**Why B:** it removes both current problems (non-commercial ToS and weekly pausing), keeps Postgres + Prisma unchanged, deletes code (Supabase clients, storage upload, signup page), and costs $0–20. The Vercel-vs-Netlify choice depends on who pays and on whether it's worth zero migration risk. C is the cheapest *paid* option and the best for EU data control, but it makes you the sysadmin.

The **no-backend** extreme (everything in the browser, save/open a project file) was considered and rejected. Charts would not be shared between colleagues and would be lost when browser data is cleared.

---

## Decisions needed (from the user)
See chat. Recorded answers go here.
