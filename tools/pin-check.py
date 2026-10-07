#!/usr/bin/env python3
"""Report pinned sources with newer upstream versions, and sources left unpinned.

Usage: pin-check.py <repo-root>

Prints tab-separated lines, "<kind>\t<message>":
  drift   a source isn't pinned (fleet-health counts it with the other drift)
  update  upstream has moved past a pin (fleet-health notifies once per new version)
  note    upstream couldn't be read, e.g. offline (logged, never notified)

Pinning stops skills and MCP servers changing under every account without review;
the cost is that they never update on their own. This prints one line per pin that
upstream has moved past, naming the new value, so a bump is a decision rather than
something nobody notices. Run weekly by tools/fleet-health.sh. Needs no npm: it asks
the registry (via curl, whose system certificates python.org's Python lacks) and
GitHub directly.
"""
import json
import os
import re
import subprocess
import sys

root = sys.argv[1]
out = []

# Skills: shared/skill-sources.txt, "<url>@<commit> [names...]".
for line in open(os.path.join(root, "shared", "skill-sources.txt")):
    line = line.split("#", 1)[0].split()
    if not line:
        continue
    url, _, ref = line[0].partition("@") if "github.com/" in line[0] else (line[0], "", "")
    if not ref:
        out.append(f"drift\tskill source {url} is unpinned — add @<commit> in shared/skill-sources.txt")
        continue
    try:
        head = subprocess.run(["git", "ls-remote", url, "HEAD"], capture_output=True, text=True,
                              timeout=30).stdout.split()[0]
    except (IndexError, subprocess.TimeoutExpired):
        out.append(f"note\tskill source {url}: could not read upstream HEAD")
        continue
    if not head.startswith(ref):
        out.append(f"update\tskill source {url} has moved on: pinned {ref[:7]}, upstream {head[:7]} — "
                   f"review, then bump to @{head} in shared/skill-sources.txt")

# MCP servers: npx packages in shared/mcp/servers.json, "<name>@<version>".
servers = json.load(open(os.path.join(root, "shared", "mcp", "servers.json")))["mcpServers"]
for name, c in servers.items():
    if c.get("command") != "npx":
        continue
    pkg = next((a for a in c.get("args", []) if not a.startswith("-")), "")
    m = re.match(r"^(@?[^@]+)(?:@(.+))?$", pkg)
    base, ver = m.group(1), m.group(2)
    if not ver or ver == "latest":
        out.append(f"drift\tmcp {name}: {pkg} is unpinned — set {base}@<version> in shared/mcp/servers.json")
        continue
    try:
        r = subprocess.run(["curl", "-fsS", "--max-time", "30",
                            f"https://registry.npmjs.org/{base.replace('/', '%2F')}/latest"],
                           capture_output=True, text=True)
        latest = json.loads(r.stdout)["version"]
    except Exception:
        out.append(f"note\tmcp {name}: could not read the latest {base} version")
        continue
    if latest != ver:
        out.append(f"update\tmcp {name}: {base} {latest} is out (pinned {ver}) — review, then bump in shared/mcp/servers.json")

print("\n".join(out))
