---
name: grill-to-spec
description: Interview a design to a settled state, then write it to docs/specs/ in one motion. Use when starting design work of any size — "let's think through X", "I want to build X", "grill me on X", "design X" — or when invoked as /grill-to-spec. This is the default entry point for design work; prefer it over a bare interview, which ends with the thinking still trapped in the conversation.
---

# Grill to spec

The interview and the document are one act. A settled design that was never
written down is lost at the end of the session, and the moment it settles is
exactly when nobody feels like writing it up — so this skill removes the choice.

**Announce at start:** "Using grill-to-spec — I'll interview this to a settled
state, then write it to `docs/specs/`."

## Step 1: Run the interview

Invoke the `grilling` skill and follow it exactly: work the design tree in
rounds, ask the whole frontier each round with a recommended answer for each,
wait for the user between rounds. Look up facts yourself rather than asking.

That skill governs the interview. Nothing here overrides it.

## Step 2: Recognise the end

`grilling` ends when the frontier is empty and the user confirms shared
understanding. **That confirmation is this skill's trigger, not a stopping
point.** Do not wait to be asked for a document.

Two things commonly go wrong here:

- **A read-only planning mode.** If the interview ran inside one — the right
  place for it, since it is read-only — you cannot write the file yet. Leave
  that mode first, and say the plan is "write up the design we just settled,"
  not the implementation. Do not let that approval carry you into building.
- **Momentum.** The settled design makes the build feel obvious and close. Write
  the document anyway. The whole chain downstream — review, and a record that
  outlives the session — hangs off the file existing.

## Step 3: Write it

Invoke the `write-spec` skill. Its rules apply in full, and one of them matters
more here than anywhere else:

**Only decisions the user actually made go in the Decisions table.** A grilling
round gives you both — the answers they gave, and the recommendations they never
answered because the round moved on. The first are decisions. The second are
**Open questions**, carrying your recommendation. Do not promote a recommendation
to a decision because the user did not object to it.

Map the tree directly: each settled branch is a Decisions row, with the reason
they gave in *Why* and what it forecloses in *Rules out*. Each unanswered
recommendation is an Open question.

## Step 4: Hand off

Report the path, the decision count, and the open-question count, then offer the
next step without running it:

> "Wrote `docs/specs/2026-09-01-foo.md` — 7 decisions, 2 open questions.
> Want `review-spec` before we build?"

## When to skip this skill

A change small enough to hold in your head does not need an interview or a
document. Use `grill-me` alone when the user explicitly wants only to be
questioned — to stress-test a decision they are not about to build. The moment
the answer is going to become work, this skill is the right entry point.
