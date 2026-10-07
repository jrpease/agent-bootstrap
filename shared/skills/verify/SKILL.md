---
name: verify
description: Prove that completed work actually works before reporting it done. Use after implementing any change — when the user says "verify", "prove it", "make sure it works", or when reporting completion of a feature, fix, or frontend change. For frontend work this means a live browser loop, not a passing typecheck.
---

# Verify

A task is not complete because code was written. Verification scales with what
changed — run the narrowest set that gives real confidence, and never report a
check you did not run.

## 1 · Pick the ladder

**What changed decides what runs.** Work down; stop when the remaining rungs
cannot fail for this change.

| Changed | Run |
|---|---|
| Any code | read the final diff end to end |
| Typed code | typecheck |
| Linted repo | lint (changed files) |
| Covered code | targeted tests, then broader when the blast radius warrants |
| Built artifact | build; confirm no new warnings |
| **UI** | the browser loop below — mandatory, not optional |

Discover commands from the repo (package.json scripts, Makefile, CI config,
the project's agent instructions) rather than guessing. No test infrastructure is a fact to
report, not a rung to fake.

## 2 · The browser loop (frontend changes)

Typecheck proves the code compiles. Only a browser proves the change works.

```
Launch the app (dev server or built output; where a `run` skill exists it
knows the per-project command, otherwise read it from package.json/Makefile)
   ↓
Open the affected page at a real http:// URL
   ↓
Look at it — screenshot desktop (1440) and mobile (375)
   ↓
Exercise the changed interactions (click, type, drag — what the change touches)
   ↓
Read the browser console — zero new errors or warnings
   ↓
Fix → repeat until clean
```

- **A design reference exists → compare against it.** Figma frame, DESIGN.md,
  or an existing page in the same system. Judge the render against the
  reference, not the DOM against the code.
- Responsive states: every viewport the change plausibly affects, minimum the
  two above.
- Pages on virtual scroll (Lenis/Locomotive): try
  `window.scrollTo({ top, behavior: 'instant' })` first and assert the scroll
  progress you expected. Stepped wheel events overshoot, because Lenis keeps
  gliding after each one. Fall back to wheels (or click, then PageDown) only
  when the page ignores `scrollTo` and captures show one frame five times.
- Headless Chrome ignores the autoplay policy, so "audio waits for a gesture"
  can't be verified headless.

## 3 · The heavy harness (marketing/campaign pages)

Pages built under `studio-design` are verified by *its* loop (`verify.md`
there) — do not duplicate it here. But its harness is reusable for any page
that needs recordings or performance evidence:

Run these from the `studio-design` skill's `reference/` directory — resolve
its path from wherever your skills are installed, then:

```bash
node <studio-design>/reference/record.mjs http://127.0.0.1:<port>/ --out captures
node <studio-design>/reference/perf.mjs   http://127.0.0.1:<port>/          # LCP/CLS/INP + frame budget
npx impeccable@3.5.0 detect http://127.0.0.1:<port>/ --json                 # tell detector
```

**Never run `impeccable install`** — in any form; `detect` needs none of it.
Perf bars when measured: LCP ≤ 2500ms · CLS ≤ 0.1 · INP ≤ 200ms. A zero is a
missing measurement, not a pass.

Glance freely (screenshot, look, fix); cap expensive full rounds at 3 and
report what remains rather than looping past the cap.

## 4 · Report

```
Implemented:
- <change>

Verified:
- <check> — <real result, numbers not adjectives>
- browser: <page> · <interactions exercised> · console clean · 1440 + 375

Not verified:
- <what, and why>          # absent infrastructure, unreachable state — named, never silent

Remaining risk:
- <concern, or "none">
```

An honest "not verified: X" is a deliverable. A claimed check that never ran
is the one unforgivable output of this skill.
