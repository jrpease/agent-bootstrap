"""Resolve an MCP server's `headers_lastpass` from the LastPass vault.

servers.json maps a header name to a LastPass item whose password field holds the
value: {"x-api-key": "studio-gen/personal-21stdev"}. Both registration paths
(lib/60-mcp.sh for Claude, tools/codex-config-merge.py for Codex) call this, so a
secret never lives in the repo — only in each agent's local config, written at
setup time.
"""
import os
import subprocess


def resolve_headers(cfg):
    """Return (headers, None) or (None, reason). An entry with no
    `headers_lastpass` resolves to ({}, None)."""
    items = cfg.get("headers_lastpass") or {}
    if not items:
        return {}, None
    # Never prompt: a locked vault skips the server rather than popping a
    # password dialog in the middle of setup.
    env = dict(os.environ, LPASS_DISABLE_PINENTRY="1")
    try:
        status = subprocess.run(["lpass", "status", "--quiet"], env=env,
                                stdin=subprocess.DEVNULL, capture_output=True, timeout=15)
    except FileNotFoundError:
        return None, "lastpass-cli not installed (run ./setup.sh deps)"
    except subprocess.TimeoutExpired:
        return None, "`lpass status` timed out"
    if status.returncode != 0:
        return None, "LastPass is locked — run `lpass login --trust <email>` in a terminal, then re-run"
    headers = {}
    for header, item in items.items():
        try:
            out = subprocess.run(["lpass", "show", "--password", item], env=env,
                                 stdin=subprocess.DEVNULL, capture_output=True, text=True,
                                 timeout=30)
        except subprocess.TimeoutExpired:
            return None, f"lpass timed out reading '{item}'"
        value = out.stdout.strip()
        if out.returncode != 0 or not value:
            # Logged in by now, so this is a missing item, an ambiguous name, or a
            # sync error — lpass's own message says which.
            detail = (out.stderr.strip().splitlines() or ["empty password field"])[0]
            return None, f"LastPass item '{item}': {detail}"
        headers[header] = value
    return headers, None
