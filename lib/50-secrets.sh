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

# Wire the repo `zshrc` into ~/.zshrc so the interactive shell actually loads
# our config (PATH additions + `source ~/.zshrc.local`, which holds the
# per-account `claude-<name>` aliases). Oh My Zsh is installed with KEEP_ZSHRC,
# so nothing else does this — without it, ~/.zshrc.local is never sourced and
# the account aliases silently don't exist.
#
# The block SOURCES the repo file rather than holding a copy of it. A pasted copy
# froze at whatever zshrc said on the day setup first ran, and the marker guard
# then skipped forever, so no later zshrc edit ever reached that machine.
# With a source line, `git pull` is all a zshrc change needs. An existing copy
# block is swapped for the source line in place, with a backup first.
zshrc="$HOME/.zshrc"
mark_start="# >>> agent-bootstrap zshrc >>>"
mark_end="# <<< agent-bootstrap zshrc <<<"
# `if`, not `&&`: a failed test as the file's last line leaves $? at 1, and the
# prompt theme opens every shell showing an error.
block="$mark_start
if [[ -f \"$DOTFILES/zshrc\" ]]; then source \"$DOTFILES/zshrc\"; fi
$mark_end"
[[ -f "$zshrc" ]] || touch "$zshrc"
# If ~/.zshrc IS the repo zshrc (symlinked by an older setup), the config is
# already loaded and there is nothing to wire. Without this guard the append
# below is `cat file >> file` — it grows until the disk fills, and the marker
# guard can't stop it because the marker is only written by the append itself.
if [[ "$(stat -L -f '%d:%i' "$zshrc")" == "$(stat -L -f '%d:%i' "$DOTFILES/zshrc")" ]]; then
  skip "$zshrc is the repo zshrc itself — already loads bootstrap config"
elif grep -qF "$mark_start" "$zshrc"; then
  current="$(sed -n "\|^$mark_start\$|,\|^$mark_end\$|p" "$zshrc")"
  # Rewrite only a block we can bound exactly: one start marker, byte-exact,
  # followed by an end marker. Anything else (a second block, CRLF, trailing
  # whitespace, an end marker above the start) is reported, never guessed at.
  if [[ "$current" == "$block" ]]; then
    skip "$zshrc already sources the repo zshrc"
  elif [[ "$(grep -cF "$mark_start" "$zshrc")" != 1 ]] || ! grep -qxF "$mark_start" "$zshrc" \
       || ! sed -n "\|^$mark_start\$|,\$p" "$zshrc" | grep -qxF "$mark_end"; then
    warn "$zshrc has a agent-bootstrap block this step can't bound safely — not touching it"
    info "Fix by hand: leave exactly one block, from the start marker to the end marker, reading:"
    info "$block"
  else
    bak="$zshrc.bak.$(date +%Y%m%d-%H%M%S)"
    cp "$zshrc" "$bak"
    BLOCK="$block" python3 - "$zshrc" "$mark_start" "$mark_end" <<'EOF'
import os, sys
path, start, end = sys.argv[1:4]
lines = open(path).read().split('\n')
i = lines.index(start)
j = lines.index(end, i)
lines[i:j + 1] = os.environ['BLOCK'].split('\n')
open(path, 'w').write('\n'.join(lines))
EOF
    ok "replaced the pasted zshrc copy in $zshrc with a source line"
    info "previous file kept at $bak — reload with: source ~/.zshrc"
  fi
else
  printf '\n%s\n' "$block" >> "$zshrc"
  ok "wired bootstrap config into $zshrc"
  info "Reload with: source ~/.zshrc"
fi
