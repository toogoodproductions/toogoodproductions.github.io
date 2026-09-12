#!/usr/bin/env python3
"""Stamp a build with its accent: corner badge and favicon.

The favicon is an inline SVG in every page's head, so it does not follow the
CSS token and has to be rewritten per build. A white square would vanish
against a light tab strip, so the white build inverts instead.
"""
import sys, glob, pathlib, re

# White is the accent. A white favicon square would vanish against a light
# tab strip, so the mark inverts instead.
BUILDS = {
    "test3": ("white", "%23000000", "%23ffffff"),
}

d = sys.argv[1]
label, square, glyph = BUILDS[d]
n = 0
for f in glob.glob(f"{d}/*.html"):
    p = pathlib.Path(f)
    s = o = p.read_text()
    s = re.sub(r"(<link rel=\"icon\"[^>]*?)rect width='32' height='32' rx='7' fill='%23[0-9a-fA-F]{6}'",
               lambda m: m.group(1) + f"rect width='32' height='32' rx='7' fill='{square}'", s)
    s = re.sub(r"(<link rel=\"icon\".*?)(d='M11 8h10v4h-6v2h6v10H11v-4h6v-2h-6z' fill=')%23[0-9a-fA-F]{3,6}",
               lambda m: m.group(1) + m.group(2) + glyph, s)
    s = re.sub(r">test(?: 3)? · [a-z ]+<", f">test · {label}<", s)
    if s != o:
        p.write_text(s)
        n += 1
print(f"{d}: {n} pages stamped ({label})")
