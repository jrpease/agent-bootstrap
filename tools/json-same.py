#!/usr/bin/env python3
"""Exit 0 if two JSON files hold the same data, 1 otherwise (or if either is
missing or unparseable). Either argument may be `-` for stdin.

Usage: json-same.py <a.json|-> <b.json|->

Compares content, not bytes. The Claude CLI rewrites settings.json in its own
format whenever it touches it (`claude plugin install` in the skills step, for
one): it reorders keys and writes em dashes as UTF-8 where json.dumps escapes
them. A byte compare called every such rewrite drift, so fleet-health cried
wolf and config replaced, and backed up, files whose settings hadn't changed.

Python equality treats true == 1 == 1.0 and false == 0, so a hand edit of true
to 1 would pass. The CLI never writes numbers for booleans; accepted.
"""
import json
import sys


def load(path):
    return json.load(sys.stdin if path == "-" else open(path))


try:
    sys.exit(0 if load(sys.argv[1]) == load(sys.argv[2]) else 1)
except (OSError, ValueError, IndexError):
    sys.exit(1)
