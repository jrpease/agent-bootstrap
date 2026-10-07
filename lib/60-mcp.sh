#!/usr/bin/env bash
# desc: Register the local MCP servers in every account
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Registering local MCP servers into every account"
servers_json="$DOTFILES/shared/mcp/servers.json"

# MCP registration is stored per config dir (in each account's .claude.json), and
# it is NOT covered by the phase-20 symlinks. So register into each account dir,
# exactly like the config & skills steps fan out. Auth (OAuth tokens) is also per config dir
# and cannot be scripted — it must be completed once per account (see note below).
while IFS= read -r dir; do
  name_label="${dir##*/}"
  info "account: $name_label"
  # Short account name for per-server scoping below: ".claude-work" -> "work",
  # and the unsuffixed default dir ".claude" -> "default".
  acct="${name_label#.claude}"; acct="${acct#-}"; [[ -z "$acct" ]] && acct="default"
  existing="$(CLAUDE_CONFIG_DIR="$dir" claude mcp list 2>/dev/null || true)"
  while IFS=$'\t' read -r name type rest accounts envargs; do
    [[ -z "$name" ]] && continue
    if [[ "$type" == "missing" ]]; then skip "mcp $name: $rest not installed on this device"; continue; fi
    # A server may list "accounts" in servers.json to limit itself to specific
    # accounts (shopify is only wanted on work). "*" means every account.
    if [[ "$accounts" != "*" && ",$accounts," != *",$acct,"* ]]; then
      skip "mcp $name not scoped to $acct"; continue
    fi
    # `claude mcp list` prints "<name>: <url> ...". Anchor on the name at line start
    # so we don't false-match a substring inside another server's URL (e.g. the
    # claude.ai "Figma" server's mcp.figma.com URL matching our local "figma").
    if grep -qE "^${name}:" <<<"$existing"; then skip "mcp $name present"; continue; fi
    # After the presence check: a locked vault only matters when adding.
    if [[ "$type" == "nosecret" ]]; then warn "mcp $name skipped: $rest"; continue; fi
    if [[ "$type" == "http" ]]; then
      CLAUDE_CONFIG_DIR="$dir" claude mcp add --transport http --scope user "$name" "$rest" && ok "added $name"
    elif [[ "$type" == "json" ]]; then
      # Carries secret headers; add-json keeps the value out of word splitting.
      CLAUDE_CONFIG_DIR="$dir" claude mcp add-json --scope user "$name" "$rest" >/dev/null && ok "added $name"
    else
      # -e is variadic, so it must follow the name or it swallows it.
      # shellcheck disable=SC2086
      CLAUDE_CONFIG_DIR="$dir" claude mcp add --scope user "$name" $envargs -- $rest && ok "added $name"
    fi
  done < <(python3 - "$servers_json" "$DOTFILES/tools" <<'PY'
import json, os, sys
sys.path.insert(0, sys.argv[2])
from mcp_secrets import resolve_headers
d = json.load(open(sys.argv[1]))
for name, c in d.get("mcpServers", {}).items():
    # agents: which agent gets it (default both); accounts: which home within
    # that agent, by name. Resolution is agents-then-accounts. The Codex half of
    # this lives in tools/codex-config-merge.py.
    if "claude" not in c.get("agents", ["claude", "codex"]):
        continue
    accounts = ",".join(c.get("accounts", [])) or "*"
    # requires_app: skip the server on a device without that app bundle.
    app = c.get("requires_app")
    if app and not os.path.exists(app):
        print(f"{name}\tmissing\t{app}\t{accounts}\t")
        continue
    if c.get("type") == "http" and c.get("headers_lastpass"):
        # headers_lastpass: header values read from the vault at setup time.
        headers, why = resolve_headers(c)
        if why:
            print(f"{name}\tnosecret\t{why}\t{accounts}\t")
            continue
        # dict(), not a {...} literal: bash 3.2 mangles braces in a heredoc inside <( ).
        spec = dict(type="http", url=c["url"], headers=headers)
        print(f"{name}\tjson\t{json.dumps(spec)}\t{accounts}\t")
    elif c.get("type") == "http":
        print(f"{name}\thttp\t{c['url']}\t{accounts}")
    else:
        parts = [c.get("command", "")] + c.get("args", [])
        env = " ".join(f"-e {k}={v}" for k, v in c.get("env", {}).items())
        print(f"{name}\tstdio\t" + " ".join(parts) + f"\t{accounts}\t{env}")
PY
)
done < <(claude_account_dirs)

warn "MCP OAuth auth is per account and can't be scripted: run each account (e.g. 'claude-<name>'), then /mcp to authenticate composio and any other OAuth server."
warn "Composio brokers OAuth apps (QuickBooks, Gmail, Drive, Calendar, Twilio, etc.) — complete their auth via the Composio connection flow after setup."
