#!/usr/bin/env python3
"""Everything search engines and answer engines read, generated from one file.

Run from the repo root after any copy change:

    python3 tools/seo.py             # the site is live; robots.txt lets crawlers in
    python3 tools/seo.py --staging   # put it back behind a Disallow: /

Into every page at the repo root, between the seo markers in <head>:
  title, meta description, canonical, robots, Open Graph, Twitter, JSON-LD.

Into offerings.html, between the faq markers: the visible FAQ rows.
The questions are written once, here, so the rows people read and the
structured data engines read cannot drift apart.

At the repo root: sitemap.xml, llms.txt, robots.txt.

Nothing below is invented. If a fact is not known it is left out, because a
wrong claim in structured data is worse than a missing one.
"""
import html
import json
import pathlib
import re
import sys
import time

# --- where the site lives ------------------------------------------------
# ROOT is the host. BASE is the site within it. The site was promoted out of
# test3/ to the repo root, so the two are now the same. The one line below is
# every absolute URL on the site: canonicals, Open Graph, sitemap, schema.
# It moved to toogoodai.in on 14 September 2026, only after that domain was
# already serving the site over a valid certificate - a canonical pointing at
# an address that is not ready yet is worse than no canonical at all.
ROOT = "https://toogoodai.in"
BASE = ROOT

PAGES_DIR = pathlib.Path(".")
OUT_DIR = pathlib.Path(".")

TODAY = time.strftime("%Y-%m-%d", time.gmtime())

NAME = "toogood"
TAGLINE = "Make it toogood, or don't make it."
EMAIL = "hello@toogoodai.in"
PHONE = "+917574003272"
PHONE_DISPLAY = "+91 75740 03272"
CITY = "Ahmedabad"
REGION = "Gujarat"
COUNTRY = "IN"
ORG_DESC = ("AI video agency in Ahmedabad. Ads, brand films, reels, launch films and "
            "animated films, generated rather than filmed. Also workflow automation, "
            "AI training and custom software.")

# Claiming these ties the profiles to the brand as one entity, so a search for
# "toogood ai" can return the site and the accounts together. LinkedIn is not
# here because no URL has been supplied for it.
SAME_AS = [
    "https://www.instagram.com/toogoodco/",
    "https://x.com/toogoodai",
    "https://www.youtube.com/@toogoodproduction",
]

SERVICES = [
    ("AI video",
     "Ads, brand films, reels, launch films, avatars. Less time and less money than a shoot. "
     "And when you need ten versions of one ad to find the hook that works on Meta, we make all ten.",
     ["Ad Films", "Brand Films", "Reels", "Avatars"]),
    ("Automation",
     "The jobs your team does over and over. Product images, social posts, reports, replies. "
     "We build the system that does them instead, shaped around how your business already runs, "
     "and then it runs on its own.",
     ["Workflow Design", "Content Pipelines", "Internal Tools"]),
    ("Training",
     "Your team has the tools open and no real idea what to do with them. We come in and teach "
     "them on your actual work, not a demo, until they can do it without us.",
     ["Team Training", "Workshops", "Playbooks"]),
    ("Custom software",
     "We learn how your business actually runs, then build software around it. Not another tool "
     "you bend your process to fit. One built for the way you already work.",
     ["Workflow Tools", "Internal Systems", "Prototypes"]),
]

FOUNDERS = [
    ("Harsh Dhakan", "Co-founder, Creative",
     "Runs the creative and the operations. Every frame that leaves here has gone through him."),
    ("Kushank Joshi", "Co-founder, Growth",
     "Runs sales and marketing. If you've heard of us, that was him."),
]

KNOWS_ABOUT = [
    "AI video production", "Generative video", "AI ad films", "Brand films",
    "Social reels", "AI avatars", "AI animated film", "Real estate marketing films",
    "Workflow automation", "AI training for teams", "Custom internal software",
]

