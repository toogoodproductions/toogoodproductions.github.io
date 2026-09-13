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
| `assets/video/` | Source films (ignored by git) plus generated output (committed). `products/` holds the product demo film, its loop and its card. |
| `assets/img/` | Logos, team photos, favicon files. |
| `assets/Logo (Brand)/` | Original client logo files as supplied. |
| `assets/Favicon/` | Original favicon art as supplied. |
| `tools/` | Scripts that generate everything from the source films. |

The **root domain still shows the old site**. Nothing in this work has touched
it. Promoting `test3/` to the root is an open decision.

---

## Pages

17 pages, all in `test3/`.

| Page | Notes |
| --- | --- |
| `index.html` | The scroll reel. Seven full-screen panels plus an outro that loops back to the hero. |
| `work.html` | Client logo marquee, then a grid/list of nine projects. |
| `offerings.html` | Four services as click-to-open rows, then the FAQ. |
| `product.html` | Product index. One card per product, same pattern as Work. |
| `product-*.html` | A page per product. One so far, Founder Branding Autopilot, with its own FAQ. **Copy is a stand-in again after the model changed.** |
| `about.html` | Positioning, statement line, two founders, contact banner. |
| `blog.html` | Layout ready. **No posts.** |
| `contact.html` | Email, WhatsApp, socials, form. |
| `project-*.html` | Nine project pages, one per film. |

**`product.html` stays the URL** even though it is an index of several products
now. It is linked from the header, the overlay menu and every footer; renaming it
would mean touching all seventeen pages to save one letter.

**Menu:** Home, Work, Offerings, Product, About, Blog. Present in both the header
bar and the overlay menu on every page. The header bar only shows above 900px
wide; below that it becomes the Menu button and Home lives inside the overlay.

There is no standalone FAQ page. The service FAQ lives on `offerings.html#faq`,
twelve questions in four groups. The product page carries its own nine, about
that product only. **Different questions on purpose** — two pages answering the
same question compete with each other for it.

**The Offerings FAQ is generated.** Both the rows people read and the structured
data engines read come from `FAQ` in `tools/seo.py`. Edit there, never in the
HTML. The product FAQ is written into its page, and its questions are mirrored
in `PRODUCTS[...]["faq"]` for the schema — change one and change the other.

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
python3 tools/seo.py                          # meta, schema, FAQ rows, sitemap, llms.txt
```

`seo.py` is the one that runs after **any** copy change. The others only run
when a film or a logo changes.

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
python3 tools/seo.py
python3 tools/stamp-assets.py test3 "$(date -u +%y%m%d%H%M)"
```

The first rewrites titles, descriptions and structured data. The second
version-stamps every CSS and JS link. **Do not skip it.** Without it,
visitors get new HTML with ten-minute-old cached scripts after a deploy. That bug
cost hours: a page shipped with a stale script looking for markup that had been
removed, so nothing responded and nothing errored.

### Adding the next product

1. A line in `PRODUCTS` in `tools/seo.py`.
2. A card in `product.html`, copied from the one that is there.
3. `product-<slug>.html`, copied from `product-founders-digital-avatar.html`.
4. `python3 tools/seo.py` writes its title, description and schema.

### The product demo film

Not part of the nine-project pipeline, so it is built directly. From a vertical
master in `assets/video/`:

```bash
FF=~/.local/bin/ffmpeg
$FF -y -i "assets/video/Founder Video 1 - Aaditya.mp4" -vf scale=720:1280:flags=lanczos \
  -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -c:a aac -b:a 128k \
  -movflags +faststart assets/video/products/founder-avatar.mp4
$FF -y -ss 1 -t 8 -i "assets/video/Founder Video 1 - Aaditya.mp4" -an -vf scale=608:1080:flags=lanczos \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
  -movflags +faststart assets/video/products/founder-avatar-loop.mp4
$FF -y -ss 2 -i assets/video/products/founder-avatar.mp4 -frames:v 1 -q:v 3 \
  assets/video/products/founder-avatar.jpg
```

The film carries sound and plays in the hero. The silent loop is what the chat
bubble and the output card run, so neither pulls the full film down.

---

## What search and answer engines read

