#!/usr/bin/env bash
# desc: Create your named Claude accounts, their aliases, and the default
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

# Every answer here rewrites account aliases, so refuse before touching anything.
if [[ ! -t 0 ]]; then
  err "accounts is interactive and stdin isn't a terminal."
  info "Run it by hand: ./setup.sh accounts. To re-sync without it: ./setup.sh --from config"
  exit 1
fi

# Account aliases are personal (your account names) and device-specific, so they
# live in the machine-local, never-committed shell file — NOT the shared repo zshrc.
# Create it from the template if the secrets step hasn't run yet so the secrets header is kept.
ZSHRC="$HOME/.zshrc.local"
[[ -f "$ZSHRC" ]] || cp "$DOTFILES/templates/zshrc.local.template" "$ZSHRC"
MARK_START="# >>> dotfiles managed accounts >>>"
MARK_END="# <<< dotfiles managed accounts <<<"

# --- Codex homes -------------------------------------------------------------
# CODEX_HOME is the exact analogue of CLAUDE_CONFIG_DIR, and it partitions more:
# config, auth, sessions, and even the OS keyring entry, which is keyed on a hash
# of the canonicalised home path. One entry today because there is one ChatGPT
# login; adding a twin is a line in this list, not a rewrite.
#
# Unlike CLAUDE_CONFIG_DIR, Codex will NOT create a missing home — it exits with
# NotFound rather than creating it — so this must run before anything else in
# the bootstrap touches the home.
codex_homes=(default)
CODEX_START="# >>> dotfiles managed codex homes >>>"
CODEX_END="# <<< dotfiles managed codex homes <<<"

log "Configuring Codex homes"
codex_block="$CODEX_START"$'\n'
for nm in "${codex_homes[@]}"; do
  if [[ "$nm" == "default" ]]; then home="$HOME/.codex"; else home="$HOME/.codex-$nm"; fi
  if [[ -d "$home" ]]; then skip "codex home $home exists"; else mkdir -p "$home"; ok "created $home"; fi
  codex_block+="alias codex-$nm=\"CODEX_HOME=$home codex\""$'\n'
done
codex_block+="$CODEX_END"

if grep -qF "$CODEX_START" "$ZSHRC" 2>/dev/null; then
  tmp="$(mktemp)"; blockfile="$(mktemp)"
  printf '%s\n' "$codex_block" > "$blockfile"
  awk -v s="$CODEX_START" -v e="$CODEX_END" -v bf="$blockfile" '
    $0==s { while ((getline line < bf) > 0) print line; close(bf); skip=1; next }
    $0==e { skip=0; next }
    skip!=1 { print }
  ' "$ZSHRC" > "$tmp" && mv "$tmp" "$ZSHRC"
  rm -f "$blockfile"
  ok "updated managed codex alias block in ~/.zshrc.local"
else
  printf '\n%s\n' "$codex_block" >> "$ZSHRC"
  ok "added managed codex alias block to ~/.zshrc.local"
fi

# Auth is per home and cannot be scripted past the browser handshake.
for nm in "${codex_homes[@]}"; do
  if [[ "$nm" == "default" ]]; then home="$HOME/.codex"; else home="$HOME/.codex-$nm"; fi
  if [[ -f "$home/auth.json" ]]; then
    skip "codex-$nm already authenticated"
  elif confirm "Log in to Codex ($nm) now?"; then
    CODEX_HOME="$home" codex login || warn "codex login for $nm did not complete"
  else
    info "Later: CODEX_HOME=$home codex login"
  fi
done

log "Configuring Claude accounts"
info "Claude Code supports multiple accounts, each with its own login + config dir."
info "Each named account gets a shell alias, e.g. 'acme' -> run it with 'claude-acme'."

# Single-account users just use the default ~/.claude — nothing to provision.
if ! confirm "Do you use more than one Claude account?"; then
  ok "Single-account setup — using the default ~/.claude only."
  exit 0
fi

