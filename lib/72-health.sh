#!/usr/bin/env bash
# desc: Schedule the weekly fleet-health drift check and the daily watch
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Scheduling the weekly fleet-health check and the daily watch"

# Each job runs from this copy — the live copy, when setup runs the usual way.
# schedule <label> <interpreter> <script> <log> <when> <StartCalendarInterval keys>
schedule() {
  local label="$1" plist="$HOME/Library/LaunchAgents/$1.plist" log="$4"
  mkdir -p "$HOME/Library/LaunchAgents" "$(dirname "$log")"
  cat >"$plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$2</string>
    <string>$DOTFILES/tools/$3</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
$6
  </dict>
  <key>StandardOutPath</key>
  <string>$log</string>
  <key>StandardErrorPath</key>
  <string>$log</string>
</dict>
</plist>
PLIST_EOF
  ok "wrote $plist"

  launchctl bootout "gui/$UID/$label" >/dev/null 2>&1 || true
  if launchctl bootstrap "gui/$UID" "$plist" 2>/dev/null; then
    ok "loaded — runs $5, log at $log"
  else
    warn "could not load $label — it will load at next login"
  fi
}


# Mondays at 09:00: tools/fleet-health.sh. Silent when clean; a notification when not.
schedule agent-bootstrap.fleet-health /bin/bash fleet-health.sh \
  "$HOME/Library/Logs/claude-fleet-health.log" "Mondays 09:00" \
'    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>'

# Daily at 09:00: tools/watch.py — Vercel sites that aren't serving, and open PRs
# in your own repos that wait on something. Notifies only on new findings.
# See docs/specs/2026-10-13-watch.md.
schedule agent-bootstrap.watch /usr/bin/python3 watch.py \
  "$HOME/Library/Logs/claude-watch.log" "daily 09:00" \
'    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>'