# --- the FAQ, written once ----------------------------------------------
FAQ = [
    ("The work", [
        ("What is AI video production?",
         "AI video production means the film is generated rather than filmed. No crew, no "
         "location, no shoot day. The script, direction and edit still happen the way they "
         "always have. Only the footage is made differently, which is what makes it faster "
         "and cheaper than a conventional shoot."),
        ("Will an AI video look artificial?",
         "Not if it's made properly. The tell in most AI video comes from rushing: faces that "
         "shift between shots, hands that go wrong, movement that reads slightly off. Those "
         "are known failure points and they're avoidable. We build around them rather than "
         "hoping nobody notices."),
        ("Can you make several versions of the same ad?",
         "Yes, and it's one of the strongest reasons to use AI. Testing ten hooks for the same "
         "Meta ad is impossible with a shoot and straightforward with a generated one. You get "
         "the variations you need to find what actually performs."),
    ]),
    ("Beyond video", [
        ("What do your automations actually do?",
         "They take the work your team repeats and hand it to a system. Product images at "
         "scale, social posts, reports, first-draft replies. We map how your business already "
         "runs, build the pipeline around it, then hand it over so it keeps running without us."),
        ("What does the AI training cover?",
         "Whatever your team actually does. We work on your real files and your real problems, "
         "not a demo, and we stay until people can do it without asking us. Usually that means "
         "prompting, the image and video tools, and small workflows they can maintain themselves."),
        ("What kind of software do you build?",
         "Internal tools shaped around how you already work. We sit with your team, find where "
         "the time goes, then build something that removes it. Not an off-the-shelf product you "
         "bend your process to fit. Usually a few weeks, and it belongs to you."),
    ]),
    ("Time and money", [
        ("How is this different from a traditional shoot?",
         "You skip everything that costs time and money before the camera rolls. No location "
         "scouting, no casting, no crew, no shoot day, no weather. What you keep is the writing, "
         "the direction and the edit. That's why an AI film lands in days rather than weeks."),
        ("How long does it take?",
         "Days rather than months for video, because there's no shoot to schedule and most of "
         "the timeline is decision-making. Automations and software run a few weeks depending "
         "on scope. Training is usually a few days on site. You get a date before anything starts."),
        ("What does it cost?",
         "Less than the same film as a shoot. Beyond that: length, scenes, frames, and where "
         "it's going, because a reel, an ad and a website film are built differently. Other work "
         "is quoted by scope, always in writing before we start."),
    ]),
    ("Working with us", [
        ("Do you work with clients outside Ahmedabad?",
         "Yes. We're based in Ahmedabad and work with brands across India and outside it. "
         "Because there's no shoot, there's nothing to travel to. The whole process runs "
         "remotely: brief, storyboard, review, delivery."),
        ("Which industries do you work with?",
         "Real estate, healthcare, manufacturing and consumer brands so far. The work translates "
         "anywhere a business needs to show something expensive, difficult or impossible to film, "
         "or anywhere a team is spending hours on work a system could do."),
        ("How do we start?",
         "Tell us what you need and what it has to do. We come back with the approach, the "
         "timeline and the price. Nothing gets built until you've approved the plan, and for "
         "film that means the storyboard."),
    ]),
]

