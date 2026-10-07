#!/usr/bin/env bash
# desc: Install the studio-gen image/video CLI and ffmpeg
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Installing studio-gen (generative asset CLI)"
cli_dir="$DOTFILES/tools/studio-gen"

if ! have_cmd node; then err "node missing — run ./setup.sh deps first"; exit 1; fi

# `ci`, not `install`: install rewrites package-lock.json, which dirties the live copy.
( cd "$cli_dir" && npm ci --silent ) && ok "studio-gen deps installed"

chmod +x "$cli_dir/bin/studio-gen"
# ~/.local/bin is already on PATH via the repo zshrc, so a symlink is all we need.
symlink "$cli_dir/bin/studio-gen" "$HOME/.local/bin/studio-gen"

if have_cmd ffmpeg; then ok "ffmpeg present"
else warn "ffmpeg missing — video frame extraction won't work (brew install ffmpeg)"; fi

# `lpass login` reads the master password from the TTY. A Claude Code session has
# none, so the read fails instantly with "Failed to enter correct password" — it
# reads as a wrong password and isn't one. pinentry-mac supplies a GUI prompt that
# needs no TTY. The template sets LPASS_PINENTRY for new machines; back-fill it here
# for machines whose ~/.zshrc.local predates that.
zshrc_local="$HOME/.zshrc.local"
if ! have_cmd pinentry-mac; then
  warn "pinentry-mac missing — 'lpass login' cannot prompt without a TTY (run ./setup.sh deps)"
elif [[ ! -f "$zshrc_local" ]]; then
  skip "~/.zshrc.local not created yet — the secrets step scaffolds it from the template"
elif grep -q 'LPASS_PINENTRY' "$zshrc_local"; then
  skip "LPASS_PINENTRY already set in ~/.zshrc.local"
else
  printf '\n# Give `lpass` a GUI password prompt, so login works without a TTY.\nexport LPASS_PINENTRY="%s"\n' \
    "$(command -v pinentry-mac)" >> "$zshrc_local"
  ok "set LPASS_PINENTRY in ~/.zshrc.local"
fi

if have_cmd lpass && lpass status >/dev/null 2>&1; then ok "LastPass vault unlocked"
else
  warn "LastPass not logged in — studio-gen cannot resolve keys until it is."
  info "With LPASS_PINENTRY set you get a GUI prompt, so this works from any shell:"
  info "    lpass login --trust <your-email>"
  info "Open a new shell first if the studio-gen step just added the export."
fi
info "Keys live in LastPass as 'studio-gen/<account>-<provider>', key in the password field."
info "Providers: gemini, fal, openai, magnific. Accounts: your claude-<name> alias names."
info "Pin a project to an account with:  studio-gen account <name>"
