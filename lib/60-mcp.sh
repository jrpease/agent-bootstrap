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
  # Short account name for per-server scoping below: ".claude-sweet" -> "sweet",
  # and the unsuffixed default dir ".claude" -> "default".
  acct="${name_label#.claude}"; acct="${acct#-}"; [[ -z "$acct" ]] && acct="default"
  existing="$(CLAUDE_CONFIG_DIR="$dir" claude mcp list 2>/dev/null || true)"
  while IFS=$'\t' read -r name type rest accounts; do
    [[ -z "$name" ]] && continue
    # A server may list "accounts" in servers.json to limit itself to specific
    # accounts (shopify is only wanted on sweet). "*" means every account.
    if [[ "$accounts" != "*" && ",$accounts," != *",$acct,"* ]]; then
      skip "mcp $name not scoped to $acct"; continue
    fi
    # `claude mcp list` prints "<name>: <url> ...". Anchor on the name at line start
    # so we don't false-match a substring inside another server's URL (e.g. the
    # claude.ai "Figma" server's mcp.figma.com URL matching our local "figma").
    if grep -qE "^${name}:" <<<"$existing"; then skip "mcp $name present"; continue; fi
    if [[ "$type" == "http" ]]; then
      CLAUDE_CONFIG_DIR="$dir" claude mcp add --transport http --scope user "$name" "$rest" && ok "added $name"
    else
      # shellcheck disable=SC2086
      CLAUDE_CONFIG_DIR="$dir" claude mcp add --scope user "$name" -- $rest && ok "added $name"
    fi
  done < <(python3 - "$servers_json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
for name, c in d.get("mcpServers", {}).items():
    # agents: which agent gets it (default both); accounts: which home within
    # that agent, by name. Resolution is agents-then-accounts. The Codex half of
    # this lives in tools/codex-config-merge.py.
    if "claude" not in c.get("agents", ["claude", "codex"]):
        continue
    accounts = ",".join(c.get("accounts", [])) or "*"
    if c.get("type") == "http":
        print(f"{name}\thttp\t{c['url']}\t{accounts}")
    else:
        parts = [c.get("command", "")] + c.get("args", [])
        print(f"{name}\tstdio\t" + " ".join(parts) + f"\t{accounts}")
PY
)
done < <(claude_account_dirs)

warn "MCP OAuth auth is per account and can't be scripted: run each account (e.g. 'claude-<name>'), then /mcp to authenticate composio, figma, etc."
warn "Composio brokers OAuth apps (QuickBooks, Gmail, Drive, Calendar, Twilio, etc.) — complete their auth via the Composio connection flow after setup."
