#!/usr/bin/env bash
# desc: Create ~/.zshrc.local for machine-specific keys
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Scaffolding local secrets file"
target="$HOME/.zshrc.local"
if [[ -f "$target" ]]; then
  skip "$target exists"
else
  cp "$DOTFILES/templates/zshrc.local.template" "$target"
  ok "created $target"
  info "Add machine-specific keys there (not committed)."
fi

# Wire the repo `zshrc` block into ~/.zshrc so the interactive shell actually
# loads our config (PATH additions + `source ~/.zshrc.local`, which holds the
# per-account `claude-<name>` aliases). Oh My Zsh is installed with KEEP_ZSHRC,
# so nothing else does this — without it, ~/.zshrc.local is never sourced and
# the account aliases silently don't exist. Idempotent via marker guard.
zshrc="$HOME/.zshrc"
mark_start="# >>> claude-bootstrap zshrc >>>"
mark_end="# <<< claude-bootstrap zshrc <<<"
[[ -f "$zshrc" ]] || touch "$zshrc"
# If ~/.zshrc IS the repo zshrc (symlinked by an older setup), the config is
# already loaded and there is nothing to wire. Without this guard the append
# below is `cat file >> file` — it grows until the disk fills, and the marker
# guard can't stop it because the marker is only written by the append itself.
if [[ "$(stat -L -f '%d:%i' "$zshrc")" == "$(stat -L -f '%d:%i' "$DOTFILES/zshrc")" ]]; then
  skip "$zshrc is the repo zshrc itself — already loads bootstrap config"
elif grep -qF "$mark_start" "$zshrc"; then
  skip "$zshrc already loads bootstrap config"
else
  {
    printf '\n%s\n' "$mark_start"
    cat "$DOTFILES/zshrc"
    printf '%s\n' "$mark_end"
  } >> "$zshrc"
  ok "wired bootstrap config into $zshrc"
  info "Reload with: source ~/.zshrc"
fi
