#!/usr/bin/env bash
# desc: Register the local MCP servers in every account
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Registering local MCP servers into every account"
servers_json="$DOTFILES/shared/mcp/servers.json"

# MCP registration is stored per config dir (in each account's .claude.json), and
# it is NOT covered by the phase-20 symlinks. So register into each account dir,
# exactly like the config & skills steps fan out. Auth (OAuth tokens) is also per config dir
# and cannot be scripted — it must be completed once per account (see note below).
# The loops read on fds 3 and 4 so stdin stays the terminal for confirm().
while IFS= read -r -u 4 dir; do
  name_label="${dir##*/}"
  info "account: $name_label"
  # Short account name for per-server scoping below: ".claude-work" -> "work",
  # and the unsuffixed default dir ".claude" -> "default".
  acct="${name_label#.claude}"; acct="${acct#-}"; [[ -z "$acct" ]] && acct="default"
  # tools/mcp-plan.py compares what's registered with servers.json and says what
  # to do; this loop only runs it. Specs can carry secret headers, so they go to
  # add-json as one argument and are never printed.
  managed="" declined="" planned=0
  while IFS=$'\t' read -r -u 3 action name payload; do
    case "$action" in
      ok)      skip "mcp $name present and current" ;;
      skip)    skip "mcp $name: $payload" ;;
      add|replace)
        [[ "$action" == replace ]] && { CLAUDE_CONFIG_DIR="$dir" claude mcp remove --scope user "$name" \
                                         </dev/null >/dev/null 2>&1 || true; }
        if CLAUDE_CONFIG_DIR="$dir" claude mcp add-json --scope user "$name" "$payload" </dev/null >/dev/null; then
          if [[ "$action" == add ]]; then ok "added $name"; else ok "updated $name (it differed from servers.json)"; fi
        elif [[ "$action" == replace ]]; then
          warn "removed $name from $name_label to update it, but could not re-register it; the next run retries"
        else
          warn "could not register $name in $name_label"
        fi ;;
      prune)
        if confirm "remove mcp $name from $name_label? (gone from servers.json)"; then
          if CLAUDE_CONFIG_DIR="$dir" claude mcp remove --scope user "$name" </dev/null >/dev/null; then ok "removed $name"
          else warn "could not remove $name from $name_label"; declined="$declined $name"; fi
        else
          declined="$declined $name"   # still ours: ask again next run
        fi ;;
      managed) managed="$name $payload"; planned=1 ;;
    esac
  done 3< <(python3 "$DOTFILES/tools/mcp-plan.py" "$servers_json" "$dir" "$acct")
  # The managed line comes last, so a planner that died part-way never gets to
  # overwrite the list (that would orphan servers awaiting a prune).
  if (( planned )); then printf '%s\n' $managed $declined > "$dir/.bootstrap-mcp-servers"
  else warn "tools/mcp-plan.py failed for $name_label; its server list was left as it was"; fi
done 4< <(claude_account_dirs)

warn "MCP OAuth auth is per account and can't be scripted: run each account (e.g. 'claude-<name>'), then /mcp to authenticate composio and any other OAuth server."
warn "Composio brokers OAuth apps (QuickBooks, Gmail, Drive, Calendar, Twilio, etc.) — complete their auth via the Composio connection flow after setup."
