#!/usr/bin/env python3
"""Version-stamp local CSS and JS links so a deploy is not served stale.

GitHub Pages caches assets for ten minutes. Without a changing URL a visitor
who was on the site during a deploy gets new HTML with old scripts, which is
how a page ends up half-broken in a way that clears itself later.
"""
import sys, re, glob, pathlib, time

d = sys.argv[1]
# Minute-resolution timestamp. A commit hash would be tidier but is not known
# until after the commit that includes this stamp, which is the wrong way round.
v = sys.argv[2] if len(sys.argv) > 2 else time.strftime("%y%m%d%H%M", time.gmtime())

pat = re.compile(r'(?P<attr>(?:src|href)=")(?P<path>(?:\.\./)*assets/(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')
n = 0
for f in glob.glob(f"{d}/*.html"):
    p = pathlib.Path(f)
    s = p.read_text()
    out = pat.sub(lambda m: f'{m.group("attr")}{m.group("path")}?v={v}"', s)
    if out != s:
        p.write_text(out)
        n += 1
print(f"{d}: {n} pages stamped with {v}")
