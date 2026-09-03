#!/bin/bash
# Claude Code status line.
# Reads session JSON from stdin and prints: model | dir (branch) | context left | cost · duration

input=$(cat)

# --- Model ---
model=$(echo "$input" | jq -r '.model.display_name // "Claude"')

# --- Directory + git branch ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
dir="${cwd/#$HOME/~}"
[ -z "$dir" ] && dir="~"

# Truncate long paths to ".../parent/base" instead of a full absolute path.
if [ ${#dir} -gt 40 ] && [ -n "$cwd" ]; then
  base=$(basename "$cwd")
  parent=$(basename "$(dirname "$cwd")")
  dir=".../${parent}/${base}"
fi

branch=""
if [ -n "$cwd" ]; then
  branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
fi
[ -n "$branch" ] && branch=" (${branch})"

# --- Context window remaining % ---
# context_window.context_window_size already reflects the correct window for the
# active model (e.g. 1M for Opus 5 vs 200k for others). Fall back to
# exceeds_200k_tokens if the size is missing for some reason.
window_size=$(echo "$input" | jq -r '.context_window.context_window_size // empty')
if [ -z "$window_size" ] || [ "$window_size" = "null" ] || [ "$window_size" = "0" ]; then
  exceeds_200k=$(echo "$input" | jq -r '.exceeds_200k_tokens // .model.exceeds_200k_tokens // empty')
  if [ "$exceeds_200k" = "true" ]; then
    window_size=1000000
  else
    window_size=200000
  fi
fi

remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
if [ -z "$remaining" ] || [ "$remaining" = "null" ]; then
  total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // empty')
  if [ -n "$total_input" ] && [ "$total_input" != "null" ] && [ "$window_size" -gt 0 ] 2>/dev/null; then
    remaining=$(awk -v t="$total_input" -v w="$window_size" 'BEGIN { r = 100 - (t / w * 100); if (r < 0) r = 0; printf "%.0f", r }')
  fi
fi

ctx_segment=""
[ -n "$remaining" ] && ctx_segment="Ctx ${remaining}% left"

# --- Session cost + duration ---
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // empty')
duration_ms=$(echo "$input" | jq -r '.cost.total_duration_ms // empty')

cost_segment=""
if [ -n "$cost" ] && [ "$cost" != "null" ]; then
  cost_segment=$(awk -v c="$cost" 'BEGIN { printf "$%.2f", c }')
fi

dur_segment=""
if [ -n "$duration_ms" ] && [ "$duration_ms" != "null" ]; then
  dur_segment=$(awk -v ms="$duration_ms" 'BEGIN {
    s = int(ms / 1000)
    m = int(s / 60)
    s = s % 60
    if (m > 0) printf "%dm%ds", m, s
    else printf "%ds", s
  }')
fi

cost_dur_segment=""
if [ -n "$cost_segment" ] && [ -n "$dur_segment" ]; then
  cost_dur_segment="${cost_segment} \xc2\xb7 ${dur_segment}"
elif [ -n "$cost_segment" ]; then
  cost_dur_segment="$cost_segment"
elif [ -n "$dur_segment" ]; then
  cost_dur_segment="$dur_segment"
fi

# --- Colors (dim, for a dark/dimmed terminal palette) ---
RESET='\033[0m'
DIM_MAGENTA='\033[2;35m'
DIM_BLUE='\033[2;34m'
DIM_YELLOW='\033[2;33m'
DIM_CYAN='\033[2;36m'
DIM_GREEN='\033[2;32m'
DIM_GRAY='\033[2;90m'

out="${DIM_MAGENTA}${model}${RESET}"
out="${out} ${DIM_GRAY}|${RESET} ${DIM_BLUE}${dir}${RESET}${DIM_YELLOW}${branch}${RESET}"
[ -n "$ctx_segment" ] && out="${out} ${DIM_GRAY}|${RESET} ${DIM_CYAN}${ctx_segment}${RESET}"
[ -n "$cost_dur_segment" ] && out="${out} ${DIM_GRAY}|${RESET} ${DIM_GREEN}${cost_dur_segment}${RESET}"

printf "%b\n" "$out"
