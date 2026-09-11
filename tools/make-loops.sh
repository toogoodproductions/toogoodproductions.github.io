#!/bin/bash
# Build 10s silent montage loops from the full-length horizontal films.
#
# Every cut is exactly CUT seconds and sits wholly inside one continuous
# shot, so a loop never breaks across a natural edit and never lands in a
# rapid-montage passage. Shots shorter than the cut length plus margin are
# ignored, which is what keeps fast sequences out.
#
#   ./tools/make-loops.sh [seed] [outdir]
#
# FADE=0.25 ./tools/make-loops.sh   cross-dissolves between cuts

set -euo pipefail

SEED="${1:-1}"
OUT="${2:-assets/video/loops}"
SRC="assets/video"
FF="$HOME/.local/bin/ffmpeg"
FP="$HOME/.local/bin/ffprobe"

CUT="${CUT:-2.0}"       # every cut is exactly this long, see cut_for
CUTS="${CUTS:-5}"       # 5 x 2s = 10s
MARGIN=0.25             # keep this clear of a shot boundary on each side
HEAD=0.15               # fraction skipped at the start, see head_for
FADE="${FADE:-0}"       # cross-dissolve length, 0 for straight cuts
SHIFT="${SHIFT:-0}"     # nudge shot selection to the next candidate along,
                        # for generating a genuinely different set of cuts
THRESH=0.25             # scene-change sensitivity, see thresh_for

mkdir -p "$OUT"

slug() {
  echo "$1" | sed -E 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/\([^)]*\)//g; s/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

# Where the crop sits vertically once a portrait film is blown up to fill the
# panel: 0 hugs the top of frame, 0.5 is centred, 1 hugs the bottom. Only bites
# on portrait sources - a landscape film has no vertical slack to move through.
crop_y_for() {
  case "$1" in
    "Office to Home - UB Heritage.mp4") echo "${CROP_Y:-0.42}" ;;
    *)                                  echo 0.5 ;;
  esac
}

# Films cut at a different rhythm. Office to Home is a slow, held film - at
# 2s a cut it crawls, so it runs rapid instead. Lengths are whole frames at
# 25fps so the cuts land clean.
cut_for() {
  case "$1" in
    "Office to Home - UB Heritage.mp4") echo "${FAST_CUT:-0.48}" ;;
    *)                                  echo "$CUT" ;;
  esac
}
cuts_for() {
  case "$1" in
    "Office to Home - UB Heritage.mp4") echo "${FAST_CUTS:-21}" ;;
    *)                                  echo "$CUTS" ;;
  esac
}

# Films needing a finer scene threshold. The default merges adjacent shots that
# are lit and framed alike - in The Scream that hides the killer inside the
# girl's take, so his shot never gets sampled on its own.
thresh_for() {
  case "$1" in
    "The Scream - Petpooja.mp4") echo 0.12 ;;
    "Office to Home - UB Heritage.mp4") echo "${OFFICE_THRESH:-0.10}" ;;
    *)                           echo "$THRESH" ;;
  esac
}

# Films whose opening stretch is unusable - the fraction skipped at the start.
# Office to Home opens on a night drive that reads as black in a panel.
head_for() {
  case "$1" in
    "Office to Home - UB Heritage.mp4") echo 0.30 ;;
    *)                                  echo "$HEAD" ;;
  esac
}

# Films where the closing stretch is unusable - the fraction trimmed off the end.
tail_for() {
  case "$1" in
    "Apna Ghar - Adani Realty.mp4") echo 0.35 ;;
    *)                              echo 0.15 ;;
  esac
}

