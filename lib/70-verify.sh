#!/usr/bin/env bash
# desc: Check that everything landed and print a summary
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"

log "Verification summary"

for c in brew node claude codex gh git ffmpeg studio-gen; do
  if have_cmd "$c"; then ok "$c present"; else err "$c MISSING"; fi
done

log "Generative asset keys (studio-gen)"
if ! have_cmd lpass; then
  err "lpass MISSING — studio-gen cannot resolve keys (run ./setup.sh deps)"
elif ! LPASS_DISABLE_PINENTRY=1 lpass status >/dev/null 2>&1; then
  warn "LastPass locked — run 'lpass login --trust <email>' in a terminal"
else
  # Fingerprint = first 12 hex of sha256. Not reversible to a key, and the ONLY
  # way to catch a key pasted into the wrong item or a knowingly-shared key that
  # has outlived its interim status: duplicates resolve silently at run time.
  printf '    %-10s %-14s %-14s %-14s\n' "" gemini fal openai
  # One "<fingerprint> <account>-<provider>" record per present key. Kept as a
  # plain newline-delimited string (not an array) so this stays bash-3.2-safe.
  records=""
  lookup_errored=0
  while IFS= read -r acct; do
    row=$(printf '    %-10s' "$acct")
    for prov in gemini fal openai; do
      # LPASS_DISABLE_PINENTRY=1: without it, a locked vault can open an
      # interactive master-password prompt instead of failing fast. The prompt
      # text goes to /dev/null below, so the phase would hang with nothing on
      # screen explaining why.
      # `lpass show` exits non-zero both for a genuinely-absent item ("Could
      # not find specified account(s).") and for a real error (locked vault,
      # network) — the exit status alone can't tell them apart, so stderr is
      # captured (via 2>&1) and inspected. These must not be conflated: an
      # errored lookup must not render (or count toward the all-clear) the
      # same as a missing one.
      set +e
      out="$(LPASS_DISABLE_PINENTRY=1 lpass show --password "studio-gen/${acct}-${prov}" 2>&1)"
      status=$?
      set -e
      if [[ $status -eq 0 && -n "$out" ]]; then
        cell="$(printf '%s' "$out" | shasum -a 256 | cut -c1-12)"
        records+="$cell ${acct}-${prov}"$'\n'
      elif [[ $status -eq 0 ]]; then
        # Single-byte ASCII placeholder: printf %-14s pads by display width
        # (bytes, for ASCII), and a multi-byte em dash would make missing-key
        # rows go ragged against the 12-hex fingerprint columns either side.
        cell="-"
      elif [[ "$out" == *"Could not find specified account"* ]]; then
        cell="-"
      else
        # Real error (not "not found"): render distinguishably from a missing
        # item, and don't let the all-clear print below without saying so.
        cell="?"
        lookup_errored=1
      fi
      row+=$(printf ' %-14s' "$cell")
    done
    printf '%s\n' "$row"
  done < <(claude_account_dirs | while IFS= read -r d; do
      # An `if`, not `[[ … ]] && printf` — common.sh sets `set -e`, and the && form
      # returns 1 for the bare ~/.claude dir, aborting the whole phase.
      b="$(basename "$d")"
      if [[ "$b" == .claude-* ]]; then printf '%s\n' "${b#.claude-}"; fi
    done)

  dupe_fps="$(printf '%s' "$records" | awk 'NF{print $1}' | sort | uniq -d)"
  if [[ -n "$dupe_fps" ]]; then
    warn "Duplicate key fingerprints — the same underlying key is used in more than one item (could be intentional sharing, or a key pasted into the wrong item):"
    while IFS= read -r fp; do
      # `if`, not a bare `[[ ]] &&`: same set -e hazard as elsewhere in this file.
      if [[ -n "$fp" ]]; then
        items="$(printf '%s' "$records" | awk -v fp="$fp" '$1==fp{print $2}' | tr '\n' ' ')"
        info "  fingerprint $fp shared by: ${items% }"
      fi
    done <<< "$dupe_fps"
  elif [[ "$lookup_errored" -eq 1 ]]; then
    warn "one or more lookups errored (marked '?' above) — duplicate detection is incomplete this run"
  else
    ok "every present key is distinct across accounts"
  fi
