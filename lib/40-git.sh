#!/usr/bin/env bash
# desc: Set your git identity and sign in to GitHub
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Configuring git and GitHub"

if [[ -n "$(git config --global user.name || true)" ]]; then
  ok "git user.name set ($(git config --global user.name))"
else
  read -r -p "    git user.name: " gn; git config --global user.name "$gn"
fi

if [[ -n "$(git config --global user.email || true)" ]]; then
  ok "git user.email set ($(git config --global user.email))"
else
  read -r -p "    git user.email: " ge; git config --global user.email "$ge"
fi

if ! have_cmd gh; then warn "gh not installed (run ./setup.sh deps first)"; exit 0; fi

if gh auth status >/dev/null 2>&1; then ok "GitHub CLI authenticated"
elif confirm "Run 'gh auth login' now?"; then
  gh auth login || warn "gh auth did not complete"
fi

# Wire git's HTTPS credential helper to the gh token. This is what actually makes
# `git clone/push/pull` work — gh being logged in is NOT enough on its own. With
# this, no SSH key is needed for normal git usage.
if gh auth status >/dev/null 2>&1; then
  if gh auth setup-git 2>/dev/null; then ok "git configured to use gh credentials (HTTPS)"
  else warn "could not run 'gh auth setup-git'"; fi
fi

# SSH is optional — only for git@github.com: remotes. The gh/HTTPS setup above
# already covers cloning and pushing.
if ls "$HOME"/.ssh/id_* >/dev/null 2>&1; then
  ok "SSH key present"
elif confirm "Also set up an SSH key? (optional — only needed for SSH git remotes)"; then
  ssh-keygen -t ed25519 -C "$(git config --global user.email)" -f "$HOME/.ssh/id_ed25519" -N ""
  ok "SSH key generated at ~/.ssh/id_ed25519"
  # Load into the agent + macOS keychain so it survives reboots.
  eval "$(ssh-agent -s)" >/dev/null 2>&1 || true
  ssh-add --apple-use-keychain "$HOME/.ssh/id_ed25519" >/dev/null 2>&1 \
    && ok "added key to ssh-agent + keychain" || warn "could not add key to ssh-agent"
  if gh auth status >/dev/null 2>&1 && confirm "Upload this SSH key to GitHub now?"; then
    if gh ssh-key add "$HOME/.ssh/id_ed25519.pub" --title "$(hostname -s)" 2>/dev/null; then
      ok "uploaded SSH key to GitHub"
    else
      warn "upload failed — your gh token likely lacks the 'admin:public_key' scope."
      info "Run: gh auth refresh -h github.com -s admin:public_key   then re-run ./setup.sh git."
    fi
  fi
fi
