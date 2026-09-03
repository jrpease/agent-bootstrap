#!/usr/bin/env bash
# capture-macos.sh — desktop-native canon capture, for the roster entries that
# are Mac apps rather than web pages (Raycast, Things 3).
#
# Simulators were rejected in the spec on a hard fact: an iOS simulator cannot
# run App Store apps, so it could never open these. Local capture can.
#
# These produce PIXEL-ONLY evidence: no DOM, so motion-measure.mjs derives
# durationMs and coverage and marks travel / participants / choreographyDepth
# as `annotated` for the operator to fill in by watching the clip once.
#
#   ./capture-macos.sh <entry-name> <seconds>
set -euo pipefail

ENTRY="${1:?usage: capture-macos.sh <entry-name> <seconds>}"
SECONDS_TO_RECORD="${2:-6}"
OUT="$(cd "$(dirname "$0")" && pwd)/shots/$ENTRY"
mkdir -p "$OUT"

echo "capture: $ENTRY -> $OUT"
echo "  1/2  still — click the window to capture when the crosshair appears"
screencapture -o -w "$OUT/still.png"

echo "  2/2  video — ${SECONDS_TO_RECORD}s; perform the interaction now"
screencapture -v -V "$SECONDS_TO_RECORD" -x "$OUT/moment.mov"

echo "done: $OUT"
echo "next: node ../motion-measure.mjs --video '$OUT/moment.mov' --type <transition|feedback|reward|reveal>"
echo "      then annotate travel / participants / choreographyDepth by watching moment.mov once."
