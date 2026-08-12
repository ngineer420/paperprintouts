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
        "slug": "year-in-pixels",
        "js": "year-in-pixels",
        "nav": "Year in pixels",
        "title": "Year in Pixels Generator — Printable Mood Tracker for Any Year",
        "h1": "Year in pixels",
        "desc": "Free printable year in pixels chart for any year: one cell a day, grid, "
                "calendar or circular layout, your own legend, square or circle cells, and A5 "
                "and A6 for planner inserts. February gets the right number of days.",
        "lede": "One cell a day for a whole year, drawn for the year you name — so February is "
                "the right length and the months stop where they actually stop.",
        "intro": [
            "A year in pixels is a cell for every day, coloured in daily against a legend you "
            "write yourself, so that twelve months of mood or habit fit on one sheet you can "
            "read at a glance. Every free version of it is a static PDF, which means it is a "
            "12 by 31 grid with 372 cells and no opinion about which seven of them are not real "
            "days.",
            "Naming the year fixes that for free. April stops at 30, February is 28 or 29 "
            "depending on the year you actually asked for, and the calendar layout can start "
            "each month on its true weekday. The circular layout — one wedge a day around a "
            "ring, with the year in the middle — is the variant people buy on Etsy and that no "
            "generator offers.",
            "The legend is what decides whether the sheet still makes sense next January, so it "
            "gets real room: one to twelve entries, each with a swatch to colour and either the "
            "label you typed or a ruled line long enough to write on. A5 and A6 are on the paper "
            "list, because a planner insert is the format this is actually used in.",
        ],
        "presets": [
            ("Mood tracker", "Five moods on a grid, A5",
             {"paper": "a5", "layout": "grid", "categories": "5", "title": "Mood",
              "labels": "Great\nGood\nOK\nLow\nRough"}),
            ("Habit tracker", "Ten habits, circles, A5",
             {"paper": "a5", "layout": "grid", "shape": "circle", "categories": "10",
              "title": "Habits"}),
            ("Circular year", "One wedge a day, the year in the middle",
             {"paper": "a5", "layout": "circular", "categories": "5", "title": "Mood"}),
            ("A6 planner insert", "Pocket binder size, five moods",
             {"paper": "a6", "layout": "grid", "categories": "5"}),
            ("Calendar layout", "Twelve mini months on their true weekdays",
             {"paper": "a4", "layout": "calendar", "categories": "5", "dayNumbers": "1"}),
            ("Sleep tracker", "Rounded cells, five bands, A4",
             {"paper": "a4", "layout": "grid", "shape": "rounded", "categories": "5",
              "title": "Sleep", "labels": "8+ hrs\n7 hrs\n6 hrs\n5 hrs\nUnder 5"}),
        ],
        "faq": [
            ("Why does the year matter?",
             "Because a printed grid cannot know it. Naming the year is what lets the sheet give "
             "February 29 days in a leap year and 28 otherwise, stop April at 30, and start each "
             "month of the calendar layout on the weekday it really starts on. The cells that are "
             "not days are simply absent rather than left as traps."),
            ("What do I put in the legend?",
             "Whatever the colours mean. Five moods is the usual, ten habits is the other common "
             "one. Type the labels and they are printed; leave them empty and you get a swatch "
             "and a ruled line to fill in by hand."),
            ("Will it fit my planner?",
             "A5 and A6 are both on the paper list and both print at true size, so an A6 insert "
             "really is 105 by 148 mm. A5 is the default here for that reason."),
            ("What is the circular one?",
             "The same year as a ring: one wedge per day, the months ticked and named around the "
             "outside, and the year itself in the hole in the middle. It is the version sold as a "
             "print, and it is the same data as the grid."),
            ("Can I use it for something other than mood?",
             "Yes — it is a cell a day and a legend, so habits, sleep, exercise, migraines, "
             "weather or reading all work the same way. Set the title and the legend to suit."),
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
    _page["navSlug"] = "cross-stitch-paper"
    _page["links"] = ("Cross stitch paper by count",
                      [_HUB_LINK] + [_count_link(other) for other in COUNT_PAGES
                                     if other["slug"] != _page["slug"]])

for _tool in TOOLS:
    if _tool["slug"] == "cross-stitch-paper":
        _tool["links"] = ("Cross stitch paper by count",
                          [_count_link(other) for other in COUNT_PAGES])


# ---------------------------------------------------------------------------
# Ruling and geometry variants.
#
# The same machinery as the count pages, pointed at the three generators people
# actually search for by ruling name. Nobody types "graph paper generator"; they
# type "5mm graph paper", "college ruled paper", "isometric graph paper". Each
# entry below is a real product with its own history and its own audience, and
# each carries its own hand-written paragraph and its own hand-written question
# — a dozen pages that differ only in a number are worth nothing.
#
# `preset` becomes window.PP_PRESET, so the generator opens already set to the
# ruling the page is about and Reset returns to that ruling rather than to the
# generic default. Value types have to match the control types: a number control
# wants an int or float, a select wants a string.
# ---------------------------------------------------------------------------

RULING_VARIANTS = [
    # ---- new geometries -------------------------------------------------
    {
        "slug": "isometric-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Isometric graph paper",
        "card": "Vertical and 30° lines · for 3D sketching",
        "title": "Isometric Graph Paper — Free Printable, True Scale, Any Triangle Size",
        "desc": "Free printable isometric graph paper at true 1:1 scale. A vertical line and two "
                "at 30 degrees, in any triangle size you like, drawn in the browser and printed "
                "at the size you asked for.",
        "lede": "A vertical and two lines thirty degrees off horizontal — the three axes of an "
                "isometric drawing, at whatever triangle size you need.",
        "preset": {"geometry": "isometric", "preset": "custom", "spacing": 10, "accentEvery": 0},
        "closing":
            "A 10 mm triangle side puts the lines 8.66 mm apart, which is the triangle height "
            "and the number a ruler laid across the sheet will actually read. Everything else "
            "the graph paper generator does is still here — paper size, orientation, margin, "
            "line weight and colour — and the geometry control switches to hexagons or polar "
            "without leaving the page.",
        "scale_faq": (
            "How do I check the triangles printed at the right size?",
            "Measure across ten triangle sides rather than one — errors of a percent or two are "
            "invisible over 10 mm and obvious over 100. At the default setting ten sides is "
            "exactly 100 mm. If you get 94, your print dialogue was set to fit to page rather "
            "than 100 percent."),
        "intro": [
            "Isometric paper is built around a single fact about isometric projection: the three "
            "axes of a cube land on the page as a vertical and two lines thirty degrees off "
            "horizontal. Draw along those three directions and a box comes out looking like a "
            "box, with no vanishing point to judge and no foreshortening to guess at. That is "
            "why it is the paper on every drawing board where pipework, ductwork and cabinetry "
            "get sketched before anyone opens CAD.",
            "The thing that makes it hard to buy is the size. Pipe isometrics want a coarse grid "
            "so a run of pipe crosses several triangles; a jewellery or joinery sketch wants a "
            "fine one. Printed pads come in one size and you take what you are given. Here the "
            "triangle side is a number you type, so a 5 mm grid and a 15 mm grid are the same "
            "two seconds of work.",
            "Every line runs to the edge of the printable area and stops exactly there, so the "
            "sheet has no half-triangles stranded in the margin and no white gutter where the "
            "grid gave up early. If you want the horizontal-and-sixty-degree arrangement instead "
            "— the one usually sold as triangle paper — switch the geometry control to "
            "Triangular; it is the same lattice turned a quarter turn.",
        ],
        "faq": [
            ("Is isometric paper the same as triangle paper?",
             "They are the same lattice at different rotations. Isometric paper has a vertical "
             "line and two at 30 degrees, which matches the axes of an isometric drawing. "
             "Triangle paper has a horizontal line and two at 60 degrees. Both are on this page "
             "— the geometry control switches between them."),
            ("What triangle size should I use for pipe isometrics?",
             "Around 10 mm is the usual working size: coarse enough that a run of pipe covers "
             "several triangles and fittings have room to be annotated, fine enough that a whole "
             "spool fits on one sheet. Detail sketches often drop to 5 mm."),
        ],
    },
    {
        "slug": "hexagonal-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Hexagonal graph paper",
        "card": "Whole hexagons, any side length, flat or pointy top",
        "title": "Hexagonal Graph Paper — Free Printable Hex Grid, Any Size",
        "desc": "Free printable hexagonal graph paper. Choose the hexagon side length in "
                "millimetres and flat-top or pointy-top, and get whole hexagons at true 1:1 "
                "scale with nothing cut off at the edges.",
        "lede": "Whole hexagons at the side length you ask for, flat-top or pointy-top, printed "
                "at true size.",
        "preset": {"geometry": "hex-pointy", "hexSide": 10},
        "closing":
            "A hexagon quoted by its side length has two widths worth knowing, and the caption "
            "control prints both on the sheet: turn it on and the page tells you its own side, "
            "its width across the flats, and how many cells it drew. That is a sheet that can "
            "be checked against a ruler months later without remembering what it was set to.",
        "scale_faq": (
            "How do I check the hexagons printed at the right size?",
            "Measure across the flats — the shorter of the two widths — because it is the one "
            "with two parallel edges to lay a ruler against. A 10 mm side is 17.32 mm across the "
            "flats. Turning the caption on prints that figure on the sheet, so the paper can "
            "check itself."),
        "intro": [
            "Two quite separate crowds print hex paper, and they want it turned different ways. "
            "Tabletop maps use pointy-top hexes, because a pointy-top grid has clean columns and "
            "the standard hex-numbering conventions assume them. Organic chemistry uses flat-top, "
            "because that is the orientation a benzene ring is conventionally drawn in and a "
            "fused ring system reads correctly along the horizontal. Both are here, and the "
            "control that switches them is the geometry select.",
            "The size that matters is the side length, not the width, because a hexagon has two "
            "widths and people quote whichever suits them. A hexagon with a 10 mm side is 20 mm "
            "across the points and 17.32 mm across the flats — the sheet will tell you both "
            "figures if you turn the caption on. A 25 mm hex map tile and a 5 mm chemistry grid "
            "come off the same page.",
            "Only whole hexagons are drawn. A grid of hexes cannot fill a rectangle exactly, so "
            "the honest options are a ragged edge of complete cells or a fringe of half-cells "
            "sliced by the margin; this draws complete cells and centres the block they make. "
            "The edge steps in and out by half a hex on alternate rows, which is exactly what a "
            "printed hex pad does.",
        ],
        "faq": [
            ("Flat-top or pointy-top — which do I want?",
             "Pointy-top for tabletop maps and hex-and-counter wargames, where the numbering "
             "conventions assume clean vertical columns. Flat-top for chemistry, where it is the "
             "orientation a benzene ring is drawn in."),
            ("Why is the edge of the grid ragged rather than straight?",
             "Because hexagons do not tile a rectangle. Every other row sits half a cell across, "
             "so a straight edge would mean slicing hexes in half at the margin. Whole cells with "
             "a stepped edge is what printed hex paper does, and it is what you get here."),
        ],
    },
    {
        "slug": "polar-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Polar graph paper",
        "card": "Rings and spokes · any radial step, any spoke angle",
        "title": "Polar Graph Paper — Free Printable Polar Grid, True Scale",
        "desc": "Free printable polar graph paper: concentric rings at any radial step you choose "
                "and spokes at any angle, drawn at true 1:1 scale so a measured radius is a "
                "measured radius.",
        "lede": "Concentric rings at the radial step you choose, with spokes at the angle you "
                "choose, printed at true size.",
        "preset": {"geometry": "polar", "polarStep": 10, "polarSpoke": 15, "accentEvery": 5},
        "closing":
            "The two heavy lines are the axes, at 0 and 90 degrees, rather than every fifth "
            "spoke — counting spokes puts heavy lines at arbitrary angles and makes the sheet "
            "look misprinted. Heavy rings still count outwards at whatever interval you set, "
            "which is what makes a radius readable at a glance on a dense plot.",
        "scale_faq": (
            "How do I check the rings printed at the right size?",
            "Measure the full diameter of the outermost ring rather than the gap between two "
            "rings, because the diameter is the longest distance on the sheet and therefore the "
            "one where a scaling error shows up most. At the default ten rings of 10 mm on "
            "Letter that diameter is 180 mm."),
        "intro": [
            "Polar paper plots a point as a distance and an angle rather than as two distances, "
            "which is the natural way to describe anything that goes round: a cardioid microphone "
            "pattern, an antenna radiation plot, a rose curve, a wind rose, the sweep of a "
            "compass bearing. On square paper those all have to be converted to x and y first, "
            "which is arithmetic nobody enjoys and a fresh chance to make a mistake.",
            "The two numbers that decide whether a polar sheet is any use are the radial step and "
            "the spoke angle. A 15-degree spoke gives twenty-four sectors, which suits compass "
            "work; 30 degrees gives twelve and keeps a busy plot readable; 10 gives thirty-six "
            "for anything needing fine angular resolution. The radial step is whatever your data "
            "measures in, and the rings are drawn at that exact distance apart on paper.",
            "The outermost ring is sized to fit inside the shorter side of the printable area, "
            "which means the whole plot is always on the page — no ring running off the edge and "
            "no guessing at where the scale ended. Turn the heavy-line setting up and every fifth "
            "ring is drawn heavier, which makes counting outwards from the centre much faster.",
        ],
        "faq": [
            ("How many spokes should I use?",
             "Fifteen degrees gives twenty-four spokes and is the usual default — it puts a line "
             "on every compass point and every hour of a clock face. Thirty degrees gives twelve "
             "and keeps a dense plot legible. Ten gives thirty-six for fine angular work."),
            ("Do the rings print at their real size?",
             "Yes, provided your print dialogue is not scaling. A 10 mm radial step measures "
             "10 mm on the paper with a ruler. If it does not, the print was scaled to fit — the "
             "calibration page will confirm it in one sheet."),
        ],
    },
    {
        "slug": "engineering-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Engineering paper",
        "card": "5 squares per inch, green, with a border",
        "title": "Engineering Paper — Free Printable Engineer's Computation Pad Grid",
        "desc": "Free printable engineering paper: the 5-squares-to-the-inch green grid of an "
                "engineer's computation pad, with a border, at true 1:1 scale.",
        "lede": "The five-to-the-inch green grid of an engineer's computation pad, bordered and "
                "printed at true size.",
        "preset": {"geometry": "square", "preset": "fifth-inch", "accentEvery": 5,
                   "colour": "green", "border": True, "lineWidth": 0.1},
        "closing":
            "The pale green and the border are set the way a pad would be, but both are just "
            "controls: grey lines scan far better than green, and the border comes off with one "
            "click when the sheet is going into something else. The spacing underneath stays "
            "5.08 mm whatever you do to the colour.",
        "scale_faq": (
            "How do I check the grid printed at the right size?",
            "Count five squares and measure: that distance has to be exactly one inch, or "
            "25.4 mm. Five squares is the right test rather than one, because a single 5.08 mm "
            "square is too small to tell 5.08 from 5.00 with a ruler."),
        "intro": [
            "An engineer's computation pad is a specific object: pale green paper, a grid of five "
            "squares to the inch, a heavier line every fifth square so the inches read at a "
            "glance, and a printed border. The convention comes from pads where the grid was "
            "printed on the back of the sheet and showed through faintly, so a drawing could be "
            "laid out on the grid and then photocopied without the grid coming with it.",
            "Five squares to the inch is a fifth of an inch, or 5.08 mm — very nearly but not "
            "quite the 5 mm of European graph paper. The difference is under two percent, which "
            "sounds like nothing until you scale a drawing off it and find every dimension is out "
            "by the same two percent. If a US course or a US drawing standard asked for "
            "engineering paper, it means the inch-based grid, and that is what this page opens at.",
            "The green line colour and the border are set for you, as they would be on a pad, but "
            "both are ordinary controls — grey lines suit a scan far better than green does, and "
            "the border comes off with one click if you are pasting the sheet into something else.",
        ],
        "faq": [
            ("Is engineering paper the same as 5 mm graph paper?",
             "No, though the two are close enough to be confused. Engineering paper is five "
             "squares to the inch, which is 5.08 mm. It is about 1.6 percent coarser than 5 mm "
             "paper — irrelevant for rough work, and not irrelevant if you are scaling dimensions "
             "off the drawing."),
            ("Why is engineering paper green?",
             "Because the grid was traditionally printed on the reverse of the sheet in a pale "
             "green that showed through faintly, so it guided the drawing without reproducing "
             "when the sheet was copied. The colour stuck as a convention long after the reason "
             "for it did."),
        ],
    },

    # ---- graph paper rulings -------------------------------------------
    {
        "slug": "5mm-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "5 mm graph paper",
        "card": "5 mm squares · the metric standard",
        "title": "5mm Graph Paper — Free Printable 5 mm Squares, True Scale",
        "desc": "Free printable 5 mm graph paper at true 1:1 scale. The standard metric square, "
                "with a heavy line every five squares, printed at exactly 5 mm so a ruler agrees.",
        "lede": "Five millimetre squares, the metric standard, printed at exactly five "
                "millimetres.",
        "preset": {"geometry": "square", "preset": "5mm", "accentEvery": 5},
        "closing":
            "On Letter with a 10 mm margin this comes out at 39 squares across and 51 down, all "
            "of them whole — the generator counts complete squares and centres them, so the "
            "leftover millimetre or two is split between the two edges rather than left as a "
            "sliver of a square at the bottom right.",
        "scale_faq": (
            "How do I check the squares printed at exactly 5 mm?",
            "Count twenty squares — four heavy blocks — and measure. That span is exactly 100 mm, "
            "and a whole decimetre is far easier to read accurately off a ruler than a single "
            "5 mm square is. If it comes out at 94 or 96, the print was scaled to fit."),
        "intro": [
            "Five millimetre squares are the default grid across most of the world outside the "
            "United States. It is what a European school exercise book is ruled with, what a "
            "bullet journal grid almost always is, and the ruling most cross-stitch and knitting "
            "charts assume when they say \"graph paper\" without qualifying it. If you are "
            "printing a sheet for someone else to use and you do not know what they want, this "
            "is the safe answer.",
            "The heavy line every fifth square makes each block a centimetre, which is the whole "
            "reason the ruling works so well. You can count in centimetres without counting at "
            "all, and a measurement read off the page needs no arithmetic — four blocks and two "
            "squares is 4.2 cm and nothing had to be worked out.",
            "It is worth knowing what 5 mm is not. It is not a quarter inch, which is 6.35 mm and "
            "visibly coarser, and it is not the five-to-the-inch grid of engineering paper, which "
            "is 5.08 mm. Both are close enough to look right and far enough out to ruin a scaled "
            "drawing.",
        ],
        "faq": [
            ("Is 5 mm graph paper the same as quarter inch?",
             "No. A quarter inch is 6.35 mm, so quarter-inch squares are about 27 percent larger "
             "in area than 5 mm ones. They look similar on screen and are obviously different "
             "under a ruler."),
            ("Why does 5 mm paper have a heavy line every fifth square?",
             "So that each heavy block is exactly one centimetre. It turns counting squares into "
             "reading centimetres, which is most of the point of a metric grid."),
        ],
    },
    {
        "slug": "1cm-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "1 cm graph paper",
        "card": "10 mm squares · big enough to write in",
        "title": "1cm Graph Paper — Free Printable 1 Centimetre Squares, True Scale",
        "desc": "Free printable 1 cm graph paper at true 1:1 scale. Centimetre squares big enough "
                "to write a number inside, for coordinate work, area problems and floor plans.",
        "lede": "Centimetre squares — big enough to write inside, which is most of why people "
                "want them.",
        "preset": {"geometry": "square", "preset": "1cm", "accentEvery": 0},
        "closing":
            "A centimetre grid is also the easiest ruling to sanity-check, because ten squares "
            "is a decimetre and any ruler shows that at a glance. If you want 5 cm blocks marked "
            "for a large plan, set the heavy line control to every fifth square; it is off here "
            "because at this spacing the lines are already countable.",
        "scale_faq": (
            "How do I check the squares printed at exactly 1 cm?",
            "Lay a ruler across ten squares. That should read 10 cm exactly. Checking ten rather "
            "than one turns a two percent scaling error from something invisible into two "
            "millimetres you can see."),
        "intro": [
            "A centimetre square is big enough to write a number in, and that single property is "
            "why primary and lower-secondary maths runs on it. Counting squares for area, "
            "plotting coordinates, drawing a bar chart one square per unit, sketching a room to "
            "scale — all of them need the square to hold a digit legibly, and 5 mm does not.",
            "It is also the ruling to reach for when the grid is a measuring tool rather than a "
            "writing surface. A floor plan at one centimetre to the metre, a garden bed laid out "
            "at one square per foot, a seating plan — anything where you want to count squares "
            "across a room and get an answer without a calculator.",
            "The heavy-line setting is off here, because on a centimetre grid the lines are "
            "already far enough apart to count and a heavy line every five would just make the "
            "sheet busy. Turn it on if you want 5 cm blocks marked for a large plan.",
        ],
        "faq": [
            ("Is 1 cm graph paper the same as 10 mm?",
             "Yes, exactly — a centimetre is ten millimetres. They are two names for this sheet."),
            ("What is 1 cm graph paper used for?",
             "Mostly school maths where something has to be written inside the square: area by "
             "counting, coordinate plotting, bar charts at one square per unit. Also scale plans, "
             "where one square standing for one metre or one foot makes a room countable."),
        ],
    },
    {
        "slug": "quarter-inch-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Quarter inch graph paper",
        "card": "6.35 mm squares · 4 squares per inch",
        "title": "Quarter Inch Graph Paper — Free Printable 4 Squares Per Inch",
        "desc": "Free printable quarter inch graph paper — four squares to the inch, 6.35 mm — at "
                "true 1:1 scale, with a heavy line every four squares to mark the inches.",
        "lede": "Four squares to the inch, which is 6.35 mm — the American classroom default.",
        "preset": {"geometry": "square", "preset": "quarter-inch", "accentEvery": 4},
        "closing":
            "The heavy line is set to every fourth square here rather than every fifth, which is "
            "the change that makes the sheet imperial rather than metric-with-inch-squares: one "
            "heavy block is one inch, so a dimension in inches and quarters reads straight off "
            "the page.",
        "scale_faq": (
            "How do I check the squares printed at exactly a quarter inch?",
            "Measure across four squares — one heavy block — which has to be exactly one inch. "
            "Measure across sixteen for a four-inch check if your ruler is long enough; the "
            "longer the run, the smaller the scaling error you can catch."),
        "intro": [
            "Quarter inch is the American classroom default, the ruling in the composition books "
            "and the loose-leaf pads sold as \"graph paper\" without further explanation in the "
            "US. Four squares to the inch, 6.35 mm a side, and — with the heavy line set to every "
            "fourth square, as it is here — one heavy block per inch.",
            "The imperial arithmetic is what makes it worth having rather than substituting 5 mm. "
            "One square is a quarter inch, two are a half, and a block is an inch, so a "
            "measurement in inches and quarters reads straight off the sheet without conversion. "
            "That is exactly what quilting, woodworking layout and any US-dimensioned drawing "
            "wants.",
            "Do not swap it for 5 mm paper on the grounds that they look alike. A quarter inch is "
            "6.35 mm, twenty-seven percent more square area, and a pattern printed on the wrong "
            "one comes out the wrong size in a way you will not notice until it is cut.",
        ],
        "faq": [
            ("What is 4 squares per inch?",
             "It is quarter-inch paper described the other way round. Four squares to an inch "
             "means each square is a quarter of an inch, or 6.35 mm — the same sheet."),
            ("Can I use 5 mm paper instead of quarter inch?",
             "Only for rough work. A quarter inch is 6.35 mm, so anything you scale off the sheet "
             "will come out 27 percent smaller in area than intended. For a quilt block or a "
             "cutting layout that matters a great deal."),
        ],
    },
    {
        "slug": "half-inch-graph-paper",
        "js": "graph-paper",
        "family": "graph-paper",
        "h1": "Half inch graph paper",
        "card": "12.7 mm squares · 2 squares per inch",
        "title": "Half Inch Graph Paper — Free Printable 2 Squares Per Inch, True Scale",
        "desc": "Free printable half inch graph paper — two squares to the inch, 12.7 mm — at true "
                "1:1 scale. The coarse grid for large plans, early-years maths and quilt layouts.",
        "lede": "Two squares to the inch, 12.7 mm a side — the coarse grid, for when you need room "
                "inside the square.",
        "preset": {"geometry": "square", "preset": "half-inch", "accentEvery": 2},
        "closing":
            "Half-inch squares are large enough that the centring matters visually: the "
            "generator fits whole squares only and splits the leftover between the two edges, "
            "which on a coarse grid is the difference between a sheet that looks deliberate and "
            "one that looks as though it slipped in the printer.",
        "scale_faq": (
            "How do I check the squares printed at exactly half an inch?",
            "Two squares should measure one inch, and eight should measure four. Use the longer "
            "run: at this size a printer scaling to 96 percent still leaves each individual "
            "square looking perfectly plausible."),
        "intro": [
            "Half inch is the coarse end of the imperial gradation, and it is chosen for room "
            "rather than precision. Twelve and a half millimetres is enough to write a two-digit "
            "number in comfortably, enough to colour a square without slipping over the line, and "
            "enough that a grid still reads clearly from across a classroom on a projected or "
            "photocopied sheet.",
            "It is the standard grid for early-years number work for exactly that reason, and it "
            "is the one quilters reach for when a block is being planned at half an inch to the "
            "inch. Two squares to the inch also makes it the easiest imperial ruling to count in: "
            "a heavy line every second square, as set here, puts one block on every inch.",
            "If half an inch turns out to be too generous, quarter inch is the next step down and "
            "twice as fine. If it is still too tight for what you are writing, the same generator "
            "will draw one-inch squares — set the spacing control to 1 inch.",
        ],
        "faq": [
            ("What is half inch graph paper used for?",
             "Early-years number work, where a digit has to fit inside a square; quilt block "
             "planning at half an inch to the inch; and any large-format sketch where a fine grid "
             "would be unreadable at a distance."),
            ("How many half-inch squares fit on a sheet of Letter?",
             "With a 10 mm margin, fifteen across and twenty down — 12.7 mm squares in 195.9 mm "
             "of usable width. The generator counts whole squares only and centres them, so "
             "nothing is cut off at the edge."),
        ],
    },

    # ---- lined paper rulings -------------------------------------------
    {
        "slug": "college-ruled-paper",
        "js": "lined-paper",
        "family": "lined-paper",
        "h1": "College ruled paper",
        "card": "7.1 mm line spacing · the US default",
        "title": "College Ruled Paper — Free Printable 7.1 mm Ruling, True Scale",
        "desc": "Free printable college ruled paper at true 1:1 scale: 7.1 mm between lines, the "
                "standard US high school and college ruling, with a margin line.",
        "lede": "Seven point one millimetres between lines — the US high school and college "
                "standard, at true size.",
        "preset": {"preset": "college"},
        "closing":
            "The margin line, the line colour and how far down the first line starts are all "
            "still yours to set — this page only fixes the spacing. That matters more than it "
            "sounds, because the margin line is the part of a ruled sheet that printed pads get "
            "wrong most often for anyone left-handed.",
        "scale_faq": (
            "How do I check the ruling printed at 7.1 mm?",
            "Measure across ten line gaps rather than one: that span should be 71 mm. A single "
            "7.1 mm gap is far too short to tell apart from a 6.8 mm one by eye, and a printer "
            "shrinking to fit takes off about that much."),
        "intro": [
            "College ruled is nine thirty-seconds of an inch between lines, which comes to "
            "7.14 mm and is advertised everywhere as 7.1. It is the default ruling for American "
            "high school and university paper, and the reason it became the default is straight "
            "arithmetic: it fits about a third more lines on a page than wide ruled does, which "
            "matters when you are taking lecture notes at speed.",
            "It suits handwriting that has stopped growing. Most people write comfortably at "
            "college ruling from around the age of twelve, and adults with small handwriting "
            "often find even this generous. Below it, narrow ruled at 6.4 mm is the next step "
            "down, and it is where most printed notebooks stop.",
            "This page opens the lined paper generator already set to college ruling. Everything "
            "else — the margin line, the line colour, how many lines fit the sheet — is still "
            "yours to change, and the spacing measures 7.1 mm on the paper with a ruler provided "
            "the print dialogue is not scaling to fit.",
        ],
        "faq": [
            ("What is the exact spacing of college ruled paper?",
             "Nine thirty-seconds of an inch, which is 7.14 mm. It is universally quoted as "
             "7.1 mm and that is the figure this generator draws."),
            ("Is college ruled the same as medium ruled?",
             "Yes. Medium ruled is the older name for the same 7.1 mm spacing; the two terms are "
             "used interchangeably, with \"college ruled\" dominant in the US and \"medium "
             "ruled\" more common in stationery catalogues."),
        ],
    },
    {
        "slug": "wide-ruled-paper",
        "js": "lined-paper",
        "family": "lined-paper",
        "h1": "Wide ruled paper",
        "card": "8.7 mm line spacing · for larger handwriting",
        "title": "Wide Ruled Paper — Free Printable 8.7 mm Ruling, True Scale",
        "desc": "Free printable wide ruled paper at true 1:1 scale: 8.7 mm between lines, the "
                "standard US elementary school ruling, with a margin line.",
        "lede": "Eight point seven millimetres between lines — the elementary school ruling, for "
                "handwriting that needs the room.",
        "preset": {"preset": "wide"},
        "closing":
            "Because the sheet is generated rather than downloaded, the ruling is not the only "
            "thing you can loosen. A paler line helps a reader who finds a dark ruling "
            "competing with their own handwriting, and that is a one-click change here and "
            "impossible on a printed pad.",
        "scale_faq": (
            "How do I check the ruling printed at 8.7 mm?",
            "Ten line gaps should span 87 mm. If you get 82 or 83, the print was scaled — turn "
            "off fit to page and print at 100 percent, then measure again."),
        "intro": [
            "Wide ruled is eleven thirty-seconds of an inch, or 8.73 mm, and it exists for "
            "handwriting that has not finished shrinking. Children's letterforms are physically "
            "larger than adults', not because of habit but because fine motor control develops "
            "before the fine motor precision that lets you write small, and cramming that "
            "handwriting into a college ruling produces the same illegible result every time.",
            "It is also the ruling to choose for anyone whose vision or grip makes a tight line "
            "hard work, which is a much larger group than the elementary-school framing suggests. "
            "A millimetre and a half more between lines is the difference between a page someone "
            "can read back and one they cannot.",
            "Wide ruled is sometimes called legal ruled, which is confusing and worth "
            "disentangling: the ruling is the same 8.7 mm, but legal-ruled pads are usually "
            "printed on legal-size paper with a double margin line down the left. The paper size "
            "and the ruling are separate choices, and both are controls on this page.",
        ],
        "faq": [
            ("What is the difference between wide ruled and college ruled?",
             "Spacing, and nothing else. Wide ruled is 8.7 mm between lines; college ruled is "
             "7.1 mm. Wide fits roughly a quarter fewer lines on the same sheet."),
            ("Is wide ruled the same as legal ruled?",
             "The line spacing is the same 8.7 mm. \"Legal ruled\" usually also implies "
             "legal-size paper and a double margin line at the left. Paper size and ruling are "
             "separate controls here, so you can have either or both."),
        ],
    },
    {
        "slug": "narrow-ruled-paper",
        "js": "lined-paper",
        "family": "lined-paper",
        "h1": "Narrow ruled paper",
        "card": "6.4 mm line spacing · the tightest common ruling",
        "title": "Narrow Ruled Paper — Free Printable 6.4 mm Ruling, True Scale",
        "desc": "Free printable narrow ruled paper at true 1:1 scale: 6.4 mm between lines, the "
                "tightest ruling in common use, for small handwriting and dense notes.",
        "lede": "Six point four millimetres between lines — the tightest ruling in common use.",
        "preset": {"preset": "narrow"},
        "closing":
            "At this spacing the line weight starts to matter as much as the spacing does. A "
            "0.12 mm line disappears politely behind small handwriting; anything heavier starts "
            "competing with it. That is a control on this page, which is the advantage of "
            "generating the sheet rather than buying it.",
        "scale_faq": (
            "How do I check the ruling printed at 6.4 mm?",
            "Ten gaps should measure 64 mm — and at this spacing checking is worth the trouble, "
            "because a few percent of shrinkage on an already-tight ruling is what turns "
            "legible notes into a wall of overlapping descenders."),
        "intro": [
            "Narrow ruled is a quarter of an inch, 6.35 mm, quoted as 6.4. It is the tightest "
            "ruling sold as standard stationery and it fits about a fifth more lines on a page "
            "than college ruled does. If you write small and have spent years finding college "
            "ruling wasteful, this is the sheet you have been looking for.",
            "It is common in British and European exercise books, where it is often described "
            "simply as feint ruling, and it is what most bound notebooks aimed at adults use. "
            "The trade-off is unforgiving: at 6.4 mm there is no room for a descender to cross "
            "into the line below without touching it, so it rewards a disciplined hand and "
            "punishes a loose one.",
            "It is also the ruling to pick when the page is going to be scanned or photographed. "
            "More lines per sheet means fewer sheets, and at this spacing a full page of notes "
            "still reproduces cleanly at ordinary scan resolutions.",
        ],
        "faq": [
            ("How narrow is narrow ruled paper?",
             "A quarter of an inch — 6.35 mm, usually advertised as 6.4 mm. That is about "
             "0.7 mm tighter than college ruled and fits roughly a fifth more lines per page."),
            ("Is narrow ruled the same as feint ruled?",
             "In British and European usage, effectively yes: feint ruling is the ordinary "
             "exercise-book spacing at around 6 to 7 mm, and narrow ruled at 6.4 mm sits squarely "
             "in that range."),
        ],
    },
    {
        "slug": "5mm-dot-grid-paper",
        "js": "dot-grid-paper",
        "family": "dot-grid-paper",
        "h1": "5 mm dot grid paper",
        "card": "5 mm dot spacing · the bullet journal standard",
        "title": "5mm Dot Grid Paper — Free Printable Bullet Journal Dotted Paper",
        "desc": "Free printable 5 mm dot grid paper at true 1:1 scale — the bullet journal "
                "standard spacing, with adjustable dot size and colour.",
        "lede": "Five millimetre dot spacing, the bullet journal standard, printed at true size.",
        "preset": {"spacing": 5, "units": "mm"},
        "closing":
            "Dot size is the control worth playing with here. Printed notebooks pick one and "
            "you live with it; drop these to a faint 0.2 mm for a page that is going to be "
            "photographed for a spread, or fatten them up for anyone who needs to see the "
            "lattice clearly.",
        "scale_faq": (
            "How do I check the dots printed 5 mm apart?",
            "Count twenty gaps and measure: 100 mm exactly. Measure between dot centres rather "
            "than edges, since the dot has a width of its own and measuring edge to edge builds "
            "that width into every reading."),
        "intro": [
            "Five millimetres is the dot grid spacing that essentially every bullet journal "
            "notebook uses, and the reason dot grid won out over both lined and squared paper for "
            "that job is that dots guide without enclosing. A line tells you where to write; a "
            "grid of squares boxes you in and shows up around anything you draw. Dots do neither "
            "— they mark the lattice and then disappear behind whatever you put on top.",
            "The spacing is small enough to write between two dots and large enough that a "
            "spread does not read as texture. It also happens to make the arithmetic trivial: two "
            "dots to the centimetre, so a spread laid out in dots converts to millimetres without "
            "thinking, which matters when you are drawing a monthly grid to fit a page exactly.",
            "Because this is a generator rather than a fixed PDF, the dot itself is adjustable "
            "too. Printed notebooks pick a dot size and you live with it; here you can drop the "
            "dots to a faint 0.2 mm for a page that is going to be photographed, or fatten them "
            "up for someone who needs to see them clearly.",
        ],
        "faq": [
            ("What dot spacing do bullet journals use?",
             "5 mm, almost universally. Leuchtturm1917, Rhodia, Scribbles That Matter and the "
             "rest all print 5 mm dot grids, which is why a spread copied from one notebook fits "
             "another."),
            ("Why dots rather than a square grid?",
             "Because dots guide without enclosing. A printed square grid shows up around every "
             "box you draw and behind every block of text; dots mark the same lattice and vanish "
             "behind whatever you put on the page."),
        ],
    },
]


def ruling_variant_pages():
    """Expand RULING_VARIANTS into full page dicts.

    Every page closes on the true-scale promise, but the closing paragraph and
    the scale question are written per variant rather than appended from a
    template. A dozen pages ending in the same paragraph is exactly the thin
    content this family exists to avoid, and a shared closer is still a shared
    closer however good it is.
    """
    pages = []
    seen_intro = {}
    seen_faq = {}
    for spec in RULING_VARIANTS:
        page = dict(spec)
        page["intro"] = list(spec["intro"]) + [spec["closing"]]
        page["faq"] = list(spec["faq"]) + [spec["scale_faq"]]
        del page["closing"]
        del page["scale_faq"]
        for para in page["intro"]:
            if para in seen_intro:
                raise SystemExit("intro paragraph shared by %s and %s"
                                 % (seen_intro[para], page["slug"]))
            seen_intro[para] = page["slug"]
        for item in page["faq"]:
            if item in seen_faq:
                raise SystemExit("FAQ shared by %s and %s" % (seen_faq[item], page["slug"]))
            seen_faq[item] = page["slug"]
        pages.append(page)
    return pages


VARIANT_PAGES = ruling_variant_pages()

# Each family cross-links to its siblings and back to the generator it opens, so
# the set is navigable rather than a dozen orphans hanging off the sitemap.
_FAMILY_HUB = {
    "graph-paper": ("Graph paper by ruling and geometry", "/graph-paper/",
                    "Graph paper, any ruling", "The full generator — any spacing, six geometries"),
    "lined-paper": ("Lined paper by ruling", "/lined-paper/",
                    "Lined paper, any ruling", "The full generator — any spacing, plus handwriting guides"),
    "dot-grid-paper": ("Dot grid paper", "/dot-grid-paper/",
                       "Dot grid paper, any spacing", "The full generator — square or triangular lattice"),
}


def _variant_link(page):
    return ("/%s/" % page["slug"], page["h1"], page["card"])


for _page in VARIANT_PAGES:
    _page["navSlug"] = _page["family"]
    _heading, _hub_href, _hub_label, _hub_blurb = _FAMILY_HUB[_page["family"]]
    _siblings = [_variant_link(o) for o in VARIANT_PAGES
                 if o["family"] == _page["family"] and o["slug"] != _page["slug"]]
    _page["links"] = (_heading, [(_hub_href, _hub_label, _hub_blurb)] + _siblings)

for _tool in TOOLS:
    if _tool["slug"] in _FAMILY_HUB:
        _heading = _FAMILY_HUB[_tool["slug"]][0]
        _tool["links"] = (_heading, [_variant_link(o) for o in VARIANT_PAGES
                                     if o["family"] == _tool["slug"]])

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
    """The menu, with the active tool marked.

    A variant page passes its parent generator's slug, not its own: a visitor on
    /5mm-graph-paper/ is using the graph paper tool, and leaving every nav item
    unmarked because the exact slug is not in the menu tells them nothing about
    where they are."""
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
    return (head(page["title"], page["desc"], canonical, extra)
            .replace("{nav}", nav_html(page.get("navSlug", page["slug"])))
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
            "year in pixels charts, savings challenge charts, EPP templates, bubble "
            "answer sheets, clock faces, periodic tables and attendance sheets.")
    cards = "\n".join(
        '<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
        % (t["slug"], sx.escape(t["h1"]), sx.escape(t["lede"].split(".")[0]))
        for t in TOOLS
    )
    variant_cards = "\n".join(
        '<li><a href="/%s/"><strong>%s</strong><span>%s</span></a></li>'
        % (t["slug"], sx.escape(t["h1"]), sx.escape(t["card"]))
        for t in VARIANT_PAGES
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
    <h2>Straight to the ruling you were looking for</h2>
    <p>Nobody searches for a graph paper generator; they search for 5 mm graph paper, or college
    ruled, or isometric. These open the right generator already set to that ruling.</p>
  </div>
  <ul class="tool-cards">
    {variant_cards}
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

    for page in TOOLS + PAGES + COUNT_PAGES + VARIANT_PAGES:
        write_page(page["slug"], tool_page(page))

    for slug, nav, title, desc, paras in LEGAL:
        write_page(slug, legal_page(slug, nav, title, desc, paras))

    urls = [SITE + "/"]
    urls += ["%s/%s/" % (SITE, p["slug"]) for p in TOOLS + PAGES + COUNT_PAGES + VARIANT_PAGES]
    urls += ["%s/%s/" % (SITE, s) for s, *_ in LEGAL]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append("  <url><loc>%s</loc></url>" % u)
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")

    print("built %d pages" % (len(TOOLS) + len(PAGES) + len(COUNT_PAGES)
                                + len(VARIANT_PAGES) + len(LEGAL) + 2))


if __name__ == "__main__":
    main()
