# Research: simpler UX + cheaper hosting (2026-11-08)

Goal from the user: the tool must be usable by almost anyone at LaSER. They give it a workbook, the tool produces a **standard set** of charts, and they adjust only where needed. Hosting must be cheap, reliable, and easy, and Supabase may be more than we need. This doc only covers research and options. **Nothing is built yet.** Decisions are at the end.

---

## Part 1 — UX

### 1.1 What the current flow costs a first-time user
Walked through it in the browser (screenshots `flow-1-empty`, `flow-2-picker`, `flow-3-editor`, `demo`):

| # | Friction | Why it matters for "anyone" |
|---|---|---|
| U1 | **Four steps before the first chart:** Dashboard → "+ New Project" → empty editor named "Untitled Project" → upload → sheet picker. | The user has to understand "project" first. Their mental model is "my report's Excel file". |
| U2 | **The output is one chart at a time.** "Export SVG" downloads only the active chart. | *Update from the user: uploads are usually a few charts, not 20, so this is minor.* |
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

### 2.5 Update (user, 2026-11-08)
The tool is built by one team member, not sold, so the user treats it as non-commercial, and **Vercel Hobby stays usable**. (Vercel defines commercial use broadly. Revisit if LaSER ever pays for the work.) Option A is dropped. Detailed B vs C below.

## Part 3 — B vs C in detail

### 3.1 Work shared by B and C (the same code either way)
Most of the migration is the same for both, because it is "remove Supabase", not "move hosting".

| Change | Files | Notes |
|---|---|---|
| Replace Supabase Auth with **Better Auth** (a library; sessions in our Postgres via its Prisma adapter) | delete `lib/supabase/*` (3), `app/auth/callback`, `app/api/users/sync`, `app/signup`; rewrite `lib/auth.js` (`getUser()` keeps its signature, so the API routes stay untouched), `proxy.js` (cookie check), `app/login`, the sign-out in `components/Header.jsx`; add `app/api/auth/[...all]/route.js` | ~10 files, mostly deletions. The dev bypass stays as is. |
| Login method | — | (a) **Email one-time code**: no passwords; needs an email sender (Resend free tier) and a domain to send from. (b) **Email + password, accounts created by you**: no email service at all, sign-up disabled. Both are restricted to an allowlist (env `ALLOWED_EMAILS` or a domain such as `@laser.lv`) with one hook. |
| Prisma schema | `prisma/schema.prisma` | `User` gets Better Auth's fields (`name`, `emailVerified`, `image`, `updatedAt`), plus new `Session`, `Account`, `Verification` tables. Projects/charts unchanged. |
| Delete the file upload | `app/api/upload/route.js`, the upload call in `app/project/[id]/page.jsx`, `Chart.dataFileUrl` (can stay unused) | Nothing reads the stored file. Removes the bucket, the service-role key and `.dev-uploads/`. |
| Remove packages | `@supabase/ssr`, `@supabase/supabase-js` | Add `better-auth` (+ `resend` for option a). |
| Existing production data | — | If prod Supabase has real projects: `pg_dump` the `public` schema, restore it into the new DB, and keep user ids by email. If it's only test data: start fresh. |
| Tests | `e2e/` | Run against the dev bypass as today, plus one e2e for the login page. |

Side benefit: today a user who never went through `/signup` has no `User` row (only `/signup` calls `/api/users/sync`). With Better Auth the user row *is* the auth record, so that gap disappears.

**Effort: about one session**, with a small risk around Better Auth + Next 16 `proxy.js` (fall back to checking the session inside pages if needed).

