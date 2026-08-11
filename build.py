#!/usr/bin/env python3
"""Build paperprintouts.com.

GitHub Pages will not infer a content type for an extensionless file, so every
page is written twice: as ``slug/index.html`` (which serves the clean URL) and
as a flat ``slug.html`` alias. This is the same pattern drawlots and clocklab
use, and it is the thing hueshift got wrong.

Run: python3 build.py
"""

import pathlib
import xml.sax.saxutils as sx

ROOT = pathlib.Path(__file__).parent
SITE = "https://paperprintouts.com"
NAME = "Paper Printouts"

# ---------------------------------------------------------------- page specs

TOOLS = [
    {
        "slug": "english-paper-piecing-templates",
        "js": "english-paper-piecing",
        "nav": "EPP templates",
        "title": "English Paper Piecing Templates — Any Shape, Any Size, True Scale",
        "h1": "English paper piecing templates",
        "desc": "Generate EPP templates at any side length — hexagons, diamonds, jewels, "
                "triangles, pentagons, squares and kites — printed at true 1:1 scale, with an "
                "optional seam allowance for the fabric-cutting template.",
        "lede": "Pick a shape, type the side length you actually want, and print it at true size. "
                "No hunting for the one PDF that happens to be 1¼ inch.",
        "intro": [
            "Every free EPP template on the web is a fixed-size PDF. If you need ¾ inch hexagons "
            "and the download is 1 inch, the download is useless to you. This page draws the "
            "shape from its geometry instead, so any side length between 5 mm and 75 mm comes "
            "out exact.",
            "The seam allowance option draws a second, larger outline around each shape. Print "
            "that version onto your fabric backing and you have the cutting line as well as the "
            "sewing line.",
        ],
        "faq": [
            ("Will these print at the right size?",
             "Yes, provided you print at 100% and not \"fit to page\". The sheet is drawn in "
             "millimetres and the page size is declared to the printer. Use the calibration page "
             "if you want to confirm your printer before cutting a hundred pieces."),
            ("What does side length mean on a hexagon?",
             "The length of one edge, which is the standard way EPP papers are sold. A \"1 inch "
             "hexagon\" has six 1 inch sides and measures 2 inches across the widest points."),
            ("Can I cut these on a Cricut or laser?",
             "Yes. Download SVG gives you clean vector outlines in true millimetre units."),
        ],
    },
    {
        "slug": "bubble-answer-sheet",
        "js": "bubble-answer-sheet",
        "nav": "Answer sheets",
        "title": "Bubble Answer Sheet Generator — Free, No Watermark",
        "h1": "Bubble answer sheet generator",
        "desc": "Make printable multiple-choice bubble answer sheets: 1–200 questions, 2–6 "
                "options, student ID grid, answer key overlay. Free, no signup, no watermark.",
        "lede": "Scantron-style answer sheets, built to your question count. No watermark, no day "
                "pass, no account.",
        "intro": [
            "Set the number of questions and how many options each one has, and the sheet lays "
            "itself out in as many columns as it needs. Header fields, a student ID bubble grid "
            "and a score box are all optional.",
            "The answer key mode fills in the correct bubbles so you can print a marking overlay "
            "from the same settings.",
        ],
        "faq": [
            ("Is there a watermark?",
             "No. The sheet prints exactly as you see it, and the SVG download is unrestricted."),
            ("Can I use ACT-style F/G/H/J lettering?",
             "Yes — the option labels can be A–F, or alternating A/B/C/D and F/G/H/J the way the "
             "ACT alternates them, or true/false."),
            ("Will this work with an automatic scanner?",
             "It is designed for hand or overlay marking. Commercial optical scanners expect "
             "their own registration marks and their own paper stock."),
        ],
    },
    {
        "slug": "blank-clock-faces",
        "js": "clock-faces",
        "nav": "Clock faces",
        "title": "Blank Clock Face Worksheets — Printable Telling Time Practice",
        "h1": "Blank clock faces",
        "desc": "Printable blank clock faces for telling-time practice: 1 to 12 per page, hands "
                "at set or random times, Roman numerals, digital answer boxes and an answer key.",
        "lede": "Clock faces with hands drawn where they genuinely belong — at 3:45 the hour hand "
                "sits three quarters of the way to four, because that is what a clock does.",
        "intro": [
            "Choose how many clocks fit on the page, whether they are blank for drawing on or "
            "pre-set to times, and whether those times are fixed intervals or random. Add a "
            "digital box under each clock for the answer.",
            "Most worksheet generators put the hour hand exactly on the hour no matter what the "
            "minutes say. That teaches children to read a clock that does not exist, so this one "
            "offsets the hour hand proportionally.",
        ],
        "faq": [
            ("Can I get an answer key?",
             "Yes. Turn on the answer key and the digital time is filled in under each clock."),
            ("What time increments can I use?",
             "Whole hours, half hours, quarter hours, five minutes or one minute."),
            ("Can the children draw the hands themselves?",
             "Yes — set the clocks to blank and print the digital time underneath instead, so "
             "they draw the hands to match."),
        ],
    },
    {
        "slug": "blank-periodic-table",
        "js": "periodic-table",
        "nav": "Periodic table",
        "title": "Blank Periodic Table Printable — Customisable, With Answer Key",
        "h1": "Blank periodic table",
        "desc": "Printable blank periodic table worksheets. Choose which fields are blank — "
                "symbol, name, atomic number, mass — colour by category or print black and "
                "white, and generate the filled answer key.",
        "lede": "Every blank periodic table online is a fixed image. This one lets you choose "
                "what is missing, and prints the answer key from the same settings.",
        "intro": [
            "Pick which parts of each cell are shown and which are left blank for the student to "
            "fill in. Colour by category, by block, or by metal and non-metal, or turn colour off "
            "entirely to save toner.",
            "All 118 elements are included, with the lanthanides and actinides on their usual "
            "rails below the main table.",
        ],
        "faq": [
            ("Is the data accurate?",
             "Atomic numbers, symbols, names and standard atomic weights are from the IUPAC "
             "published values. Weights are shown to four significant figures."),
            ("Can I print it in black and white?",
             "Yes — set colouring to none. The category outline stays, so the shape of the table "
             "is still readable."),
            ("Does it fit on one page?",
             "On Letter or A4 in landscape, yes. Portrait works but the cells are small; tabloid "
             "or A3 gives the most room for writing."),
        ],
    },
    {
        "slug": "attendance-sheet",
        "js": "attendance-sheet",
        "nav": "Attendance",
        "title": "Attendance Sheet & Gradebook Grid Generator — Paste Your Roster",
        "h1": "Attendance sheet and gradebook grids",
        "desc": "Printable attendance registers, gradebook grids and class checklists. Paste your "
                "class list and the names print down the side — no spreadsheet, no retyping.",
        "lede": "Paste twenty-eight names, choose a month, print. Everyone else hands you a "
                "spreadsheet to fill in yourself.",
        "intro": [
            "The roster box takes names one per line, or separated by commas. They are printed "
            "down the left-hand column so the sheet arrives ready to use rather than blank.",
            "Columns can be a month of weekdays, a fixed number of sessions, or a plain "
            "gradebook grid. Nothing you type is sent anywhere — it stays in the browser.",
        ],
        "faq": [
            ("Where do the names go?",
             "Nowhere. The whole page runs in your browser; there is no server to send them to. "
             "Your last roster is kept in this browser's local storage so you do not have to "
             "paste it again."),
            ("Can it work out attendance percentages?",
             "No. This is a printed sheet, so it cannot add anything up. If you need the "
             "arithmetic, you want a spreadsheet."),
            ("How many names fit on a page?",
             "Around 30 on Letter or A4 in portrait at the default row height. Beyond that, "
             "reduce the row height or move to legal or tabloid."),
        ],
    },
    {
        "slug": "graph-paper",
        "js": "graph-paper",
        "nav": "Graph paper",
        "title": "Printable Graph Paper — Any Grid Size, True Scale",
        "h1": "Printable graph paper",
        "desc": "Printable graph paper in any spacing: 5 mm, 1 cm, ¼ inch, ½ inch, 1 inch, or "
                "anything you type. Heavy accent lines, choice of colour, true 1:1 scale.",
        "lede": "Any spacing you like, in millimetres or inches, printed at true size.",
        "intro": [
            "Type the spacing you want rather than hunting for the sheet that happens to match. "
            "Accent every fifth or tenth line to get the familiar engineering look, and set the "
            "line weight and colour to suit what you are drawing.",
            "Quarter inch, 5 mm and \"4 squares per inch\" are three names for very nearly the "
            "same thing — a quarter inch is 6.35 mm, so 5 mm paper is noticeably finer. Both are "
            "here; type the one you mean.",
        ],
        "faq": [
            ("Is ¼ inch the same as 5 mm?",
             "No, though they are often listed as if they were. A quarter inch is 6.35 mm, so "
             "5 mm squares are about 27% smaller. If a pattern calls for one, use that one."),
            ("What is 4 squares per inch?",
             "Quarter inch spacing, named the other way around. 5 squares per inch is 1/5 inch, "
             "and 10 squares per inch is 1/10 inch."),
            ("Why does my print come out slightly small?",
             "Your printer is scaling to fit. Turn that off and print at 100%."),
        ],
    },
    {
        "slug": "dot-grid-paper",
        "js": "dot-grid-paper",
        "nav": "Dot grid",
        "title": "Printable Dot Grid Paper — 5 mm Bullet Journal Dot Paper",
        "h1": "Printable dot grid paper",
        "desc": "Printable dot grid paper at any spacing, including the 5 mm spacing bullet "
                "journals use. Set dot size, colour and margins, and print at true scale.",
        "lede": "Dot paper at the spacing you actually use — 5 mm for a bullet journal, or "
                "whatever you type.",
        "intro": [
            "Dot grid gives you the alignment of graph paper without the printed cage around "
            "everything you write. 5 mm is the spacing almost every bullet journal uses.",
            "Dot size matters more than people expect. Below about 0.3 mm the dots disappear "
            "under ink; above 0.6 mm they start to compete with your handwriting.",
        ],
        "faq": [
            ("What spacing do bullet journals use?",
             "5 mm, almost universally. Leuchtturm1917 and Scribbles That Matter both use it."),
            ("Can I get isometric dots?",
             "Yes — switch the layout to triangular and the dots offset into a 60 degree grid "
             "for isometric drawing."),
            ("Why are my dots grey rather than black?",
             "By choice — grey dots stay out of the way of what you write over them. Set the "
             "colour darker if you want them prominent."),
        ],
    },
    {
        "slug": "lined-paper",
        "js": "lined-paper",
        "nav": "Lined paper",
        "title": "Printable Lined Paper — College Ruled, Wide Ruled, Handwriting",
        "h1": "Printable lined paper",
        "desc": "Printable lined paper: college ruled, wide ruled, narrow ruled, and handwriting "
                "practice paper with baseline, midline and dashed guides.",
        "lede": "College ruled, wide ruled, or handwriting paper with a dashed midline — at the "
                "real spacings, not an approximation.",
        "intro": [
            "Wide ruled is 8.7 mm between lines, college ruled is 7.1 mm and narrow ruled is "
            "6.4 mm. Those are the actual US paper standards, and they are the presets here.",
            "Handwriting mode adds the midline and descender guides that early writers need, "
            "with the dashed middle line they are taught to aim at.",
        ],
        "faq": [
            ("What is the difference between college and wide ruled?",
             "Line spacing. Wide ruled is 8.7 mm and is used in primary school; college ruled is "
             "7.1 mm and fits about four more lines on a page."),
            ("Can I add a margin line?",
             "Yes, on the left, the right, or both, at whatever offset you set."),
            ("What are the dashed lines for?",
             "Handwriting practice. Lower-case letters sit between the baseline and the dashed "
             "midline; capitals and ascenders reach the top line."),
        ],
    },
]

