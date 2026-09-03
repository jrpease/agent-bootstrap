#!/usr/bin/env bash
# desc: Install Homebrew, Node, the Claude CLI, gh, and the other tools
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

require_macos

# Homebrew
if have_cmd brew; then ok "Homebrew present"
else
  log "Installing Homebrew"
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Put brew on PATH for the rest of THIS run and for future shells. Each phase runs
# in its own bash process, and the Homebrew installer doesn't wire ~/.zprofile, so
# without this a fresh machine can't find brew (or brew-installed node/gh) in the
# phases below. Idempotent.
brew_bin=""
for cand in /opt/homebrew/bin/brew /usr/local/bin/brew; do
  [[ -x "$cand" ]] && { brew_bin="$cand"; break; }
done
if [[ -n "$brew_bin" ]]; then
  eval "$("$brew_bin" shellenv)"
  zprofile="$HOME/.zprofile"
  if [[ ! -f "$zprofile" ]] || ! grep -qF "$brew_bin shellenv" "$zprofile"; then
    printf '\n# Homebrew (added by agent-bootstrap)\neval "$(%s shellenv)"\n' "$brew_bin" >> "$zprofile"
    ok "wired Homebrew into ~/.zprofile"
  fi
fi

# Oh My Zsh (KEEP_ZSHRC so it never clobbers our zshrc)
if [[ -d "$HOME/.oh-my-zsh" ]]; then ok "Oh My Zsh present"
else
  log "Installing Oh My Zsh"
  RUNZSH=no KEEP_ZSHRC=yes sh -c \
    "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi

# Node
if have_cmd node; then ok "Node present ($(node --version))"
else log "Installing Node"; brew install node; fi

# ffmpeg (studio-gen video frame extraction)
if have_cmd ffmpeg; then ok "ffmpeg present"
else log "Installing ffmpeg"; brew install ffmpeg; fi

# lastpass-cli (studio-gen reads per-account API keys from the vault)
if have_cmd lpass; then ok "lastpass-cli present"
else log "Installing lastpass-cli"; brew install lastpass-cli; fi

# pinentry-mac — `lpass login` otherwise reads the master password straight from
# the TTY, and a Claude Code session (or any non-interactive shell) has none, so
# the read fails instantly and reports a wrong password. This gives it a GUI prompt.
if have_cmd pinentry-mac; then ok "pinentry-mac present"
else log "Installing pinentry-mac"; brew install pinentry-mac; fi

# Claude CLI
if have_cmd claude; then ok "Claude CLI present ($(claude --version))"
else log "Installing Claude CLI"; npm install -g @anthropic-ai/claude-code; fi

# GitHub CLI
if have_cmd gh; then ok "GitHub CLI present"
else log "Installing GitHub CLI"; brew install gh; fi

# tomlkit — the config step edits ~/.codex/config.toml, which the ChatGPT
# desktop app also writes. Only a round-trip editor preserves the tables it
# owns (marketplaces, plugins, projects, desktop, its own MCP servers); stdlib
# tomllib is read-only, and `toml`/`tomli-w` reformat and drop comments.
#
# Homebrew's python3 is PEP 668 "externally managed", so a plain `pip install`
# is refused outright. --break-system-packages is the sanctioned escape hatch,
# and paired with --user it writes to ~/.local/..., never into brew's own
# site-packages — which is the breakage PEP 668 exists to prevent. There is no
# brew formula for tomlkit, so this is the install path. Try the plain form
# first so a python that doesn't need the flag never sees it.
if python3 -c 'import tomlkit' 2>/dev/null; then ok "tomlkit present"
else
  log "Installing tomlkit"
  python3 -m pip install --user --quiet tomlkit 2>/dev/null \
    || python3 -m pip install --user --break-system-packages --quiet tomlkit
fi

# Codex CLI. Install from the Homebrew cask, NOT npm and NOT a symlink to the
# binary inside ChatGPT.app:
#   - the cask reports install method "brew", which is what makes `codex update`
#     work at all; an app-bundled binary reports "Other" and has no update path
#   - the ChatGPT.app copy is replaced wholesale on every app update, on the
#     app's own (currently alpha) release cadence
#   - the standalone installer puts the binary INSIDE $CODEX_HOME, which would
#     entangle it with whichever account home is active
#
# The cask links to /opt/homebrew/bin/codex, the same path an npm install uses,
# and declares no conflicts_with — so a stale npm copy must go first. Note it
# may be orphaned rather than registered: installing node via fnm leaves an
# earlier Homebrew-node install of @openai/codex on disk with nothing tracking
# it, which is exactly how this machine ended up with a `codex` that only ever
# returned ENOENT.
#
# NEVER run `brew uninstall --zap --cask codex`: the cask's zap stanza is
# `rmdir ~/.codex`, which takes auth, sessions, memories, skills and rules.
if have_cmd codex; then
  ok "Codex CLI present ($(codex --version 2>/dev/null || echo 'BROKEN — see below'))"
else
  # Back up execpolicy rules first: the one-shot ~/.codex/.sandbox_migration
  # marker makes a newer binary strip legacy allow rules from default.rules.
  if [[ -d "$HOME/.codex/rules" ]]; then
    bk="$DOTFILES/tmp/codex-rules-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$bk" && cp -R "$HOME/.codex/rules/." "$bk/" && ok "backed up ~/.codex/rules -> $bk"
  fi
  if npm ls -g @openai/codex --depth=0 >/dev/null 2>&1; then
    log "Removing npm-installed codex (the cask wants the same path)"
    npm uninstall -g @openai/codex
  elif [[ -e /opt/homebrew/lib/node_modules/@openai/codex ]]; then
    warn "orphaned npm codex at /opt/homebrew/lib/node_modules/@openai/codex"
    info "npm does not track it (installed under a different node). Move it aside:"
    info "  mv /opt/homebrew/lib/node_modules/@openai/codex ~/  &&  rm -f /opt/homebrew/bin/codex"
  fi
  log "Installing Codex CLI"; brew install --cask codex
fi
