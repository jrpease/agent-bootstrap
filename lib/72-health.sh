#!/usr/bin/env bash
# desc: Schedule the weekly fleet-health drift check
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Scheduling the weekly fleet-health check"

# Runs this copy's tools/fleet-health.sh — the live copy, when setup runs the usual
# way — every Monday at 09:00. Silent when clean; a notification when not.
LABEL="agent-bootstrap.fleet-health"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/claude-fleet-health.log"


mkdir -p "$HOME/Library/LaunchAgents" "$(dirname "$LOG")"
cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DOTFILES/tools/fleet-health.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
PLIST_EOF
ok "wrote $PLIST"

launchctl bootout "gui/$UID/$LABEL" >/dev/null 2>&1 || true
if launchctl bootstrap "gui/$UID" "$PLIST" 2>/dev/null; then
  ok "loaded — runs Mondays 09:00, log at $LOG"
else
  warn "could not load the launch agent — it will load at next login"
fi
