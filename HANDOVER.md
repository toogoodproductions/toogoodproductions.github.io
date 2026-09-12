# toogood website — handover

Everything needed to pick this up cold. Written 12 September 2026.

---

## What this is

The toogood site: a dark, film-led agency site built as static HTML, CSS and
vanilla JavaScript. No build step, no framework, no package manager. Edit a file,
commit, push — GitHub Pages serves it.

- **Live:** https://toogoodproductions.github.io/test3/
- **Repo:** https://github.com/toogoodproductions/toogoodproductions.github.io
- **Local machine path:** `/Users/toogood/Downloads/Claude - toogood/Website`
- **Status page (Notion):** https://app.notion.com/p/3d98466c8f13817eb74afda41046841d

### Folders at the repo root

| Folder | What it is |
| --- | --- |
| `test3/` | **The site.** All current work lives here. |
| `test/`, `test2/` | Old variants, untouched, effectively dead. |
| `assets/video/` | Source films (ignored by git) plus generated output (committed). |
| `assets/img/` | Logos, team photos, favicon files. |
| `assets/Logo (Brand)/` | Original client logo files as supplied. |
| `assets/Favicon/` | Original favicon art as supplied. |
| `tools/` | Scripts that generate everything from the source films. |

The **root domain still shows the old site**. Nothing in this work has touched
it. Promoting `test3/` to the root is an open decision.

---

## Pages

16 pages, all in `test3/`.

| Page | Notes |
| --- | --- |
| `index.html` | The scroll reel. Seven full-screen panels plus an outro that loops back to the hero. |
| `work.html` | Client logo marquee, then a grid/list of nine projects. |
| `offerings.html` | Four services as click-to-open rows, then the FAQ. |
| `product.html` | Same row pattern. **Three placeholder slots — needs real copy.** |
| `about.html` | Positioning, statement line, two founders, contact banner. |
| `blog.html` | Layout ready. **No posts.** |
| `contact.html` | Email, WhatsApp, socials, form. |
| `project-*.html` | Nine project pages, one per film. |

**Menu:** Home, Work, Offerings, Product, About, Blog. Present in both the header
bar and the overlay menu on every page. The header bar only shows above 900px
wide; below that it becomes the Menu button and Home lives inside the overlay.

There is no standalone FAQ page. The FAQ lives on `offerings.html#faq`, with the
structured data that search and answer engines read. Keep it in one place —
duplicating it makes the two copies compete.

---

## The video pipeline

**Source films never enter the repository.** `.gitignore` excludes everything
directly inside `assets/video/`, whatever the extension, so a master dropped in
as `.mp4`, `.mov` or anything else stays local. Only generated output is
committed.

### Adding a new project

1. Drop the master into `assets/video/`. The filename becomes the URL slug, so
   name it properly: `Client Name - Project.mp4`.
2. Run the three tools (below).
3. Copy an existing `project-*.html`, swap the slug, client, title and copy.
4. Add a card to `work.html` and, if it belongs there, a panel to `index.html`.

### The tools

Run from the repo root.

```bash
./tools/make-loops.sh 1 assets/video/loops    # silent 10s loops + posters
./tools/make-films.sh                         # watchable films with sound
./tools/make-stills.sh                        # six frames per project
python3 tools/make-logos.py                   # client logos, white, trimmed
```

**`make-loops.sh`** builds the silent background loops. Equal-length cuts, each
sitting wholly inside one continuous shot, so no cut breaks a natural edit or
straddles a dip to black. Per-film settings live in `case` blocks near the top:
scene-detection threshold, head/tail trim, cut length and count, vertical crop
position, and whether a portrait film may be zoom-cropped.

**`make-films.sh`** builds the version people sit and watch, 720p with sound,
sized by the **short** edge so portrait films are 720x1280 rather than 400px
wide. It also maps an alternate cut onto an existing project — Office to Home
plays its "with text" version while its loop and frames come from the original.

**`make-stills.sh`** pulls six frames from the middle of held shots, skipping
dark holds, so they are composed frames rather than motion blur between cuts.

**`make-logos.py`** measures each logo's real bounds from its alpha channel,
trims the margin, recolours to white and normalises to one height. The Storeys
Golf Coast is a two-tone lockup and is resized only — flattening it to white
destroys it.

### After any change to `test3/`

```bash
python3 tools/stamp-assets.py test3 "$(date -u +%y%m%d%H%M)"
```

This version-stamps every CSS and JS link. **Do not skip it.** Without it,
visitors get new HTML with ten-minute-old cached scripts after a deploy. That bug
cost hours: a page shipped with a stale script looking for markup that had been
removed, so nothing responded and nothing errored.

---

## The nine projects

