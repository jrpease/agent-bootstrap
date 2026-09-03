#!/usr/bin/env bash
# desc: Give every account one shared memory store per project
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Pointing per-account project memory at one shared store"

# Claude writes memory to <config dir>/projects/<key>/memory, so the same project
# gets a separate memory store per account. The desktop app makes this worse: it
# always uses ~/.claude no matter which account is signed in, so desktop sessions
# accumulate a third copy that no alias can see. (Before this phase existed,
# ~/.claude held more memory than every alias combined.)
#
# Fix the storage location rather than the launcher: give each project ONE store
# and symlink every account's memory dir at it, so a project's memory is the same
# whether the session came from the Dock or an alias. Sessions, history, and auth
# stay per-account — only memory is shared.
#
# The store deliberately lives outside ~/.claude-*: claude_account_dirs() globs
# that pattern and would otherwise provision the store as if it were an account.
STORE="$HOME/.local/share/claude-memory"
mkdir -p "$STORE"

# Projects that appear only after this phase runs keep their memory in whichever
# account wrote first, until the next run relinks them. Re-running is safe.
while IFS=$'\t' read -r verb msg; do
  case "$verb" in
    ok)   ok   "$msg" ;;
    skip) skip "$msg" ;;
    warn) warn "$msg" ;;
    *)    info "$msg" ;;
  esac
done < <(python3 - "$STORE" <<'PY'
import os, pathlib, sys

store = pathlib.Path(sys.argv[1])
home = pathlib.Path.home()
accounts = [home / ".claude"] + sorted(p for p in home.glob(".claude-*") if p.is_dir())


def merge_index(src, dst):
    """Union MEMORY.md lines: keep dst's order, append lines it doesn't have."""
    if not dst.exists():
        dst.write_text(src.read_text())
        return
    kept = dst.read_text().splitlines()
    seen = {line.strip() for line in kept if line.strip()}
    added = [l for l in src.read_text().splitlines() if l.strip() and l.strip() not in seen]
    if added:
        dst.write_text("\n".join(kept + added).rstrip() + "\n")


def absorb(mem, canon, acct):
    """Move real memory files into the shared store, merging indexes."""
    moved = 0
    for f in sorted(mem.glob("*.md")):
        if f.name == "MEMORY.md":
            merge_index(f, canon / "MEMORY.md")
            f.unlink()
            continue
        target = canon / f.name
        if target.exists():
            if target.read_bytes() == f.read_bytes():
                f.unlink()          # identical copy, nothing to keep
                continue
            target = canon / f"{f.stem}--from-{acct}{f.suffix}"
        f.rename(target)
        moved += 1
    return moved


for acct_dir in accounts:
    if not (acct_dir / "projects").is_dir():
        continue
    acct = acct_dir.name.replace(".claude-", "") or "default"
    if acct == ".claude":
        acct = "default"
    linked = absorbed = 0
    for proj in sorted((acct_dir / "projects").iterdir()):
        if not proj.is_dir():
            continue
        mem, canon = proj / "memory", store / proj.name

        if mem.is_symlink():
            if os.readlink(mem) == str(canon):
                continue            # already correct
            mem.unlink()

        canon.mkdir(parents=True, exist_ok=True)
        if mem.is_dir():
            absorbed += absorb(mem, canon, acct)
            try:
                mem.rmdir()
            except OSError:
                print(f"warn\t{proj.name}: memory dir not empty, left in place")
                continue
        mem.symlink_to(canon, target_is_directory=True)
        linked += 1

    if linked or absorbed:
        print(f"ok\t{acct_dir.name}: linked {linked} project(s), absorbed {absorbed} memory file(s)")
    else:
        print(f"skip\t{acct_dir.name}: already linked")
PY
)

info "shared store: $STORE"
