#!/bin/bash
# Client logos: recoloured white, alpha kept, normalised to one height.
set -euo pipefail
SRC="assets/Logo (Brand)"
OUT="assets/img/logos"
FF="$HOME/.local/bin/ffmpeg"
mkdir -p "$OUT"

# Two-tone lockups cannot be flattened to one colour without losing their
# shape. Listed here, they are only resized.
keep_colour() {
  case "$1" in
    "The Storys - Golf Coast.png") return 0 ;;
    *) return 1 ;;
  esac
}

slug() {
  echo "$1" | sed -E 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

for f in "$SRC"/*.png; do
  name=$(basename "$f")
  case "$name" in
    "The Storys - Golf Coast.png") out="$OUT/the-storeys-golf-coast.png" ;;
    "Storythone.png")              out="$OUT/storython-studios.png" ;;
    "The Parapgraph.png")          out="$OUT/the-paragraph.png" ;;
    "UB Herritage.png")            out="$OUT/ub-heritage.png" ;;
    *)                             out="$OUT/$(slug "$name").png" ;;
  esac
  if keep_colour "$name"; then
    vf="format=rgba,scale=-1:160:flags=lanczos"
  else
    vf="format=rgba,lutrgb=r=255:g=255:b=255,scale=-1:160:flags=lanczos"
  fi
  "$FF" -v error -y -i "$f" -vf "$vf" "$out"
  printf "%-34s %s\n" "$(basename "$out")" "$(keep_colour "$name" && echo "resized only" || echo "white")"
done
