---
name: review-spec
description: Launch a critic review of a design spec or implementation plan. Use when a spec or plan is written and needs an independent read before planning or execution — or when the user says "review the spec", "review the plan", or invokes /review-spec. Takes an optional file path; without one, picks the most recently modified spec or plan.
---

# Review a spec or plan

Dispatch the `critic` agent at a design spec or implementation plan and report
its findings. This skill is thin on purpose — the judgment lives in the agent.

**Announce at start:** with a path argument, "Using review-spec to get an
independent read on `<file>`." Without one the file is not known yet, so
announce "Using review-spec to get an independent read." and name the file in
the step 1 confirmation.

## Step 1: Resolve the target

If the user named a path, use it.

Otherwise find the most recently modified candidate. Use `find`, not a glob —
under zsh an unmatched glob aborts the whole command, so a missing directory
would silently return nothing rather than falling through to the others:

```bash
find docs/specs -maxdepth 1 -name '*.md' -print0 2>/dev/null \
  | xargs -0 ls -t 2>/dev/null | head -5
```

Specs live in `docs/specs/` and nowhere else — the same directory `build-spec`
reads from. Do not search `docs/notes/`: that is where `wrap-up` files handoff
notes, so after any wrap-up the newest file there is a handoff, not a spec, and
offering it costs a wrong-guess round trip every time.

Take the newest and **confirm before dispatching** — a wrong guess wastes a
whole review:

> "Reviewing the newest: `docs/specs/2026-09-01-foo.md` (modified 20 minutes ago). Right file?"

If nothing turns up anywhere, say so and ask for a path. Do not go hunting
elsewhere in the repo.

## Step 2: Dispatch the critic

Dispatch one agent in the `critic` role. Which standard applies is decided by the
document's contents, not by its filename — check before dispatching:

```bash
grep -m1 '^Status:' <path>; grep -c '^## Plan' <path>
```

A spec written by `write-spec` holds both stages in one file: the design
sections always get the spec bar, and a `## Plan` section, where one exists,
additionally gets the executability bar. Tell the agent which it is looking at
so it does not report a missing plan as a gap.

Prompt template:

```
Review <path>. It is a design spec in this repo's one-document format:
Status: <status>, and it <has | does not have> a ## Plan section.

Judge the design sections — Goal, Non-goals, Decisions, Open questions —
by the spec bar: are the decisions made, the constraints stated, the scope
bounded? It is not incomplete for lacking code.

<If it has a Plan:> Additionally judge the ## Plan section by the
executability bar: could an engineer with no context run these steps without
asking questions? Placeholders, undefined references, steps that say what
without showing how, and steps with no real Verify command are failures.
Check the commands actually exist in this repo.

<If it has no Plan:> Do not report the absent Plan section as a gap — this
document is at the design stage by design.

Pay particular attention to decisions asserted in the Decisions table that
the document gives no sign were actually settled.

Read any document this one references before judging completeness.
Report in your standard output shape. Do not edit the file.
```

## Step 3: Report

Relay the verdict and findings in full — the agent's report is not shown to the
user. Keep its grouping (gaps, ambiguities, unstated assumptions, scope).

Then stop and let the user decide. **Do not apply the findings.** Review and
authorship stay separate; the user disagreeing with a finding should cost
nothing. If they want changes made, they will say so.

If the verdict is "ready to plan" with minor notes, say that plainly rather than
inflating the notes into blockers.

## Step 4: Record that the review happened

Append one line to the spec, under its `Status:` line:

```
Reviewed: YYYY-MM-DD — <verdict>
```

This is a **fact, not a finding** — it records that a review took place and what
it concluded, nothing about what to change. Review and authorship stay separate;
the findings still live only in your report, for the user to accept or reject.

Without this line the review leaves no trace, and `build-spec` in a later
session cannot tell a reviewed spec from an unreviewed one — which is the whole
reason it asks.

Re-reviewing replaces the line rather than stacking a second one; the current
verdict is the one that matters.

## Step 5: Offer the next step

Name it, do not run it:

> "Want me to `build-spec` it, or revise first?"
