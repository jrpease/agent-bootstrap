# Agent roster

Four agents, carved by **work type** rather than model tier, so the call at the
point of work is "what kind of task is this" — not "which model does this
deserve." The model is an implementation detail baked into each definition.

| Agent | Model | Work |
|---|---|---|
| `scout` | `haiku` | Bulk reading, codebase search, "where is X" |
| `implementer` | `sonnet` | The same decided edit across many files; long transcription |
| `critic` | `fable` | Reviewing a spec, plan, or diff |
| `design-critic` | `fable` | Fresh-context visual judgment on rendered design work |

## Routing

Route by work type; the model comes with the agent. Global `CLAUDE.md` grants
standing permission to dispatch these four without asking, so a harness rule
against launching agents unannounced does not block the roster.

**The gate is tedium, not difficulty:** dispatch when describing the change
costs less than making it. A rename across twelve files is one sentence of
brief and twelve edits of work — that is the shape `implementer` exists for.
A single subtle edit is not: writing the brief would be most of the work, and
a cheap model on a vague task takes more turns than doing it directly.

The earlier version of this rule was a *completeness* gate — dispatch only from
a brief complete enough that execution is copying. It read as a bar to clear
rather than a trigger to fire, and by the time a brief was that complete the
work was done. Volume, not specification, is the thing worth handing off.

A `BLOCKED` result means the brief had a real gap — a decision the agent would
have had to make. Fill the gap or run the work inline; never re-dispatch the
same brief unchanged.

(Global `CLAUDE.md` carries the routing table and points here.
This file is named without a leading path on purpose: CLAUDE.md is symlinked
into every account and loads from every project, so a repo-relative path would
resolve to nothing, and an absolute one would name a home directory that
differs between machines.)

## Why the models are pinned here

`throughline/references/agent-routing.md` names capability *tiers* and resolves
them to models at dispatch time, because plugin installers have different plans.
That indirection is right for a distributed plugin and wrong here: it leaves a
judgment call in the loop, and the judgment call is what drifts. This repo has
one operator on a known plan, so the model is pinned in frontmatter and there is
nothing left to decide.

The cost is accepted deliberately: this roster is not portable to a machine with
different model access, and a plan change means editing these files.

## Re-mapping

**The `model:` line lives in `claude/agents/<name>.meta.yml`, not in the body.** Nothing
generates or derives it.

`./setup.sh verify` prints the current bindings, so the roster surfaces on
every setup run — new machines and updates, the moments worth reconsidering it.

## What does and does not drift

- **A new version within a family** — nothing to do. `haiku`, `sonnet`, `opus`,
  and `fable` are family aliases, not version strings (the same form
  `settings.json` uses for `"model": "opus[1m]"`). A new Haiku is picked up with
  no edit.
- **A family retired or renamed** — dispatch fails with an error naming the
  model. Loud and immediate; it cannot silently downgrade you to a weaker model.
- **The assignment going stale** — a future Haiku strong enough for implementer
  work, or a new family landing between tiers, needs a human re-read. Not
  detectable, not automatable. This file exists so that re-read has the original
  reasoning to work from.

## Adding an agent

Drop a `<name>.md` here with `name:`, `description:`, `model:`, and `tools:`
frontmatter, then run `./setup.sh skills`. Keep `description:` on a **single
line** — `lib/70-verify.sh` reads it with `sed`.

This file is excluded from the link pass in `lib/30-skills.sh`; only
agent definitions get installed.
