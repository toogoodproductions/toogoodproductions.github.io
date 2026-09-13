#!/usr/bin/env python3
"""Recolour a Lottie animation into the site's palette.

The animations come off stock sites designed for white pages: blue lines,
white fills, the occasional near-black. On a black page that reads as a
blue blob with holes in it. This walks every colour property and remaps it.

    python3 tools/lottie-tint.py in.json out.json [white|invert]

white   every colour becomes white, and the drawing carries itself on shape
        alone. Right for line art.
invert  luminance is flipped and clamped, so what was dark ink on paper
        becomes light ink on black, and relative weight survives.
onblack near-white is treated as paper and hidden outright; everything
        else becomes white, carrying its old weight as opacity. Right for
        line art.
flat    every shape stays fully opaque and is separated by grey alone,
        with old white falling to black. Right for stacked illustration,
        where varying opacity turns overlaps see-through.
"""
import json, sys


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def grey_gradient(node):
    """Gradient fills keep their colours in a flat array, not a colour
    property, so the ordinary walk goes straight past them and a page that
    should be monochrome keeps a coloured wash in it."""
    g = node.get("g")
    if not isinstance(g, dict):
        return
    k = g.get("k")
    if not isinstance(k, dict) or not isinstance(k.get("k"), list):
        return
    arr = k["k"]
    n = g.get("p", len(arr) // 4)
    # colour stops come first, four numbers each: position, r, g, b
    for i in range(n):
        j = i * 4
        if j + 3 >= len(arr):
            break
        c = arr[j + 1:j + 4]
        if not all(isinstance(x, (int, float)) for x in c):
            continue
        v = (1.0 - lum(c)) ** GAMMA
        v = round(FLOOR + v * (1.0 - FLOOR), 4)
        arr[j + 1] = arr[j + 2] = arr[j + 3] = v


FLOOR = 0.08
GAMMA = 0.72


def flat(node):
    """For flat illustration, where shapes are stacked and opaque.

    onblack varies opacity to carry weight, which is right for line art and
    wrong here: a hand drawn over a chin becomes a see-through hand. This
    leaves every shape fully opaque and separates them by grey instead, with
    the old white paper falling to black so it disappears against the page.
    """
    if not isinstance(node, dict):
        return
    if node.get("ty") in ("gf", "gs"):
        grey_gradient(node)
        return
    if node.get("ty") in ("fl", "st") and isinstance(node.get("c"), dict):
        k = node["c"].get("k")
        if isinstance(k, list) and len(k) >= 3 and all(isinstance(n, (int, float)) for n in k):
            # A straight luminance flip lands the body around 0.6, which on
            # black is dark enough that a ring crossing the head reads as
            # showing through it. The curve lifts the midtones so the figure
            # is solid and anything over it is plainly in front.
            v = (1.0 - lum(k)) ** GAMMA
            v = round(FLOOR + v * (1.0 - FLOOR), 4)
            node["c"]["k"] = [v, v, v] + k[3:]


def onblack(node):
    """Treat the artwork as ink on paper and move it onto black.

    Anything near-white is the paper, not the drawing, so it is hidden
    rather than recoloured: a white plate turned grey is still a plate.
    Everything else becomes white, carrying its weight as opacity, so a
    dark line stays heavy and a pale one stays faint.
    """
    if not isinstance(node, dict):
        return
    if node.get("ty") in ("gf", "gs"):
        grey_gradient(node)
        return
    if node.get("ty") in ("fl", "st") and isinstance(node.get("c"), dict):
        k = node["c"].get("k")
        if isinstance(k, list) and len(k) >= 3 and all(isinstance(n, (int, float)) for n in k):
            L = lum(k)
            # Only near-perfect white is the plate. At 0.86 the pale grey
            # that drew the connections between nodes was being hidden too,
            # which left a brain with no synapses in it.
            if L > 0.93:
                node.setdefault("o", {"a": 0, "k": 100})
                node["o"]["k"] = 0          # paper
                return
            node["c"]["k"] = [1.0, 1.0, 1.0] + k[3:]
            o = node.setdefault("o", {"a": 0, "k": 100})
            if not o.get("a"):
                base = o.get("k", 100)
                o["k"] = round(base * (0.42 + (1.0 - L) * 0.58), 1)


def remap(c, how):
    r, g, b = c[0], c[1], c[2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if how == "white":
        return [1.0, 1.0, 1.0] + c[3:]
    v = 1.0 - lum                      # ink on paper becomes light on black
    v = 0.30 + v * 0.70                # nothing is allowed to vanish
    return [round(v, 4)] * 3 + c[3:]


def walk(o, how):
    if isinstance(o, dict):
        if how == "onblack":
            onblack(o)
        elif how == "flat":
            flat(o)
        for k, v in o.items():
            if how != "onblack" and k == "c" and isinstance(v, dict) and isinstance(v.get("k"), list) \
               and len(v["k"]) in (3, 4) and all(isinstance(n, (int, float)) for n in v["k"]):
                v["k"] = remap(v["k"], how)
            else:
                walk(v, how)
    elif isinstance(o, list):
        for v in o:
            walk(v, how)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    how = sys.argv[3] if len(sys.argv) > 3 else "white"
    d = json.load(open(src))
    walk(d, how)
    json.dump(d, open(dst, "w"), separators=(",", ":"))
    print("%s -> %s (%s)" % (src.split("/")[-1], dst.split("/")[-1], how))


if __name__ == "__main__":
    main()
