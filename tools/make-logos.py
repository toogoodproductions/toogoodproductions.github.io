#!/usr/bin/env python3
"""Client logos: trimmed to the mark, recoloured white, one height.

Each supplied file carries a different amount of empty margin, so scaling them
all to the same height left some reading much smaller than others. The bounds
of the actual mark are measured from the alpha channel first, then everything
is trimmed to that before scaling - which is what makes them look consistent.
"""
import subprocess, pathlib, os, sys

FF = os.path.expanduser("~/.local/bin/ffmpeg")
FP = os.path.expanduser("~/.local/bin/ffprobe")
SRC = pathlib.Path("assets/Logo (Brand)")
OUT = pathlib.Path("assets/img/logos")
HEIGHT = 200           # generated height; the page scales it down
ALPHA_MIN = 12         # below this a pixel is margin, not mark

NAMES = {
    "The Storys - Golf Coast.png": "the-storeys-golf-coast",
    "Storythone.png": "storython-studios",
    "The Parapgraph.png": "the-paragraph",
    "UB Herritage.png": "ub-heritage",
    "Adani Realty.png": "adani-realty",
    "Mera Broadband.png": "mera-broadband",
    "Petpooja.png": "petpooja",
    "Sanatan Seal.png": "sanatan-seal",
    "Money at work.png": "money-at-work",
    "Nephurocare.png": "nephurocare",
}
# Two-tone lockups lose their shape if flattened to one colour.
KEEP_COLOUR = {"The Storys - Golf Coast.png"}

OUT.mkdir(parents=True, exist_ok=True)

def size(p):
    out = subprocess.run([FP, "-v", "error", "-select_streams", "v:0",
                          "-show_entries", "stream=width,height", "-of", "csv=p=0", str(p)],
                         capture_output=True, text=True).stdout.strip()
    w, h = out.split(",")[:2]
    return int(w), int(h)

def bounds(p, w, h):
    """Bounding box of everything that is not transparent margin."""
    raw = subprocess.run([FF, "-v", "error", "-i", str(p), "-vf", "alphaextract",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    if len(raw) < w * h:
        return 0, 0, w, h
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        row = raw[y * w:(y + 1) * w]
        if max(row) < ALPHA_MIN:
            continue
        first = next(i for i, v in enumerate(row) if v >= ALPHA_MIN)
        last = w - 1 - next(i for i, v in enumerate(reversed(row)) if v >= ALPHA_MIN)
        x0, x1 = min(x0, first), max(x1, last)
        y0, y1 = min(y0, y), max(y1, y)
    if x1 < 0:
        return 0, 0, w, h
    return x0, y0, x1 - x0 + 1, y1 - y0 + 1

for f in sorted(SRC.glob("*.png")):
    slug = NAMES.get(f.name)
    if not slug:
        continue
    w, h = size(f)
    cx, cy, cw, ch = bounds(f, w, h)
    colour = "" if f.name in KEEP_COLOUR else "lutrgb=r=255:g=255:b=255,"
    vf = f"format=rgba,crop={cw}:{ch}:{cx}:{cy},{colour}scale=-1:{HEIGHT}:flags=lanczos"
    subprocess.run([FF, "-v", "error", "-y", "-i", str(f), "-vf", vf, str(OUT / f"{slug}.png")], check=True)
    nw, nh = size(OUT / f"{slug}.png")
    trimmed = 100 - round(cw * ch * 100 / (w * h))
    print(f"{slug:<26} {w}x{h} -> {nw}x{nh}   {trimmed}% was margin")