# --- the nine films ------------------------------------------------------
# seconds and pixel size read off the generated films with ffprobe; published
# is the day the film went onto the site. lang only where the voiceover
# language is actually known.
PROJECTS = [
    dict(slug="jewellery-ad-concept", client="toogood Originals", title="Viraasat",
         seconds=88, w=1280, h=720, lang="hi",
         summary="A film about what one generation hands to the next, told through a single "
                 "jewellery set that appears twice, decades apart. Shot in the grain of old "
                 "wedding footage, it moves between an album and the morning it was made.",
         note="Concept film for the jewellery category. Fully AI-generated, Hindi voiceover, a "
              "period wedding recreated without archive footage or a shoot.",
         keywords="AI jewellery ad film, concept film, Hindi voiceover, generated wedding footage"),
    dict(slug="the-scream-petpooja", client="Petpooja", title="The Scream",
         seconds=45, w=1280, h=720,
         summary="A horror film in which a fingerprint scanner is the difference between escape "
                 "and not. A woman runs from a killer through a shattered building, and the first "
                 "scanner fails her, over and over. The second one is Attendo, and it opens on "
                 "the first try.",
         note="Brand film for Attendo, Petpooja's payroll and attendance software. Fully "
              "AI-generated, horror format, no crew and no location.",
         keywords="AI brand film, SaaS film, horror format, payroll software ad"),
    dict(slug="apna-ghar-adani-realty", client="Adani Realty", title="Apna Ghar",
         seconds=70, w=1456, h=720,
         summary="A child draws the house her family will live in, framed the way you would see "
                 "it from your own living room. Her father does the arithmetic, worries, then "
                 "doesn't. The film is about the two words in its title, and what it costs to "
                 "earn them.",
         note="Ad film for Adani Realty, built around their FlexiPay plan. Fully AI-generated, "
              "no cast and no location.",
         keywords="AI real estate ad film, property launch film, AI cast"),
    dict(slug="the-paragraph-reel-3", client="The Paragraph", title="Own Your Pause",
         seconds=65, w=720, h=1280,
         summary="A walk through the amenities at The Paragraph, built as a feeling rather than "
                 "a list. Every shot moves slowly enough that you sit inside it for a moment "
                 "before it passes.",
         note="Amenities film for The Paragraph, a residential development by UB Heritage on the "
              "outskirts of Ahmedabad. Fully AI-generated, no drone and no site access required.",
         keywords="AI amenities film, real estate reel, vertical film, Ahmedabad"),
    dict(slug="betu-ai-animated-film-scene-toogood", client="Storython Studios", title="Betu",
         seconds=75, w=1280, h=720,
         summary="A teaser for an animated film in which a soul, unable to get into the house it "
                 "wants, settles instead for the dog that wanders out on its evening walk. "
                 "Character, voice and lip sync are all generated.",
         note="Animated film teaser for Storython Studios. Character design, animation, voice and "
              "lip sync all AI-generated, at feature-animation quality.",
         keywords="AI animated film, AI character animation, AI lip sync, teaser"),
    dict(slug="office-to-home-ub-heritage", client="UB Heritage", title="Adding More Storeys",
         seconds=64, w=720, h=1280,
         summary="A man drives home from the office, and the drive fills up with everything that "
                 "got him there. The chess games as a boy, the all-nighters, the holidays, the "
                 "watch. A life built to a standard deserves an address that matches.",
         note="Brand film for The Storeys Golf Coast, a residential development in Ahmedabad. "
              "Fully AI-generated, original voiceover, no crew and no shoot.",
         keywords="AI brand film, luxury real estate film, Ahmedabad, original voiceover"),
    dict(slug="building-making-ub-heritage", client="UB Heritage",
         title="UBH Construction Time-lapse", seconds=40, w=720, h=1280,
         summary="A building rises from bare ground to finished home in a single hyperreal "
                 "time-lapse. The camera pulls back to the Narmada canal and the green around "
                 "it, then drops inside to a couple on the balcony.",
         note="Construction time-lapse for The Storeys Golf Coast, Ahmedabad. Fully AI-generated, "
              "including aerial views of the Narmada canal and the golf course, with no site footage.",
         keywords="AI construction time-lapse, AI aerial shot, real estate film, Ahmedabad"),
    dict(slug="mera-broadband", client="Mera Broadband", title="Fast Internet Matters",
         seconds=53, w=1280, h=720, lang="hi",
         summary="There are two kinds of people, the ones who spend their lives buffering and the "
                 "ones who never do. The film cuts through a household where everyone is "
                 "streaming something different and nobody is waiting.",
         note="Ad film for a broadband provider. Fully AI-generated, Hindi voiceover, fast-cut "
              "format built for social and performance placements.",
         keywords="AI performance ad, Hindi ad film, broadband ad, fast-cut social video"),
    dict(slug="real-estate-ad-concept", client="toogood Originals", title="Unhurried Homes",
         seconds=53, w=1280, h=720,
         summary="A house filmed at the speed the house actually moves. A shadow, a hand across a "
                 "bedsheet, a teapot starting to go, and a woman revealed so slowly you stop "
                 "waiting for her.",
         note="Concept film for the residential category. Fully AI-generated, original voiceover, "
              "made without a location, a cast or a camera.",
         keywords="AI residential film, concept film, slow cinema, generated interiors"),
]

