#!/bin/bash
# Web-ready full films for the Work page. The loops are silent background
# texture; these are the versions someone sits and watches, with sound.
#
# 720p keeps each film under jsDelivr's 20MB per-file ceiling, so they can be
# served from the CDN rather than eating GitHub Pages bandwidth.

set -euo pipefail

SRC="assets/video"
OUT="${1:-assets/video/films}"
FF="$HOME/.local/bin/ffmpeg"
FP="$HOME/.local/bin/ffprobe"

mkdir -p "$OUT"

slug() {
  echo "$1" | sed -E 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/\([^)]*\)//g; s/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

# Some projects are watched as a different cut from the one the loop and
# frames come from. This maps such a source onto the project it belongs to.
film_slug_for() {
  case "$1" in
    "Office to Home (with text).mp4") echo "office-to-home-ub-heritage" ;;
    "Office to Home - UB Heritage.mp4") echo "" ;;   # superseded by the cut above
    *) slug "$1" ;;
  esac
}

for src in "$SRC"/*.mp4; do
  [ -e "$src" ] || continue
  name=$(basename "$src")
  base=$(film_slug_for "$name")
  if [ -z "$base" ]; then
    echo "skip (superseded by another cut): $name"
    continue
  fi
  out="$OUT/$base.mp4"

  # 720 on the SHORT edge. Scaling by height alone leaves a vertical film
  # only ~400px wide, which is soft once it is playing tall on screen.
  "$FF" -v error -y -i "$src" -vf "scale='if(gt(a,1),-2,720)':'if(gt(a,1),720,-2)'" \
    -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart "$out"

  # Poster from a little way in, past any fade up from black.
  "$FF" -v error -y -ss 3 -i "$out" -frames:v 1 -q:v 4 "${out%.mp4}.jpg"

  printf "%-40s %6sKB  %5.1fs\n" "$(basename "$out")" \
    "$(( $(stat -f%z "$out") / 1024 ))" \
    "$("$FP" -v error -show_entries format=duration -of csv=p=0 "$out")"
done

echo
printf "total: %s\n" "$(du -sh "$OUT" | cut -f1)"
