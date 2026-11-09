---
name: crush-it
description: >
  Take one request from idea to an open, reviewed PR by sizing it and then running the stage
  skills in order (grill-to-spec, write-spec, review-spec, build-spec, verify, finish-branch,
  wrap-up). Use only when the user names the workflow, with "/crush-it", "crush it", "crush
  this", "take this end to end", or "run the full workflow". Not for plain "fix X" or "build Y"
  requests. Never merges.
---

# Crush it

Run one request through Understand → Build → Verify with as much ceremony as it needs and
no more. The stage skills do the work; this skill sizes the request, chains the stages,
answers their hand-off questions, bounds the loops, and ends every run the same way: an
open PR, one report, and no merge.

**Announce at start, with the size (Step 2).** Read the request, the issue, and the code it
touches; then, before any branch, edit, or stage, send a message that **begins with these
exact words**, the size spelled out:

> Using crush-it — <Small | Medium | Large>: <reason>.

The size word must appear, even when the user named it. "Sized it." or "Sizing done" is not
the announcement: the user can't say "go smaller" to a size they never saw.

## The rule that never bends

**Never merge.** Not at any size, not after a clean review, not because the PR is
trivial. The run ends at an open PR with a clean critic review and the words "ready to
merge, your call". Merge only when the user says so in this session.

## Where it runs

Run this skill and every stage in the **main session**. Do not hand a stage to a
subagent or a workflow script: a subagent cannot dispatch agents, so the stages' own
routing (`critic` for reviews, `implementer` for mechanical edits, `scout` for reading)
would silently disappear. Let the user's agent-routing instructions apply as usual.

Under Codex, the `grilling` skill isn't installed, so the Large flow is not available.
Say so if a request sizes Large there, and stop.

## Step 1: Check the starting state

```bash
git status --short --branch
```

- **On the base branch (`main`)**: once the size is announced (Step 2), cut a feature
  branch named for the request before changing anything.
- **On any other branch** (ask after the announcement): stop and ask one question:
  "Build on `<branch>` or branch off `main`?" That branch may hold the user's work in
  progress.
- **Uncommitted changes this run didn't make** (ask after the announcement): stop and
  ask. Never build on top of them, never stash them, never stage them.

## Step 2: Size the request

Look at the request and do a quick search of the code it touches. This is a look, not an
investigation. Then pick one size:

| Size | When |
|---|---|
| **Large** | Any of: a decision nobody has made yet; hard to reverse; changes behaviour the product's users see, or the architecture |
| **Medium** | The *what* is decided, but it's several steps, spans several areas, or reaches shared or public things (setup steps, every account, a public export) |
| **Small** | A clear ask, nothing to design, one area of code, easy to undo |

