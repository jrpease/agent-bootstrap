# User binary locations (claude installer, pipx, local scripts). Homebrew puts its
# own bin on PATH via ~/.zprofile. Machine-specific PATH additions go in ~/.zshrc.local.
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

# Machine-specific env vars (API keys, extra PATH entries, etc.) — not committed.
# The accounts step also writes per-account Claude aliases (claude-<name>) into this file,
# since account names are personal and device-specific.
[[ -f "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"

# fnm — node version manager (auto-switches on .node-version/.nvmrc). The deps
# step installs it, but this file is shared across devices and sourced before
# setup has ever run on a new one, so guard rather than erroring in every shell.
# `if`, not `&&`: as the file's last line a failed test would leave $? at 1 and
# the prompt theme would open every shell showing an error.
if command -v fnm >/dev/null; then eval "$(fnm env --use-on-cd --shell zsh)"; fi
