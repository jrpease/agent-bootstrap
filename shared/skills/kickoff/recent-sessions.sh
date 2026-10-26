#!/usr/bin/env bash
# List recent Claude Code sessions for a project directory (and its git worktrees):
# date, title, last prompt, and any PRs the session opened.
# Usage: recent-sessions.sh [project-dir] [count]
# Reads the session transcripts Claude Code keeps under $CLAUDE_CONFIG_DIR/projects/.
# Their format is internal and undocumented — treat the output as best-effort.
set -u

dir="${1:-$PWD}"
count="${2:-5}"
root="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects"
slugify() { sed 's/[^A-Za-z0-9]/-/g'; }

dir="$(cd "$dir" 2>/dev/null && pwd -P)"
if [[ -z "$dir" || ! -d "$root" ]]; then
  echo "no session history found (looked in $root)"
  exit 0
fi

# The project itself plus every worktree git knows about — exact slugs only, so
# a sibling like foo-v2 never matches foo.
paths="$( { echo "$dir"; git -C "$dir" worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p'; } | sort -u)"
slugs="$(slugify <<< "$paths")"

files="$(while IFS= read -r s; do
  [[ -d "$root/$s" ]] && ls "$root/$s"/*.jsonl 2>/dev/null
done <<< "$slugs" \
  | grep -v "/${CLAUDE_CODE_SESSION_ID:-none}\.jsonl$" \
  | xargs ls -t 2>/dev/null | head -n "$count")"

if [[ -z "$files" ]]; then
  echo "no earlier sessions for $dir"
  exit 0
fi

while IFS= read -r f; do
  when="$(date -r "$f" '+%Y-%m-%d %H:%M')"
  where="$(basename "$(dirname "$f")")"
  echo "== $when  $where"
  if command -v jq >/dev/null 2>&1; then
    # title: last AI title · you: last prompt typed · resume: wrap-up's "To resume:"
    # line, if any · ended: the session's final reply · pr: each PR it opened
    jq -rs '
      def flat: gsub("\\s+"; " ") | .[0:300];
      [.[] | select(.type == "assistant") | [.message.content[]? | select(.type == "text") | .text] | join(" ")
           | select(. != "")] as $said
      | ([.[] | select(.type == "ai-title") | .aiTitle] | last) as $title
      | ([.[] | select(.type == "last-prompt") | .lastPrompt // empty | select(. != "")] | last) as $you
      # Any reply that mentions "To resume:" counts, so a session that quotes one
      # can show a stray line. Best-effort, like the rest of this.
      | ([$said[] | select(test("To resume:"))] | last) as $resume
      | (if $title then "title:  " + $title else empty end),
        (if $you then "you:    " + ($you | flat) else empty end),
        (if $resume then "resume: " + ($resume | sub("(?s).*To resume:"; "") | sub("(?s)(\n```|\n\n).*"; "") | flat) else empty end),
        (if ($said | length) > 0 then "ended:  " + ($said | last | flat) else empty end),
        ([.[] | select(.type == "pr-link") | .prUrl] | unique[] | "pr:     " + .)
    ' "$f" 2>/dev/null || echo "(transcript could not be parsed)"
  else
    echo "(jq not installed — titles unavailable)"
  fi
done <<< "$files"