PAGES = [
    {
        "slug": "print-calibration",
        "js": "print-calibration",
        "nav": "Calibration",
        "title": "Printer Scale Calibration — Check Your Printer Prints at True Size",
        "h1": "Printer calibration",
        "desc": "Print a ruler and a measured square to confirm your printer is printing at true "
                "100% scale before you cut anything.",
        "lede": "Print this once. Measure it. Then you can trust every other sheet on this site.",
        "intro": [
            "Everything here is drawn at true physical size, which only survives if your printer "
            "is not quietly scaling the page. Most print dialogues default to \"fit to page\", "
            "which shrinks the sheet by a few percent to clear the unprintable margin.",
            "Print this page at 100%, measure the square with a ruler, and if it is not the size "
            "it claims, find the scale setting in your print dialogue and set it to 100 or "
            "\"actual size\".",
        ],
        "faq": [
            ("My square is a few percent small. What now?",
             "Your printer is scaling to fit. In the print dialogue set scale to 100% or "
             "\"actual size\", rather than \"fit to printable area\"."),
            ("Why does this matter?",
             "For graph paper it is a mild annoyance. For English paper piecing templates or "
             "seam guides, a 3% error is the difference between pieces that fit and pieces that "
             "do not."),
        ],
    },
]

LEGAL = [
    ("privacy", "Privacy", "Privacy — Paper Printouts",
     "Paper Printouts runs entirely in your browser and collects nothing.",
     [
         "Every generator on this site runs in your browser. Nothing you type — a class roster, "
         "a list of names, a set of measurements — is transmitted anywhere, because there is no "
         "server to transmit it to. The site is static files.",
         "Your last-used settings are stored in your browser's local storage so the page opens "
         "the way you left it. That data never leaves the machine, and clearing your browser "
         "data removes it.",
         "This site shows advertising through Google AdSense, which may set cookies and use them "
         "to personalise the advertising you see. You can control that through Google's own ad "
         "settings.",
     ]),
    ("terms", "Terms", "Terms — Paper Printouts",
     "Terms of use for Paper Printouts.",
     [
         "Everything this site generates is yours to use, for anything, including commercial "
         "work. There is no attribution requirement and no licence to accept.",
         "The site is provided as-is. The sheets are drawn to the dimensions you ask for, but "
         "whether they print at that size depends on your printer and your print settings — "
         "check the calibration page before cutting anything you cannot un-cut.",
         "The element data on the periodic table page is published reference data. It is "
         "believed accurate but should not be relied on for anything that matters without "
         "checking it against a primary source.",
     ]),
]