read -r -p "    How many named accounts do you want to set up? [2] " count
count="${count:-2}"
if ! [[ "$count" =~ ^[1-9][0-9]*$ ]]; then
  err "Expected a positive number, got: $count"; exit 1
fi

# Prompt for each name. No pre-filled defaults — names are user/org specific.
# Recommended convention: name by company or context (e.g. acme, work, personal).
names=()
for ((i=1; i<=count; i++)); do
  while :; do
    read -r -p "    Name for account $i (e.g. company/context -> alias 'claude-<name>'): " nm
    nm="${nm//[[:space:]]/}"
    [[ -n "$nm" ]] && break
    warn "Name can't be empty — try something like 'acme' or 'personal'."
  done
  names+=("$nm")
done

# Choose which account the bare `claude` command should use by default. Exporting
# CLAUDE_CONFIG_DIR points the default at a named account's dir, so `claude` shares
# that account's login + synced config instead of a separate, unconfigured ~/.claude.
# The per-account aliases set CLAUDE_CONFIG_DIR inline, so they still override this.
info "Which account should the plain 'claude' command use by default?"
for ((i=0; i<count; i++)); do info "  $((i+1))) ${names[i]}"; done
info "  0) keep a standalone default (~/.claude, its own separate login)"
read -r -p "    Default account [1]: " defsel
defsel="${defsel:-1}"
default_name=""
if [[ "$defsel" == "0" ]]; then
  info "Default 'claude' stays standalone — the config step will sync config into ~/.claude."
elif [[ "$defsel" =~ ^[0-9]+$ ]] && (( defsel >= 1 && defsel <= count )); then
  default_name="${names[defsel-1]}"
  ok "Default 'claude' will use the '$default_name' account."
else
  err "Invalid selection: $defsel"; exit 1
fi

# Build the managed alias block (includes its own markers).
block="$MARK_START"$'\n'
if [[ -n "$default_name" ]]; then
  block+="export CLAUDE_CONFIG_DIR=\"\$HOME/.claude-$default_name\"  # bare 'claude' -> $default_name account"$'\n'
fi
for nm in "${names[@]}"; do
  dir="$HOME/.claude-$nm"
  if [[ -d "$dir" ]]; then skip "config dir $dir exists"; else mkdir -p "$dir"; ok "created $dir"; fi
  block+="alias claude-$nm=\"CLAUDE_CONFIG_DIR=\$HOME/.claude-$nm claude\""$'\n'
done
block+="$MARK_END"

# Replace the managed block if present, else append it.
if grep -qF "$MARK_START" "$ZSHRC" 2>/dev/null; then
  tmp="$(mktemp)"; blockfile="$(mktemp)"
  printf '%s\n' "$block" > "$blockfile"
  awk -v s="$MARK_START" -v e="$MARK_END" -v bf="$blockfile" '
    $0==s { while ((getline line < bf) > 0) print line; close(bf); skip=1; next }
    $0==e { skip=0; next }
    skip!=1 { print }
  ' "$ZSHRC" > "$tmp" && mv "$tmp" "$ZSHRC"
  rm -f "$blockfile"
  ok "updated managed alias block in ~/.zshrc.local"
else
  printf '\n%s\n' "$block" >> "$ZSHRC"
  ok "added managed alias block to ~/.zshrc.local"
fi

# Inline login per account (best-effort detection; skip if already authed).
for nm in "${names[@]}"; do
  dir="$HOME/.claude-$nm"
  if [[ -f "$dir/.credentials.json" ]] || grep -q '"oauthAccount"' "$dir/.claude.json" 2>/dev/null; then
    skip "claude-$nm already authenticated"
  elif confirm "Log in to claude-$nm now?"; then
    info "A browser will open to sign in. Approve access there, then return to this"
    info "terminal — setup continues automatically once login completes."
    CLAUDE_CONFIG_DIR="$dir" claude auth login || warn "login for claude-$nm did not complete"
  else
    info "Later: run 'claude-$nm' then /login"
  fi
done
