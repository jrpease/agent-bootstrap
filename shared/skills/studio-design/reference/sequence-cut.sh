#!/usr/bin/env bash
# sequence-cut.sh — cut a film into tiered WebP frame sequences for scroll scrubbing.
#
#   reference/sequence-cut.sh <video> <out-dir> [fps=24] [tiers="768 1440"] [quality=78]
#
# Writes <out-dir>/<tier>/f_000.webp … and <out-dir>/manifest.json:
#   {"tiers":{"768":{"count":N},"1440":{"count":N}}}
# which is what reference/sequence-loader.mjs reads. Every tier has the same count,
# so a frame index means the same moment at every width.
#
# ffmpeg writes PNG and cwebp converts: many ffmpeg builds ship without a WebP
# encoder, and cwebp (brew `webp`, installed by the deps step) is everywhere.
set -euo pipefail

video="${1:?usage: sequence-cut.sh <video> <out-dir> [fps] [tiers] [quality]}"
out="${2:?usage: sequence-cut.sh <video> <out-dir> [fps] [tiers] [quality]}"
fps="${3:-24}"
tiers="${4:-768 1440}"
quality="${5:-78}"

for tool in ffmpeg cwebp; do
  command -v "$tool" >/dev/null || { echo "missing $tool (brew install ${tool/cwebp/webp})" >&2; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
shopt -s nullglob
manifest=""
count=""
# Everything is built in $tmp and only moved into <out-dir> once every tier has
# succeeded, so a failed cut leaves the previous frames and manifest intact.
for w in $tiers; do
  mkdir -p "$tmp/png/$w" "$tmp/out/$w"
  # -2 keeps the aspect ratio with an even height; lanczos holds edge detail.
  ffmpeg -loglevel error -y -i "$video" -vf "fps=$fps,scale=$w:-2:flags=lanczos" \
    -start_number 0 "$tmp/png/$w/f_%03d.png"
  pngs=("$tmp/png/$w"/f_*.png)
  (( ${#pngs[@]} )) || { echo "tier $w: ffmpeg produced no frames" >&2; exit 1; }
  for png in "${pngs[@]}"; do
    cwebp -quiet -q "$quality" -m 6 "$png" -o "$tmp/out/$w/$(basename "${png%.png}").webp"
  done
  n=${#pngs[@]}
  if [[ -n "$count" && "$n" != "$count" ]]; then
    echo "tier $w produced $n frames, expected $count" >&2; exit 1
  fi
  count="$n"
  manifest="${manifest:+$manifest,}\"$w\":{\"count\":$n}"
done
printf '{"tiers":{%s}}\n' "$manifest" > "$tmp/out/manifest.json"

mkdir -p "$out"
# Replace each tier, and drop numeric tier dirs no longer in the list (only ones
# holding f_*.webp, so nothing else in <out-dir> is touched).
for d in "$out"/*/; do
  d="${d%/}"; name="${d##*/}"
  [[ "$name" =~ ^[0-9]+$ ]] || continue
  [[ " $tiers " == *" $name "* ]] && continue
  stale=("$d"/f_*.webp)
  (( ${#stale[@]} )) && rm -rf "$d"
done
for w in $tiers; do
  rm -rf "$out/$w"
  mv "$tmp/out/$w" "$out/$w"
  echo "tier $w: $count frames, $(du -sh "$out/$w" | cut -f1)"
done
mv "$tmp/out/manifest.json" "$out/manifest.json"
echo "wrote $out/manifest.json"
