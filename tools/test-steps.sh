#!/usr/bin/env bash
# test-steps.sh — run the setup steps against a throwaway HOME, twice, and check them.
#
# Usage: tools/test-steps.sh [--keep]
#
# Every step had only ever been tested by running it against a real home folder.
# This runs config, memory, skills, secrets, mcp and health in an empty HOME with
# stub claude/npx/codex/launchctl/osascript/lpass on a PATH that can't reach the real
# ones, then checks: no step failed, the key results landed, and a second run changed
# nothing (the README's idempotency promise, checked as a snapshot of every file and
# link in that HOME). --keep leaves the HOME behind for inspection.
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
keep=0; [[ "${1:-}" == --keep ]] && keep=1

T="$(mktemp -d)"
H="$T/home"; BIN="$T/bin"; OUT="$T/out"
# Two accounts. The second is named for the one account overlay the repo carries, so
# config's --overlay path runs too. Each has its own memory for the same project, which
# the memory step should merge into one shared store.
mkdir -p "$H/.claude" "$H/.claude-work" "$H/.codex" "$BIN" "$OUT"
for a in .claude .claude-work; do
  mkdir -p "$H/$a/projects/-tmp-proj/memory"
  printf -- '- [note from %s](n.md) — hook\n' "$a" > "$H/$a/projects/-tmp-proj/memory/MEMORY.md"
done
(( keep )) || trap 'rm -rf "$T"' EXIT

# Stubs. claude keeps MCP registrations in $CLAUDE_CONFIG_DIR/.claude.json the way the
# real CLI does; everything else succeeds quietly. lpass reports a locked vault.
cat > "$BIN/claude" <<'EOF'
#!/usr/bin/env python3
import json, os, sys
a = [x for x in sys.argv[1:] if x not in ("--scope", "user", "-s")]
if a[:1] == ["mcp"]:
    f = os.path.join(os.environ["CLAUDE_CONFIG_DIR"], ".claude.json")
    d = json.load(open(f)) if os.path.exists(f) else {}
    m = d.setdefault("mcpServers", {})
    if a[1] == "add-json":
        m[a[2]] = json.loads(a[3])
    elif a[1] == "remove":
        if a[2] not in m:
            sys.exit(1)
        del m[a[2]]
    open(f, "w").write(json.dumps(d))
