#!/usr/bin/env bash
# fleet-health.sh — weekly deterministic drift check across Claude accounts.
# Scheduled weekly by the health step (lib/72-health.sh), from the live copy.
# Silent when clean; macOS notification + nonzero exit when something drifted. Newer
# upstream versions of pinned sources notify separately, once each (check 6).
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

# 2. The live copy is exactly a commit: no tracked edits (the harness writes through
# the account links into it), on origin/main unless deliberately pinned, and no
# account still reading the dev checkout. See docs/specs/2026-10-07-live-deploy.md.
if [[ -n "$(git -C "$DOTFILES" status --porcelain --untracked-files=no)" ]]; then
  issues+=("tracked changes in $DOTFILES — review: git -C $DOTFILES diff")
fi
if dev="$(git -C "$DOTFILES" remote get-url dev 2>/dev/null)"; then
  dev="$(cd "$dev" 2>/dev/null && pwd -P || printf '%s' "$dev")"   # realpath below is physical
  if [[ -f "$DOTFILES/.git/live-pin" ]]; then
    issues+=("live copy pinned to $(cat "$DOTFILES/.git/live-pin") — ./setup.sh deploy in your checkout returns it to main")
  elif ! git -C "$DOTFILES" fetch -q origin main 2>/dev/null; then
    issues+=("could not fetch origin to check the live copy is current (offline, or no GitHub credentials here)")
  elif [[ "$(git -C "$DOTFILES" rev-parse HEAD)" != "$(git -C "$DOTFILES" rev-parse FETCH_HEAD)" ]]; then
    issues+=("live copy is not at origin/main — git pull on main in your checkout, or ./setup.sh deploy")
  fi
  for link in "$HOME"/.claude*/CLAUDE.md "$HOME"/.claude*/skills/* "$HOME"/.claude*/agents/* \
              "$HOME"/.agents/skills/* "$HOME"/.local/bin/*; do
    [[ -L "$link" ]] || continue
    case "$(realpath "$link" 2>/dev/null)" in "$dev"/*) issues+=("$link still reads the dev checkout — ./setup.sh --from config") ;; esac
  done
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

# 6. Pins. An unpinned source is drift. A pin upstream has moved past is not: it
# gets its own quieter notification, once per new upstream version (the lines name
# the version, so a new one reads as new), so weekly upstream churn never buries
# real drift. Unreadable upstream (offline) is logged only.
updates=() fresh=0
seen="$HOME/Library/Logs/claude-fleet-health.updates-seen"
while IFS=$'\t' read -r kind msg; do
  case "$kind" in
    drift)  issues+=("$msg") ;;
    update) updates+=("$msg"); grep -qxF "$msg" "$seen" 2>/dev/null || fresh=$((fresh + 1)) ;;
    note)   echo "pins: $msg" ;;
    *)      [[ -n "$kind" ]] && issues+=("pins: $kind $msg") ;;
  esac
done < <(python3 "$DOTFILES/tools/pin-check.py" "$DOTFILES" 2>&1 || echo "pins: tools/pin-check.py failed to run")
if (( ${#updates[@]} )); then
  printf 'update available: %s\n' "${updates[@]}"
  mkdir -p "$(dirname "$seen")"; printf '%s\n' "${updates[@]}" > "$seen"
  (( fresh )) && osascript -e "display notification \"$fresh new upstream version(s) to review — see ~/Library/Logs/claude-fleet-health.log\" with title \"Claude fleet: updates available\"" 2>/dev/null
fi

if (( ${#issues[@]} )); then
  printf '%s\n' "${issues[@]}"
  osascript -e "display notification \"${#issues[@]} issue(s) — see ~/Library/Logs/claude-fleet-health.log\" with title \"Claude fleet drift\"" 2>/dev/null
  exit 1
fi
echo "fleet healthy: $(date '+%Y-%m-%d %H:%M')"
