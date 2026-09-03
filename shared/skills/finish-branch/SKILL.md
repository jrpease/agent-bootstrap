---
name: finish-branch
description: Decide and execute how completed branch work gets integrated — open a PR, merge locally, or leave the branch. Use when implementation is complete and verified and the work needs to land, when the user says "finish this branch", "land this", "let's integrate", or when wrap-up finds an unintegrated branch.
---

# Finish a development branch

Work is done and verified; this skill decides how it lands. It never decides
*whether* the work is done — run `verify` first if that question is open.

## Step 1: Establish the state

```bash
git rev-parse --abbrev-ref HEAD                       # current branch
git status --porcelain                                # loose changes?
base="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
git log --oneline "$base"..HEAD                       # what would land
```

Stop and report rather than proceeding if: HEAD is detached, the base can't be
resolved, you are *on* the base branch, or there are no commits ahead (nothing
to finish). Uncommitted changes that belong to this work get committed first —
per the Git rules, with the user's go-ahead; unrelated loose files are named
and left alone.

## Step 2: Offer the three outcomes

Present the commit list, then ask — this is the user's call, not a default:

1. **Open a PR** — push the branch, `gh pr create` with a real summary of what
   shipped and what was verified. The branch survives review; nothing else is
   touched. *(The usual choice for repos that review via PRs.)*
2. **Merge locally** — `git checkout <base> && git pull && git merge <branch>`,
   push the base, then delete the branch (plain `-d`, never `-D`). Only offer
   this when the repo's history shows direct-to-base merges are normal.
3. **Leave it** — branch stays as-is, pushed or not. Name what state it's left
   in so the next session isn't doing archaeology.

If the user has already said which they want ("open a PR when done"), skip the
question and do that.

## Step 3: Execute and confirm

Do exactly the chosen option. Afterwards, report: branch, what landed where,
PR URL if one exists, and what was deleted or kept.

## Boundaries

- Never force-push, never rewrite published history, never `-D` a branch.
- Never merge over a dirty base checkout — `git pull` first, stop on conflict
  and report rather than resolving into surprise content.
- A failing check or unverified change is a reason to stop and say so, not a
  reason to land quietly.