EOF
for c in npx codex launchctl osascript; do printf '#!/bin/sh\nexit 0\n' > "$BIN/$c"; done
printf '#!/bin/sh\nexit 1\n' > "$BIN/lpass"
chmod +x "$BIN"/*
# A python3 that has tomlkit (the deps step installs it into one of them) and git,
# and nothing else from outside.
py=""
for c in $(which -a python3); do "$c" -c 'import tomlkit' 2>/dev/null && { py="$c"; break; }; done
[[ -n "$py" ]] || { echo "test-steps: no python3 with tomlkit on PATH (./setup.sh deps installs it)"; exit 1; }
ln -s "$py" "$BIN/python3"
# tomlkit often sits in the user site-packages, which Python finds through HOME; the
# throwaway HOME hides it, so hand over its real folder.
PYPATH="$("$py" -c 'import os, tomlkit; print(os.path.dirname(os.path.dirname(tomlkit.__file__)))')"
ln -s "$(command -v git)" "$BIN/git"

steps=(config memory skills secrets mcp health)
run_all() {   # run_all <label>
  local s f
  for s in "${steps[@]}"; do
    f="$(ls "$REPO"/lib/[0-9][0-9]-"$s".sh)"
    env -i HOME="$H" PATH="$BIN:/usr/bin:/bin:/usr/sbin:/sbin" PYTHONPATH="$PYPATH" TERM=dumb \
      bash "$f" </dev/null >"$OUT/$1-$s.log" 2>&1
    echo "$?" >"$OUT/$1-$s.rc"
  done
}
snapshot() {  # every file's content hash and every link's target, minus backups and
              # the skill-source clones (git rewrites its own index; skills/ shows the result)
  (cd "$H" && find . \( -type f -o -type l \) ! -name '*.bak*' ! -path '*-backup/*' ! -path './.cache/*' | sort \
    | while IFS= read -r p; do
        if [[ -L "$p" ]]; then printf '%s -> %s\n' "$p" "$(readlink "$p")"
        else printf '%s %s\n' "$p" "$(shasum <"$p" | cut -c1-12)"; fi
      done)
}

fails=0
check() {     # check <description> <command...>
  if "${@:2}" >/dev/null 2>&1; then printf '  ok    %s\n' "$1"
  else printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); fi
}

echo "test-steps: HOME=$H"
run_all first;  snapshot >"$OUT/first.snap"
run_all second; snapshot >"$OUT/second.snap"

for s in "${steps[@]}"; do
  check "$s exits 0 (both runs)" test "$(cat "$OUT/first-$s.rc")$(cat "$OUT/second-$s.rc")" = 00
  check "$s prints no ✗" bash -c "! grep -q '✗' '$OUT/first-$s.log' '$OUT/second-$s.log'"
  # A step that skips half its work says so with a warning, not an error. The only
  # warnings a clean run prints are mcp's two OAuth notices.
  check "$s prints no unexpected warning" bash -c "! grep -h ' ! ' '$OUT/first-$s.log' '$OUT/second-$s.log' | grep -vq 'OAuth'"
done
for d in "$H/.claude" "$H/.claude-work"; do
  a="${d##*/}"
  check "$a/CLAUDE.md links into the repo" test "$(readlink "$d/CLAUDE.md")" = "$REPO/claude/CLAUDE.md"
  check "$a/settings.json is generated JSON" python3 -c "import json; json.load(open('$d/settings.json'))"
  check "$a has every shared skill" bash -c "for s in '$REPO'/shared/skills/*/; do test -e '$d/skills/'\"\$(basename \"\$s\")\" || exit 1; done"
  check "$a has every agent" bash -c "for g in '$REPO'/claude/agents/*.md; do test -e '$d/agents/'\"\$(basename \"\$g\")\" || exit 1; done"
  check "$a has its MCP servers" python3 -c "import json; assert json.load(open('$d/.claude.json'))['mcpServers']"
done
# The public copy ships no account overlays.
[[ -f "$REPO/claude/accounts/work.settings.json" ]] && check "work's overlay applied" python3 -c "
import json; o = json.load(open('$REPO/claude/accounts/work.settings.json'))
s = json.load(open('$H/.claude-work/settings.json'))
def within(a, b): return all(within(v, b.get(k, {})) if isinstance(v, dict) else b.get(k) == v for k, v in a.items())
assert within(o, s)"
check "both accounts' memory points at one store" bash -c "test -L '$H/.claude/projects/-tmp-proj/memory' && test \"\$(readlink '$H/.claude/projects/-tmp-proj/memory')\" = \"\$(readlink '$H/.claude-work/projects/-tmp-proj/memory')\""
check "the merged MEMORY.md kept both notes" bash -c "grep -q 'from .claude]' '$H/.local/share/claude-memory/-tmp-proj/MEMORY.md' && grep -q 'from .claude-work]' '$H/.local/share/claude-memory/-tmp-proj/MEMORY.md'"
check "~/.zshrc sources the repo zshrc" grep -qF "$REPO/zshrc" "$H/.zshrc"
check "codex AGENTS.md generated" test -s "$H/.codex/AGENTS.md"
check "fleet-health plist written" test -f "$H/Library/LaunchAgents/agent-bootstrap.fleet-health.plist"
check "second run changed nothing" cmp -s "$OUT/first.snap" "$OUT/second.snap"
if ! cmp -s "$OUT/first.snap" "$OUT/second.snap"; then
  diff "$OUT/first.snap" "$OUT/second.snap" | sed 's/^/        /' | head -20
fi

if (( fails )); then
  echo "test-steps: $fails failed. Logs: $OUT (rerun with --keep to inspect)"
  exit 1
fi
echo "test-steps: all passed"