# ------------------------------------------------------------------ templates

THEME_BOOTSTRAP = (
    '<script>(function(){try{var t=localStorage.getItem("pp-theme");'
    'if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>'
)


def nav_html(current):
    links = []
    for t in TOOLS + PAGES:
        cls = ' aria-current="page"' if t["slug"] == current else ""
        links.append('<a href="/%s/"%s>%s</a>' % (t["slug"], cls, sx.escape(t["nav"])))
    return "\n      ".join(links)


def head(title, desc, canonical, extra_json=""):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{sx.escape(title)}</title>
<meta name="description" content="{sx.escape(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="{sx.escape(title)}">
<meta property="og:description" content="{sx.escape(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="{NAME}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{sx.escape(title)}">
<meta name="twitter:description" content="{sx.escape(desc)}">
<meta name="theme-color" content="#14161a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/style.css">
{THEME_BOOTSTRAP}
{extra_json}
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7560786263587509" crossorigin="anonymous"></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="/">paper<span>printouts</span></a>
  <nav class="site-nav" aria-label="Tools">
      {{nav}}
  </nav>
  <button class="theme-toggle" type="button" aria-label="Switch theme">&#9680;</button>
</header>
"""


FOOTER = """
<footer class="site-footer">
  <p>Everything here runs in your browser. Nothing you type is uploaded, because there is
  nowhere to upload it to.</p>
  <p><a href="/">All tools</a> &middot; <a href="/print-calibration/">Printer calibration</a>
  &middot; <a href="/privacy/">Privacy</a> &middot; <a href="/terms/">Terms</a></p>