# --- the products -------------------------------------------------------
# One entry per product. Adding the next one means a line here, a card in
# product.html and a product-<slug>.html cloned from the first.
PRODUCTS = [
    dict(slug="founder-branding-autopilot",
         name="Founder Branding Autopilot",
         kicker="Founder Content Engine",
         media="founder-avatar-card",
         blurb="Set up with you, then run without you. It posts in your face and your voice.",
         desc="toogood sets up a founder's face, voice, positions and format, and after "
              "that it runs on its own: it watches their industry, decides what is worth "
              "saying, writes the script, generates the voice, edits, cuts the b-roll and "
              "adds the captions, and delivers short-form video ready to post. No daily "
              "involvement from the founder, no editor, no shoot days.",
         category="BusinessApplication",
         features=["Set up with you, then runs with no founder involvement",
                   "Avatar built from your own face and voice",
                   "Watches your industry so nobody has to decide what to post",
                   "Script written against how you see your world and the words you would never use",
                   "Edit, b-roll and captions done automatically",
                   "Short-form video delivered ready to post"],
         faq=[
             ("Does it actually sound like me?",
              "That's what the setup is for. Before anything goes live we work out how you "
              "see your world, the words you'd never use, and where you stop short of the "
              "obvious point. Every script gets written against that."),
             ("Why can't I just do this myself with HeyGen?",
              "You could. HeyGen will make you an avatar this afternoon. What takes the time "
              "is everything after it: knowing what's worth posting about today, writing it so "
              "it sounds like you, cutting it, captioning it, getting it out. That's the part "
              "we built, and it's the part that stops most founders posting."),
             ("Will people be able to tell it's AI?",
              "Some will, most won't. The ones who notice usually ask how you made it, which "
              "is its own conversation. What people are actually judging is whether the "
              "opinion is worth reading, and that part is yours."),
             ("How much of my time does it take?",
              "The setup, and nothing after it. Once it is running you are not involved."),
             ("How long does setup take?",
              "As long as it takes to get you right. We capture your face and voice "
              "properly and work out how you actually think, and we would rather spend "
              "another afternoon on that than ship something that sounds like somebody "
              "else. After that you never sit in front of a camera again."),
             ("What if the post doesn't sound right?",
              "Say so and it gets rewritten. It learns from what you send back, so corrections "
              "get rarer over the first few weeks."),
             ("Who owns the avatar, and what happens if I stop?",
              "Your likeness is yours. Nobody else can use it, and if you stop we delete the "
              "avatar on request. Everything already made stays yours."),
             ("Which platforms does it post to?",
              "LinkedIn and Instagram to start. If you post somewhere else regularly, we add it."),
         ]),
]

CLIENTS = ["Adani Realty", "Petpooja", "UB Heritage", "The Storeys Golf Coast",
           "The Paragraph", "Mera Broadband", "Storython Studios", "Sanatan Seal",
           "Money At Work", "Nephurocare Pharma"]

# --- the pages -----------------------------------------------------------
PAGES = {
    "index.html": dict(
        url=BASE + "/", crumb="Home", kind="WebPage",
        title="toogood · AI video agency in Ahmedabad",
        desc="AI video agency in Ahmedabad. Ads, brand films, reels and animated films, "
             "generated rather than filmed. We make your brand toogood to ignore.",
        image="jewellery-ad-concept"),
    "work.html": dict(
        url=BASE + "/work", crumb="Work", kind="CollectionPage",
        title="Work · AI ad films, brand films and reels · toogood",
        desc="Nine AI-generated films for brands: ads, brand films, reels, launch videos and "
             "an animated film. Made without a crew, a location or a shoot day.",
        image="the-scream-petpooja"),
    "offerings.html": dict(
        url=BASE + "/offerings", crumb="Offerings", kind=["WebPage", "FAQPage"],
        title="Offerings · AI video, automation, training, software · toogood",
        desc="Four things we do: AI video, automation, AI training for your team, and custom "
             "software. Plus answers to what clients ask before they hire us.",
        image="mera-broadband"),
    "product.html": dict(
        url=BASE + "/product", crumb="Product", kind="CollectionPage",
        title="Product · Software we built for ourselves first · toogood",
        desc="Software we built for ourselves first, out of problems we hit doing the work, "
             "then turned into something other people can use.",
        image="betu-ai-animated-film-scene-toogood"),
    "about.html": dict(
        url=BASE + "/about", crumb="About", kind="AboutPage",
        title="About · toogood",
        desc="One of the first fully AI video agencies in Ahmedabad. Everything made with AI. "
             "None of it looks like it.",
        image="real-estate-ad-concept"),
    "blog.html": dict(
        url=BASE + "/blog", crumb="Blog", kind=["CollectionPage", "Blog"],
        title="Blog · toogood",
        desc="Breakdowns of how the films got made, answers to what clients ask before they "
             "hire us, and whatever we have worked out about these tools.",
        image="apna-ghar-adani-realty"),
    "contact.html": dict(
        url=BASE + "/contact", crumb="Get in touch", kind="ContactPage",
        title="Get in touch · toogood",
        desc="Tell us what you are making. Email hello@toogoodai.in or message us on WhatsApp. "
             "An AI studio in Ahmedabad, working with brands across India and outside it.",
        image="office-to-home-ub-heritage"),
}

