#!/usr/bin/env python3
"""Merge this repo's owned keys into a Codex config.toml, preserving the rest.

~/.codex/config.toml is written by BOTH the ChatGPT desktop app and the CLI, and
the app owns far more of it than we do — marketplaces, plugin toggles, its own
MCP servers (node_repl, computer-use), notify, per-project trust, desktop and
tui blocks. So this is a round-trip edit via tomlkit (the Python equivalent of
the toml_edit Codex itself uses), not a rewrite: formatting, comments, key order
and every table we do not name survive untouched.

Owned keys, and nothing else:
  model, model_reasoning_effort, approval_policy
  default_permissions + [permissions.<profile>]
  [mcp_servers.<id>] for each server declared in shared/mcp/servers.json

Deliberately NOT written: sandbox_mode. Codex's two permission systems do not
compose — within a layer default_permissions wins, across layers the last layer
wins — so writing both makes the winner depend on config layer ordering.

  python3 tools/codex-config-merge.py --config ~/.codex/config.toml \
      --servers shared/mcp/servers.json --profile bootstrap
"""
import argparse
import json
import os
import pathlib
import sys

import tomlkit

PROFILE_DENIES_HOME = ["~/.zshrc.local"]
PROFILE_DENIES_WORKSPACE = ["**/.env", "**/.env.*", "**/secrets/**", "**/*.pem"]


def resolve_through_symlinks(path: pathlib.Path) -> pathlib.Path:
    """Codex resolves symlinks before writing; a naive temp+rename would replace
    the link with a regular file. Follow it to the real target."""
    seen = set()
    while path.is_symlink():
        if path in seen:
            raise RuntimeError(f"symlink cycle at {path}")
        seen.add(path)
        path = (path.parent / os.readlink(path)).resolve()
    return path


def build_permission_profile(name: str):
    perms = tomlkit.table()
    prof = tomlkit.table()
    prof["description"] = "Workspace write, minus secrets"
    prof["extends"] = ":workspace"

    fs = tomlkit.table()
    # Required, or Codex warns at startup: non-macOS sandboxing cannot expand an
    # unbounded ** natively, so the glob scan needs an explicit depth cap.
    fs["glob_scan_max_depth"] = 6
    for pattern in PROFILE_DENIES_HOME:
        fs[pattern] = "deny"
    roots = tomlkit.table()
    for pattern in PROFILE_DENIES_WORKSPACE:
        roots[pattern] = "deny"
    # Repo-relative globs are not valid as top-level keys; they live here.
    fs[":workspace_roots"] = roots
    prof["filesystem"] = fs
    perms[name] = prof
    return perms


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--servers")
    ap.add_argument("--profile", default="bootstrap")
    ap.add_argument("--approval-policy", default="on-request",
                    choices=["untrusted", "on-request", "never"])
    ap.add_argument("--model", default="gpt-5.5")
    ap.add_argument("--reasoning-effort", default="medium")
    ap.add_argument("--home-name", default="default",
                    help="which Codex home this is, for accounts: scoping")
    ap.add_argument("--out", help="write here instead of in place (for testing)")
    args = ap.parse_args()

    src = pathlib.Path(args.config).expanduser()
    doc = tomlkit.parse(src.read_text()) if src.exists() else tomlkit.document()
    before = set(doc.keys())

    doc["model"] = args.model
    doc["model_reasoning_effort"] = args.reasoning_effort
    doc["approval_policy"] = args.approval_policy
    doc["default_permissions"] = args.profile
    doc["permissions"] = build_permission_profile(args.profile)

    added = []
    if args.servers:
        decl = json.loads(pathlib.Path(args.servers).read_text())["mcpServers"]
        servers = doc.get("mcp_servers", tomlkit.table())
        for sid, cfg in decl.items():
            # agents: which agent gets it (default both). accounts: which home,
            # by name, within that agent. Resolution is agents-then-accounts.
            if "codex" not in cfg.get("agents", ["claude", "codex"]):
                continue
            if "accounts" in cfg and args.home_name not in cfg["accounts"]:
                continue
            entry = tomlkit.table()
            for key in ("command", "args", "env", "url", "cwd", "startup_timeout_sec"):
                if cfg.get(key):
                    entry[key] = cfg[key]
            servers[sid] = entry
            added.append(sid)
        doc["mcp_servers"] = servers

    out = pathlib.Path(args.out).expanduser() if args.out else resolve_through_symlinks(src)
    tmp = out.with_suffix(out.suffix + ".new")
    tmp.write_text(tomlkit.dumps(doc))
    os.replace(tmp, out)

    kept = sorted(before - {"model", "model_reasoning_effort", "approval_policy",
                            "default_permissions", "permissions", "mcp_servers"})
    print(f"wrote {out}")
    print(f"  owned:     model, model_reasoning_effort, approval_policy, default_permissions, "
          f"permissions.{args.profile}" + (f", mcp_servers({', '.join(added)})" if added else ""))
    print(f"  preserved: {', '.join(kept) if kept else '(nothing pre-existing)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
