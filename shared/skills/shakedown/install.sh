#!/usr/bin/env bash
# Install the Playwright that shakedown's harness uses, once per machine, shared by every product.
# Idempotent: does nothing when PW_VERSION is already installed. Never writes inside the skill folder.
set -euo pipefail

PW_VERSION="1.64.1"   # latest stable when the skill was built (2026-10-28)
DIR="$HOME/.cache/shakedown"

installed="$(node -p "require('$DIR/node_modules/playwright/package.json').version" 2>/dev/null || true)"
if [[ "$installed" == "$PW_VERSION" ]]; then
  echo "playwright $PW_VERSION already installed in $DIR"
  exit 0
fi

mkdir -p "$DIR"
npm install --prefix "$DIR" --no-audit --no-fund --silent "playwright@$PW_VERSION"
npx --prefix "$DIR" playwright install chromium webkit firefox
echo "playwright $PW_VERSION installed in $DIR"