for pr in PRODUCTS:
    PAGES["product-%s.html" % pr["slug"]] = dict(
        url="%s/product-%s" % (BASE, pr["slug"]),
        crumb=pr["name"], kind=["ItemPage", "FAQPage"], product=pr,
        title="%s · toogood" % pr["name"],
        desc=pr["desc"],
        image="betu-ai-animated-film-scene-toogood")

for p in PROJECTS:
    PAGES["project-%s.html" % p["slug"]] = dict(
        url="%s/project-%s" % (BASE, p["slug"]),
        crumb=p["title"], kind="ItemPage", project=p,
        title="%s · %s · toogood" % (p["title"], p["client"]),
        desc="%s %s" % (p["summary"].split(". ")[0] + ".", p["note"]),
        image=p["slug"])


# --- schema.org ----------------------------------------------------------
def org_id():
    return BASE + "/#organization"


def organisation():
    node = {
        "@type": ["Organization", "ProfessionalService"],
        "@id": org_id(),
        "name": NAME,
        "url": BASE + "/",
        "description": ORG_DESC,
        "slogan": TAGLINE,
        "email": EMAIL,
        "telephone": PHONE,
        "logo": {
            "@type": "ImageObject",
            "@id": BASE + "/#logo",
            "url": BASE + "/assets/img/toogood-dark.png",
            "contentUrl": BASE + "/assets/img/toogood-dark.png",
            "width": 1290, "height": 530, "caption": NAME,
        },
        "image": {"@id": BASE + "/#logo"},
        "address": {
            "@type": "PostalAddress",
            "addressLocality": CITY,
            "addressRegion": REGION,
            "addressCountry": COUNTRY,
        },
        "areaServed": [
            {"@type": "City", "name": CITY},
            {"@type": "AdministrativeArea", "name": REGION},
            {"@type": "Country", "name": "India"},
        ],
        "knowsAbout": KNOWS_ABOUT,
        "knowsLanguage": ["en", "hi"],
        "founder": [{"@id": person_id(n)} for n, _, _ in FOUNDERS],
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "sales",
            "email": EMAIL,
            "telephone": PHONE,
            "areaServed": "IN",
            "availableLanguage": ["English", "Hindi"],
        },
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "What we do",
            "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@id": service_id(s[0])}}
                for s in SERVICES
            ],
        },
    }
    if SAME_AS:
        node["sameAs"] = SAME_AS
    return node


def person_id(name):
    return BASE + "/about#" + name.lower().replace(" ", "-")


def service_id(name):
    return BASE + "/offerings#" + name.lower().replace(" ", "-")


def people():
    out = []
    for name, role, bio in FOUNDERS:
        out.append({
            "@type": "Person",
            "@id": person_id(name),
            "name": name,
            "jobTitle": role,
            "description": bio,
            "worksFor": {"@id": org_id()},
            "url": BASE + "/about",
        })
    return out


def services():
    out = []
    for name, desc, tags in SERVICES:
        out.append({
            "@type": "Service",
            "@id": service_id(name),
            "name": name,
            "serviceType": name,
            "description": desc,
            "provider": {"@id": org_id()},
            "areaServed": [{"@type": "Country", "name": "India"}],
            "category": tags,
            "url": BASE + "/offerings",
        })
    return out


def website():
    return {
        "@type": "WebSite",
        "@id": BASE + "/#website",
        "url": BASE + "/",
        "name": NAME,
        "description": ORG_DESC,
        "publisher": {"@id": org_id()},
        "inLanguage": "en",
    }


def breadcrumb(page_url, crumbs):
    return {
        "@type": "BreadcrumbList",
        "@id": page_url + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(crumbs)
        ],
    }


def iso_duration(seconds):
    m, s = divmod(int(seconds), 60)
    return "PT%dM%dS" % (m, s) if m else "PT%dS" % s


def video_node(p, page_url):
    node = {
        "@type": "VideoObject",
        "@id": page_url + "#film",
        "name": p["title"],
        "description": "%s %s" % (p["summary"], p["note"]),
        "thumbnailUrl": [ROOT + "/assets/video/loops/%s.jpg" % p["slug"]],
        "uploadDate": "2026-09-12",
        "duration": iso_duration(p["seconds"]),
        "contentUrl": ROOT + "/assets/video/films/%s.mp4" % p["slug"],
        "url": page_url,
        "width": p["w"], "height": p["h"],
        "encodingFormat": "video/mp4",
        "creator": {"@id": org_id()},
        "productionCompany": {"@id": org_id()},
        "copyrightHolder": {"@id": org_id()},
        "keywords": p["keywords"],
        "isAccessibleForFree": True,
    }
    if p.get("lang"):
        node["inLanguage"] = p["lang"]
    if p["client"] == "toogood Originals":
        node["about"] = {"@id": org_id()}
    else:
        node["about"] = {"@type": "Organization", "name": p["client"]}
    return node


