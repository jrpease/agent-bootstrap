#!/usr/bin/env python3
"""Decide what lib/60-mcp.sh does to one Claude account's MCP servers.

Usage: mcp-plan.py <servers.json> <account-dir> <account-name>

Prints one tab-separated line per action:
  add      <name> <spec-json>   not registered yet
  replace  <name> <spec-json>   registered, but differs from servers.json
  ok       <name>               registered and matches
  skip     <name> <reason>      not for this account or device, or its secret can't be read
  prune    <name>               registered by this step earlier, now gone from servers.json

Registration used to be add-only: a server already present was never touched, so a
rotated key, a changed URL or command, or a server removed from servers.json never
reached the accounts. Now each registered entry is compared with what
servers.json says, read straight from the account's .claude.json.

Only servers this step registered are ever pruned. Their names are kept in
<account-dir>/.bootstrap-mcp-servers; a server added by hand or in the app isn't
in it and is never touched. A server whose secret can't be read (LastPass locked)
is left as it is: there's nothing to compare it against.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_secrets import resolve_headers  # noqa: E402

servers_json, acct_dir, acct = sys.argv[1:4]
STATE = os.path.join(acct_dir, ".bootstrap-mcp-servers")


def desired(c):
    """The entry as Claude stores it, or (None, reason)."""
    if c.get("type") == "http":
        headers, why = resolve_headers(c)
        if why:
            return None, why
        spec = dict(type="http", url=c["url"])
        if headers:
            spec["headers"] = headers
        return spec, None
    return dict(type="stdio", command=c.get("command", ""), args=c.get("args", []),
                env=c.get("env", {})), None


def same(have, want):
    # Claude may add keys of its own; compare only the ones servers.json owns.
    # An absent env or headers is the same as an empty one.
    for key in ("type", "url", "command", "args"):
        if have.get(key) != want.get(key):
            return False
    return all((have.get(k) or {}) == (want.get(k) or {}) for k in ("env", "headers"))


try:
    registered = json.load(open(os.path.join(acct_dir, ".claude.json"))).get("mcpServers", {})
except (OSError, ValueError):
    registered = {}
try:
    managed = set(open(STATE).read().split())
except OSError:
    managed = None   # first run: the servers.json names are ours, nothing else is

ours = []
for name, c in json.load(open(servers_json)).get("mcpServers", {}).items():
    # agents: which agent gets it (default both); accounts: which home within
    # that agent, by name. The Codex half of this lives in tools/codex-config-merge.py.
    if "claude" not in c.get("agents", ["claude", "codex"]):
        continue
    if c.get("accounts") and acct not in c["accounts"]:
        print(f"skip\t{name}\tnot scoped to {acct}")
        continue
    ours.append(name)
    app = c.get("requires_app")
    if app and not os.path.exists(app):
        print(f"skip\t{name}\t{app} not installed on this device")
        continue
    spec, why = desired(c)
    if spec is None:
        print(f"skip\t{name}\t{why}" + (" (left as registered)" if name in registered else ""))
    elif name not in registered:
        print(f"add\t{name}\t{json.dumps(spec)}")
    elif not same(registered[name], spec):
        print(f"replace\t{name}\t{json.dumps(spec)}")
    else:
        print(f"ok\t{name}")

for name in sorted((managed or set()) - set(ours)):
    if name in registered:
        print(f"prune\t{name}")

# The names to remember as this step's own, for the next run's prune.
print("managed\t" + " ".join(ours))
