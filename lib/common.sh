#!/usr/bin/env bash
# common.sh — shared helpers for dotfiles setup phases.
# Sourced by setup.sh and by each lib/NN-*.sh when run standalone.
set -euo pipefail

DOTFILES="${DOTFILES:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
export DOTFILES

# The native Claude installer lands in ~/.local/bin, which a fresh machine's
# login shell may not have on PATH yet. Every step runs in its own bash process
# and later ones call `claude`, so put it on PATH here, once, for all of them.
[[ ":$PATH:" == *":$HOME/.local/bin:"* ]] || export PATH="$HOME/.local/bin:$PATH"

if [[ -t 1 ]]; then
  _C_RESET=$'\033[0m'; _C_BLUE=$'\033[34m'; _C_GREEN=$'\033[32m'
  _C_YELLOW=$'\033[33m'; _C_RED=$'\033[31m'; _C_DIM=$'\033[2m'
else
  _C_RESET=''; _C_BLUE=''; _C_GREEN=''; _C_YELLOW=''; _C_RED=''; _C_DIM=''
fi

log()  { printf '%s==>%s %s\n' "$_C_BLUE" "$_C_RESET" "$*"; }
info() { printf '    %s\n' "$*"; }
ok()   { printf '    %s✓%s %s\n' "$_C_GREEN" "$_C_RESET" "$*"; }
skip() { printf '    %sskip%s %s\n' "$_C_DIM" "$_C_RESET" "$*"; }
warn() { printf '    %s!%s %s\n' "$_C_YELLOW" "$_C_RESET" "$*" >&2; }
err()  { printf '    %s✗%s %s\n' "$_C_RED" "$_C_RESET" "$*" >&2; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# confirm "prompt" -> 0 if yes (default yes on empty input).
confirm() {
  local reply
  read -r -p "    $1 [Y/n] " reply || reply=""
  [[ -z "$reply" || "$reply" =~ ^[Yy] ]]
}

# symlink SRC DST — back up a real (non-symlink) DST to DST.bak, then link.
symlink() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [[ -e "$dst" && ! -L "$dst" ]]; then
    warn "Backing up existing $dst -> $dst.bak"
    mv "$dst" "$dst.bak"
  fi
  ln -sf "$src" "$dst"
  ok "linked $dst"
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    err "This bootstrap targets macOS only (detected $(uname -s)). Aborting."
    exit 1
  fi
}

# claude_account_dirs — echo each existing Claude config dir, one per line.
claude_account_dirs() {
  local d
  for d in "$HOME/.claude" "$HOME"/.claude-*; do
    [[ -d "$d" ]] && printf '%s\n' "$d"
  done
}