fi

# Which config dir does the bare `claude` command resolve to? Read the default
# export that the accounts step writes into ~/.zshrc.local (fall back to ~/.claude).
default_dir="$(sed -n 's/^export CLAUDE_CONFIG_DIR="\(.*\)".*/\1/p' "$HOME/.zshrc.local" 2>/dev/null | head -1)"
default_dir="${default_dir/#\$HOME/$HOME}"
[[ -z "$default_dir" ]] && default_dir="$HOME/.claude"

log "Accounts, skills & agents"
while IFS= read -r dir; do
  nm="$(basename "$dir")"
  if [[ -d "$dir/skills" ]]; then
    cnt="$(find "$dir/skills" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
  else
    cnt=0
  fi
  dangling=""
  if [[ -d "$dir/agents" ]]; then
    acnt="$(find "$dir/agents" -mindepth 1 -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')"
    # The count above can't tell a live link from a dead one: rename or delete a
    # vendored agent and its symlink survives in every account, still counted.
    # `|| true` because find's status must not abort the phase under set -e.
    dangling="$(find "$dir/agents" -maxdepth 1 -name '*.md' -type l ! -exec test -e {} \; -print 2>/dev/null || true)"
  else
    acnt=0
  fi
  marker=""; [[ "$dir" == "$default_dir" ]] && marker="  <- default 'claude'"
  ok "$nm — $cnt skill(s), $acnt agent(s) linked$marker"
  if [[ -n "$dangling" ]]; then
    while IFS= read -r link; do
      if [[ -n "$link" ]]; then
        warn "$nm — dangling agent symlink: $(basename "$link") — run ./setup.sh skills to regenerate"
      fi
    done <<< "$dangling"
  fi
done < <(claude_account_dirs)

log "Agent roster (bodies in shared/agents/, tiers in claude/agents/*.meta.yml)"
if [[ -d "$DOTFILES/claude/agents" ]]; then
  for agent in "$DOTFILES/claude/agents"/*.md; do
    [[ -f "$agent" ]] || continue
    case "$(basename "$agent")" in README.md) continue ;; esac
    fm="$(awk 'NR==1 && /^---$/{inb=1; next} inb && /^---$/{exit} inb' "$agent")"
    a_name="$(printf '%s\n' "$fm" | sed -n 's/^name: *//p' | head -1)"
    a_model="$(printf '%s\n' "$fm" | sed -n 's/^model: *//p' | head -1)"
    # description is emitted single-quoted by tools/compose-agents.py; strip the
    # wrapping quotes for display and un-double any escaped apostrophe.
    a_desc="$(printf '%s\n' "$fm" | sed -n 's/^description: *//p' | head -1 \
      | sed -e "s/^'//" -e "s/'$//" -e "s/''/'/g" | cut -c1-52)"
    if [[ -z "$a_name" || -z "$a_model" ]]; then
      warn "$(basename "$agent"): missing name or model in frontmatter"
    else
      printf '    %-12s -> %-8s %s\n' "$a_name" "$a_model" "$a_desc"
    fi
  done
else
  warn "no claude/agents directory — run ./setup.sh skills"
fi

log "Plugins (default account: $(basename "$default_dir"))"
CLAUDE_CONFIG_DIR="$default_dir" claude plugin list 2>/dev/null || warn "could not list plugins"

log "MCP servers (default account: $(basename "$default_dir"))"
CLAUDE_CONFIG_DIR="$default_dir" claude mcp list 2>/dev/null || warn "could not list mcp servers"

log "Managed aliases (reload shell with: source ~/.zshrc)"
grep -E '^alias claude-' "$HOME/.zshrc.local" 2>/dev/null || true

