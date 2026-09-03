# agent-bootstrap

Most agent configs are a pile of rules that contradict each other by month three.
This one is a build system: the instructions, skills, and agent definitions live
once in `shared/`, and a single command projects them into every coding agent on
the machine — Claude Code gets `CLAUDE.md` and `.md` agents, Codex gets
`AGENTS.md` and `.toml` roles. Edit the source, run `./setup.sh config`, and both
agents change together. They cannot drift, because there is only one copy.

It is macOS-only and opinionated on purpose. Take the whole thing, or take the
`shared/` directory and leave the rest.

```bash
git clone https://github.com/jrpease/agent-bootstrap.git ~/Dev/agent-bootstrap
cd ~/Dev/agent-bootstrap && ./setup.sh --list   # look before you run
```

## What's worth stealing

**`shared/instructions/core.md`** is the centerpiece — the operating loop
(Understand → Build → Verify), when to stop and ask, when to just decide, and
the rule that keeps the rest honest: *verification is part of implementation;
code written is not work done.* If you read one file, read that one.

**`shared/agents/`** — four subagents (`scout`, `critic`, `implementer`,
`design-critic`) and, in the README beside them, the routing logic that decides
which one gets the work. The rule that made them useful: dispatch on tedium, not
on difficulty. If describing the change costs less than making it, delegate.

**`shared/skills/`** — the design skills are the deep end.
`studio-design` (17k words) and `product-design` (10k) are methodology, not tips:
build three heroes and kill two, judge the result against named real-world work
rather than your own brief, and prove the thing runs before calling it done.
`product-design/reference/canon/` holds measurements harvested from real
products — type contrast, spacing steps, component reuse ratios — so "make it
good" has numbers behind it.

**`lib/`** — eleven ordered, idempotent setup steps, each one a file. Re-running
is safe; every write into `$HOME` is marker-guarded or backed up first.

## How the projection works

```
shared/instructions/core.md  ──┬─→  claude/CLAUDE.md      → symlinked into each account
                               └─→  $CODEX_HOME/AGENTS.md
shared/skills/<name>/        ──┬─→  ~/.claude*/skills/<name>
                               └─→  ~/.agents/skills/<name>
shared/agents/<name>.md      ──┬─→  claude/agents/<name>.md   (+ model, tools)
                               └─→  $CODEX_HOME/agents/<name>.toml
```

`core.md` carries named slots — `{{> block-name }}` — filled from each agent's
`instructions/addendum.md`. A block absent from an agent leaves its slot empty.
That is how a rule stays Claude-only without a second copy of the whole file.

**Skill and agent bodies must stay variable-free.** Skills are symlinked, so
nothing substitutes between `shared/` and what the agent reads — a placeholder
would ship as literal text.

## Running it

```bash
./setup.sh                   # everything, in order
./setup.sh --list            # the steps, and what each one does
./setup.sh config            # run one
./setup.sh --from config     # that step and everything after
```

| Step | Purpose |
|------|---------|
| `deps` | Homebrew, Oh My Zsh, Node, Claude CLI, Codex CLI, gh |
| `accounts` | Named Claude accounts and Codex homes, aliases, the default |
| `desktop-app` | Point the Dock-launched Claude app at the default account |
| `config` | Generate `CLAUDE.md`, per-account `settings.json`, Codex `AGENTS.md` and roles |
| `memory` | One shared memory store per project, across accounts |
| `skills` | Marketplaces, plugins, vendored skills, `npx skills` sources |
| `git` | git identity, GitHub auth, optional SSH key |
| `studio-gen` | The image/video CLI, plus ffmpeg |
| `secrets` | Scaffold `~/.zshrc.local` and wire it into `~/.zshrc` |
| `mcp` | Register local MCP servers in every account |
| `verify` | Health-check summary |

`accounts` is the only interactive step, and it aborts when stdin isn't a
terminal — so a bare `./setup.sh` fails inside an agent session, on purpose.

## Before you run it

This provisions a machine. It installs Homebrew and global npm packages, appends
managed blocks to `~/.zshrc` and `~/.zprofile`, and symlinks config into
`~/.claude*/`. Every write is guarded — existing real files are backed up to
`.bak`, appends are marker-based and idempotent, and the one destructive step
(pruning stale skill mirrors) prompts first. Nothing is deleted without a
confirm. Still: read `lib/` first. It's ~1,300 lines, and it is touching your `$HOME`.

Run one step at a time if you'd rather. `./setup.sh config` alone gets you the
instruction/skill projection without any of the account or dependency machinery,
and that is the part most people actually want.

**`claude/settings.json` ships `"defaultMode": "auto"`** — Claude runs tools
without prompting you first. I want that; you may not. There is a deny-list
alongside it (`.env`, `secrets/**`, `*.pem`, `~/.zshrc.local`), but a deny-list
is a floor, not a seatbelt. Change it to `"default"` before the `config` step if
you'd rather approve things yourself.

## What this expects, and what you'll want to change

**Multiple agent accounts.** The account plumbing exists because I run separate
Claude logins for personal and client work, each with its own config dir. If you
run one account, the `accounts` step still works — say one — but the
per-account machinery in `studio-gen` will feel like ceremony.

**`studio-gen` resolves API keys through LastPass.** It checks, in order: an
account-specific env var, that account's vault item, the shared env var, then a
shared vault item. `export GEMINI_API_KEY=...` is enough to use it with no vault
at all — LastPass is a rung on the ladder, not a requirement.

**The marketplaces in `claude/settings.json` are mine.** `throughline` and
`brainforge` are public and will install fine, but they're my tools and you
probably want your own list.

**There is no voice skill here.** `core.md` has a Voice section pointing at one,
and the section says plainly that it's inert until you supply it. The original
of this repo has a personal one built from a corpus of my own writing. That is
exactly the thing you cannot borrow — write your own, or delete the section.

## What's not here

This is a subset of a private repo. Left out: the voice skill, per-account
overlays naming real clients, and about 120,000 words of working notes that were
written to be read by me and no one else. Nothing load-bearing is missing —
`./setup.sh` runs end to end — but if a reference looks like it points somewhere
that doesn't exist, that's why. Open an issue and I'll fix it.

## License

MIT. Take it, fork it, strip it for parts.
