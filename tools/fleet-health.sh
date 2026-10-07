#!/usr/bin/env bash
# fleet-health.sh — weekly deterministic drift check across Claude accounts.
# Intended to run weekly (launchd, cron, or by hand).
# Silent when clean; macOS notification + nonzero exit when something drifted.
set -uo pipefail
DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
issues=()

# 1. Managed files. CLAUDE.md is a symlink into the repo. settings.json is a real
# generated file whose CONTENT must match base ⊕ overlay ⊕ its own runtime keys —
# regenerating with --runtime <itself> is a pure idempotency check, so any
# hand-edit or un-propagated base change shows up as a diff. Name derivation
# stays in lockstep with lib/20-config.sh.
for dir in "$HOME/.claude" "$HOME"/.claude-*; do
  [[ -d "$dir" ]] || continue
  tgt="$(readlink "$dir/CLAUDE.md" 2>/dev/null || true)"
  [[ "$tgt" == "$DOTFILES/claude/CLAUDE.md" ]] || issues+=("$dir/CLAUDE.md not linked to repo (-> ${tgt:-real file})")
  name="$(basename "$dir")"; name="${name#.claude}"; name="${name#-}"; name="${name:-default}"
  overlay="$DOTFILES/claude/accounts/$name.settings.json"
  overlay_args=(); [[ -f "$overlay" ]] && overlay_args=(--overlay "$overlay")
  if [[ -L "$dir/settings.json" ]]; then
    issues+=("$dir/settings.json is a symlink — run ./setup.sh config to migrate to a generated file")
  elif ! python3 "$DOTFILES/tools/settings-merge.py" "$DOTFILES/claude/settings.json"       ${overlay_args[@]+"${overlay_args[@]}"} --runtime "$dir/settings.json" 2>/dev/null       | python3 "$DOTFILES/tools/json-same.py" - "$dir/settings.json"; then
    issues+=("$dir/settings.json differs from base${overlay_args:+ + $name overlay} — re-run ./setup.sh config, or fold deliberate drift into base/overlay")
  fi
  # 1b. Plugins and marketplaces only this account has — switched on in-app. They
  # survive config (settings-merge.py ADDITIVE_KEYS), so nothing else would ever
  # mention them; surface them until they are folded into the repo on purpose.
  [[ -f "$dir/settings.json" && ! -L "$dir/settings.json" ]] || continue
  while IFS= read -r line; do
    issues+=("$line")
  done < <(python3 "$DOTFILES/tools/settings-merge.py" "$DOTFILES/claude/settings.json" \
      ${overlay_args[@]+"${overlay_args[@]}"} 2>/dev/null \
    | python3 -c '
import json, sys
try:
    repo = json.load(sys.stdin)
    acct = json.load(open(sys.argv[1]))
except ValueError:
    sys.exit(0)   # malformed base or account file: check 1 already reports it
for key in ("enabledPlugins", "extraKnownMarketplaces"):
    have, declared = acct.get(key), repo.get(key)
    if not isinstance(have, dict):
        continue
    for name in have:
        if not isinstance(declared, dict) or name not in declared:
            print(f"{sys.argv[2]}: {key}.{name} is not declared in the repo — add it to claude/accounts/{sys.argv[3]}.settings.json and to the matching list in lib/30-skills.sh to keep it deliberately")
' "$dir/settings.json" "$dir" "$name")
done

# 2. Uncommitted drift in the shared config — the harness writes through the symlinks.
# claude/CLAUDE.md is generated and gitignored, so it is checked by re-composition
# below rather than by git; its SOURCES are what can drift uncommitted.
if ! git -C "$DOTFILES" diff --quiet -- claude/settings.json claude/accounts \
     shared/instructions claude/instructions codex/instructions; then
  issues+=("uncommitted changes in shared config — review: git -C $DOTFILES diff claude/ shared/instructions")
fi

# 2b. The generated CLAUDE.md still matches its sources. The harness writes
# through the account symlinks into this file, so a stray edit lands here and
# would be silently overwritten by the next ./setup.sh config.
if ! python3 "$DOTFILES/tools/compose-instructions.py" --agent claude --root "$DOTFILES" 2>/dev/null \
     | cmp -s - "$DOTFILES/claude/CLAUDE.md"; then
  issues+=("claude/CLAUDE.md differs from core + addendum — re-run ./setup.sh config, or fold the edit into shared/instructions/core.md")
fi

# 3. Dangling skill/agent symlinks
for dir in "$HOME/.claude" "$HOME"/.claude-*; do
  [[ -d "$dir" ]] || continue
  for link in "$dir"/skills/* "$dir"/agents/*; do
    [[ -L "$link" && ! -e "$link" ]] && issues+=("dangling symlink: $link — run ./setup.sh config skills")
  done
done

# 4. User-scope plugin version drift between accounts (autoUpdate never bumps installs)
while IFS= read -r line; do
  issues+=("$line")
done < <(python3 - "$HOME" <<'PYEOF'
import json, sys, glob, os
home = sys.argv[1]
versions = {}  # plugin -> {account: version}
for path in glob.glob(os.path.join(home, ".claude*", "plugins", "installed_plugins.json")):
    account = path.split(os.sep)[-3]
    try:
        data = json.load(open(path))
    except Exception:
        continue
    for name, installs in data.get("plugins", {}).items():
        for inst in installs:
            if inst.get("scope") == "user":
                versions.setdefault(name, {})[account] = inst.get("version", "?")
for name, accts in sorted(versions.items()):
    if len(set(accts.values())) > 1:
        detail = ", ".join(f"{a}={v}" for a, v in sorted(accts.items()))
        print(f"plugin version drift: {name} ({detail})")
PYEOF
)

# 5. Model routing is current. Claude models must be family aliases (haiku,
# sonnet, opus, fable), which always resolve to the newest release — a pinned
# version id stops tracking. Codex has no aliases, so each configured model is
# checked against Codex's own model list: gone, hidden, marked for retirement,
# or behind a newer generation of its own tier is drift. A brand-new Claude family is not detectable
# here — see shared/agents/README.md.
while IFS= read -r line; do
  issues+=("$line")
done < <(python3 "$DOTFILES/tools/model-check.py" "$HOME" "$DOTFILES" 2>&1 || echo "model routing: tools/model-check.py failed to run")

if (( ${#issues[@]} )); then
  printf '%s\n' "${issues[@]}"
  osascript -e "display notification \"${#issues[@]} issue(s) — see /tmp/claude-fleet-health.log\" with title \"Claude fleet drift\"" 2>/dev/null
  exit 1
fi
echo "fleet healthy: $(date '+%Y-%m-%d %H:%M')"
