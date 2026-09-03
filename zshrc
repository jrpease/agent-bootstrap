# User binary locations (claude installer, pipx, local scripts). Homebrew puts its
# own bin on PATH via ~/.zprofile. Machine-specific PATH additions go in ~/.zshrc.local.
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

# Machine-specific env vars (API keys, extra PATH entries, etc.) — not committed.
# Phase 10 also writes per-account Claude aliases (claude-<name>) into this file,
# since account names are personal and device-specific.
[[ -f "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"

# fnm — node version manager (auto-switches on .node-version/.nvmrc)
eval "$(fnm env --use-on-cd --shell zsh)"
