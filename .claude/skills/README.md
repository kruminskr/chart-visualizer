# Skills catalog

Skills load by description; Claude picks them automatically or you type `/<name>`. Vendored skills keep their upstream text, with an **"In this repo"** section appended at the end. To update one, re-copy it from upstream and keep that section.

## Workflow (this repo)
| Skill | Use | Source |
|---|---|---|
| `preview` | Run the app, take Playwright screenshots, send them to the phone | own |
| `ship` | lint + unit + e2e → review → commit/push → summary | own |
| `wrap-up` | End of session: lessons → gotchas/CLAUDE.md, refresh `docs/HANDOFF.md`, push | own, synthesised from goagrawal-genai/wrap-up + mattpocock `retro`/`handoff` + Anthropic `revise-claude-md` |
| `gotchas` | Record a trap as a When/Do/Else rule in `.claude/context/gotchas.md` (auto-loaded) | own, format from goagrawal-genai/wrap-up |
| `chart-spec` | The fixed SVG/brand spec and how to verify it | own |
| `e2e-testing` | Vitest + Playwright conventions here | own |

## UI / UX taste
| Skill | Use | Source |
|---|---|---|
| `frontend-ui` | Entry point for app UI work; routes to the skills below | own, adapted from [anthropics/skills](https://github.com/anthropics/skills) `frontend-design` |
| `ui-ux-pro-max` | Searchable design data (styles, palettes, type, 120 UX rules, Next/Tailwind stacks), design-system generator | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) ★147k, MIT |
| `web-design-guidelines` | Audit UI code against Vercel's Web Interface Guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) ★34k, MIT |
| `react-best-practices` | 70 React/Next performance rules | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), MIT |
| `prototype` | 2–5 radically different UI variants via `?variant=` to pick from | [mattpocock/skills](https://github.com/mattpocock/skills), MIT |

## Engineering discipline
| Skill | Use | Source |
|---|---|---|
| `ponytail` (+ always-on rules in `.claude/context/ponytail.md`) | Smallest complete change; levels lite/full/ultra | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), MIT |
| `ponytail-review` | Review a change: correct, safe, load, tested, fast, lean | Ponytail, MIT |
| `ponytail-audit` | Whole-repo audit report | Ponytail, MIT |
| `ponytail-debt` | Ledger of `shortcut:` comments | Ponytail, MIT |
| `tdd` | Red → green at agreed seams | mattpocock/skills, MIT |
| `diagnosing-bugs` | Feedback loop first, then hypotheses, then the fix and a regression test | mattpocock/skills, MIT |
| `codebase-design` | Deep modules / seams vocabulary | mattpocock/skills, MIT |
| `grilling` / `grill-me` | Stress-test a plan in question rounds | mattpocock/skills, MIT |
| `writing-for-agents` | How to write skills and CLAUDE.md | mattpocock/skills, MIT |
| `verification-before-completion` | No success claims without fresh evidence | [obra/superpowers](https://github.com/obra/superpowers) ★314k, MIT |

## Also adopted (not skills)
- `.claude/hooks/block-dangerous-git.sh`: adapted from mattpocock `git-guardrails-claude-code`. It still allows normal pushes to the session branch.
- `.github/workflows/ci.yml`: lint + unit + e2e on every push. Matt's `retro` treats a repo with no guardrail as a finding.

## Considered, not adopted
- Ponytail plugin hooks, statusline and band: plugin-runtime specific. The rules file covers the behaviour.
- mattpocock issue-tracker skills (`to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement-spec`): add them if the project starts using GitHub issues.
- superpowers `brainstorming`/`writing-plans`: they overlap with `grilling` and `prototype`.