</footer>
<a href="https://erabb.it" class="erabbit-mark" aria-label="erabb.it"><img src="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#129365;</text></svg>" width="10" height="10" alt=""></a>
<script src="/assets/app.js"></script>
{tool_script}
</body>
</html>
"""


def faq_jsonld(faq):
    items = []
    for q, a in faq:
        items.append({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        })
    import json
    return '<script type="application/ld+json">%s</script>' % json.dumps({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": items,
    })


def app_jsonld(page, canonical):
    import json
    return '<script type="application/ld+json">%s</script>' % json.dumps({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": page["h1"],
        "url": canonical,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "description": page["desc"],
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    })


def tool_page(page):
    canonical = "%s/%s/" % (SITE, page["slug"])
    extra = app_jsonld(page, canonical) + "\n" + faq_jsonld(page["faq"])
    intro = "\n".join("<p>%s</p>" % sx.escape(p) for p in page["intro"])
    faqs = "\n".join(
        '<details class="faq"><summary>%s</summary><p>%s</p></details>'
        % (sx.escape(q), sx.escape(a)) for q, a in page["faq"]
    )
    related = "\n".join(
        '<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
        % (t["slug"], sx.escape(t["h1"]), sx.escape(t["lede"].split(".")[0] + "."))
        for t in TOOLS if t["slug"] != page["slug"]
    )
    body = f"""
