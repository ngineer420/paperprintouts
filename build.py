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
from urllib.parse import urlencode

ROOT = pathlib.Path(__file__).parent
SITE = "https://paperprintouts.com"
NAME = "Paper Printouts"

# ---------------------------------------------------------------- page specs

TOOLS = [
    {
        "slug": "beading-graph-paper",
        "js": "beading-graph-paper",
        "nav": "Beading graph",
        "title": "Beading Graph Paper — Peyote, Brick, Herringbone, RAW, True Size",
        "h1": "Beading graph paper",
        "desc": "Free printable beading graph paper for all seven stitches — even and odd count "
                "peyote, two-drop, brick, loom and square stitch, herringbone and right-angle "
                "weave — at true bead size for Delica cylinders and round seed beads. No "
                "watermark, every paper size, A6 included.",
        "lede": "Charting paper drawn from the bead's own measurements, so the beads on the page "
                "are the size of the beads in the tube. Every stitch, every size, no watermark.",
        "intro": [
            "Generic graph paper does not work for beadwork, because a bead is not a square. A "
            "Delica 11/0 is 1.6 mm across the hole and 1.3 mm along it, and which of those two "
            "numbers ends up horizontal depends entirely on which way the thread runs. Peyote and "
            "brick stitch make the same fabric turned ninety degrees, so their paper is the same "
            "paper rotated — and loom work uses the peyote proportion on a grid that does not "
            "stagger at all.",
            "All seven geometries are here: even count peyote, odd count peyote, two-drop peyote, "
            "brick, loom and square stitch, herringbone and right-angle weave. So are the four "
            "Delica cylinder sizes and the round seed bead sizes, which have a different aspect "
            "ratio again. Set the column count to the width of your piece and the sheet becomes "
            "the piece; leave it at zero and the grid fills the page.",
            "Nothing is watermarked, no size is held back, and A6 is on the paper list alongside "
            "A4 and Letter for anyone charting into a binder.",
        ],
        "faq": [
            ("Will it print at the true bead size?",
             "Yes, at 100% scale. The sheet is drawn in millimetres from published bead "
             "dimensions and the page size is declared to the printer. Print the calibration page "
             "once to confirm your printer is not shrinking to fit, and then a fifteen-bead row "
             "on the page really will be as wide as fifteen beads."),
            ("What is the difference between odd and even count peyote paper?",
             "The lattice is identical; the column count is not. Even count peyote needs an even "
             "number of columns and odd count needs an odd one, because the odd-count edge has to "
             "be turned differently every other row. The generator forces the parity to match the "
             "stitch you picked rather than letting you chart something you cannot stitch."),
            ("Why are the round seed bead sizes given as one number?",
             "Because that is how rocailles are sold. The published figure is the diameter across "
             "the hole; how much they are squashed along the hole varies by maker and by batch, "
             "which is exactly why cylinder beads are preferred for patterns that have to be "
             "exact. Rather than invent a second figure, the sheet derives it — 80% of the "
             "diameter by default, printed in the caption so it is never a hidden assumption. "
             "Measure your own and change it, or type both numbers in as a custom size."),
            ("Can I enlarge it to colour in?",
             "Yes. The scale control multiplies the bead, and the caption always states the "
             "scale, so an enlarged chart never gets mistaken for an actual-size one."),
            ("Why does the counting line zigzag?",
             "Because the cell boundary does. On peyote and brick the columns or rows are offset "
             "by half a bead, so a straight rule would slice beads in half. The guide follows the "
             "real boundary instead, stepping half a bead at a time."),
        ],
    },
    {
        "slug": "cross-stitch-paper",
        "js": "cross-stitch-paper",
        "nav": "Cross stitch",
        "title": "Cross Stitch Pattern Paper — Every Count, True Scale, Centre Marks",
        "h1": "Cross stitch pattern paper",
        "desc": "Free printable cross stitch graph paper at any fabric count — 11, 14, 16, 18, "
                "22, 25, 28 and 32 — with heavy lines every ten, edge numbering and centre marks. "
                "Knows that evenweave is worked over two threads, so 28 count comes out at 14 "
                "stitches per inch.",
        "lede": "Charting paper at the size your stitches will actually be, for the count of "
                "fabric you actually have. Centre marks included, because you start from the "
                "middle.",
        # "links" is filled in below, once the per-count pages exist to link to.
        "intro": [
            "Cross stitch paper is a square grid at one square per stitch, and the only thing "
            "that makes one sheet different from another is how big that square is. That comes "
            "from the fabric: 25.4 mm divided by the number of stitches you get to the inch. "
            "Print at 100% and you can hold the sheet against the cloth and see your finished "
            "design at its real size before you thread a needle.",
            "The catch is that fabric is not sold by stitches per inch. It is sold by count — "
            "threads, or Aida blocks, to the inch — and on evenweave and linen a stitch is worked "
            "over two threads. So 28 count evenweave is 14 stitches per inch, exactly the stitch "
            "size of 14 count Aida, and a sheet of 28 count paper drawn at 28 squares to the inch "
            "is wrong for almost everybody who asks for it. The toggle here gets it right, and "
            "the caption prints both numbers so the sheet can never mean something other than "
            "what it says.",
            "Set the stitch counts to your design size and the grid becomes the design, with the "
            "finished measurement printed underneath in both millimetres and inches — which is "
            "the number you need before you buy fabric and cut a margin for the frame.",
        ],
        "faq": [
            ("Which count do I have?",
             "If it came in a kit and nobody said, it is almost certainly 14 count Aida — that is "
             "the default here. Aida has visible square blocks with holes at the corners; "
             "evenweave and linen look like plain woven cloth with no obvious blocks at all."),
            ("Why is the 28 count page drawn at 14 squares to the inch?",
             "Because that is what 28 count evenweave stitches at. The count is the number of "
             "threads to the inch, and cross stitch on evenweave or linen is worked over two of "
             "them, so 28 threads give 14 stitches. If you genuinely are stitching over one "
             "thread, switch the fabric control to Aida and the grid doubles to 28 squares to "
             "the inch."),
            ("Will it print at the true size?",
             "Yes, at 100% scale. The grid is drawn in millimetres at 25.4 divided by your "
             "stitches per inch, and the page size is declared to the printer. Print the "
             "calibration page once to confirm your printer is not shrinking to fit, and then ten "
             "squares of 14 count paper really will measure five sevenths of an inch."),
            ("What are the arrows on the edges?",
             "The centre. You find the middle of the fabric by folding it in half twice and start "
             "stitching there, so the chart has to agree about where its own middle is. Static "
             "PDFs rarely mark it."),
            ("Can I chart a design that is bigger than one page?",
             "Not across pages, no — this prints one sheet. Set the stitch counts to what fits "
             "and chart in sections, or move up to A3 or tabloid, which at 14 count holds a "
             "little over 150 stitches across."),
        ],
    },
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
    {
        "slug": "savings-challenge-chart",
        "js": "savings-challenge-chart",
        "nav": "Savings charts",
        "title": "Savings Challenge Chart Generator — Any Goal, Cells That Add Up Exactly",
        "h1": "Savings and goal colouring charts",
        "desc": "Printable savings challenge charts for any goal: 100 envelope challenge, 52 week "
                "challenge, debt payoff, sinking funds, weight loss, mileage and reading trackers. "
                "Circles, squares, hexagons or honeycomb, A4 down to A6 binder inserts, and the "
                "cells always add up to the goal exactly.",
        "lede": "Type your goal and how many cells you want. The chart solves for amounts that add "
                "up to it exactly — then you colour one in as you go.",
        "intro": [
            "Every one of these charts is the same arithmetic problem: find N amounts that sum to "
            "the goal, arranged so the early ones are bearable. The 100 envelope challenge is "
            "1 to 100, which comes to 5,050. The 52 week challenge is 1 to 52, which comes to "
            "1,378. But almost nobody's goal is 5,050 or 1,378 — it is 5,000, or 3,270, or "
            "whatever is left on the card — and that is the arithmetic a printed PDF cannot do.",
            "So this does it. Pick the goal, the number of cells and the shape of the "
            "distribution: sequential, randomised, a fixed amount, a progressive ramp, or a "
            "repeating cycle. The amounts are solved as whole pennies and the remainder is handed "
            "out one penny at a time, so the cells sum to the goal exactly — not to within a "
            "rounding error. The sheet prints what they add up to, so it proves its own sums.",
            "Because it is only arithmetic and shapes, it is not only a savings chart. Set the "
            "unit to lb, miles, pages or km and the same engine is a weight loss tracker, a "
            "mileage chart or a reading log. Set the paper to A6 and it is a binder insert.",
        ],
        "presets": [
            ("100 envelope challenge", "£5,050 in 100 envelopes — 1 to 100",
             {"goal": "5050", "count": "100", "distribution": "sequential", "decimals": "0",
              "title": "100 envelope challenge", "shape": "circle"}),
            ("100 envelopes, randomised", "The same amounts, drawn in random order",
             {"goal": "5050", "count": "100", "distribution": "random", "decimals": "0",
              "title": "100 envelope challenge", "shape": "square"}),
            ("52 week savings challenge", "£1,378 over a year — 1 to 52",
             {"goal": "1378", "count": "52", "distribution": "sequential", "decimals": "0",
              "title": "52 week savings challenge", "shape": "circle"}),
            ("A6 binder insert", "The 52 week challenge sized for a pocket binder",
             {"goal": "1378", "count": "52", "distribution": "sequential", "decimals": "0",
              "paper": "a6", "title": "52 week challenge", "shape": "circle"}),
            ("Sinking fund", "£1,200 over twelve equal months",
             {"goal": "1200", "count": "12", "distribution": "fixed", "decimals": "2",
              "title": "Sinking fund", "shape": "square"}),
            ("Credit card payoff", "£3,500 over 50 cells, biggest payment first",
             {"goal": "3500", "count": "50", "distribution": "progressive", "order": "down",
              "decimals": "0", "title": "Credit card payoff", "shape": "hexagon"}),
            ("Debt snowball", "£2,000 in a repeating four-week cycle",
             {"goal": "2000", "count": "48", "distribution": "cyclical", "cycle": "4",
              "decimals": "0", "title": "Debt snowball", "shape": "honeycomb"}),
            ("House deposit tracker", "£20,000 over 100 rising cells",
             {"goal": "20000", "count": "100", "distribution": "progressive", "ramp": "4",
              "decimals": "0", "title": "House deposit", "shape": "honeycomb"}),
            ("Weight loss tracker", "30 lb, one pound a cell",
             {"goal": "30", "count": "30", "distribution": "fixed", "decimals": "0",
              "unit": "lb", "unitPos": "after", "title": "Weight loss", "shape": "circle"}),
            ("Running mileage chart", "500 miles over 52 weeks, building up",
             {"goal": "500", "count": "52", "distribution": "progressive", "decimals": "0",
              "unit": "miles", "unitPos": "after", "title": "500 miles", "shape": "hexagon"}),
            ("Reading pages chart", "3,000 pages over 30 sittings",
             {"goal": "3000", "count": "30", "distribution": "progressive", "decimals": "0",
              "unit": "pages", "unitPos": "after", "title": "Reading log", "shape": "square"}),
        ],
        "faq": [
            ("Do the cells really add up to the goal?",
             "Exactly, every time, and the sheet prints the total so you can check it at a "
             "glance. The amounts are worked out in whole pennies rather than in decimals, and "
             "the few pennies that will not divide evenly are handed out one at a time to the "
             "cells that were rounded down hardest. That is why a goal of 5,000 across 12 cells "
             "gives four cells of 416.66 and eight of 416.67 rather than twelve cells of 416.67 "
             "and a four penny hole."),
            ("What if I want whole notes rather than odd pennies?",
             "Set the rounding to whole units, or to multiples of 5, 10, 25, 50 or 100. Rounding "
             "cannot be allowed to change the total, so whatever is left over — always less than "
             "one of your chosen multiples — is carried by the largest cell, and the sheet says "
             "so in print rather than quietly losing it."),
            ("What is the difference between sequential and progressive?",
             "Sequential is 1, 2, 3 up to N, scaled to your goal — the classic envelope "
             "challenge, where the last cell is N times the first. Progressive is the same ramp "
             "with the steepness in your hands: set it to 3 and the last cell is three times the "
             "first, which is far gentler over 100 cells."),
            ("Can I use it for something other than money?",
             "Yes. The unit is a free text box, so lb, kg, miles, km, pages or minutes all work, "
             "and it can sit after the number where those units belong. A 30 lb weight loss "
             "tracker and a 500 mile running chart are the same solver as a savings challenge."),
            ("Will it fit an A6 binder?",
             "Yes — A6 is on the paper list, along with A5, A4, Letter, Legal, Tabloid and A3, "
             "and the cells are laid out to fill whichever you choose. Everything prints at true "
             "size, so an A6 insert really is 105 by 148 mm."),
            ("Is anything I type sent anywhere?",
             "No. The whole page runs in your browser, so your goal, your debt and your weight "
             "target never leave the machine."),
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

# ------------------------------------ cross stitch: one landing page per count
#
# Fabric is sold by count, so every count is its own product and its own search,
# and a generator with a dropdown does not answer the query "14 count cross
# stitch paper" the way a page named that does.
#
# Count is threads — or Aida blocks — to the inch. It is only the same number as
# stitches per inch when one stitch covers one thread, which is Aida's case and
# nobody else's: evenweave, linen and Hardanger are worked over two threads, so
# they stitch at half their count. Every figure on these pages is therefore
# DERIVED from the two fields below rather than typed, because a page headed
# "28 count" whose body says 14 stitches per inch has to get that arithmetic
# right every single time or a stitcher will catch it out.

CROSS_STITCH_COUNTS = [
    {
        "count": 11,
        "fabric": "aida",
        "cloth": "Aida",
        "suits": "The largest Aida in common use. At eleven stitches to the inch the blocks are "
                 "big enough to see and count without magnification, which is why it turns up in "
                 "children's kits and in charts for anyone who finds 14 count hard on the eyes. "
                 "The same design comes out about 27% larger than it would on 14 count.",
        "faq": ("Is 11 count good for a beginner?",
                "It is the easiest of the common counts to see, and the holes are unmistakable, "
                "so it is a reasonable place to start. The trade-off is size: a design worked at "
                "eleven stitches to the inch takes up noticeably more fabric than the same design "
                "at fourteen."),
    },
    {
        "count": 14,
        "fabric": "aida",
        "cloth": "Aida",
        "suits": "The most common cross stitch fabric there is. It is the count most kits ship "
                 "with, and the count a chart assumes when it does not say otherwise, so if you "
                 "are not sure what is in your stash it is probably this. Every other count on "
                 "this site is most usefully described by how it compares to it.",
        "faq": ("Is 14 count the standard?",
                "As close as the hobby has to one. Charts that quote a finished size without "
                "naming a fabric have almost always worked it out at fourteen stitches to the "
                "inch."),
    },
    {
        "count": 16,
        "fabric": "aida",
        "cloth": "Aida",
        "suits": "One step finer than 14 count Aida. The same chart comes out about 12% smaller, "
                 "which is usually the whole reason for choosing it — a design that will not fit "
                 "the frame you have at 14 count will often fit at 16.",
        "faq": ("How much smaller is 16 count than 14 count?",
                "About 12%. A design 100 stitches wide measures 7.14 inches on 14 count and 6.25 "
                "inches on 16 count, because the stitch count has not changed and the stitches "
                "have."),
    },
    {
        "count": 18,
        "fabric": "aida",
        "cloth": "Aida",
        "suits": "The finest Aida commonly sold. A chart comes out about 22% smaller than the "
                 "same chart on 14 count, so it is what you reach for when a design has more "
                 "detail in it than the space you have will allow.",
        "faq": ("How much smaller is 18 count than 14 count?",
                "About 22%. A design 100 stitches wide measures 7.14 inches on 14 count and 5.56 "
                "inches on 18 count."),
    },
    {
        "count": 22,
        "fabric": "evenweave",
        "cloth": "Hardanger",
        "suits": "Hardanger cloth is woven in pairs: 22 threads to the inch, which is eleven "
                 "pairs. Cross stitch worked over one pair is eleven stitches per inch — exactly "
                 "the stitch size of 11 count Aida — which is why this page is drawn at eleven "
                 "squares to the inch and not twenty-two.",
        "faq": ("Why is 22 count drawn at 11 squares to the inch?",
                "Because Hardanger is woven in pairs of threads and cross stitch is worked over a "
                "pair. Twenty-two threads to the inch is eleven pairs, so eleven stitches. If you "
                "are working over single threads instead, switch the fabric control to Aida and "
                "the grid doubles."),
    },
    {
        "count": 25,
        "fabric": "evenweave",
        "cloth": "evenweave",
        "suits": "Worked over two threads, 25 count evenweave — Lugana and Dublin are the usual "
                 "names — gives 12.5 stitches per inch. It is the one common count with no Aida "
                 "equivalent at all, sitting between 11 and 14, and stitches very slightly larger "
                 "than a 14 count stitch.",
        "faq": ("Is there an Aida equivalent to 25 count?",
                "No. Over two threads it works out at 12.5 stitches per inch, and Aida is not "
                "sold in half counts. It is the closest thing to 14 count that is not 14 count, "
                "which is worth knowing before you assume a chart's finished size."),
    },
    {
        "count": 28,
        "fabric": "evenweave",
        "cloth": "evenweave",
        "suits": "The linen substitution everybody makes. Worked over two threads, 28 count — "
                 "Cashel linen, Jobelan, Brittney — comes out at exactly fourteen stitches per "
                 "inch, the same stitch size as 14 count Aida. That is why a 14 count chart can "
                 "be stitched on 28 count linen and finish at precisely the same size, and why "
                 "this page is drawn at fourteen squares to the inch rather than twenty-eight.",
        "faq": ("Can I stitch a 14 count chart on 28 count linen?",
                "Yes, and it will finish at exactly the same size, because 28 threads worked over "
                "two is fourteen stitches to the inch. This is the single most useful piece of "
                "arithmetic in the hobby and the one that catches people out when they order "
                "fabric."),
    },
    {
        "count": 32,
        "fabric": "evenweave",
        "cloth": "linen",
        "suits": "Fine linen — Belfast is the usual name — worked over two threads at sixteen "
                 "stitches per inch, the same stitch size as 16 count Aida. It is chosen for the "
                 "look and the drape of linen rather than to change the size of the design.",
        "faq": ("Is 32 count linen the same as 16 count Aida?",
                "The same stitch size, yes: 32 threads worked over two is sixteen stitches to the "
                "inch. The fabric is nothing like the same to handle, but a chart finishes at the "
                "identical measurement on either."),
    },
]


def _fmt(n):
    """Trim the trailing zeroes off a derived figure: 12.5 stays, 14.0 does not."""
    return ("%.4f" % n).rstrip("0").rstrip(".")


def cross_stitch_count_pages():
    """One landing page per count, generated from the table above.

    Hand-writing eight near-identical pages is how the arithmetic drifts: the
    11 count page ends up quoting a figure worked out for 14, nobody notices,
    and the one audience on earth that checks its stitch counts against a ruler
    notices immediately. So every number below comes out of the same two fields
    the generator itself is preloaded with.
    """
    pages = []
    for spec in CROSS_STITCH_COUNTS:
        count = spec["count"]
        threads = 2 if spec["fabric"] == "evenweave" else 1
        per_inch = count / threads
        pitch = 25.4 / per_inch

        spi = _fmt(per_inch)
        mm_sq = "%.2f" % pitch
        cloth = spec["cloth"]
        worked = ("has one stitch per block" if threads == 1
                  else "is worked over two threads")
        # A concrete design to hang the sizes on. 100 stitches is a round number
        # and near the middle of what one sheet holds.
        hundred_in = "%.2f" % (100 / per_inch)
        hundred_mm = "%.0f" % (100 / per_inch * 25.4)

        heading = "%d count cross stitch paper" % count
        pages.append({
            "slug": "%d-count-cross-stitch-paper" % count,
            "js": "cross-stitch-paper",
            "title": "%d Count Cross Stitch Paper — Free Printable Grid, True Scale" % count,
            "h1": heading,
            "card": "%s stitches per inch · %s mm squares" % (spi, mm_sq),
            "desc": "Free printable %d count cross stitch graph paper at true scale: %s stitches "
                    "per inch, %s mm squares, heavy lines every ten, edge numbering and centre "
                    "marks. Set it to your design size and it prints the finished measurement."
                    % (count, spi, mm_sq),
            "lede": "%d count %s %s, so this is %s stitches to the inch — squares of %s mm, "
                    "printed at true size." % (count, cloth, worked, spi, mm_sq),
            "preset": {"count": count, "fabric": spec["fabric"]},
            "intro": [
                "%d count %s %s, which puts %s stitches in an inch and makes every square on "
                "this page %s mm across. Print it at 100%% and you can lay the sheet against the "
                "cloth: a design 100 stitches wide finishes %s inches (%s mm) wide at this count."
                % (count, cloth, worked, spi, mm_sq, hundred_in, hundred_mm),
                spec["suits"],
                "The grid below is the generator from the main cross stitch paper page, opened at "
                "%d count. Heavy lines fall every ten stitches, the edges are numbered and the "
                "centre is arrowed on all four sides. Change the paper size, the colour or the "
                "design size and it redraws; nothing you set leaves your browser."
                % count,
            ],
            "faq": [
                spec["faq"],
                ("How big will my design be on %d count?" % count,
                 "Divide the stitch count by %s. A design 100 stitches wide finishes %s inches "
                 "(%s mm) wide, and 200 stitches finishes twice that. Set the stitch counts in "
                 "the panel and the sheet prints the finished measurement for you, in both "
                 "millimetres and inches, so you can work out how much fabric to buy before you "
                 "cut anything." % (spi, hundred_in, hundred_mm)),
                ("Will it print at the true size?",
                 "Yes, at 100%% scale. The grid is drawn in millimetres at 25.4 divided by %s "
                 "stitches per inch, which is %s mm a square, and the page size is declared to "
                 "the printer. Print the calibration page once to confirm your printer is not "
                 "quietly shrinking to fit." % (spi, mm_sq)),
            ],
        })
    return pages


COUNT_PAGES = cross_stitch_count_pages()

# The count pages and the generator page cross-link, which is what makes the set
# navigable rather than eight orphans. Built after the fact because the links
# point in both directions.
_HUB_LINK = ("/cross-stitch-paper/", "Cross stitch paper, any count",
             "The full generator — any count from 6 to 40")


def _count_link(page):
    return ("/%s/" % page["slug"], page["h1"], page["card"])


for _page in COUNT_PAGES:
    _page["links"] = ("Cross stitch paper by count",
                      [_HUB_LINK] + [_count_link(other) for other in COUNT_PAGES
                                     if other["slug"] != _page["slug"]])

for _tool in TOOLS:
    if _tool["slug"] == "cross-stitch-paper":
        _tool["links"] = ("Cross stitch paper by count",
                          [_count_link(other) for other in COUNT_PAGES])

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


def presets_html(page):
    """Preset links for tools that are one engine serving many named jobs.

    The controls already read the query string, so a preset is nothing but a
    link back to the same page with the settings in it — no extra machinery,
    and each named challenge gets a real URL that can be linked to.
    """
    presets = page.get("presets")
    if not presets:
        return ""
    items = []
    for label, blurb, params in presets:
        query = urlencode(params)
        items.append(
            '<li><a href="/%s/?%s"><strong>%s</strong><span>%s</span></a></li>'
            % (page["slug"], sx.escape(query), sx.escape(label), sx.escape(blurb))
        )
    return ('\n  <div class="prose"><h2>Start from a challenge</h2></div>\n'
            '  <ul class="tool-cards">\n    %s\n  </ul>\n' % "\n    ".join(items))


def links_html(page):
    """A named set of sibling pages, for a tool that has a page per variant.

    Different from presets_html: those are query strings on one page, these are
    real pages with their own titles and their own copy. A count is a product
    people search for by name, so it earns a URL rather than a parameter.
    """
    spec = page.get("links")
    if not spec:
        return ""
    heading, items = spec
    lis = "\n    ".join(
        '<li><a href="%s"><strong>%s</strong><span>%s</span></a></li>'
        % (href, sx.escape(label), sx.escape(blurb))
        for href, label, blurb in items
    )
    return ('\n  <div class="prose"><h2>%s</h2></div>\n'
            '  <ul class="tool-cards">\n    %s\n  </ul>\n' % (sx.escape(heading), lis))


def preset_script(page):
    """Preload the generator with what this page is a page about.

    app.js reads window.PP_PRESET as the control defaults for this page, ahead of
    whatever the visitor last used. A count page that opened at someone's last
    count would contradict its own heading.
    """
    import json
    preset = page.get("preset")
    if not preset:
        return ""
    return "<script>window.PP_PRESET = %s;</script>" % json.dumps(preset)


def tool_page(page):
    canonical = "%s/%s/" % (SITE, page["slug"])
    extra = app_jsonld(page, canonical) + "\n" + faq_jsonld(page["faq"])
    extra += "\n" + preset_script(page)
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
{presets_html(page)}

  <div class="prose">
    {intro}
  </div>
{links_html(page)}
  <div class="prose">
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


def count_word(n):
    """Spell the generator count, so adding a tool cannot leave the prose lying."""
    words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
             "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
             "seventeen", "eighteen", "nineteen", "twenty"]
    return words[n] if n < len(words) else str(n)


def home():
    canonical = SITE + "/"
    desc = ("Free printable paper and worksheet generators that run entirely in your browser: "
            "graph paper, dot grid, lined paper, cross stitch paper, beading graph paper, "
            "savings challenge charts, EPP templates, bubble "
            "answer sheets, clock faces, periodic tables and attendance sheets.")
    cards = "\n".join(
        '<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
        % (t["slug"], sx.escape(t["h1"]), sx.escape(t["lede"].split(".")[0]))
        for t in TOOLS
    )
    body = f"""
<main id="main" class="wrap">
  <h1>Printable paper, generated to your measurements</h1>
  <p class="lede">{count_word(len(TOOLS) + len(PAGES)).capitalize()} generators that draw the
  sheet you actually need and print it at true physical scale. Free, no account, and nothing you
  type leaves your browser.</p>
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

    for page in TOOLS + PAGES + COUNT_PAGES:
        write_page(page["slug"], tool_page(page))

    for slug, nav, title, desc, paras in LEGAL:
        write_page(slug, legal_page(slug, nav, title, desc, paras))

    urls = [SITE + "/"]
    urls += ["%s/%s/" % (SITE, p["slug"]) for p in TOOLS + PAGES + COUNT_PAGES]
    urls += ["%s/%s/" % (SITE, s) for s, *_ in LEGAL]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append("  <url><loc>%s</loc></url>" % u)
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")

    print("built %d pages" % (len(TOOLS) + len(PAGES) + len(COUNT_PAGES) + len(LEGAL) + 2))


if __name__ == "__main__":
    main()
