#!/usr/bin/env bash
# desc: Install marketplaces, plugins, and skills into every account
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Installing marketplaces, plugins, and skills"

# Marketplaces and plugins are scoped per Claude config dir, so each account must
# have its marketplaces registered before plugins that resolve against them install.
markets_names=(claude-plugins-official throughline-marketplace brainforge)
markets_repos=(anthropics/claude-plugins-official jrpease/throughline jrpease/brainforge)
plugins=(
  throughline@throughline-marketplace
  brainforge@brainforge
  synapse@brainforge
  figma@claude-plugins-official
  vercel@claude-plugins-official
  frontend-design@claude-plugins-official
)

# link_asset SRC DST — symlink an asset (a skill or an agent) into an account's
# skills/ or agents/ dir, replacing any stale REAL entry. Unlike the shared
# symlink() helper, a displaced entry is moved to a sibling <dir>-backup (NOT to
# <name>.bak inside the dir), so the mirror step below never picks a backup up
# and propagates it as a bogus skill or agent.
link_asset() {
  local src="$1" dst="$2" bak
  if [[ -L "$dst" || ! -e "$dst" ]]; then
    ln -sfn "$src" "$dst"; ok "linked $dst"
  else
    bak="$(dirname "$dst")-backup"
    mkdir -p "$bak"
    warn "backing up stale $dst -> $bak/$(basename "$dst")"
    mv "$dst" "$bak/$(basename "$dst")"
    ln -sfn "$src" "$dst"; ok "linked $dst"
  fi
}

# --- Marketplaces + plugins -> ensure per account config dir ---
while IFS= read -r dir; do
  info "account: $dir"
  existing_markets="$(CLAUDE_CONFIG_DIR="$dir" claude plugin marketplace list 2>/dev/null || true)"
  for i in "${!markets_names[@]}"; do
    name="${markets_names[$i]}"
    # Match the marketplace name at end of its list line, not as a loose word — a
    # bare `grep -w` also matches the name inside the "Source: (owner/repo)" line
    # of a different marketplace.
    if grep -qE "${name}\$" <<<"$existing_markets"; then skip "marketplace $name present"
    else
      log "adding marketplace ${markets_repos[$i]}"
      CLAUDE_CONFIG_DIR="$dir" claude plugin marketplace add "${markets_repos[$i]}" \
        && ok "added marketplace $name" || warn "could not add marketplace ${markets_repos[$i]}"
    fi
  done
  installed="$(CLAUDE_CONFIG_DIR="$dir" claude plugin list 2>/dev/null || true)"
  for p in "${plugins[@]}"; do
    short="${p%@*}"
    if grep -qF "$p" <<<"$installed"; then skip "$short installed"
    else CLAUDE_CONFIG_DIR="$dir" claude plugin install "$p" --scope user \
      && ok "installed $p" || warn "install failed for $p (marketplace missing or offline?)"; fi
  done
  # A marketplace's autoUpdate only refreshes its catalog — it never bumps an
  # already-installed plugin's version, so accounts drift silently (throughline
  # sat at 0.2.0 here for two months with autoUpdate on). Update explicitly.
  # User scope only: project-scoped installs are keyed to a projectPath this
  # phase doesn't know, so those still need a manual --scope project update.
  CLAUDE_CONFIG_DIR="$dir" claude plugin marketplace update >/dev/null 2>&1 \
    || warn "marketplace refresh failed for $dir"
  for p in "${plugins[@]}"; do
    if CLAUDE_CONFIG_DIR="$dir" claude plugin update "$p" --scope user >/dev/null 2>&1; then
      ok "$p current"
    else warn "update failed for $p in $dir"; fi
  done
  # Prune: this phase only ever added, so dropping an entry from plugins=() was a
  # silent no-op — superpowers stayed installed for four months after being removed
  # from the list, and kept getting updated on every run. The array is the source
  # of truth; converge to it. Destructive, so it only acts on a TTY: an unattended
  # run reports and leaves the plugin alone.
  while IFS= read -r have; do
    [[ -z "$have" ]] && continue
    declared_p=0
    for p in "${plugins[@]}"; do
      if [[ "$have" == "$p" ]]; then declared_p=1; break; fi
    done
    (( declared_p )) && continue
    warn "undeclared plugin: $have"
    if [[ -t 0 ]] && confirm "uninstall $have from $(basename "$dir")?"; then
      if CLAUDE_CONFIG_DIR="$dir" claude plugin uninstall "$have" --scope user >/dev/null 2>&1; then
        ok "uninstalled $have"
      else
        warn "could not uninstall $have (duplicate entries confuse the CLI into"
        warn "  reporting project scope) — edit $dir/plugins/installed_plugins.json"
      fi
    else
      info "left alone — CLAUDE_CONFIG_DIR=$dir claude plugin uninstall $have --scope user"
    fi
  done < <(CLAUDE_CONFIG_DIR="$dir" claude plugin list 2>/dev/null \
             | grep -oE '[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+' | sort -u || true)
