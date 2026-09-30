---
name: wrap-up
description: Close out a work session — capture findings to memory and issues, commit loose work, integrate the branch, clean up merged branches and worktrees, and leave the repo ready for a cold start. Use when work is finished and the session is ending, or when the user says "wrap up", "let's close this out", or invokes /wrap-up.
---

# Wrap up a session

Five steps, in order. The order matters: capture runs first, while session
context is intact and before anything is merged or removed.

**Announce at start:** "Using wrap-up to close out this session."

Create a todo per step and work them in order.

## Step 1: Capture

**Memory.** Findings worth carrying into future sessions go to memory now.
Follow the memory protocol: check for an existing file that already covers it
and update that rather than creating a near-duplicate. Save what was
non-obvious — decisions and their reasoning, constraints discovered the hard
way. Do not save what the repo already records: code structure, what changed
(git history has it), or anything only this conversation cared about.

**Follow-ups.** Papercuts and deferred work become GitHub issues on the relevant
repo. **List them for the user before filing anything** — filing is outward-
facing and some of them will be things they would rather drop. Never create or
append to a `BACKLOG.md`.

**Handoff note.** Write one only if there is unfinished work or a live thread.
Skip it when the branch closes its topic cleanly — unconditional handoffs
accumulate as files that say "nothing pending", and they make the ones that
matter harder to find.

When written, it goes to `docs/notes/YYYY-MM-DD-<topic>-handoff.md`: what
shipped, what is unfinished, what the next session needs to know, and open
questions.

## Step 2: Commit loose work

Read `git status`. Commit changes that are coherent and ready, with a real
message describing why — not "wip" or "updates".

Anything not ready stays uncommitted and gets **named in the step 5 report**.
Never `git add -A` to clear the board; sweeping half-finished work into a commit
to make the tree look clean is how it gets merged.

## Step 3: Integrate

Integration may already have happened earlier in the session, so **classify the
state before acting** — never assume it still needs doing.

```bash
git rev-parse --abbrev-ref HEAD          # current branch (or "HEAD" if detached)
git status --porcelain                    # clean?

# Establish the base FIRST — the integrated/not rows are all relative to it.
base="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
[ -n "$base" ] || base="$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null)"
echo "base=[$base]"                       # empty = unresolved; the log below then prints nothing, which is NOT "integrated"
git log --oneline "$base"..HEAD          # commits ahead of base

git rev-parse --abbrev-ref @{u} 2>/dev/null   # upstream, or empty = never pushed
git log --oneline @{u}..HEAD 2>/dev/null      # unpushed commits (only if upstream exists)
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state open
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state merged --limit 1
```

Check detached HEAD first — it short-circuits the other rows.

| State | Signal | Action |
|-------|--------|--------|
| Detached HEAD | `git rev-parse --abbrev-ref HEAD` returns `HEAD` | There is no branch to finish. Report the state and ask how to proceed — never invoke `finish-branch` from detached HEAD. |
| Already integrated | `git log "$base"..HEAD` is empty — every commit on this branch is already in the base — and no open PR. Being on the base branch with the feature branch gone is the same signal (the diff against yourself is empty) | Report it and skip to step 4 |
| Already integrated (squash) | `git log "$base"..HEAD` is **non**-empty but `gh pr list --state merged` shows a merged PR, and no open PR — squash and rebase merges rewrite the commits, so the branch's own commits are never ancestors of the base | Report it and skip to step 4 |
| PR open | `gh pr list --state open` shows an open PR | Skip integration; **mark that branch protected for step 4** |
| Not integrated | On a named branch, `git log "$base"..HEAD` is non-empty, no open PR, no merged PR | Invoke `finish-branch` and follow it |

`$base`..HEAD is the discriminator, not `@{u}..`. Ahead-of-upstream answers
"pushed?", which is a different question: a feature branch that is pushed and
current but never merged has an empty `@{u}..` and is *not* integrated. Use the
upstream rows only for the push half of the report — an empty `git rev-parse
@{u}` means never pushed, an empty `git log @{u}..HEAD` with an upstream set
means pushed and current, and those two states are indistinguishable if you
only run the log.

The base branch comes from `git symbolic-ref refs/remotes/origin/HEAD` (fall
back to `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` if that
resolves nothing — without `--jq` it prints JSON, not a branch name). If
neither resolves, step 4 asks rather than guessing. If `$base` is empty or
`git log "$base"..HEAD` *errors* (no such ref — a clone that never fetched the
base locally), the base is unresolved: say so and ask. An error is not
"no commits ahead", and reading it that way is how integrated-vs-not gets
silently skipped.

