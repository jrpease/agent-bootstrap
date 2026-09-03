---
name: write-spec
description: Capture a settled design as a spec document in docs/specs/, so the thinking survives the conversation. Use when a grilling session reaches shared understanding, when a design discussion has settled and you are about to build, or when the user says "write this up", "capture the design", "make a spec", "write the plan", or invokes /write-spec. Also use to fill in the Plan section of an existing spec before implementation.
---

# Write a spec

A design settled in conversation is lost when the conversation ends. This skill
puts it on disk in a shape `critic` can review and `implementer` can execute.

**Announce at start:** "Using write-spec to capture this as a document."

## The document model

**One file per topic**, at `docs/specs/YYYY-MM-DD-<topic>.md`. It grows over its
life rather than being superseded:

| Status | Means | What exists |
|---|---|---|
| `spec` | The design is settled, the build is not planned | Goal, Decisions, Open questions |
| `planned` | Steps are written and reviewable | …plus a filled-in Plan |
| `built` | Shipped | …plus what actually happened, where it diverged |

There is no separate plan file. The Plan section is how a spec becomes a plan.

## Step 1: Resolve the file

If this continues an existing topic, update that file rather than starting a
new one — a second file on the same topic splits the decision record:

```bash
mkdir -p docs/specs && ls -t docs/specs/*.md 2>/dev/null | head -5
```

Otherwise create `docs/specs/YYYY-MM-DD-<topic>.md`, `<topic>` in kebab-case,
the date from `date +%F`. Say the path before writing it.

## Step 2: Write it from the conversation, not from imagination

**The hard rule: every decision in the document must be one the user actually
made.** The failure mode for this skill is a fluent, plausible spec full of
choices nobody agreed to — it reads as settled, so it never gets questioned,
and it is worse than no document at all.

- A decision the user made → the Decisions table.
- Something you inferred, assumed, or would recommend but never put to them →
  **Open questions**, marked as your recommendation. Not the Decisions table.
- Something nobody raised → leave it out. Do not round the design up to
  complete.

Where a grilling session produced the design, its tree maps directly: each
settled question is a Decisions row, each recommendation the user did not
answer is an Open question.

## The template

```markdown
# <Topic>

Status: spec
Date: YYYY-MM-DD

## Goal

<What this is for, in two or three sentences. What is true after it ships
that is not true now.>

## Non-goals

- <What this deliberately does not do — the scope fence critic checks creep against>

## Decisions

| Decision | Chose | Why | Rules out |
|---|---|---|---|
| <the question that was open> | <what was picked> | <the reason given> | <what this forecloses> |

## Open questions

- **<question>** — <the options, and which you would recommend>. Unresolved.

## What shipped

<Only at Status: built. A list of what actually changed, one line per file or
group. Omit this heading entirely at spec and planned.>

## Where it diverged

<Only at Status: built. What did not go as written — steps amended, assumptions
that proved wrong, work left out and why. If nothing diverged, say so in one
line rather than omitting the section; "nothing diverged" is a claim worth
making explicitly.>

## Plan

<Omit this heading entirely until the build is planned. Do not write an empty
one — an empty Plan reads as "no steps needed" to a reviewer.>
```

## Step 3: The Plan section, when there is one

Write it only when the build is actually being planned. Each step is a brief
that could be handed to `implementer` without a follow-up question:

```markdown
## Plan

### Step 1 — <what changes, in a phrase>

Files: `path/to/a.ext`, `path/to/b.ext`
Change: <precisely what to do — the rule, not a vague intent>
Verify: `<command>` → <what output proves it worked>

### Step 2 — …
```

Then set `Status: planned`.

A step that names no verification is not finished. "Verify: reviewed by eye" is
a legitimate answer for prose; inventing a command that does not exist is not.

## Step 4: Hand off

Say what you wrote and offer the next move — do not run it unprompted:

> "Wrote `docs/specs/2026-09-01-foo.md` — 6 decisions, 2 open questions.
> Want `review-spec` on it before we build?"

Where the Plan section is filled and its steps are mechanical and repetitive,
say so — those are `implementer` dispatches, one step per brief.

## What this skill does not do

- **It does not decide.** An open question stays open. Resolving it to make the
  document look finished is the one unrecoverable failure here.
- **It does not implement.** Writing the plan and running it are separate acts,
  and the gap between them is where review happens.