done < <(claude_account_dirs)

# --- Build canonical skill set in ~/.claude/skills/ ---
mkdir -p "$HOME/.claude/skills"

# 1. Vendored loose skills -> symlink into ~/.claude/skills/
if [[ -d "$DOTFILES/shared/skills" ]]; then
  for skill in "$DOTFILES/shared/skills"/*/; do
    [[ -d "$skill" ]] || continue
    link_asset "${skill%/}" "$HOME/.claude/skills/$(basename "${skill%/}")"
  done
fi

# 2. npx skills sources -> install into ~/.claude/skills/ (forced there via env -u below)
#    Line format: "<url> [skill names...]". Names present -> --skill each; else --skill '*'.
#    NOT --all: that shorthand expands to `--skill '*' --agent '*' -y` and its --agent '*'
#    overrides the -a claude-code below, fanning out to agents that reject a global install
#    (Eve, PromptScript) and reporting every one as a failure.
sources="$DOTFILES/shared/skill-sources.txt"
if [[ -f "$sources" ]] && have_cmd npx; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    # shellcheck disable=SC2206
    parts=($line)            # word-split: parts[0]=url, parts[1..]=skill names
    url="${parts[0]:-}"
    [[ -z "$url" ]] && continue
    flags=()
    if [[ "${#parts[@]}" -gt 1 ]]; then
      for s in "${parts[@]:1}"; do flags+=(--skill "$s"); done
    else
      flags+=(--skill '*')
    fi
    log "npx skills add $url ${flags[*]}"
    # </dev/null: this loop reads sources.txt on stdin, and npx inherits and drains it —
    # without the redirect it swallows every remaining line and only the first source installs.
    # env -u CLAUDE_CONFIG_DIR: the CLI picks its claude-code target dir from that variable,
    # which the default-account export sets to ~/.claude-<name>. Unset, it targets the
    # canonical ~/.claude/skills that step 3 mirrors from; left set, installs land in one
    # account and never reach the others.
    env -u CLAUDE_CONFIG_DIR npx --yes skills add "$url" "${flags[@]}" -g -a claude-code -y </dev/null \
      || warn "npx skills add failed for $url"
  done < "$sources"
elif [[ -f "$sources" ]]; then
  warn "npx not found — skipping shared/skill-sources.txt"
fi

# 2b. Prune loose skills sources.txt no longer declares.
#     Same bug as plugins, one degree worse: when the disable lived in
#     settings.json's skillOverrides, deleting the override alongside the source
#     line RE-ENABLED the skills instead of removing them. Thirteen taste-skills
#     ran that way for four months. Repo skills are symlinks and are never
#     candidates; only npx-installed real directories are.
declared_skills=()
prune_skills=1
if [[ -f "$sources" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    # shellcheck disable=SC2206
    parts=($line)
    [[ -z "${parts[0]:-}" ]] && continue
    # A source line with no skill names installs everything in that repo, so
    # nothing on disk can be judged undeclared. Skip pruning rather than guess.
    if [[ "${#parts[@]}" -le 1 ]]; then
      prune_skills=0
      warn "skill-sources.txt line '${parts[0]}' names no skills — skipping skill prune"
      break
    fi
    for s in "${parts[@]:1}"; do declared_skills+=("$s"); done
  done < "$sources"
else
  prune_skills=0
fi

if (( prune_skills )); then
  for entry in "$HOME/.claude/skills"/*; do
    [[ -e "$entry" ]] || continue
    [[ -L "$entry" ]] && continue          # repo skill — owned by shared/skills/
    name="$(basename "$entry")"
    case "$name" in *.bak|*-backup) continue ;; esac
    found=0
    for s in "${declared_skills[@]}"; do
      if [[ "$s" == "$name" ]]; then found=1; break; fi
    done
    (( found )) && continue
    warn "undeclared skill: $name"
    if [[ -t 0 ]] && confirm "remove skill $name?"; then
      # Move rather than delete — an undeclared skill may be a deliberate manual
      # install, and this runs on every setup.
      bak="$HOME/.claude/skills-pruned/$(date +%Y%m%d-%H%M%S)"
      mkdir -p "$bak"
      mv "$entry" "$bak/$name" && ok "pruned $name -> $bak/$name"
    else
      info "left alone — declare it in shared/skill-sources.txt to keep it quiet"
    fi
  done
fi

# 3. Mirror the canonical ~/.claude/skills/* into every OTHER account
while IFS= read -r dir; do
  [[ "$dir" == "$HOME/.claude" ]] && continue
  info "mirroring skills -> $dir"
  mkdir -p "$dir/skills"
  for entry in "$HOME/.claude/skills"/*; do
    [[ -e "$entry" ]] || continue
    case "$(basename "$entry")" in *.bak) continue ;; esac  # never mirror backup junk
    target="$(realpath "$entry")"
    link_asset "$target" "$dir/skills/$(basename "$entry")"
  done
  # Mirroring only ever added too, so a skill pruned from the canonical set
  # survived in the other three accounts. Converge both directions.
  for entry in "$dir/skills"/*; do
    [[ -e "$entry" || -L "$entry" ]] || continue
    name="$(basename "$entry")"
    case "$name" in *.bak|*-backup) continue ;; esac
    [[ -e "$HOME/.claude/skills/$name" ]] && continue
    # Only reclaim links this mirror created. A real directory here was put there
    # by hand, and deleting it would be this phase destroying work it never made.
    if [[ -L "$entry" ]]; then
      rm -f "$entry"; ok "removed stale mirror $name"
    else
      warn "$dir/skills/$name is not in the canonical set and is a real directory — left alone"
    fi
  done
done < <(claude_account_dirs)

# --- Vendored agents -> link into every account's agents/ ---
# Unlike skills, agents cannot be symlinked straight from shared/: Claude reads
# `model:` and `tools:` out of the frontmatter of the file it loads, and the
# shared body deliberately carries neither — the pinning is a projection detail
# in claude/agents/<name>.meta.yml. So compose first into claude/agents/*.md
# (generated, gitignored), then link those, the same shape CLAUDE.md uses.
# README.md is excluded: it documents the roster, and linking it would install a
# frontmatter-less file as a bogus agent.
if [[ -d "$DOTFILES/shared/agents" ]]; then
  python3 "$DOTFILES/tools/compose-agents.py" --agent claude --out "$DOTFILES/claude/agents" \
    | sed 's/^/    /'
  while IFS= read -r dir; do
    info "agents -> $dir"
    mkdir -p "$dir/agents"
    for agent in "$DOTFILES/claude/agents"/*.md; do
      [[ -f "$agent" ]] || continue
      case "$(basename "$agent")" in README.md) continue ;; esac
      link_asset "$agent" "$dir/agents/$(basename "$agent")"
    done
  done < <(claude_account_dirs)
else
  warn "no shared/agents directory — skipping agent sync"
fi

# --- Codex skills ------------------------------------------------------------
# ~/.agents/skills is pinned to $HOME, NOT to CODEX_HOME — one directory serves
# every Codex home, so this runs once rather than fanning out. The loader
# follows directory symlinks and dedupes by canonical path, so linking is safe
# and behaves the same way the Claude side does.
#
# We own only what we install. The 14 skills already here came from elsewhere
# and are left alone — but their overlaps are reported, because a duplicated
# NAME across two roots silently breaks $name invocation (it resolves to
# neither, with no warning) and a near-duplicate trigger quietly competes.
AGENTS_SKILLS="$HOME/.agents/skills"
mkdir -p "$AGENTS_SKILLS"
log "Linking shared skills into $AGENTS_SKILLS (Codex)"

declare -a ours=()
for skill in "$DOTFILES/shared/skills"/*/; do
  [[ -d "$skill" ]] || continue
  name="$(basename "${skill%/}")"
  # A skill may opt out per agent with `agents:` in an optional sidecar.
  sidecar="${skill%/}/.agents"
  if [[ -f "$sidecar" ]] && ! grep -qw codex "$sidecar"; then
    skip "$name — not targeted at codex"; continue
  fi
  # find-skills already exists here from outside this repo; installing ours
  # would silently replace a skill the bootstrap did not put there.
  if [[ "$name" == "find-skills" && -e "$AGENTS_SKILLS/$name" && ! -L "$AGENTS_SKILLS/$name" ]]; then
    skip "$name — pre-existing copy not installed by this repo, left alone"; continue
  fi
  link_asset "${skill%/}" "$AGENTS_SKILLS/$name"
  ours+=("$name")
done

# Name collisions against the other root Codex reads.
for nm in "${codex_homes[@]:-default}"; do
  if [[ "$nm" == "default" ]]; then home="$HOME/.codex"; else home="$HOME/.codex-$nm"; fi
  [[ -d "$home/skills" ]] || continue
  for entry in "$home/skills"/*/; do
    [[ -d "$entry" ]] || continue
    other="$(basename "${entry%/}")"
    for name in "${ours[@]}"; do
      [[ "$name" == "$other" ]] && \
        warn "name collision: '$name' exists in both $AGENTS_SKILLS and $home/skills — \$$name will resolve to NEITHER"
    done
  done
done

# Skills here that we did not install, reported so competing triggers surface.
foreign=()
for entry in "$AGENTS_SKILLS"/*/; do
  [[ -d "$entry" ]] || continue
  nm="$(basename "${entry%/}")"
  owned=0; for name in "${ours[@]}"; do [[ "$name" == "$nm" ]] && owned=1; done
  (( owned )) || foreign+=("$nm")
done
if (( ${#foreign[@]} )); then
  info "${#foreign[@]} skill(s) here not installed by this repo (left alone):"
  info "  ${foreign[*]}"
  info "  review for triggers competing with studio-design / product-design"
fi