**`gh` failure is not "no PR".** An expired token, being offline, a rate limit,
or a repo with no GitHub remote all make `gh pr list` fail. Its output is left
unredirected above so you see that. If any `gh` call errors or `gh` is
unavailable, PR state is **unknown** — do not use the merged/open rows. Report
the unknown and ask before invoking the finishing skill, and exclude the branch
in step 4.

**A dirty tree does not change the classification.** Step 2 sanctions leaving
work uncommitted, so classify on the commit rows regardless. But name the
uncommitted files before invoking the finishing skill — integration switches
branches underneath them.

The PR-open case matters twice: it is exactly what option 2 of the finishing
skill leaves behind, and reaping that branch in step 4 would delete work that is
still under review.

## Step 4: Clean up

**Current repository only.** Do not scan other repos on the machine.

Gather candidates:

```bash
git branch --merged "<base-branch>" \
  | grep -v "^\*" \
  | grep -v "^+" \
  | sed 's/^[[:space:]]*//' \
  | grep -vE "^(main|master|develop|staging|release/.*)$"
git worktree list
git worktree prune --dry-run    # stale registrations: dir already gone
```

`git worktree prune --dry-run` names registrations whose directory no longer
exists. They are a third candidate type alongside branches and worktrees —
list each as `stale` with the path it points at. Nothing is deleted by clearing
one; the work it referred to is already gone. `git worktree prune` (no `-f`)
clears the whole set, so it runs once, after confirmation, not per item.

**Exclude before listing — check each candidate against all of these:**

- unpushed commits (`git log --oneline <branch> --not --remotes` is non-empty)
- an open PR — and if any `gh` call errors or `gh` is unavailable, PR state is
  **unknown**, so exclude the branch rather than assuming there is no PR
- commits not merged into the base branch
- checked out in another worktree — shows as `+` in `git branch --merged`
  (already filtered out above; `git branch -d` refuses these too, but don't
  rely on that backstop since worktrees are removed before branches)
- a worktree with uncommitted or untracked changes
  (`git status --porcelain` run inside it is non-empty)
- worktrees outside `.worktrees/` or `worktrees/` — the host owns those
- the current branch
- the base branch
- `main`, `master`, `develop`, `staging`, `release/*`, or any other
  long-lived shared branch — protected by name, not just by merge state

If step 3 could not establish a base branch, **ask** before listing anything.
Guessing `main` here deletes real work.

Present what survives as a list with a one-line reason each:

```
Safe to remove:
  branch  fix-statusline-path   merged into main, pushed, no open PR
  branch  spike-agent-routing   merged into main, pushed, no open PR
  worktree .worktrees/old-spike   branch merged, nothing uncommitted
  stale   .worktrees/gone        registration only, directory already deleted

Remove these? [y/N]
```

A worktree's own branch is excluded from the branch list while the worktree
exists — it becomes an ordinary candidate on a later run, once the worktree is
gone, which is also why the step 5 count of removed branches can trail what
you expected.

One confirmation removes the whole set — not a prompt per item. If the user says
no, report and move on; do not negotiate item by item.

Remove worktrees before their branches, and run worktree removal from outside
the worktree. **Never `git worktree remove --force` (or `-f`).** If removal
fails because the worktree has modified or untracked files, report it and skip
that item — `--force` is exactly how the one class of work here that no
remote holds gets deleted. Same rule on the branch side: **never `git branch
-D` (or `--delete --force`)** — if plain `-d` refuses, report and skip rather
than escalating.

## Step 5: Cold-start report

Close with the state of things, so a fresh session can pick up without
archaeology:

```
Repo:      <branch>, clean, synced with origin
Uncommitted: <anything deliberately left, or "none">
Handoff:   docs/notes/<file>  (or "not needed — topic closed")
Issues:    #<n> <title>, #<n> <title>  (or "none filed")
Memory:    <what was written or updated, or "nothing new">
Removed:   <N> branch(es), <N> worktree(s), <N> stale registration(s)  (or "nothing to clean")

To resume: <one sentence to paste into a new session>
```

Make the resume sentence specific and self-contained. "Continue the work" is
useless to a session with no context; "Pick up the agent-routing plan at Task 5,
`review-spec` is written but untested" is not.

## Red flags

| Thought | Reality |
|---------|---------|
| "`finish-branch` already ran, so wrap-up is done" | It handles integration only. Memory, issues, hygiene, and the handoff are still yours. |
| "I'll commit everything so the tree is clean" | Half-finished work in a commit gets merged. Name it in the report instead. |
| "This branch looks stale, I'll reap it" | Run every exclusion first. An open PR or an unpushed commit means hands off. |
| "The base is obviously main" | Step 3 establishes it. If it didn't, ask. |
| "I'll file the issues and mention them after" | Filing is outward-facing. List them first. |
| "Every session should leave a handoff" | A handoff that says "nothing pending" buries the ones that matter. |