log "Next steps"
info "1. Reload your shell so aliases + the default account take effect:"
info "     source ~/.zshrc"
info "2. Authenticate MCP servers PER ACCOUNT — auth is not shared between accounts."
info "   For each account, run it then authenticate, e.g.:"
info "     claude-<name>   ->   /mcp   (complete OAuth for composio, figma)"
info "3. Composio SaaS apps (Gmail, Drive, Calendar, QuickBooks, Twilio, ...) are"
info "   authorized through the Composio connection flow, not here."
info "4. Git auth uses gh over HTTPS (no SSH key required). An SSH key is optional."

log "claude doctor"
CLAUDE_CONFIG_DIR="$default_dir" claude doctor 2>/dev/null || true

log "Codex"
codex_homes=(default)
for nm in "${codex_homes[@]}"; do
  if [[ "$nm" == "default" ]]; then home="$HOME/.codex"; else home="$HOME/.codex-$nm"; fi
  if [[ ! -d "$home" ]]; then err "$home missing — run ./setup.sh accounts"; continue; fi

  [[ -f "$home/auth.json" ]] && ok "$nm authenticated" || err "$nm NOT authenticated (CODEX_HOME=$home codex login)"

  # AGENTS.override.md silently wins over AGENTS.md and never merges with it.
  [[ -f "$home/AGENTS.override.md" ]] && \
    err "$home/AGENTS.override.md exists — Codex IGNORES the AGENTS.md we generate"

  if [[ -f "$home/AGENTS.md" ]] && grep -q 'Understand → Build → Verify' "$home/AGENTS.md"; then
    ok "AGENTS.md is the generated instructions"
  else
    err "AGENTS.md missing or stale — run ./setup.sh config"
  fi

  n_roles="$(find "$home/agents" -maxdepth 1 -name '*.toml' 2>/dev/null | wc -l | tr -d ' ')"
  [[ "$n_roles" -gt 0 ]] && ok "$n_roles agent role(s)" || warn "no agent roles in $home/agents"

  while IFS=$'\t' read -r status msg; do
    case "$status" in ok) ok "$msg" ;; warn) warn "$msg" ;; *) err "$msg" ;; esac
  done < <(python3 - "$home/config.toml" <<'PY'
import sys, tomllib, pathlib
p = pathlib.Path(sys.argv[1])
if not p.exists():
    print("err\tconfig.toml missing"); sys.exit()
d = tomllib.load(open(p, "rb"))
prof = d.get("default_permissions")
perms = d.get("permissions", {}).get(prof or "", {})
fs = perms.get("filesystem", {})
denies = len([k for k, v in fs.items() if v == "deny"]) + \
         len([k for k, v in fs.get(":workspace_roots", {}).items() if v == "deny"])
if prof and denies:
    print(f"ok\tpermissions '{prof}' extends {perms.get('extends')}, "
          f"{denies} deny rule(s), approval {d.get('approval_policy')}")
else:
    print("err\tpermission profile not readable — run ./setup.sh config")
if "sandbox_mode" in d:
    print("warn\tsandbox_mode is set alongside default_permissions — they do not "
          "compose, and which wins depends on config layer order")
print(f"ok\t{len(d.get('mcp_servers', {}))} MCP server(s): "
      f"{', '.join(sorted(d.get('mcp_servers', {})))}")
PY
  )
done

# -type l counts what we linked; -type d counts real directories, i.e. exactly
# the ones this repo did not install. They are disjoint — do not subtract.
n_ours="$(find "$HOME/.agents/skills" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')"
n_foreign="$(find "$HOME/.agents/skills" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
ok "~/.agents/skills — $n_ours linked from this repo, $n_foreign from elsewhere"
dangling="$(find "$HOME/.agents/skills" -maxdepth 1 -type l ! -exec test -e {} \; -print 2>/dev/null | wc -l | tr -d ' ')"
[[ "$dangling" == "0" ]] || err "$dangling dangling skill symlink(s) in ~/.agents/skills"
