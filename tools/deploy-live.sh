#!/usr/bin/env bash
# deploy-live.sh — update the live copy that every account reads, from the dev checkout.
#
# Usage: deploy-live.sh [--working-tree] [--no-relink]
#   (no flag)        live -> origin/main on GitHub, and unpin
#   --working-tree   live -> this checkout's tracked files as they are now, and pin
#   --no-relink      skip re-running config + skills (the caller runs steps next)
#
# Live sessions read ~/.local/share/agent-bootstrap/live, a second clone held on a
# detached commit, never this working tree: a branch checkout or a half-done edit here
# can't reach them. Design: docs/specs/2026-10-07-live-deploy.md.
set -euo pipefail
DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # this checkout, never an inherited value
source "$DOTFILES/lib/common.sh"

DEV="$DOTFILES"
LIVE="$HOME/.local/share/agent-bootstrap/live"
PIN="$LIVE/.git/live-pin"
DEPLOYED="$LIVE/.git/live-deployed"   # the last commit a deploy finished on
working_tree=0 relink=1
for arg in "$@"; do
  case "$arg" in
    --working-tree) working_tree=1 ;;
    --no-relink)    relink=0 ;;
    *) err "unknown option: $arg"; exit 1 ;;
  esac
done

if [[ "$(cd "$DEV" && pwd -P)" == "$(cd "$LIVE" 2>/dev/null && pwd -P)" ]]; then
  err "deploy runs from your checkout, not from the live copy"; exit 1
fi

log "Deploying the live copy ($LIVE)"
first=0
if [[ ! -d "$LIVE/.git" ]]; then
  mkdir -p "$(dirname "$LIVE")"
  git clone -q --no-checkout "$(git -C "$DEV" remote get-url origin)" "$LIVE"
  git -C "$LIVE" remote add dev "$DEV"
  ok "cloned $LIVE"
  first=1
fi

# Dirty = tracked changes only; node_modules, tmp/ and __pycache__ are ignored writers.
if (( ! first )); then
  dirty="$(git -C "$LIVE" status --porcelain --untracked-files=no)"
  if [[ -n "$dirty" ]]; then
    err "the live copy has local changes; refusing to deploy over them:"
    printf '%s\n' "$dirty" | sed 's/^/      /' >&2
    if grep -q 'claude/CLAUDE.md$' <<<"$dirty"; then
      info "A session wrote this into CLAUDE.md through an account's link:"
      git -C "$LIVE" --no-pager diff -- claude/CLAUDE.md | grep -E '^[-+]' \
        | grep -vE '^(\+\+\+|---) ' | sed 's/^/      /' >&2 || true
      info "Fold it into shared/instructions/ in your checkout and merge, then discard it here:"
    else
      info "Keep anything worth keeping in your checkout, then discard it here:"
    fi
    info "    git -C $LIVE checkout -- .   &&   ./setup.sh deploy"
    exit 1
  fi
fi

# Compare against the last deploy that finished, not wherever HEAD was left: a deploy
# that checked out and then failed must still re-link and reinstall on the retry.
old="$(cat "$DEPLOYED" 2>/dev/null || true)"
if (( working_tree )); then
  # A commit of the tracked working tree (staged and unstaged), without touching the
  # stash or the tree. Empty on a clean tree, where HEAD is the same thing.
  sha="$(git -C "$DEV" stash create)"; sha="${sha:-$(git -C "$DEV" rev-parse HEAD)}"
  git -C "$DEV" update-ref refs/live/working-tree "$sha"
  git -C "$LIVE" fetch -q dev refs/live/working-tree
  printf 'working tree of %s at %s (%s)\n' "$DEV" "$(date '+%Y-%m-%d %H:%M')" "${sha:0:7}" > "$PIN"
  target="working tree (${sha:0:7}); live is pinned until ./setup.sh deploy"