def product_id(slug):
    return "%s/product-%s#product" % (BASE, slug)


def product_node(pr):
    return {
        "@type": "SoftwareApplication",
        "@id": product_id(pr["slug"]),
        "name": pr["name"],
        "alternateName": pr["kicker"],
        "description": pr["desc"],
        "url": "%s/product-%s" % (BASE, pr["slug"]),
        "applicationCategory": pr["category"],
        "operatingSystem": "Web",
        "featureList": pr["features"],
        "publisher": {"@id": org_id()},
        "author": {"@id": org_id()},
        "provider": {"@id": org_id()},
    }


def product_list():
    return {
        "@type": "ItemList",
        "@id": BASE + "/product#products",
        "name": "Product",
        "numberOfItems": len(PRODUCTS),
        "itemListElement": [
            {
                "@type": "ListItem", "position": i + 1,
                "item": product_node(pr),
            }
            for i, pr in enumerate(PRODUCTS)
        ],
    }


def work_list():
    return {
        "@type": "ItemList",
        "@id": BASE + "/work#films",
        "name": "Work",
        "numberOfItems": len(PROJECTS),
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": [
            {
                "@type": "ListItem", "position": i + 1,
                "item": {
                    "@type": "VideoObject",
                    "@id": "%s/project-%s#film" % (BASE, p["slug"]),
                    "name": p["title"],
                    "url": "%s/project-%s" % (BASE, p["slug"]),
                    "thumbnailUrl": ROOT + "/assets/video/loops/%s.jpg" % p["slug"],
                    # Naming the client here is what ties the logo in the
                    # marquee to a real brand for anything reading the page.
                    "about": ({"@id": org_id()} if p["client"] == "toogood Originals"
                              else {"@type": "Organization", "name": p["client"]}),
                    "creator": {"@id": org_id()},
                },
            }
            for i, p in enumerate(PROJECTS)
        ],
    }


def questions():
    out = []
    for _, rows in FAQ:
        for q, a in rows:
            out.append({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            })
    return out


def graph_for(fname, page):
    url = page["url"]
    crumbs = [("Home", BASE + "/")]
    if fname != "index.html":
        if "project" in page:
            crumbs.append(("Work", BASE + "/work"))
        if "product" in page:
            crumbs.append(("Product", BASE + "/product"))
        crumbs.append((page["crumb"], url))

    webpage = {
        "@type": page["kind"],
        "@id": url + "#webpage",
        "url": url,
        "name": page["title"],
        "description": page["desc"],
        "isPartOf": {"@id": BASE + "/#website"},
        "about": {"@id": org_id()},
        "primaryImageOfPage": {"@type": "ImageObject",
                               "url": ROOT + "/assets/video/loops/%s.jpg" % page["image"]},
        "breadcrumb": {"@id": url + "#breadcrumb"},
        "inLanguage": "en",
    }

    nodes = [organisation(), website(), webpage, breadcrumb(url, crumbs)]

    if fname == "index.html":
        webpage["mainEntity"] = {"@id": org_id()}
        nodes.append(work_list())
    elif fname == "work.html":
        webpage["mainEntity"] = {"@id": BASE + "/work#films"}
        nodes.append(work_list())
    elif fname == "offerings.html":
        webpage["mainEntity"] = questions()
        nodes.extend(services())
    elif fname == "product.html":
        webpage["mainEntity"] = {"@id": BASE + "/product#products"}
        nodes.append(product_list())
    elif "product" in page:
        pr = page["product"]
        webpage["mainEntity"] = [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in pr["faq"]
        ]
        webpage["about"] = {"@id": product_id(pr["slug"])}
        nodes.append(product_node(pr))
    elif fname == "about.html":
        webpage["mainEntity"] = {"@id": org_id()}
        nodes.extend(people())
    elif fname == "contact.html":
        webpage["mainEntity"] = {"@id": org_id()}
    elif "project" in page:
        webpage["mainEntity"] = {"@id": url + "#film"}
        nodes.append(video_node(page["project"], url))

    return {"@context": "https://schema.org", "@graph": nodes}


