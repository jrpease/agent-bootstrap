#!/usr/bin/env python3
"""Generate an account's settings.json: base, optionally overlaid, with runtime
keys preserved from the account's existing file.

Usage: settings-merge.py <base.json> [--overlay F] [--runtime F]

Dicts merge recursively with the overlay winning; every other type is replaced
outright. RUNTIME_KEYS are account-owned state the harness writes (auto mode's
per-project trust profiles) — they carry over from --runtime verbatim.

ADDITIVE_KEYS are shared between the repo and the app: `/plugin` writes into
the same maps the repo declares. Entries only the account has carry over;
entries the repo also declares take the repo's value. So a plugin switched on
in-app survives regeneration, and removing one deliberately means setting
it to false in base or overlay — deleting the line no longer removes it from
accounts that have it. tools/fleet-health.sh reports account-only entries so
they get folded into the repo rather than accumulating unseen.

Everything else in --runtime is replaced. Callers compare an account file to a
re-merge by content (tools/json-same.py), since the Claude CLI rewrites these
files in its own key order and escaping.
"""
import json
import os
import sys

RUNTIME_KEYS = ("autoMode",)
ADDITIVE_KEYS = ("enabledPlugins", "extraKnownMarketplaces")


def merge(base, overlay):
    if isinstance(base, dict) and isinstance(overlay, dict):
        out = dict(base)
        for key, value in overlay.items():
            out[key] = merge(base[key], value) if key in base else value
        return out
    return overlay


args = sys.argv[1:]
result = json.load(open(args.pop(0)))
while args:
    flag, path = args.pop(0), args.pop(0)
    if flag == "--overlay":
        result = merge(result, json.load(open(path)))
    elif flag == "--runtime" and os.path.isfile(path):
        try:
            existing = json.load(open(path))
        except ValueError:
            existing = {}
        for key in RUNTIME_KEYS:
            if key in existing:
                result[key] = existing[key]
        for key in ADDITIVE_KEYS:
            if isinstance(existing.get(key), dict):
                target = result.setdefault(key, {})
                for name, value in existing[key].items():
                    target.setdefault(name, value)
print(json.dumps(result, indent=2))
