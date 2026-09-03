---
name: senior-engineering-cleanup-pass
description: |
  Post-code cleanup and stabilization pass. Behaves like a careful senior engineer after a feature
  build, AI coding session, or large refactor. Inspects the repo, ranks cleanup opportunities by
  confidence and risk, implements only safe improvements, and reports anything requiring human judgment.
  Use after: building a feature with AI, merging AI-generated changes, completing a vibe-coding session,
  creating a prototype, or adding UI screens quickly.
  Do NOT use for: architecture migrations, framework upgrades, security reviews, or production incident response.
license: MIT
metadata:
  author: Jordan Pease
  version: "1.0.0"
---

Perform a careful, low-risk cleanup pass across the codebase. Inspect first. Preserve behavior.
Implement only high-confidence low-risk fixes. Report everything else.

**This is not a rewrite. Not a redesign. Not a modernization project. Not permission to change behavior.**

## Primary rule

Preserve current product behavior unless a change is obviously broken, provably unused, clearly safer,
and validated by checks. When in doubt, do not change the code — report the concern instead.

---

## Confidence scoring

Apply to every finding before acting.

| Level | Action | Criteria |
|-------|--------|----------|
| **High** | Implement | Narrow change · behavior preserved · easy to validate · easy to revert |
| **Medium** | Report only | Likely beneficial but has some behavior risk or needs architectural judgment |
| **Low** | Do not implement | Speculative · broad impact · unclear ownership · touches auth/payments/security/data |

---

## Execution workflow

1. **Reconnaissance** — inspect repo before touching anything
2. **Baseline** — run available validation checks; record any pre-existing failures
3. **Cleanup in small batches** — implement only high-confidence changes per track
4. **Validate after each batch** — run checks; stop if something breaks unexpectedly
5. **Report** — summarize applied changes, deferred findings, validation results, remaining risks

---

## Phase 0: Reconnaissance

Inspect and report before changing anything. Look for:

- Framework, package manager, TypeScript config, lint config, test setup, build setup
- Folder structure, aliases, generated/do-not-touch code
- Environment variables, API routes, server/client boundaries
- Auth, payment, billing, permissions, database/ORM usage
- Deployment config

Produce a short assessment covering: detected stack · validation commands · high-risk areas ·
generated/do-not-touch areas · likely cleanup opportunities · recommended first batch.

---

## Phase 1: Validation baseline

Run the repo's actual check commands before editing. Common examples:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Record baseline failures. Do not claim cleanup broke something that was already broken.

---

## Cleanup tracks

Work through applicable tracks in this order. Skip tracks not relevant to the repo.

### Track 1: Dead code removal
Remove confirmed unused exports, files, components, hooks, assets, feature flags, utilities,
unreachable branches, and unused dependencies.

**Critical:** Static analysis is not enough. Before deleting, verify code is not used by dynamic
imports, framework/route conventions, config files, reflection, string-based references, or tests.

### Track 2: Deduplication
Consolidate exact duplicate helpers, constants, formatting logic, component logic, API mapping.
Do not merge code that only *looks* similar. Do not create generic abstractions for unrelated workflows.

### Track 3: Circular dependencies
Extract small shared primitives, move pure utilities to neutral locations, split type-only imports
from runtime imports. Do not restructure folders or rewrite architecture.

### Track 4: Type strengthening
Replace `any` with obvious existing types. Type function parameters when usage is clear. Infer types
from nearby schemas. Do not invent types without evidence or over-constrain flexible APIs.

### Track 5: Type consolidation
Consolidate identical interfaces, export shared domain types from a clear owner file, remove redundant
local type definitions. Do not create one giant global types file.

### Track 6: Error handling
Add structured logging where patterns already exist. Remove useless try/catch wrappers. Return clear
failure states. Do not change user-facing behavior or remove recovery logic that may be intentional.

### Track 7: AI slop and deprecated code
Remove: commented-out code, placeholder logic, obsolete TODOs, comments that narrate obvious code,
duplicate files with similar names, vague helpers (`processData`, `handleThing`, `utils2`),
speculative abstractions, generic wrappers that add no value. Do not remove compatibility code
without proof.

### Track 8: Dependency hygiene
Remove packages confirmed unused. Clean obsolete package scripts. Do not replace libraries,
upgrade major versions, or change package managers.

### Track 9: Boundary cleanup
Move tiny pure helpers to local domain utilities. Split obvious server/client import violations.
Do not redesign architecture or introduce new patterns.

### Track 10: UI / design system consistency
*(Skip if no UI layer, design system, or Tailwind.)*
Replace repeated inline styles / arbitrary values with existing tokens. Remove unused component props.
Align one-off components to existing variants. Do not redesign screens or invent a new design system.

---

## Areas requiring explicit approval before touching

Authentication · authorization · payments · billing · database migrations · data deletion ·
security rules · permissions · analytics events · privacy/consent · infrastructure config ·
production deployment config · environment variables · rate limiting · encryption · user data handling.

These can be **inspected and reported** but not changed without user approval.

---

## Stop conditions

- Build is broken at baseline AND the cause is unclear → report, ask whether to proceed
- A cleanup change breaks a check → revert immediately, document, move on
- Any finding touches an approval-required area → report only

---

## Git hygiene

Keep changes small. Group related changes by track. Suggested commit style:

```
cleanup: remove confirmed dead code
cleanup: consolidate duplicate types
cleanup: strengthen safe TypeScript types
cleanup: remove AI-generated placeholders
```

---

## Final report

```md
# Cleanup Report

## Summary
Brief plain-English summary of what was cleaned up.

## Baseline
- Stack detected:
- Package manager:
- Validation commands found:
- Pre-existing failures:

## Changes Applied
For each change: what · why it was safe · files touched

## Deferred Findings
### Medium-confidence
- Finding · Risk · Suggested next step

### Low-confidence / needs human review
- Finding · Why not changed · Suggested owner decision

## Validation Results
- Typecheck:
- Lint:
- Tests:
- Build:

## Risks and Notes
- Remaining concerns:
- Areas intentionally not touched:
- Suggested next cleanup pass:
```