# --- the head block ------------------------------------------------------
def meta(name, content, prop=False):
    key = "property" if prop else "name"
    return '  <meta %s="%s" content="%s">' % (key, name, html.escape(content, quote=True))


def head_block(fname, page):
    url = page["url"]
    img = ROOT + "/assets/video/loops/%s.jpg" % page["image"]
    robots = ("noindex,nofollow" if page.get("noindex") else
              "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1")
    lines = [
        "  <!-- seo:start - generated by tools/seo.py, do not edit by hand -->",
        "  <title>%s</title>" % html.escape(page["title"]),
        meta("description", page["desc"]),
        '  <link rel="canonical" href="%s">' % url,
        meta("robots", robots),
        meta("og:type", "video.other" if "project" in page else "website", prop=True),
        meta("og:site_name", NAME, prop=True),
        meta("og:locale", "en_IN", prop=True),
        meta("og:title", page["title"], prop=True),
        meta("og:description", page["desc"], prop=True),
        meta("og:url", url, prop=True),
        meta("og:image", img, prop=True),
        meta("og:image:width", "1280", prop=True),
        meta("og:image:height", "720", prop=True),
        meta("og:image:alt", page["title"], prop=True),
    ]
    if "project" in page:
        p = page["project"]
        lines += [
            meta("og:video", ROOT + "/assets/video/films/%s.mp4" % p["slug"], prop=True),
            meta("og:video:type", "video/mp4", prop=True),
            meta("og:video:width", str(p["w"]), prop=True),
            meta("og:video:height", str(p["h"]), prop=True),
        ]
    lines += [
        meta("twitter:card", "summary_large_image"),
        meta("twitter:title", page["title"]),
        meta("twitter:description", page["desc"]),
        meta("twitter:image", img),
        # Legacy, but still read by some local-intent crawlers and free to carry.
        meta("geo.region", "IN-GJ"),
        meta("geo.placename", CITY),
        '  <script type="application/ld+json">%s</script>'
        % json.dumps(graph_for(fname, page), ensure_ascii=False, separators=(",", ":")),
        "  <!-- seo:end -->",
    ]
    return "\n".join(lines)


# --- the visible FAQ -----------------------------------------------------
def faq_block():
    e = lambda t: html.escape(t, quote=True)
    out = ["  <!-- faq:start - generated by tools/seo.py, do not edit by hand -->",
           '    <div class="faq-list container" id="faq" data-reveal-group>',
           '      <h2 class="faq-head-title" data-reveal>FAQs</h2>']
    n = 0
    for label, rows in FAQ:
        out += ['      <div class="faq-group" data-reveal>',
                '        <h3 class="faq-group-label">%s</h3>' % e(label),
                '        <div class="faq-group-rows">']
        for q, a in rows:
            n += 1
            out += [
                '        <section class="offer-panel faq-panel" data-panel>',
                '          <div class="pan-inner">',
                '            <button class="pan-head" type="button" aria-expanded="false" aria-controls="faq-%02d">' % n,
                '              <span class="faq-num">%02d</span>' % n,
                '              <span class="pan-title">%s</span>' % e(q),
                '              <span class="pan-mark" aria-hidden="true"></span>',
                '            </button>',
                '            <div class="pan-wrap" id="faq-%02d">' % n,
                '              <div class="pan-detail"><p class="pan-body">%s</p></div>' % e(a),
                '            </div>',
                '          </div>',
                '        </section>',
            ]
        out += ['        </div>', '      </div>']
    out += ['    </div>', "  <!-- faq:end -->"]
    return "\n".join(out)


# --- writing -------------------------------------------------------------
SEO_RE = re.compile(r"[ \t]*<!-- seo:start.*?<!-- seo:end -->", re.S)
FAQ_RE = re.compile(r"[ \t]*<!-- faq:start.*?<!-- faq:end -->", re.S)
LEGACY_FAQ_RE = re.compile(r'[ \t]*<div class="faq-list container" id="faq".*?\n[ \t]*</div>\n(?=\n[ \t]*<!-- Footer)', re.S)
ANCHOR_RE = re.compile(r'[ \t]*<meta name="theme-color"[^>]*>\n')
DROP_RE = re.compile(
    r'[ \t]*(?:<title>.*?</title>'
    r'|<meta name="description"[^>]*>'
    r'|<link rel="canonical"[^>]*>'
    r'|<script type="application/ld\+json">.*?</script>)\n', re.S)