`tools/seo.py` is the single source of truth. Run it from the repo root and it
writes, into every page in `test3/`, between `<!-- seo:start -->` and
`<!-- seo:end -->` in the head: title, meta description, canonical, robots,
Open Graph, Twitter card and one JSON-LD `@graph`. It also writes the visible
FAQ rows on `offerings.html`, and `sitemap.xml`, `llms.txt` and `robots.txt` at
the repo root. **Nothing inside those markers should be edited by hand** — the
next run overwrites it.

The schema carried on each page: Organization plus ProfessionalService (address,
phone, email, founders, service catalogue, topics), WebSite, a typed page node,
breadcrumbs, and then per page — nine VideoObjects with real durations on the
project pages, an ItemList on Work and the reel, four Service nodes and a
FAQPage on Offerings, two Person nodes on About.

Two constants at the top decide every absolute URL:

```python
ROOT = "https://toogoodproductions.github.io"   # the host
BASE = ROOT + "/test3"                          # the site within it
```

Promoting `test3/` to the root means `BASE = ROOT`. Moving to toogoodai.in means
changing `ROOT` — **and that domain has to resolve first.** A canonical pointing
at a dead domain is worse than no canonical.

`robots.txt` still blocks everyone, because the site is staging on a test URL.
Going live is one command:

```bash
python3 tools/seo.py --live
```

That opens the site to search engines and names the AI crawlers explicitly —
GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot and the rest — so
the work can be quoted rather than skipped. `llms.txt` is the plain-language
brief those engines read: who we are, the four services, all nine films, the
clients, the founders and the full FAQ. `product.html` carries `noindex` and
stays out of the sitemap until it has real copy.

**Client names are carried by `alt` text and by structured data, not by hidden
text.** Every logo in the Work marquee has the brand name as its `alt`, which is
what crawlers and screen readers read, and the Work page's `ItemList` names the
client behind every film. Text hidden behind or under an image adds nothing on
top of that and is the definition of cloaking, which is a penalty rather than a
ranking.

Nothing in there is invented. Where a fact is not known it is left out, because
a wrong claim in structured data is worse than a missing one. That is why there
is no `sameAs` yet: the footer social links are still `#`.

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
| `work-film.js` | Work card loops, and any film outside the grid that opts in with `data-loop-film`. |
| `project-film.js` | A hero that holds a film: still until you press play. Project pages, and the product hero via `data-film-hero`. |
| `panels.js` | Offerings and FAQ rows. |

### The product page, and the thread that used to be on it

The page went through four models in a day. The last one is the real one:
**everything is locked in one setup session, then it runs with no founder
involvement at all.** No daily message, no voice note, no approval.

A Telegram thread used to sit in the middle of it, played by the page. It is
gone, along with `chat-play.js` and about 15 KB of CSS, because there is no
daily interaction left to draw. Do not resurrect it without checking the model
first. For the record, and so nobody repeats them:

1. **Tied to the scrollbar**, phone pinned, a message per so many pixels moved.
   It stuttered, because a conversation does not happen in scroll distance.
2. **Genuinely interactive**, with real buttons to tap. It worked and nobody
   tapped them. A phone on a page does not read as a thing you can use.
3. **Played itself** on a timer. Good, and then the product changed underneath
   it.
4. **Scroll locked until it finished.** Considered and rejected: trapping
   someone for twenty seconds to make them watch is worse than them not
   watching, and it breaks on a phone.

Things about the page that still matter:

- **The month grid is the page's one picture.** Thirty day cells, ten filled,
  cascading in on scroll. It is the schedule rather than a wall of invented
  posts, which is the only honest thing to draw while there is one real video
  in existence. When there are ten, it becomes a grid of real thumbnails and
  gets much stronger.
- **Say videos, not films.** Film is the word for the ad and brand work. This
  product makes short-form social video, and blurring the two cheapens the
  first one.
- **The four steps carry the page.** The last one takes the accent, filled,
  because it is the promise rather than a step.
- **The FAQ is written into the page, and mirrored** in `PRODUCTS[...]["faq"]`
  in `tools/seo.py` for the schema. Change one and change the other.
