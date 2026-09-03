---
name: build-spec
description: >
  Execute the Plan section of a spec in docs/specs/, routing each step to
  implementer or inline work and verifying as it goes. Use when a reviewed
  spec is ready to build, when the user says "build the spec", "execute the
  plan", "let's build this", or invokes /build-spec. Updates the spec to
  Status: built when done.
---

# Build a spec

Run a spec's Plan. This skill is thin on purpose — the work lives in the steps
and the agents; what this adds is order, routing, and honest verification.

**Announce at start:** "Using build-spec to execute `<file>`."

## Step 1: Resolve and check the spec

If the user named a path, use it. Otherwise take the newest:

```bash
find docs/specs -maxdepth 1 -name '*.md' -print0 2>/dev/null \
  | xargs -0 ls -t 2>/dev/null | head -5
```

Confirm the file before doing anything. Then check it is actually buildable:

```bash
grep -m1 '^Status:' <path>; grep -m1 '^Reviewed:' <path>; grep -c '^## Plan' <path>
```

- **No `## Plan` section** — there is nothing to execute. Say so and offer
  `write-spec` to add one. Do not invent the steps yourself; that is a design
  act, and it belongs in the document where it can be reviewed.
- **`Status: built`** — already run. Ask whether this is a re-run or a new
  round of work before touching anything.
- **No `Reviewed:` line** — `review-spec` writes one when it runs, so its
  absence means no review has happened. Mention it once and let the user
  decide; a review before building is cheap, but skipping it is their call,
  not a blocker.
- **A `Reviewed:` line older than the file's last edit** — the spec changed
  after it was reviewed. Say so; the verdict on record may not describe what
  you are about to build.

## Step 2: Walk the steps in order

Steps run in the order written. A step's `Verify` must pass before the next one
starts — a plan half-built with three unverified steps is worse than a plan
stopped at step two, because nobody knows which half works.

For each step, decide where it runs:

**Dispatch to `implementer`** when the step is decided and repetitive — the same
change across several files, a long transcription, boilerplate in an existing
shape. The step is already written as a brief: `Files`, `Change`, `Verify` is
exactly what that agent expects. Pass it verbatim, plus any repo convention it
needs to match.

**Run it inline** when the step needs a judgment call, touches one file, or is
short enough that writing the dispatch costs more than doing it. Most steps in
a small plan are this.

If `implementer` returns `BLOCKED`, it found a real gap. Fill the gap and
re-dispatch, or run that step inline — never re-send the same brief unchanged.

## Step 3: Verify each step, honestly

Run the step's `Verify` command and read the actual output.

- **Paste real output.** Never report a check you did not run, and never
  summarize a failure as a pass.
- **A step with no `Verify`** is a gap in the plan. Do the work, then say
  plainly that it is unverified — do not invent a command to make it look
  checked.
- **`Verify` names a command that does not exist** — stop and say so. That is
  a finding about the plan, not a problem to route around.

Where the spec's Goal is user-visible behaviour, the `verify` skill's bar
applies at the end of the run, not just the per-step checks.

## Step 4: When reality contradicts the plan

This is the moment the skill exists for. If a step cannot be done as written —
the file is not what the plan assumed, the approach does not work, a decision
turns out to be wrong — **stop and report.** Do not improvise a different design
and keep going.

Say which step, what the plan assumed, and what is actually true. Then let the
user choose: amend the spec and continue, or stop and re-plan. A plan quietly
departed from is a plan nobody can trust afterwards.

## Step 5: Close the loop

When the Plan is done, update the spec in place:

- Set `Status: built`.
- Add a `## Where it diverged` section naming anything that did not go as
  written — steps amended, assumptions that proved wrong, work left out. If
  nothing diverged, say that in one line rather than omitting the section.
- Move any question the build surfaced into `## Open questions`.

Then report as: what changed · what was verified · what remains.

The spec is now the record of what was actually built, not just what was
intended. That is the whole point of it being one file.
