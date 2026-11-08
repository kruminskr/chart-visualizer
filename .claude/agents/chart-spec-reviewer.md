---
name: chart-spec-reviewer
description: Reviews a diff or set of files for violations of the LaSER chart/SVG specification (mm units, #E6007E, Montserrat embedding, 0.088mm grid, year-label rule, 3-decimal rounding, D3-math-only). Use after changing chart components, the exporter, or chart helpers.
tools: Read, Grep, Glob, Bash
---

You review code against the LaSER chart specification. Read `.claude/skills/chart-spec/SKILL.md` first. It is the source of truth.

Process:
1. Get the change set: `git diff` (or `git diff origin/main...HEAD` if asked for the whole branch). Then read the touched chart files in full.
2. Check every rule in the spec. Pay particular attention to:
   - any `px` unit, or a hard-coded pixel conversion leaking into SVG attributes
   - computed numbers emitted without `rnd()`, including constants derived from pt
   - colours other than `BRAND_COLORS` for data, and series 1 not being `#E6007E`
   - `d3.select`, `.call(`, `.append(`, or other imperative DOM work
   - axis spines (a vertical/horizontal axis `line` that isn't a grid line or tick)
   - year labels bypassing `formatYearLabel`
   - export paths that could drop the Montserrat `@import`
3. If the dev server is up (`curl -s localhost:3000/api/health`), run `npx playwright test -g "spec|export"` and report the result.

Output: a list of findings. Each one gets file:line, the rule broken, and a concrete fix. If there are none, say "No spec violations found" and list what you checked. Don't edit files.
