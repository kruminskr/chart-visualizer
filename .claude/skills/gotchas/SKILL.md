---
name: gotchas
description: Record a tricky thing (a trap, surprising behaviour, an environment quirk, a mistake you or the user corrected) so later sessions avoid it. Writes a preventive rule to .claude/context/gotchas.md, which is auto-loaded. Use when you hit something surprising, when the user says "remember this", "note that", "gotcha", or "don't do that again", and during wrap-up.
---

# Gotchas

`.claude/context/gotchas.md` is imported by `CLAUDE.md`, so every session reads it. That makes it powerful and also expensive. Every line costs context in every future session.

## When to add one
- You lost real time to something that the code does not make obvious: an environment quirk, a version clash, a race, a tool that behaves in a surprising way.
- The user corrected how you work, or overturned a claim you made.
- A fix depended on knowledge that the next session will not have.

Do **not** add: one-off typos, facts that are obvious from the code, things that a test or lint rule already enforces (point to the check instead), or anything that contains secrets or personal data.

## Format: a preventive rule, not a story
Write each entry in this form:
`- **When** <trigger situation> **Do** <required check or action> **Else** <failure it prevents, plus a short note on what happened>.`

A rule that names its trigger fires when it should. A story about the mistake only stays true. Put the entry under the right `##` heading (Git & environment, Tooling versions, App behaviour, Chart spec, ...). Create a heading only if none fits.

## Before writing
1. Read the whole file. If an entry already covers the case, **update** it. Do not add a second one.
2. Ask: can this be a mechanical check instead (lint rule, test, hook)? If yes, build the check. Then either leave no gotcha, or leave a one-line gotcha that points to the check. A check is better than a rule.
3. Ask: is this one occurrence, or a pattern? A single inference that has not been checked goes in `docs/HANDOFF.md` under "Open questions", not in this file.
4. Keep the file under about 60 lines. If it grows past that, merge entries that overlap and delete entries that are no longer true. Fixed code, removed tools and upgraded versions all make entries stale.

## After writing
Say in one line what you added and where. The file is committed with the rest of the work.

_Format adapted from the "preventive rules" step of [goagrawal-genai/wrap-up](https://github.com/goagrawal-genai/wrap-up) (MIT). "Prefer an automated check over a rule" comes from the `retro` skill in [mattpocock/skills](https://github.com/mattpocock/skills) (MIT)._