**A size the user names wins** (`/crush-it small: …`). Still print the sizing line, so
they can see whether the audit agrees: their size goes in the slot, and the reason says
where the audit differs ("Using crush-it — Medium: you named it; the audit says Small,
because …").

**The table decides, not how clear the ask feels.** An issue that already names its fix is
still sized by its reach: a clear fix to something every account runs is Medium. A choice
between fixes the issue leaves open (drop or narrow, A or B) is never made silently in the
build. A minor one is an inference: it goes under Open questions (Medium, step 1). One that
changes the product or the architecture is a decision nobody has made: Large.

**Announce it** as the opening line, with the reason:

> "Using crush-it — Medium: the change is decided, but it touches the setup steps for every
> account."

Do not wait for approval. The user can reply "go bigger" or "go smaller" **now, at the
announcement, before any stage runs**. After that, the size only moves up.

## Step 3: Run the flow for that size

Each stage is a skill. Invoke it, follow it, and answer its questions as listed here.
Whenever a flow writes a spec, `write-spec` also writes its `## Plan` section and sets
`Status: planned` in the same step, before any review, so the review covers the Plan and
`build-spec` has steps to run.
A stage's closing offer ("Want `review-spec`?", "Want me to `build-spec` it?") is
answered by moving to the next stage; don't stop there.

### Small

1. **Build inline.** No spec.
2. **`verify`** — the verify loop (Step 4).
3. **Commit** (Step 5), then the **diff review** (Step 4).
4. **`finish-branch`** — always choose "open a PR".
5. **The final report** (Step 7). No `wrap-up`. Anything worth keeping as a memory or an
   issue goes in the report for the user to decide.

### Medium

1. **`write-spec`**, with no interview. Only decisions the user stated in the request go
   in the Decisions table; anything inferred goes under Open questions. If an inferred
   choice is material — it changes the product or the architecture — size up to Large
   (Step 6) and start the grilling from this spec. If every inference is minor, build and
   list them in the report.
2. **`review-spec`**, **once**. Answer "Right file?" yourself. If the verdict is `needs
   revision`, apply the fixes (the review loop's rules, Step 4) and go on without a
   second pass. A finding under "decisions nobody made" still stops the run, and sizes
   up if it's material.
3. **`build-spec`**. Answer its file confirmation yourself. It will usually say the
   `Reviewed:` line is older than the file, because you edited the spec after the review;
   that's expected, so carry on.
4. **`verify`** — the verify loop.
5. **Commit**, then the **diff review**.
6. **`finish-branch`** — always choose "open a PR".
7. **`wrap-up`**, with these answers: memory writes are allowed; follow-up issues are
   listed in the report, **not filed**; its clean-up step is **skipped entirely** (list
   nothing, remove nothing; the PR is still open); no handoff note (the report is the
   handoff). Its cold-start report folds into the final report.
8. **The final report.**

### Large

1. **`grill-to-spec`**, taking every recommendation.
   **This run overrides two rules the grilling stages normally enforce, and only because
   the checkpoint below exists:**
   - **Rounds are self-answered.** `grilling` says to put each round to the user and wait,
     and `grill-to-spec` says nothing overrides that. Here, work the rounds yourself with
     your recommended answers, without showing or waiting on them. The user sees the
     result at the checkpoint.
   - **Taken recommendations go in the Decisions table**, each marked *taken as
     recommended, pending checkpoint*, not under Open questions as `write-spec` and
     `grill-to-spec` normally require.

   Don't enter a read-only plan mode for the interview, and don't wait for the
   end-of-interview "shared understanding" confirmation either: go straight to
   `write-spec`. The checkpoint is the approval.
2. **The checkpoint — the one place the run waits.** Share a short summary of the design
   and the Decisions table, and wait for the user.
   - **The user approves**: record that in the spec's Decisions preamble and drop the
     *pending checkpoint* marks.
   - **The user changes an answer**: edit that row, re-work only the questions that hang
     off it (self-answered, as in step 1) and any Plan steps that depend on it, show the
     changed rows, and wait again. The
     checkpoint repeats until the user approves.
3. **`review-spec` loop** (Step 4). Answer "Right file?" yourself.
4. **`build-spec`**, as in Medium.
5. **`verify`** — the verify loop.
6. **Commit**, then the **diff review**.
7. **`finish-branch`** — always choose "open a PR".
8. **`wrap-up`**, with the same answers as in Medium.
9. **The final report.**

## Step 4: The loops

Every loop has a limit of **3 rounds**. When the limit is hit, stop and bring what's left
to the user. A stuck loop is a question, not something to grind through.

**Review loop (Large).** Run `review-spec`, then revise the spec yourself:
- Fix gaps, ambiguities, unstated assumptions and plan problems.
- A finding under **"decisions nobody made"** is a product call. Stop and put it to the
  user with a recommendation; don't decide it.
- The loop ends on the critic's verdict **`ready to plan`** or **`ready to build`**. Minor
  notes are allowed and go in the report. **`needs revision`** means revise and review
  again.

**Verify loop.** Run `verify`, fix what fails, run it again. It passes on real output, not
on a claim. Verification never shrinks with the size; a Small run gets a real check too.

**Diff review (every size).** After `verify` passes and the work is committed, dispatch
`critic` on the diff:

```
Review the diff `git diff main...HEAD` in <repo> against <the spec, or the request for a
Small run>. Read with `git diff`, `git show` and `git log` only. Do not check out, switch,
or stash anything. Report in your standard output shape.
```

If the verdict is `needs work`, fix the Critical and Important findings as follow-up
commits, run `verify` again, and dispatch `critic` again on the new `main...HEAD`. Repeat
until the verdict is `ready to merge`. Each fix → verify → review round counts toward the
verify loop's limit of 3. The verdict that goes in the PR body is the last one, and it
must be `ready to merge`; if the limit is hit first, stop and ask instead of opening the PR.

**When the plan doesn't match the code** (during `build-spec`): a mechanical mismatch,
like a renamed file or a moved function, gets fixed and noted in the spec's "Where it
diverged". Anything that needs a decision stops the run and goes to the user.

## Step 5: Committing

Invoking this skill is the go-ahead to commit and push on the feature branch.

- Commit once `verify` passes. Fixes from the diff review are follow-up commits.
- Stage **by path**: only the files this run changed. Never `git add -A` or `git add .`.
- Follow the repo's commit message convention.
- Push when `finish-branch` opens the PR. By then nothing is uncommitted, so its "commit
  first?" question doesn't arise.

## Step 6: Changing size mid-run

- **Size up** whenever a real design question turns up, including on a size the user
  named. Keep the work on the branch, stop building, and continue with the larger flow
  from where you are. A Small run that hits a design question goes to Large, and the
  grilling uses what the build found. Say what triggered it in one line.
- **Never size down** on your own judgment. The user can size down only at the
  announcement (Step 2).

## When to stop and ask

- The starting state checks in Step 1.
- A "decisions nobody made" finding, or a material inferred choice.
- A plan mismatch that needs a decision.
- A loop at its limit.
- The Large checkpoint.
- Anything destructive or hard to reverse, anything needing credentials, or anything that
  would mean guessing an important product decision.

## Step 7: The final report

The same shape at every size, as the last thing in the run:

```
**What changed:** <one line per file or group>
**What was verified:** <the checks that ran, with real results; the critic's verdict>
**Remaining risk:** <what's unverified or uncertain>
**PR:** <link> — ready to merge, your call.
**Open questions:** <carried inferences and minor review notes, if any>
**Follow-ups:** <issues worth filing, unfiled; in Small, memories worth saving, unsaved>
**Memory:** <memories wrap-up wrote, Medium/Large only>
**Repo:** <branch, clean or not, in sync or not — wrap-up's state line in Medium/Large>
```

Then stop.