for src in "$SRC"/*.mp4; do
  [ -e "$src" ] || continue
  name=$(basename "$src")

  read -r W H DUR < <("$FP" -v error -select_streams v:0 \
    -show_entries stream=width,height:format=duration \
    -of csv=p=0:s=, "$src" | tr ',' ' ' | tr '\n' ' ') || true

  # Verticals are skipped by default - filling a wide panel means keeping only
  # the middle band. Films listed here are centre-composed enough to survive it.
  case "$name" in
    "Office to Home - UB Heritage.mp4") zoom=1 ;;
    *)                                  zoom=0 ;;
  esac
  if [ "$W" -le "$H" ] && [ "$zoom" -eq 0 ]; then
    echo "skip (vertical ${W}x${H}): $name"
    continue
  fi

  out="$OUT/$(slug "$name").mp4"

  scenes=$("$FF" -v error -i "$src" \
    -vf "select='gt(scene,$(thresh_for "$name"))',metadata=print:file=-" -an -f null - 2>/dev/null \
    | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 | tr '\n' ' ' || true)

  # A dip to black reads as an edit but rarely trips the scene detector, so
  # find those separately and treat both edges as boundaries too.
  blacks=$("$FF" -v info -i "$src" \
    -vf "blackdetect=d=0.05:pic_th=0.98:pix_th=0.10" -an -f null - 2>&1 \
    | grep -o 'black_start:[0-9.]* black_end:[0-9.]*' \
    | sed -E 's/black_start:([0-9.]+) black_end:([0-9.]+)/\1,\2/' | tr '\n' ' ' || true)

  filter=$(python3 - "$DUR" "$SEED" "$(cut_for "$name")" "$(cuts_for "$name")" \
                     "$MARGIN" "$(tail_for "$name")" \
                     "$FADE" "$name" "$scenes" "$blacks" "$(head_for "$name")" "$SHIFT" \
                     "$(crop_y_for "$name")" <<'PY'
import sys, random
(dur, seed, cut, cuts, margin, tail, fade, name, scenes, blacks,
 head, shift, cropy) = sys.argv[1:]
cropy = float(cropy)
dur, cut, margin, tail, fade, head = (float(dur), float(cut), float(margin),
                                     float(tail), float(fade), float(head))
cuts, shift = int(cuts), int(shift)
random.seed(f"{name}-{seed}")

dark = [tuple(float(x) for x in b.split(",")) for b in blacks.split()]
marks = sorted({0.0, *(float(t) for t in scenes.split()),
                *(t for iv in dark for t in iv), dur})
lo, hi = dur * head, dur * (1 - tail)

def usable(c):
    """Shots long enough to hold a c-second cut, clear of blackouts."""
    need = c + 2 * margin
    out = []
    for a, b in zip(marks, marks[1:]):
        a, b = max(a, lo), min(b, hi)
        if b - a < need:
            continue
        if any(a < d_end and b > d_start for d_start, d_end in dark):
            continue                # overlaps a blackout - would flash mid-cut
        out.append((a, b))
    return out

# One cut per shot, never two. Two cuts from the same shot land next to each
# other and read as a jump within a scene rather than an edit - that is what
# reads as a jerk. If the film cannot supply enough distinct shots, use fewer
# and longer cuts instead, holding the loop's overall length.
total = cut * cuts
shots, n = [], cuts
while n > 1:
    shots = usable(total / n)
    if len(shots) >= n:
        break
    n -= 1

cut, cuts = total / n, n
if not shots:                       # nothing clean - fall back to the window
    shots, cuts, cut = [(lo, hi)], 1, total

need = cut + 2 * margin

# Spread the picks across the film rather than clustering at one moment.
# len(shots) >= cuts here, so these indices are strictly increasing.
base = [int(i * len(shots) / cuts) for i in range(cuts)]
shift_eff = max(0, min(shift, len(shots) - 1 - base[-1]))

picks = []
for b0 in base:
    lo_i, hi_i = shots[b0 + shift_eff]
    room = (hi_i - lo_i) - need
    picks.append(lo_i + margin + random.uniform(0, max(room, 0)))
picks.sort()

parts, labels = [], []
for i, start in enumerate(picks):
    parts.append(
        f"[0:v]trim=start={start:.3f}:duration={cut:.3f},setpts=PTS-STARTPTS,"
        f"scale=1280:720:force_original_aspect_ratio=increase,"
        f"crop=1280:720:(iw-1280)/2:(ih-720)*{cropy},fps=25,format=yuv420p[v{i}]"
    )
    labels.append(f"[v{i}]")

if fade > 0:
    chain, prev = [], "[v0]"
    for i in range(1, cuts):
        off = i * (cut - fade)
        nxt = "[out]" if i == cuts - 1 else f"[x{i}]"
        chain.append(f"{prev}[v{i}]xfade=transition=fade:duration={fade}:offset={off:.3f}{nxt}")
        prev = nxt
    print(";".join(parts + chain))
else:
    sys.stderr.write(f"{cuts}x{cut:.2f}s\n")
    print(";".join(parts) + ";" + "".join(labels) + f"concat=n={cuts}:v=1:a=0[out]")
PY
)

  "$FF" -v error -y -i "$src" -filter_complex "$filter" -map "[out]" -an \
    -c:v libx264 -crf 26 -preset slow -movflags +faststart "$out"

  # Poster frame so the panel is never blank while the clip loads.
  "$FF" -v error -y -i "$out" -frames:v 1 -q:v 4 "${out%.mp4}.jpg"

  n=$(echo "$scenes" | wc -w | tr -d ' ')
  printf "%-40s %6sKB  %s shots detected\n" "$(basename "$out")" \
    "$(( $(stat -f%z "$out") / 1024 ))" "$n"
done
