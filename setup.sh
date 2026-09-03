#!/usr/bin/env bash
# setup.sh — orchestrate the bootstrap steps in lib/.
set -euo pipefail

DOTFILES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DOTFILES
# shellcheck source=lib/common.sh
source "$DOTFILES/lib/common.sh"

# Steps are lib/NN-<name>.sh. The number is run order; the name is what you type.
steps=()
while IFS= read -r f; do steps+=("$f"); done \
  < <(find "$DOTFILES/lib" -maxdepth 1 -name '[0-9][0-9]-*.sh' | sort)

step_order() { basename "$1" | cut -c1-2; }
step_name()  { local b; b="$(basename "$1" .sh)"; printf '%s' "${b#??-}"; }
step_desc()  { sed -n '/^# desc: /{s///;p;q;}' "$1"; }

step_names() { local p; for p in "${steps[@]}"; do printf '%s ' "$(step_name "$p")"; done; }

usage() {
  cat <<EOF
Usage: ./setup.sh [step ...] [options]

  ./setup.sh                      run every step, in order
  ./setup.sh skills               run one step
  ./setup.sh accounts config      run several (always in order, never twice)
  ./setup.sh --from config        run that step and everything after it
  ./setup.sh --list               show the steps and what each one does
  -h, --help                      this message

Steps: $(step_names)
EOF
}

list_steps() {
  printf 'Steps, in the order they run:\n\n'
  local p
  for p in "${steps[@]}"; do
    printf '  %-12s %s\n' "$(step_name "$p")" "$(step_desc "$p")"
  done
  printf '\nRun them all with ./setup.sh, or one with ./setup.sh <step>.\n'
}

# resolve TOKEN — print the matching step path. Accepts the name, or the legacy
# two-digit order number so older docs and muscle memory keep working.
resolve() {
  local token="$1" p
  for p in "${steps[@]}"; do
    if [[ "$(step_name "$p")" == "$token" || "$(step_order "$p")" == "$token" ]]; then
      printf '%s' "$p"; return 0
    fi
  done
  err "no step called '$token'"
  info "steps: $(step_names)" >&2
  return 1
}

run_step() { log "$(step_name "$1") — $(step_desc "$1")"; bash "$1"; }

main() {
  local mode="all"
  local -a tokens=()

  while (( $# )); do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --list)    list_steps; exit 0 ;;
      --from)
        [[ -n "${2:-}" ]] || { err "--from needs a step name (e.g. --from config)"; exit 1; }
        mode="from"; tokens+=("$2"); shift 2 ;;
      --phase|--step|--only)
        [[ -n "${2:-}" ]] || { err "$1 needs a step name (e.g. $1 skills)"; exit 1; }
        mode="only"; tokens+=("$2"); shift 2 ;;
      -*) err "unknown option: $1"; usage; exit 1 ;;
      *)  mode="only"; tokens+=("$1"); shift ;;
    esac
  done

  local -a run=()
  local p t start seen=0

  case "$mode" in
    all) run=("${steps[@]}") ;;
    only)
      # Validate every token first, so a typo fails before anything runs.
      for t in "${tokens[@]}"; do resolve "$t" >/dev/null || exit 1; done
      # Walk the steps in file order and keep the ones asked for — that dedupes
      # repeats and makes argument order irrelevant.
      for p in "${steps[@]}"; do
        for t in "${tokens[@]}"; do
          [[ "$p" == "$(resolve "$t")" ]] && { run+=("$p"); break; }
        done
      done
      ;;
    from)
      (( ${#tokens[@]} == 1 )) || { err "--from takes exactly one step name"; exit 1; }
      start="$(resolve "${tokens[0]}")" || exit 1
      for p in "${steps[@]}"; do
        [[ "$p" == "$start" ]] && seen=1
        (( seen )) && run+=("$p")
      done
      ;;
  esac

  for p in "${run[@]}"; do run_step "$p"; done
  log "Done."
}

main "$@"