else
  git -C "$LIVE" fetch -q origin main
  rm -f "$PIN"
  target="origin/main ($(git -C "$LIVE" rev-parse --short FETCH_HEAD))"
fi
git -C "$LIVE" checkout -q --detach FETCH_HEAD
ok "live -> $target"

# Untracked runtime dependencies a checkout doesn't carry.
for pkg in tools/studio-gen shared/skills/studio-design/reference/canon; do
  [[ -f "$LIVE/$pkg/package-lock.json" ]] || continue
  if [[ ! -d "$LIVE/$pkg/node_modules" || -z "$old" ]] \
     || ! git -C "$LIVE" diff --quiet "$old" HEAD -- "$pkg/package-lock.json"; then
    # npm ci empties node_modules first, so a failed install is removed to make the
    # next deploy retry it rather than trusting a partial directory.
    if ( cd "$LIVE/$pkg" && npm ci --silent ); then ok "npm ci in $pkg"
    else warn "npm ci failed in $pkg — the next ./setup.sh deploy retries it"; rm -rf "$LIVE/$pkg/node_modules"; fi
  fi
done

# Generated files must match what was committed: setup regenerates them inside the
# live copy, and a mismatch would make it dirty and block the next deploy.
stale=()
python3 "$LIVE/tools/compose-instructions.py" --agent claude --root "$LIVE" \
  | cmp -s - "$LIVE/claude/CLAUDE.md" || stale+=("claude/CLAUDE.md")
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
( cd "$LIVE" && python3 tools/compose-agents.py --agent claude --out "$tmp" >/dev/null )
for f in "$tmp"/*.md; do
  cmp -s "$f" "$LIVE/claude/agents/$(basename "$f")" || stale+=("claude/agents/$(basename "$f")")
done
if (( ${#stale[@]} )); then
  err "generated files don't match their sources in what was deployed: ${stale[*]}"
  info "Regenerate them in your checkout (./setup.sh config skills), commit, and deploy again."
  exit 1
fi

# The post-merge hook makes a pull on main redeploy. Rewritten every deploy, so it
# tracks this script. It deploys origin/main, so a merge made locally on main reaches
# live after it's pushed and pulled, not at the local merge.
hook="$(git -C "$DEV" rev-parse --git-path hooks)/post-merge"
cat > "$hook" <<'EOF'
#!/usr/bin/env bash
# Installed by tools/deploy-live.sh: a pull or merge on main redeploys the live copy.
[[ "$(git rev-parse --abbrev-ref HEAD)" == main ]] || exit 0
live="$HOME/.local/share/agent-bootstrap/live"
if [[ -f "$live/.git/live-pin" ]]; then
  echo "live copy is pinned to a working tree ($(cat "$live/.git/live-pin")); ./setup.sh deploy returns it to main"
  exit 0
fi
# A GUI git client doesn't load the shell, so find node and the CLIs ourselves.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
command -v fnm >/dev/null && eval "$(fnm env --shell bash)"
"$(git rev-parse --show-toplevel)/setup.sh" deploy \
  || echo "live deploy failed after the merge; the pull itself is done. Retry: ./setup.sh deploy" >&2
EOF
chmod +x "$hook"

# Re-link when the set of skills or agents changed, so an added skill appears and a
# removed one is pruned. Content edits need nothing: the links already point into
# the live copy. A first deploy links nothing on its own; the steps that follow it
# (or ./setup.sh) do, since a new machine has no claude CLI yet.
names() { git -C "$LIVE" ls-tree --name-only "$1" -- shared/skills/ claude/agents/ 2>/dev/null; }
if (( first && relink )); then
  info "First deploy. Link every account to it with: ./setup.sh --from config"
elif (( relink )) && [[ "$(names "$old")" != "$(names HEAD)" ]]; then
  log "The skill or agent set changed; re-linking from the live copy"
  ( cd "$LIVE" && ./setup.sh config skills )
fi
git -C "$LIVE" rev-parse HEAD > "$DEPLOYED"