- **One question is deliberately missing.** "Do I approve everything before it
  posts?" used to be answered yes. Under autopilot that is false, and the
  honest replacement has not been supplied. It is the first objection any buyer
  will raise, so the page needs an answer: a pause switch, a weekly summary of
  what went out, or approval for the first month then hands off.

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
- **`hello@toogoodai.in` does not receive mail.** toogoodai.in publishes no
  nameservers, no A record and no MX record, so every address on that domain
  bounces. It is in the footer of every page and on the contact page. Until the
  domain is set up, the site is advertising an address that does not work.
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

Ordered. Everything above the line changes what the work looks like; everything
below it can wait.

### Decide first

1. **The final web address.** toogoodai.in, or promote `test3/` to the repo
   root. Google and the answer engines learn whichever address the site goes
   live on, and moving afterwards gives some of that away. Nothing else here is
   time-sensitive in the same way.
   - toogoodai.in needs a `CNAME` file in the repo plus DNS at the registrar,
     and **it has to resolve before canonicals point at it** — a canonical
     aimed at a dead domain is worse than none.
   - Then change `ROOT` (and `BASE`, if test3 is promoted) at the top of
     `tools/seo.py` and run it.
2. **Go live**, when the address is settled: `python3 tools/seo.py --live`.
   Until then `robots.txt` blocks every crawler, which is correct for a site
   sitting on a test URL.

### Needs the user

3. **Copy for the product page.** The model changed after the supplied copy was
   written, so most of that page is a stand-in again and says so in the file.
4. **The approval answer.** See above. The page cannot ship without it.
5. **A price, or a price signal,** for Founder Branding Autopilot. The page
   asks for the sale twice and says nothing about cost. Not invented here.
6. **Where the setup session happens.** The FAQ promises "one recording session"
   and the rest of the site says everything runs remotely with nothing to travel
   to. Those two need to agree.
7. **Products two and three.** A line in `PRODUCTS` in `tools/seo.py`, a card in
   `product.html`, and a copy of the first product page. About an hour each once
   the copy exists.
8. **A LinkedIn URL.** Instagram, X and YouTube are wired into every footer and
   claimed in `SAME_AS` in `tools/seo.py`. The LinkedIn icon was removed rather
   than left pointing at nothing; it is one line in each footer to put back.
9. **The Formspree form ID** on `contact.html`. The form refuses to send while
   `YOUR_FORM_ID` is there. Email and WhatsApp work.
10. **Blog posts.** Page and layout ready, nothing written. This is the biggest
   single lever for being quoted by ChatGPT and Perplexity: they quote pages
   that answer a question properly. One post per film would do it.
11. **Clean Viraasat master.** Burned-in timecode and watermark, and it is the
   first thing anyone sees on the homepage.
12. **A street address**, and a Google Business Profile. The schema claims
    Ahmedabad, Gujarat and nothing finer, which is as far as the known facts go.

### Open work

- **Frames under each project** are auto-picked; some are the wrong moments and
  should be chosen by hand.
- **Sanatan Seal** is in the logo folder and in the Work marquee but has no
  project. Unresolved.
- **A second favicon**, the Face mark, sits unused in `assets/Favicon/`.

### Done, so nobody redoes it

- **The FAQ** is twelve questions in four groups on `offerings.html#faq`,
  generated from `tools/seo.py` so the visible rows and the structured data
  cannot drift.
- **Search, answer and AI engines** get titles, descriptions, canonicals, Open
  Graph, Twitter cards and a full JSON-LD graph on all seventeen pages, plus
  `sitemap.xml` and `llms.txt`. Before this every page said "Sample brand work
  index".
- **Product** is an index with a page per product, the same pattern as Work.
- **The played Telegram thread** on the product page, with the founder's voice
  note and the bot reading the angle back.
- **Money At Work** in the Work marquee; the lorem placeholder names removed.
- **The white test badge** is gone from every page.
- **About** carries the positioning as its headline and the origin story as its
  statement line.

---

## Working style that suited this user

Move fast, verify on the live site rather than locally, and say plainly when
something could not be checked. Do not re-ask questions already answered. When a
change looks wrong, check the cache before rebuilding anything.