def write_page(path, fname, page):
    s = path.read_text()
    block = head_block(fname, page)

    if SEO_RE.search(s):
        s = SEO_RE.sub(lambda _: block, s, count=1)
    else:
        s = DROP_RE.sub("", s)
        m = ANCHOR_RE.search(s)
        if not m:
            raise SystemExit("%s: no theme-color meta to anchor the seo block to" % fname)
        s = s[:m.end()] + block + "\n" + s[m.end():]

    if fname == "offerings.html":
        fb = faq_block()
        if FAQ_RE.search(s):
            s = FAQ_RE.sub(lambda _: fb, s, count=1)
        elif LEGACY_FAQ_RE.search(s):
            s = LEGACY_FAQ_RE.sub(lambda _: fb + "\n", s, count=1)
        else:
            raise SystemExit("offerings.html: cannot find the FAQ block to replace")

    path.write_text(s)


def sitemap():
    urls = []
    for fname, page in PAGES.items():
        if page.get("noindex"):
            continue
        urls.append((page["url"], "1.0" if fname == "index.html" else
                     "0.9" if fname in ("work.html", "offerings.html") else "0.7"))
    body = "\n".join(
        "  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>" % (u, TODAY, pr)
        for u, pr in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + body + "\n</urlset>\n")


def llms_txt():
    L = ["# toogood", "",
         "> %s" % ORG_DESC, "",
         "Based in %s, %s, India. Works with brands across India and outside it." % (CITY, REGION),
         "Every film is generated rather than filmed: no crew, no location, no shoot day.",
         "The script, direction and edit happen the way they always have.", "",
         "Contact: %s / %s" % (EMAIL, PHONE_DISPLAY), "",
         "## What we do", ""]
    for name, desc, tags in SERVICES:
        L.append("- **%s** - %s (%s)" % (name, desc, ", ".join(tags)))
    L += ["", "## Pages", ""]
    for fname, page in PAGES.items():
        if page.get("noindex") or "project" in page:
            continue
        L.append("- [%s](%s): %s" % (page["crumb"], page["url"], page["desc"]))
    L += ["", "## Films", ""]
    for p in PROJECTS:
        L.append("- [%s, %s](%s/project-%s): %s %s"
                 % (p["client"], p["title"], BASE, p["slug"], p["summary"], p["note"]))
    L += ["", "## Clients", "", ", ".join(CLIENTS), "", "## People", ""]
    for name, role, bio in FOUNDERS:
        L.append("- **%s**, %s. %s" % (name, role, bio))
    L += ["", "## Questions clients ask", ""]
    for label, rows in FAQ:
        L.append("### %s" % label)
        L.append("")
        for q, a in rows:
            L.append("**%s** %s" % (q, a))
            L.append("")
    return "\n".join(L).rstrip() + "\n"


STAGING_ROBOTS = """\
# STAGING MODE - search engines and answer engines blocked.
# Back to live is one command: python3 tools/seo.py
User-agent: *
Disallow: /
"""

LIVE_ROBOTS = """\
User-agent: *
Allow: /

# Earlier drafts of this site are still in the repo. They are not the site.
Disallow: /test/
Disallow: /test2/

# Answer engines are welcome. Being quoted is the point.
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: meta-externalagent
Allow: /

Sitemap: {root}/sitemap.xml
"""


def main():
    # The site is live, so live is the default. It used to be the other way
    # round, which became a trap the moment the site went public: an ordinary
    # run after a copy change would have quietly put robots.txt back to
    # Disallow: / and dropped the site out of the index with nothing to show
    # for it. Blocking crawlers is now the thing you have to ask for.
    live = "--staging" not in sys.argv[1:]

    for fname, page in PAGES.items():
        path = PAGES_DIR / fname
        if not path.exists():
            raise SystemExit("missing page: %s" % path)
        write_page(path, fname, page)
    print("%s: %d pages given meta, canonical, social cards and JSON-LD"
          % (PAGES_DIR, len(PAGES)))

    (OUT_DIR / "sitemap.xml").write_text(sitemap())
    (OUT_DIR / "llms.txt").write_text(llms_txt())
    (OUT_DIR / "robots.txt").write_text(
        LIVE_ROBOTS.format(root=ROOT) if live else STAGING_ROBOTS)
    print("sitemap.xml, llms.txt, robots.txt (%s)" % ("live" if live else "staging"))


if __name__ == "__main__":
    main()