### 3.2 B: Vercel Hobby + Neon Free (managed, $0)
| Topic | Detail |
|---|---|
| Extra steps on top of 3.1 | Create a Neon project in **AWS eu-central-1 (Frankfurt)**. Set `DATABASE_URL` (pooled, `?pgbouncer=true`) and `DIRECT_URL` (direct) in Vercel. `prisma db push` once. Set the Vercel function region to `fra1` so the app sits next to the DB. Delete the Supabase project. |
| Cost | €0 |
| Speed | The first request after 5 minutes idle waits ~0.5–1 s while Neon wakes. Then it's normal. Parsing and rendering are in the browser anyway. |
| Limits | 1 GB storage (we'd use a few MB), 100 compute-hours/month per project (hundreds of active hours at the smallest size), 5 GB transfer. [Neon free FAQ](https://neon.com/faqs/free-plan-limits-and-quotas) |
| Backups | **Weak on free:** a 6-hour instant-restore window and 1 manual snapshot. [Neon history window](https://neon.com/docs/postgres/backup-restore/history-window). Fix: a **nightly GitHub Action** runs `pg_dump` and keeps the dump as a workflow artifact (or in a private repo). ~20 lines of YAML, free. |
| Deploys | Unchanged: push → Vercel builds; every branch gets a preview URL you can open on your phone. |
| Logs / debugging | Vercel dashboard (works on a phone). Neon console for SQL. |
| Data location | EU for the DB. Vercel functions run in Frankfurt if set. Both are US companies (relevant only if LaSER asks for EU-owned providers). |
| Ops for you | None. No servers, no updates. |
| Risks | Two free tiers that can change terms (Supabase and Neon both have before). Vercel Hobby's commercial clause, if the situation changes. |

### 3.3 C: one Hetzner server + Coolify (self-hosted, ~€7–9/month)
| Topic | Detail |
|---|---|
| Extra steps on top of 3.1 | Rent a Hetzner Cloud server in Falkenstein/Nuremberg/Helsinki (Ubuntu). Run the Coolify install script. Connect the GitHub repo (Coolify's GitHub App). Add a Postgres service in Coolify. Point a domain (or Coolify's free `sslip.io` hostname) at it, with HTTPS set up automatically. Set `next.config` `output: 'standalone'` (smaller image). Set up backups and monitoring (below). Firewall: only 22/80/443, SSH keys only. |
| Cost | CX23 (2 vCPU x86, 4 GB) ≈ **€5.49** or CAX11 (2 vCPU ARM, 4 GB) ≈ €5.99 after Hetzner's 2026 price rises, + backups (20 % ≈ €1.10) + VAT. **≈ €8–9/month incl. VAT.** [Northflank on the 2026 increases](https://northflank.com/blog/hetzner-cloud-server-price-increases). One October report says the cheap CX/CAX plans sometimes can't be ordered ([Bitdoze](https://www.bitdoze.com/md/es/hetzner-cloud-precios-2026.md)). Check on the day. The next size up (CX33) is ≈ €8.49 + VAT. |
| Speed | Always on, no cold start. Next.js + Postgres + Coolify fit in 4 GB. The **build** (`next build`) runs on the same box and is the tight spot. Add 2 GB swap. |
| Backups | Hetzner server backups (7 daily images) + Coolify's scheduled Postgres dumps to S3-compatible storage (Cloudflare R2 free tier, or Hetzner Object Storage). Test a restore once. |
| Deploys | Push to `main` → Coolify builds and deploys. **Preview URLs per branch/PR** are possible but need extra setup (wildcard domain + PR previews). Without them, you lose the "open the branch on my phone" step you have now. |
| Logs / debugging | Coolify's web UI shows logs (usable on a phone). Anything deeper needs SSH. These cloud sessions can't reach your server unless you allow its host in the network settings. |
| Data location | Everything with one EU-owned provider (Germany/Finland). The strongest answer if LaSER cares about data residency. |
| Ops for you | Monthly: Coolify updates (it's a web admin panel on the internet, so keep it current), Ubuntu security updates (enable unattended-upgrades), check backups ran, and a free uptime monitor (e.g. UptimeRobot) that emails you. Roughly 30 min/month. When something breaks, it's on you. |
| Risks | You are the sysadmin. A full disk, a failed update or an expired certificate = downtime until you fix it, and LaSER uses it in bursts around deadlines. |

### 3.4 Side by side
| | **B: Vercel + Neon** | **C: Hetzner + Coolify** |
|---|---|---|
| Monthly cost | €0 | ≈ €8–9 |
| Migration work | 3.1 + ~1 h config | 3.1 + ~half a session of server setup |
| Cold start | ~1 s after idle | none |
| Backups out of the box | weak (6 h); add the nightly dump Action | good (daily images + dumps) |
| Branch preview URLs | yes, free | extra setup |
| Data location | EU region, US companies | EU, EU company |
| Your monthly upkeep | none | ~30 min + incidents |
| Lock-in | low (plain Postgres) | none |
| Can I (Claude) help from these sessions? | yes (config is in repo/dashboards) | partly (deploy via git; server access needs a network allowance) |

### 3.5 Recommendation
**Do 3.1 first, deploy on B.** The auth/storage work is identical for both and makes the app plain "Next.js + Postgres". After that, moving from B to C is a `pg_dump` / restore and an env change, an afternoon at most. So the hosting choice stays reversible. Go straight to C only if LaSER requires EU-owned hosting, or you *want* to run a server.

## Part 4 — UX questions (round 1, 2026-11-08)
The user answers what they can. The rest goes to LaSER (translate into `docs/laser-questions.md`). Answers go under each question.

**Who and how often**
1. How many people will use it, and who? (Analysts who hand SVGs to the designer? The designer herself? Anyone in the office?)
2. How often: weekly, or a burst around each report?
3. How comfortable are they with Excel: can they be asked to follow a simple template, or must the tool cope with whatever they send?

**What goes in**
4. A typical upload: how many sheets/charts? Is one file = one report, or one file = one chart?
5. When a number changes, do they fix it in Excel and upload again, or would they rather edit it in the tool?
6. Do they ever have data that's *not* in Excel (copied from a PDF/website), so a "paste a table" box would help?

**What comes out**
7. Where does the SVG go next: straight to the designer (InDesign/Illustrator), or also into Word/PowerPoint or the web (which would need PNG)?
8. Is the chart's size always one of the two report widths (77,5 / 165 mm), or do they need other sizes often?

**Coming back later**
9. Do they come back to old charts (e.g. "last year's chart 7 with new numbers"), or is each upload a one-off? (This decides whether "projects" stay or the home screen becomes just "drop a file".)
10. Should colleagues see each other's charts (one shared team space), or does everyone have their own?

**How much freedom**
11. Which adjustments do they actually make today? (Our guess: chart type, horizontal/vertical, numbers on bars, order, size.)
12. Should colours be **locked to the country palette** (no picker), with an exception only for a designer or admin?

**Hosting-related (user)**
13. Is there real data in the production Supabase now, or only tests? (Decides whether we migrate data.)
14. Do you (or LaSER) have a domain we can send login emails from and point the site at? (Decides code-by-email vs. passwords, and C's address.)
15. Does LaSER have any rule that data must stay with EU companies? (The only strong reason to choose C over B.)

### Answers (user, 2026-11-08)
1. **Users = researchers.** They make the charts themselves to see how they'll look, then hand them to the designer, who lays out the paper (published as a PDF and in print, e.g. [Rīgas zināšanu josla 2.0](https://domnicalaser.lv/rigas-zinasanu-judze-2-0/)). 3 researchers at LaSER, sometimes external researchers for a single paper: ~5 users, 10 at most. Goal: every researcher produces charts in one standard.
2. Bursts around each report, a few times a month. (Why it matters: people forget a tool between uses, so it must explain itself every time; and a free database that pauses after a quiet week hits exactly this pattern.)
3. They can follow simple Excel templates, but the tool shouldn't depend on exact cells. The current parser already finds the table anywhere on the sheet.
4. Unknown; assume ~5 charts per upload. → ask LaSER.
5. Editing values after upload is valuable. → **built** (Data panel). Also ask LaSER how they prefer to fix numbers.
6. Excel only for now. No paste-a-table.
7. SVG goes only to the designer. No other exports for now.
8. Designer: 77,5 / 165 mm is her own "keeping order" choice. Ideally width and height are free. (Already possible: presets + free mm inputs.)
9. Researchers should reach the projects they're working on, at least current charts. → ask LaSER about older ones.
10. → ask LaSER.
11. Most important question. Build what we think is needed, then talk it through with LaSER.
12. → ask LaSER.
13. No production data to keep.
14. LaSER owns a domain. (Only needed for login-code emails or a nicer address. Not needed with passwords.)
15. Probably no EU-only rule. The user likes C for its simplicity and price. **Hosting changes are on hold.**

### Built this round (UX quick wins that don't wait on LaSER)
- **Start from the file:** ~~the dashboard became a big drop zone~~. *The user rejected it as feeling cheap (2026-11-08) and the original "Projects" + "+ New Project" layout is back.* What remains: dropping a file anywhere on the dashboard creates a project named after it and opens the sheet picker (no visible UI until a file is dragged over), and uploading into an "Untitled Project" renames it after the file.
- **Edit values in place:** every number in the Data panel is an input (Latvian decimal comma, empty = no value, unreadable input is rejected). The Excel file isn't changed.
- **See the whole set:** the chart list shows a live thumbnail of each chart and a ⚠ count when the parser left notes.

## Part 5 — Flow ideas to show LaSER
Three directions, from least to most change. They aren't exclusive.

| | Idea | What changes | Mockup |
|---|---|---|---|
| F1 | **Current editor, tidied** (built) | Thumbnails, editable data, project named after the file. Everything else as now. | `img/v3-editor.png`, `img/v3-data-edit.png` |
| F2 | **Set overview first** | After upload, a grid of all charts with warnings and a "Download all" button. Click a chart to edit it. Good if a paper has many charts. | `img/mock-review.png` |
| F3 | **Simple editor** | The settings panel shows ~4 common controls. Everything else sits behind "More options". The right set depends on LaSER's answer to "which adjustments do you make". | `img/mock-edit.png` |

Not proposed now: a step-by-step wizard. With ~5 charts and repeat users, it adds clicks without adding clarity.
