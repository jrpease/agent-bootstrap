#!/usr/bin/env python3
"""Report model routing that has stopped tracking the latest models.

Called by tools/fleet-health.sh (check 5); prints one issue per line, nothing
when clean. Claude models must be family aliases; Codex models are checked
against Codex's own model list (~/.codex/models_cache.json).

  python3 tools/model-check.py "$HOME" "$DOTFILES"
"""
import glob, json, os, re, sys
try:
    import tomllib
except ImportError:   # Python < 3.11; checks 1-4 run on the system 3.9, this one cannot
    print(f"model routing: needs Python 3.11+ (found {sys.version.split()[0]}) — put Homebrew's python3 first on the fleet-health PATH")
    sys.exit(0)
home, dotfiles = sys.argv[1:]
ALIASES = {"haiku", "sonnet", "opus", "fable", "opusplan", "inherit", "default"}

def claude(where, value):
    base = re.sub(r"\[.*\]$", "", str(value)).strip().strip("'\"")
    if base and base not in ALIASES:
        print(f"model routing: {where} pins '{value}' — use a family alias so it tracks the latest")

for meta in sorted(glob.glob(os.path.join(dotfiles, "claude", "agents", "*.meta.yml"))):
    for line in open(meta):
        m = re.match(r"\s*model:\s*(\S+)", line)
        if m:
            claude(os.path.relpath(meta, dotfiles), m.group(1))
for path in [os.path.join(dotfiles, "claude", "settings.json"),
             *glob.glob(os.path.join(dotfiles, "claude", "accounts", "*.settings.json")),
             *glob.glob(os.path.join(home, ".claude*", "settings.json"))]:
    try:
        model = json.load(open(path)).get("model")
    except (OSError, ValueError):
        continue
    if model:
        claude(path.replace(home, "~"), model)

codex = os.path.join(home, ".codex")
try:
    cache = json.load(open(os.path.join(codex, "models_cache.json")))
    catalog, fetched = cache["models"], str(cache.get("fetched_at", "?"))[:10]
except (OSError, ValueError, KeyError):
    sys.exit(0)   # Codex not installed or never run: nothing to compare against
listed = {m["slug"] for m in catalog if m.get("visibility") == "list"}
known = {m["slug"] for m in catalog}
# A slug is gpt-<generation>[-<tier>]: astra, sol and luna are tiers, and each
# moves to a new generation on its own schedule (gpt-6.1-sol beside gpt-6-astra).
# So a model is behind only when Codex itself names its replacement (`upgrade`,
# set on models being retired) or a newer generation of the same tier is listed.
# A tier missing from the newest generation proves nothing — its next model may
# simply not have shipped yet.
def parse(slug):
    m = re.match(r"gpt-(\d+(?:\.\d+)?)(?:-(.+))?$", slug)
    return (float(m.group(1)), m.group(2) or "") if m else None
upgrades = {m["slug"]: m["upgrade"] for m in catalog if isinstance(m.get("upgrade"), dict)}
def stale(model):
    up = upgrades.get(model)
    if up:
        when = str(up.get("retirement_at") or "")[:10]
        target = up.get("model")
        # Name the replacement only when the cache lists it; otherwise the advice
        # would be flagged again next week.
        to = f" in favour of '{target}'" if target in listed else " — pick a listed model"
        return f"Codex retires it{' on ' + when if when else ''}{to}"
    p = parse(model)
    if not p:
        return None
    newer = [s for s in listed if parse(s) and parse(s)[1] == p[1] and parse(s)[0] > p[0]]
    if newer:
        return f"'{max(newer, key=lambda s: parse(s)[0])}' is listed"
    return None

configured = []
try:
    configured.append(("~/.codex/config.toml", tomllib.load(open(os.path.join(codex, "config.toml"), "rb")).get("model")))
except (OSError, ValueError):
    pass
for role in sorted(glob.glob(os.path.join(codex, "agents", "*.toml"))):
    try:
        configured.append((role.replace(home, "~"), tomllib.load(open(role, "rb")).get("model")))
    except (OSError, ValueError):
        pass
for where, model in configured:
    if not model:
        continue
    # The cache is only as fresh as the last Codex launch, so a model newer than
    # it reads as missing. Say so rather than steer toward the older list.
    if model not in known:
        print(f"model routing: {where} uses '{model}', which isn't in the model list Codex cached on {fetched} — launch Codex to refresh it and re-run; if it is still missing, the model was retired")
    elif model in upgrades:   # before the hidden check: a retiring model may also be hidden
        print(f"model routing: {where} uses '{model}' but {stale(model)} — update codex/agents/*.meta.toml or the --model default in tools/codex-config-merge.py")
    elif model not in listed:
        print(f"model routing: {where} uses '{model}', which Codex hides from its model picker — pick a listed one from ~/.codex/models_cache.json")
    elif (why := stale(model)):
        print(f"model routing: {where} uses '{model}' but {why} — update codex/agents/*.meta.toml or the --model default in tools/codex-config-merge.py")
