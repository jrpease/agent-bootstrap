#!/usr/bin/env bash
# desc: Point the Dock-launched Claude desktop app at the default account
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Pointing GUI-launched Claude at the default account"

# The accounts step can export CLAUDE_CONFIG_DIR in ~/.zshrc.local so bare `claude` uses a
# named account. That only reaches INTERACTIVE shells: .zshrc.local is sourced
# from .zshrc, which `zsh -lc` and the launchd session never read. So a terminal
# `claude` honors it while the desktop app — launched from the Dock, inheriting
# launchd's environment — starts with CLAUDE_CONFIG_DIR unset and silently uses
# ~/.claude instead.
#
# That split is what mixes accounts: desktop sessions accumulate in ~/.claude no
# matter which account is signed in. (MCP servers are spawned through an
# interactive shell, so THEY do see .zshrc.local — which is why a Figma token in
# that file works from the desktop app while this variable does not. Same file,
# different lookup path.)
#
# `launchctl setenv` writes the launchd session environment, which is exactly
# what Dock-launched apps inherit. A RunAtLoad agent re-applies it each login.
LABEL="claude-bootstrap.config-dir"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

# Single source of truth: whatever the accounts step wrote. No second copy of the account
# name to drift out of sync.
target="$(sed -n 's|^export CLAUDE_CONFIG_DIR="\(.*\)".*|\1|p' "$HOME/.zshrc.local" 2>/dev/null | head -1)"
target="${target/\$HOME/$HOME}"

if [[ -z "$target" ]]; then
  skip "no CLAUDE_CONFIG_DIR export in ~/.zshrc.local — GUI Claude keeps using ~/.claude"
  info "run './setup.sh accounts' and pick a default account to change that"
  exit 0
fi
if [[ ! -d "$target" ]]; then
  warn "$target does not exist — skipping (run ./setup.sh accounts first)"
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/launchctl</string>
    <string>setenv</string>
    <string>CLAUDE_CONFIG_DIR</string>
    <string>$target</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
PLIST_EOF
ok "wrote $PLIST"

# Re-register so an edited plist takes effect; bootout is noisy when not loaded.
launchctl bootout "gui/$UID/$LABEL" >/dev/null 2>&1 || true
if launchctl bootstrap "gui/$UID" "$PLIST" 2>/dev/null; then
  ok "loaded launch agent"
else
  warn "could not load launch agent — it will still apply at next login"
fi

# Apply now too, so the change works without logging out first.
launchctl setenv CLAUDE_CONFIG_DIR "$target"
ok "GUI Claude -> $target"
warn "already-running Claude apps keep the OLD value — quit and relaunch (Cmd-Q) to pick this up"
