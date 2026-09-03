#!/usr/bin/env python3
"""Generate an account's settings.json: base, optionally overlaid, with runtime
keys preserved from the account's existing file.

Usage: settings-merge.py <base.json> [--overlay F] [--runtime F]

Dicts merge recursively with the overlay winning; every other type is replaced
outright. RUNTIME_KEYS are account-owned state the harness writes (auto mode's
per-project trust profiles) — they carry over from --runtime verbatim, so
regenerating an account file is always lossless. Output is stable (indent=2),
so callers can byte-compare a file against a re-merge to detect drift.
"""
import json
import os
import sys

RUNTIME_KEYS = ("autoMode",)


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
print(json.dumps(result, indent=2))
