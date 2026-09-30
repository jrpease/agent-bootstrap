#!/usr/bin/env bash
# desc: Generate and push instructions and settings into every Claude and Codex home
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Syncing Claude config to all accounts"

# claude/CLAUDE.md is GENERATED from shared/instructions/core.md + the Claude
# addendum, then symlinked into each account exactly as before. Generating into
# the repo rather than into each account is deliberate: three things read that
# symlink — the statusline resolves its script dir through it (claude/settings.json),
# tools/fleet-health.sh asserts its target, and the harness writes through it.
python3 "$DOTFILES/tools/compose-instructions.py" --agent claude \
  > "$DOTFILES/claude/CLAUDE.md.new"
if cmp -s "$DOTFILES/claude/CLAUDE.md.new" "$DOTFILES/claude/CLAUDE.md" 2>/dev/null; then
  rm "$DOTFILES/claude/CLAUDE.md.new"
  skip "claude/CLAUDE.md current (core + claude addendum)"
else
  mv "$DOTFILES/claude/CLAUDE.md.new" "$DOTFILES/claude/CLAUDE.md"
  ok "generated claude/CLAUDE.md (core + claude addendum)"
fi

# Ensure the default account dir exists before we enumerate accounts. On a fresh
# machine ~/.claude isn't created until the first `claude` run (after this phase),
# so without this the default account would silently miss CLAUDE.md + settings.
mkdir -p "$HOME/.claude"

# account_name DIR — ".claude" -> "default", ".claude-work" -> "work".
# Must stay in lockstep with the same derivation in tools/fleet-health.sh.
account_name() {
  local n; n="$(basename "$1")"; n="${n#.claude}"; n="${n#-}"; echo "${n:-default}"
}

# settings.json is GENERATED per account, every run:
#   shared base  ⊕  claude/accounts/<name>.settings.json overlay (if present)
#   ⊕  runtime keys preserved from the account's existing file (autoMode), plus
#      plugins and marketplaces added in-app (settings-merge.py ADDITIVE_KEYS).
#
# A real file, not a symlink: harness runtime writes (/model toggles, auto mode's
# per-project trust profiles) stay in the account instead of smearing into the
# repo and every other account (one account's per-project trust profile once
# ended up in all of them that way). But not
# seed-once either: base edits propagate on every phase-20 run, and regeneration
# is lossless because runtime keys carry over. Account files are compared to a
# re-merge by content (tools/json-same.py), not bytes: the Claude CLI rewrites
# them in its own key order and escaping, which is not drift.
#
# There is no claude/settings.local.json: Claude Code does not read a user-scope
# settings.local.json (verified with a canary); shared config belongs in
# claude/settings.json, per-account config in claude/accounts/.
while IFS= read -r dir; do
  info "account: $dir"
  symlink "$DOTFILES/claude/CLAUDE.md" "$dir/CLAUDE.md"

  name="$(account_name "$dir")"
  overlay="$DOTFILES/claude/accounts/$name.settings.json"
  overlay_args=()
  [[ -f "$overlay" ]] && overlay_args=(--overlay "$overlay")
  python3 "$DOTFILES/tools/settings-merge.py" "$DOTFILES/claude/settings.json" \
    ${overlay_args[@]+"${overlay_args[@]}"} --runtime "$dir/settings.json" > "$dir/settings.json.new"
  # Content, not bytes: the Claude CLI rewrites this file in its own key order
  # and escaping, which is not a change worth replacing (and backing up) for.
  if [[ ! -L "$dir/settings.json" ]] && python3 "$DOTFILES/tools/json-same.py" "$dir/settings.json.new" "$dir/settings.json"; then
    rm "$dir/settings.json.new"
    skip "settings.json current (base${overlay_args:+ + $name overlay} + runtime)"
  else
    # Only autoMode and app-added plugins/marketplaces carry over
    # (tools/settings-merge.py RUNTIME_KEYS, ADDITIVE_KEYS), so anything else in
    # the existing file — a hand-added hook, env var or allow rule — is
    # replaced, not merged. Back it up
    # on EVERY replacement, timestamped. Not once: a machine set up by an older
    # version of this repo can already hold a stale settings.json.bak, and a
    # backup-once guard would treat that as done and never fire.
    if [[ -f "$dir/settings.json" && ! -L "$dir/settings.json" ]]; then
      bak="$dir/settings.json.bak.$(date +%Y%m%d-%H%M%S)"
      cp "$dir/settings.json" "$bak"
      info "backed up previous settings.json -> $(basename "$bak") (only autoMode and app-added plugins carry over)"
    fi
    rm -f "$dir/settings.json"
    mv "$dir/settings.json.new" "$dir/settings.json"
    ok "generated $dir/settings.json (base${overlay_args:+ + $name overlay} + runtime)"
  fi
done < <(claude_account_dirs)

# --- Codex ------------------------------------------------------------------
# One home today; the list mirrors lib/10-accounts.sh.
codex_homes=(default)

log "Syncing Codex config"
for nm in "${codex_homes[@]}"; do
  if [[ "$nm" == "default" ]]; then home="$HOME/.codex"; else home="$HOME/.codex-$nm"; fi
  if [[ ! -d "$home" ]]; then
    warn "$home does not exist — run ./setup.sh accounts first"; continue
  fi
  info "codex home: $home"

  # AGENTS.override.md WINS over AGENTS.md and the two never merge: the loader
  # returns the first of [override, default] that is a regular non-blank file.
  # So writing AGENTS.md while an override exists is a silent no-op. Refuse.
  if [[ -f "$home/AGENTS.override.md" ]]; then
    err "$home/AGENTS.override.md exists and takes precedence over AGENTS.md"
    info "Codex would ignore anything written here. Remove or rename it, then re-run."
    exit 1
  fi

  python3 "$DOTFILES/tools/compose-instructions.py" --agent codex > "$home/AGENTS.md.new"
  if cmp -s "$home/AGENTS.md.new" "$home/AGENTS.md" 2>/dev/null; then
    rm "$home/AGENTS.md.new"; skip "AGENTS.md current (core + codex addendum)"
  else
    # Back up ONCE. This file is regenerated on every run, so an unconditional
    # backup would overwrite the real original with a previous generation of our
    # own output on the second run.
    if [[ -f "$home/AGENTS.md" && ! -f "$home/AGENTS.md.bak" ]]; then
      cp "$home/AGENTS.md" "$home/AGENTS.md.bak"; warn "backed up pre-existing AGENTS.md -> AGENTS.md.bak"
    fi
    mv "$home/AGENTS.md.new" "$home/AGENTS.md"
    ok "generated $home/AGENTS.md (core + codex addendum)"
  fi

  # config.toml is a MERGE, never a rewrite: the ChatGPT desktop app owns most
  # of this file and rewrites it on its own schedule.
  python3 "$DOTFILES/tools/codex-config-merge.py" \
    --config "$home/config.toml" \
    --servers "$DOTFILES/shared/mcp/servers.json" \
    --home-name "$nm" | sed 's/^/    /'

  # Agent roles: shared body -> developer_instructions, plus the codex sidecar.
  python3 "$DOTFILES/tools/compose-agents.py" --agent codex --out "$home/agents" | sed 's/^/    /'
done