| Slug | Client | Title |
| --- | --- | --- |
| `jewellery-ad-concept` | toogood Originals | Viraasat |
| `the-scream-petpooja` | Petpooja | The Scream |
| `apna-ghar-adani-realty` | Adani Realty | Apna Ghar |
| `the-paragraph-reel-3` | The Paragraph | Own Your Pause |
| `betu-ai-animated-film-scene-toogood` | Storython Studios | Betu |
| `office-to-home-ub-heritage` | UB Heritage | Adding More Storeys |
| `building-making-ub-heritage` | UB Heritage | UBH Construction Time-lapse |
| `mera-broadband` | Mera Broadband | Fast Internet Matters |
| `real-estate-ad-concept` | toogood Originals | Unhurried Homes |

**Reel order on the homepage:** Viraasat, Betu, The Scream, Fast Internet
Matters, Adding More Storeys, Apna Ghar, Unhurried Homes. Own Your Pause and UBH
Construction Time-lapse appear on Work only.

Slugs are load-bearing. They connect the loop, poster, film, frames folder,
project page, Work card and reel panel. Renaming one means renaming all of them,
so prefer keeping a slug and changing only the displayed title.

---

## How the JavaScript is organised

All in `test3/assets/js/`. Plain IIFEs, no modules, no dependencies beyond GSAP
and Lenis which were already there.

| File | Does |
| --- | --- |
| `main.js` | Pre-existing. Reveal animations, menu, smooth scroll. |
| `home.js` | Pre-existing. The reel: panel transitions, snapping, infinite loop. |
| `work.js` | Pre-existing. Grid/list toggle, cursor-riding list preview. |
| `panel-video.js` | Home reel background film. |
| `work-film.js` | Work card loops. |
| `project-film.js` | Project hero: still until you press play. |
| `panels.js` | Offerings, Product and FAQ rows. |

### Conventions worth keeping

- **Only one clip decodes at a time** on the reel — the panel holding the
  viewport centre. Not "is it visible": the panels overlap, so several always are.
- **Clips pause in place, never rewind.** Scrolling back resumes where you were.
- **Everything opens on click, not hover**, so desktop, tablet and phone behave
  identically.
- **Mute as a property, not just an attribute.** iOS checks the property before
  allowing autoplay.
- **Retry playback on the first user gesture.** Low Power Mode and Safari's
  per-site autoplay setting both refuse programmatic playback until then.

---

## Gotchas that have already bitten

- **The ten-minute page cache.** Force a reload before concluding a change did
  not land. This wasted more time than any actual bug.
- **Never put decorative content inside an element that animates open.** It must
  hide its overflow for the height animation, which will slice that content in
  half.
- **This site sets a non-default root font size.** A `rem`-based `clamp()`
  collapses to its minimum. Use pixels for type that must hit a specific size.
- **`.work-card .media-inner` is a span** and needs `display: block`, or it
  collapses to nothing and every card renders as a black box. This was broken
  site-wide before any of this work.
- **Prerendering every link loads and runs those pages**, quietly starting up
  video in the background. The rule is a conservative prefetch now; do not put it
  back.
- **Browsers request an icon from the domain root** whatever a page declares,
  which is why `favicon.ico` sits at the root as well as per-page links.
- **A `set -e` shell script dies silently** when `read` hits end of input or
  `grep` finds nothing. Both have happened here; both need `|| true`.

---

## Free hosting, and why nothing else is needed

Films are served from the repo by GitHub Pages. The heaviest page, Work with nine
films, loads in about 233 KB because no video is fetched until you scroll to it.

If traffic ever outgrows GitHub's free allowance, every film is already under
jsDelivr's per-file limit, so it is a one-line path change to a free CDN mirroring
the same repository. No YouTube, no Vimeo, no account, no cost.

---

## Still to do

### Needs the user

1. **Product copy.** Page built, three placeholder slots.
2. **Blog posts.** Page built, nothing written.
3. **Project copy review.** Real copy is in, supplied by the user, but worth a read.
4. **Clean Jewellery/Viraasat master.** Burned-in timecode and watermark, and it
   is the hero of the site.
5. **Team photographs** → `assets/img/team/harsh-dhakan.jpg` and
   `kushank-joshi.jpg`. Square, around 600x600. Initials stand in until then.
6. **Sanatan Seal** is in the logo folder but has no project. Currently shown as
   a client in the marquee. Unresolved.
7. **Promote `test3/` to the root**, or not.
8. **toogoodai.in** — needs a `CNAME` file in the repo plus DNS records at the
   registrar.

### Open work

- Frames under each project are auto-picked; some are the wrong moments and
  should be chosen by hand.
- A second favicon, the Face mark, sits unused in `assets/Favicon/`.

---

## Working style that suited this user

Move fast, verify on the live site rather than locally, and say plainly when
something could not be checked. Do not re-ask questions already answered. When a
change looks wrong, check the cache before rebuilding anything.
