---
name: wrap-up
description: End-of-session knowledge pass for LaSER Charts. Distil durable lessons into gotchas, CLAUDE.md, or skills; propose environment improvements (retro); refresh docs/HANDOFF.md so the next session starts where this one stopped; verify; commit and push; send a phone-sized summary. Use when the user says "wrap up", "wrap up the session", "close out", "hand off", "checkpoint", "end of session", or "capture what we learned".
---

# Wrap-up

This is a **distillation, not a transcript dump**. The next session has no memory except the files it re-reads. "Smarter next time" means better files. Bloat makes the next session *dumber*, so remove things as readily as you add them.

## Homes (this repo)

| Role | File | Loaded |
|---|---|---|
| Entry point: current state, next steps | `docs/HANDOFF.md` | read first each session (pointer in CLAUDE.md) |
| Preventive rules / traps | `.claude/context/gotchas.md` (`gotchas` skill) | auto, every session |
| How to work in this repo | `CLAUDE.md` | auto, every session |
| Coding-size discipline | `.claude/context/ponytail.md` | auto, upstream text, don't edit casually |
| Decisions + why | `docs/decisions.md` (create on first decision) | on purpose |
| Repeatable workflows | `.claude/skills/<name>/SKILL.md` (follow `writing-for-agents`) | description auto, body on use |
| Gates | `npm run lint`, `npm test`, `npm run test:e2e`, hooks in `.claude/settings.json` | n/a |

Auto-loaded files must be **consolidated**: merge, replace, retire, *then* add. On-purpose files can grow.

## Process

0. **Scope.** Find the last wrap-up (`git log --grep "wrap-up" -1`) and look only at what happened after it. Read `docs/HANDOFF.md` and `gotchas.md` so you update entries instead of duplicating them.
1. **Reflect.** Scan the session for *durable* signal only:
   - **User corrections and preferences.** This is the strongest signal ("do X not Y", tone, format, phone workflow).
   - **Overturned claims and mistakes.** Write each one as a gotcha (When / Do / Else). Don't tell the story.
   - **Recurring friction.** Look for anything you did twice or had to re-derive. If it can be automated (script, hook, test, lint rule), propose the automation, not a rule.
   - **Decisions and their rationale.**
   - **Stale artifacts.** Probe for them: CLAUDE.md commands that no longer exist, gotchas whose cause has been fixed, a HANDOFF that claims something now false.
   Ignore one-off detail and anything already recorded in commits, tests or code.
2. **Retro on the environment.** In order of severity, check whether anything could have been caught or sped up by: navigation pointers, an automated check (prefer a deterministic check over a written rule), better tooling or logs, or a CLAUDE.md line that is a no-op and should be deleted.
3. **Propose.** Use one bullet per item: `what → file → one-line change`. Group by file. Keep it to a handful. If the user is AFK or said "just do it", apply the low-risk items, defer the rest with a reason, and never block on a confirmation nobody is there to give. Always confirm before deleting user-written rules.
4. **Apply.** Edit the files. Prefer replacing to adding. Check each new rule: will a future reader know when it *stops* applying? Is it one occurrence dressed up as a fact? If so, put it under HANDOFF "Open questions" instead.
5. **Refresh `docs/HANDOFF.md`.** This is the deliverable. Rewrite it to today using the template below. Check every claim against reality: run `git log`, `git status`, and the tests. A wrap-up that improves five files and leaves HANDOFF stale has made the next session worse.
6. **Verify, then ship.** Run `npm run lint && npm test` (and `npm run test:e2e` if code changed this session). Look at `git diff` and confirm it only touches what you meant. Commit with a message starting `chore: wrap-up`, staging paths explicitly, and push. Never claim that something was saved or pushed unless you saw it happen.
7. **Report to the phone.** Keep it to five bullets at most: what was done this session, what was learned (with the files it went to), the next step, and anything the user must decide. Say what you deliberately did *not* record, and why.

## HANDOFF.md template

```markdown
# Handoff — <YYYY-MM-DD>

## Where we are
<2–4 sentences: state of the app and of the current work stream. Branch name.>

## Next steps
1. <most valuable next action, concrete enough to start without questions>
2. ...

## Open questions (need the user / unverified)
- <question or weak-signal observation, with date>

## Recent sessions
- <date>: <one line>. (Keep the last 5. Older history lives in git log.)

## Suggested skills for the next session
- <skill>: <why>
```

Redact secrets and personal data everywhere.

_Synthesised from [goagrawal-genai/wrap-up](https://github.com/goagrawal-genai/wrap-up) (MIT: roles, consolidate-vs-append, preventive rules, refresh the entry point), [mattpocock/skills](https://github.com/mattpocock/skills) `retro` + `handoff` (MIT: environment retro, suggested skills, no duplication of artifacts), and Anthropic's [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) `revise-claude-md` (concise one-line CLAUDE.md additions). Adapted to this repo's files and phone workflow._
