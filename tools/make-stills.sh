#!/bin/bash
# Frame showcase for the project pages.
#
# Frames are pulled from the middle of distinct shots rather than at fixed
# intervals, so each one is a composed frame the director actually held,
# not a blur caught between two cuts. Dark shots are skipped.

set -euo pipefail

SRC="assets/video"
OUT="${1:-assets/video/stills}"
FF="$HOME/.local/bin/ffmpeg"
FP="$HOME/.local/bin/ffprobe"

WANT=6          # frames per film
MIN_SHOT=1.2    # ignore anything shorter than this
MIN_LUMA=42     # video black sits at 16; below this reads as a dark hold

slug() {
  echo "$1" | sed -E 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/\([^)]*\)//g; s/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

for src in "$SRC"/*.mp4; do
  [ -e "$src" ] || continue
  name=$(basename "$src")
  dir="$OUT/$(slug "$name")"
  mkdir -p "$dir"
  rm -f "$dir"/*.jpg

  DUR=$("$FP" -v error -show_entries format=duration -of csv=p=0 "$src")

  scenes=$("$FF" -v error -i "$src" \
    -vf "select='gt(scene,0.18)',metadata=print:file=-" -an -f null - 2>/dev/null \
    | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 | tr '\n' ' ' || true)

  # Candidate timestamps: midpoint of every shot long enough to be held.
  cands=$(python3 - "$DUR" "$MIN_SHOT" "$scenes" <<'PY'
import sys
dur, min_shot, scenes = sys.argv[1:]
dur, min_shot = float(dur), float(min_shot)
marks = sorted({0.0, *(float(t) for t in scenes.split()), dur})
lo, hi = dur * 0.04, dur * 0.94          # skip titles and end card
out = []
for a, b in zip(marks, marks[1:]):
    a, b = max(a, lo), min(b, hi)
    if b - a >= min_shot:
        out.append((b - a, (a + b) / 2))
out.sort(reverse=True)                   # longest holds first
for _, t in out:
    print(f"{t:.2f}")
PY
)

  n=0
  for t in $cands; do
    [ "$n" -ge "$WANT" ] && break
    y=$("$FF" -v error -ss "$t" -t 0.1 -i "$src" -vf "signalstats,metadata=print:file=-" \
        -an -f null - 2>/dev/null | grep -o 'YAVG=[0-9.]*' | head -1 | cut -d= -f2 \
        | awk '{printf "%d", $1}')
    [ -n "${y:-}" ] && [ "$y" -lt "$MIN_LUMA" ] && continue
    n=$((n + 1))
    "$FF" -v error -y -ss "$t" -i "$src" -frames:v 1 -vf "scale=1280:-2" -q:v 4 \
      "$dir/$(printf '%02d' "$n").jpg"
  done

  printf "%-40s %s frames  %sKB\n" "$(basename "$dir")" "$n" \
    "$(( $(du -sk "$dir" | cut -f1) ))"
done