<main id="main" class="wrap">
  <h1>{sx.escape(page["h1"])}</h1>
  <p class="lede">{sx.escape(page["lede"])}</p>

  <div class="tool">
    <form class="panel" id="controls" onsubmit="return false">
      <h2>Settings</h2>
    </form>
    <section class="stage" id="stage" aria-live="polite" aria-label="Sheet preview"></section>
  </div>

  <div class="prose">
    {intro}
    <h2>Questions</h2>
    {faqs}
    <h2>Other tools</h2>
  </div>
  <ul class="tool-cards">
    {related}
  </ul>
</main>
"""
    script = '<script src="/assets/tools/%s.js"></script>' % page["js"]
    return (head(page["title"], page["desc"], canonical, extra).replace("{nav}", nav_html(page["slug"]))
            + body + FOOTER.replace("{tool_script}", script))


def legal_page(slug, nav, title, desc, paras):
    canonical = "%s/%s/" % (SITE, slug)
    body = '<main id="main" class="wrap"><div class="prose"><h1>%s</h1>%s</div></main>' % (
        sx.escape(nav), "\n".join("<p>%s</p>" % sx.escape(p) for p in paras)
    )
    return (head(title, desc, canonical).replace("{nav}", nav_html(slug))
            + body + FOOTER.replace("{tool_script}", ""))


def home():
    canonical = SITE + "/"
    desc = ("Free printable paper and worksheet generators that run entirely in your browser: "
            "graph paper, dot grid, lined paper, EPP templates, bubble answer sheets, clock "
            "faces, periodic tables and attendance sheets.")
    cards = "\n".join(
        '<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
        % (t["slug"], sx.escape(t["h1"]), sx.escape(t["lede"].split(".")[0]))
        for t in TOOLS
    )
    body = f"""
<main id="main" class="wrap">
  <h1>Printable paper, generated to your measurements</h1>
  <p class="lede">Nine generators that draw the sheet you actually need and print it at true
  physical scale. Free, no account, and nothing you type leaves your browser.</p>
  <ul class="tool-cards">
    {cards}
  </ul>
  <div class="prose">
    <h2>Why generate rather than download</h2>
    <p>Most printable paper online is a fixed PDF. If you need three-quarter inch hexagons and the
    file is one inch, the file is no use to you. Everything here is drawn from its measurements
    instead, so you get the size you asked for.</p>
    <p>That only works if your printer is not silently shrinking the page to fit, which most
    print dialogues do by default. <a href="/print-calibration/">Print the calibration page</a>
    once and you will know.</p>
  </div>
</main>
"""
    return (head("Paper Printouts — Printable Paper and Worksheet Generators", desc, canonical)
            .replace("{nav}", nav_html("")) + body + FOOTER.replace("{tool_script}", ""))


def not_found():
    body = ('<main id="main" class="wrap"><div class="prose"><h1>Page not found</h1>'
            '<p>That page does not exist. <a href="/">All the tools are here</a>.</p>'
            '</div></main>')
    return (head("Page not found — Paper Printouts", "Page not found.", SITE + "/404")
            .replace("{nav}", nav_html("")) + body + FOOTER.replace("{tool_script}", ""))


def write_page(slug, html):
    """Write both the directory page and the flat alias."""
    directory = ROOT / slug
    directory.mkdir(exist_ok=True)
    (directory / "index.html").write_text(html, encoding="utf-8")
    (ROOT / (slug + ".html")).write_text(html, encoding="utf-8")


def main():
    (ROOT / "index.html").write_text(home(), encoding="utf-8")
    (ROOT / "404.html").write_text(not_found(), encoding="utf-8")

    for page in TOOLS + PAGES:
        write_page(page["slug"], tool_page(page))

    for slug, nav, title, desc, paras in LEGAL:
        write_page(slug, legal_page(slug, nav, title, desc, paras))

    urls = [SITE + "/"]
    urls += ["%s/%s/" % (SITE, p["slug"]) for p in TOOLS + PAGES]
    urls += ["%s/%s/" % (SITE, s) for s, *_ in LEGAL]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append("  <url><loc>%s</loc></url>" % u)
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")

    print("built %d pages" % (len(TOOLS) + len(PAGES) + len(LEGAL) + 2))


if __name__ == "__main__":
    main()
