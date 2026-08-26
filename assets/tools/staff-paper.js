/* paperprintouts.com — staff and tablature paper.
 *
 * Six systems share one page layout:
 *
 *   staff5      a single five-line staff
 *   grand       two five-line staves joined by a brace and a systemic barline
 *   tab6        six-line guitar tablature
 *   tab4bass    four-line bass tablature
 *   tab4uke     four-line ukulele tablature
 *   staffTab    a five-line staff over six-line tab, joined as one system
 *
 * Two independent size numbers, both of which a ruler can check:
 *
 *   staffHeight   bottom line to top line of a five-line staff. This is the
 *                 measurement rastral numbers name, so the rastral sizes are
 *                 presets on it rather than the other way round — almost
 *                 nobody looking for blank manuscript paper knows what No. 2
 *                 means, and everybody can measure 7.4 mm.
 *   tabSpacing    the gap between two adjacent tab lines. Tab is sized by what
 *                 has to fit between the lines (a two-digit fret number), not
 *                 by a notation convention, so it gets its own control instead
 *                 of being derived from the staff.
 *
 * NO CLEFS. A clef control is not shipped in v1, deliberately: a hand-drawn
 * treble clef that is nearly right is worse than an empty staff, and empty is
 * what commercial blank manuscript paper ships as anyway. The brace on the
 * grand staff IS drawn, because it is a curve rather than a glyph and it is
 * the thing that makes a grand staff recognisable.
 *
 * Every coordinate is a millimetre. The framework supplies the viewBox that
 * makes a millimetre here a millimetre on paper, so nothing may be scaled.
 */
(function () {
  'use strict';

  /* Rastral sizes: the engraver's traditional staff heights, in millimetres,
     measured from the bottom line to the top line of a five-line staff. */
  var RASTRAL = {
    r0: 9.2,
    r1: 7.9,
    r2: 7.4,
    r3: 7.0,
    r4: 6.5,
    r5: 6.0,
    r6: 5.5,
    r7: 4.8,
    r8: 3.7
  };

  var LINE_COLOURS = {
    black: '#222222',
    grey: '#8b8b8b',
    blue: '#5a7fae'
  };

  var TEXT_COLOUR = '#333333';

  /* Vertical space the title/composer block takes off the top. */
  var HEADER_BLOCK = 21;
  var HEADER_FONT = 3.6;
  var CAPTION_BLOCK = 7;
  var CAPTION_FONT = 2.8;

  /* How many ruled lines each system type draws, and how many staves it is. */
  var SYSTEMS = {
    staff5: { staves: 1, kind: 'staff', label: 'Five-line staff' },
    grand: { staves: 2, kind: 'staff', label: 'Grand staff' },
    tab6: { staves: 1, kind: 'tab', lines: 6, label: 'Six-line guitar tab' },
    tab4bass: { staves: 1, kind: 'tab', lines: 4, label: 'Four-line bass tab' },
    tab4uke: { staves: 1, kind: 'tab', lines: 4, label: 'Four-line ukulele tab' },
    staffTab: { staves: 2, kind: 'pair', lines: 6, label: 'Staff over tab' }
  };

  /* Values arrive from the URL as well as the form, so a key can be any string
     at all — '__proto__' included. Only ever accept a key the map owns. */
  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function round(n, dp) {
    var f = Math.pow(10, dp);
    return Math.round(n * f) / f;
  }

  function mm(n) {
    return round(n, 3);
  }

  function path(d, colour, width) {
    return '<path d="' + d + '" fill="none" stroke="' + colour +
      '" stroke-width="' + round(width, 3) +
      '" shape-rendering="geometricPrecision"/>';
  }

  function rule(x1, x2, y) {
    return 'M' + mm(x1) + ' ' + mm(y) + 'H' + mm(x2);
  }

  function vline(x, y1, y2) {
    return 'M' + mm(x) + ' ' + mm(y1) + 'V' + mm(y2);
  }

  function text(s, x, y, size, anchor, colour) {
    return '<text x="' + mm(x) + '" y="' + mm(y) +
      '" font-family="Helvetica, Arial, sans-serif" font-size="' + round(size, 2) +
      '" fill="' + (colour || TEXT_COLOUR) + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + PP.esc(s) + '</text>';
  }

  /* Estimated width of a short label. Nothing is measurable before it is in the
     document, so 0.58 em a character plus a little air is the working figure —
     over-estimating only shortens a rule slightly, under-estimating would run
     the text into it. */
  function labelWidth(s, size) {
    return s.length * size * 0.58 + 1.6;
  }

  /* A curly brace, drawn as a single stroked path rather than a filled outline
     with a swelling waist. A uniform-weight brace is what a ruled manuscript
     page has always had, and it is a shape that cannot come out subtly wrong
     the way a variable-width one can. Two mirrored S-curves meeting at a point
     on the left, tips at the top and bottom right. */
  function brace(x, y0, y1, colour, width) {
    var h = y1 - y0;
    var w = Math.min(h * 0.10, 5);
    var mid = (y0 + y1) / 2;
    var d = 'M' + mm(x + w) + ' ' + mm(y0) +
      ' C' + mm(x + w * 0.15) + ' ' + mm(y0 + h * 0.10) +
      ' ' + mm(x + w * 0.98) + ' ' + mm(y0 + h * 0.21) +
      ' ' + mm(x + w * 0.30) + ' ' + mm(mid - h * 0.055) +
      ' C' + mm(x + w * 0.12) + ' ' + mm(mid - h * 0.022) +
      ' ' + mm(x + w * 0.05) + ' ' + mm(mid - h * 0.008) +
      ' ' + mm(x) + ' ' + mm(mid) +
      ' C' + mm(x + w * 0.05) + ' ' + mm(mid + h * 0.008) +
      ' ' + mm(x + w * 0.12) + ' ' + mm(mid + h * 0.022) +
      ' ' + mm(x + w * 0.30) + ' ' + mm(mid + h * 0.055) +
      ' C' + mm(x + w * 0.98) + ' ' + mm(y1 - h * 0.21) +
      ' ' + mm(x + w * 0.15) + ' ' + mm(y1 - h * 0.10) +
      ' ' + mm(x + w) + ' ' + mm(y1);
    return '<path d="' + d + '" fill="none" stroke="' + colour +
      '" stroke-width="' + round(width, 3) +
      '" stroke-linecap="round" shape-rendering="geometricPrecision"/>';
  }

  /* Geometry of one system, before it is placed on the page. Returns the
     total height and the y offsets (relative to the system top) of each ruled
     block, so drawing and measuring never disagree. */
  function systemGeometry(spec, staffHeight, tabSpacing, tabLines) {
    var staffSpace = staffHeight / 4;
    var blocks = [];
    var h = 0;
    /* An explicit line count overrides the staff type's own: a five-string
       bass and a seven-string guitar are the same sheet with a line added, and
       forcing them onto the wrong instrument's page would be silly. */
    var lines = tabLines >= 3 ? tabLines : spec.lines;

    function tabHeight(n) {
      return (n - 1) * tabSpacing;
    }

    if (spec.kind === 'staff' && spec.staves === 1) {
      blocks.push({ type: 'staff', top: 0, height: staffHeight, lines: 5, step: staffSpace });
      h = staffHeight;
    } else if (spec.kind === 'staff') {
      /* Piano brace: the gap between the two staves is quoted in staff spaces
         by every engraving manual there is, and seven is the usual working
         figure — wide enough for ledger lines from both staves to meet in the
         middle without colliding. */
      var pianoGap = staffSpace * 7;
      blocks.push({ type: 'staff', top: 0, height: staffHeight, lines: 5, step: staffSpace });
      blocks.push({ type: 'staff', top: staffHeight + pianoGap, height: staffHeight, lines: 5, step: staffSpace });
      h = staffHeight * 2 + pianoGap;
    } else if (spec.kind === 'tab') {
      var th = tabHeight(lines);
      blocks.push({ type: 'tab', top: 0, height: th, lines: lines, step: tabSpacing });
      h = th;
    } else {
      /* Staff over tab. The gap is generous on purpose: this is the sheet
         where rhythm stems hang below the staff and fret numbers sit on the
         tab lines, and the two must not meet. */
      var pairGap = staffSpace * 5;
      var tabH = tabHeight(lines);
      blocks.push({ type: 'staff', top: 0, height: staffHeight, lines: 5, step: staffSpace });
      blocks.push({ type: 'tab', top: staffHeight + pairGap, height: tabH, lines: lines, step: tabSpacing });
      h = staffHeight + pairGap + tabH;
    }
    return { height: h, blocks: blocks };
  }

  PP.register('staff-paper', {
    filename: function (v) { return [v.system]; },
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 12,

    controls: [
      {
        id: 'system', label: 'Staff type', type: 'select', default: 'staff5',
        options: [
          { value: 'staff5', label: 'Five-line staff — blank manuscript' },
          { value: 'grand', label: 'Grand staff with brace — piano, harp, organ' },
          { value: 'tab6', label: 'Guitar tab — six lines' },
          { value: 'tab4bass', label: 'Bass tab — four lines' },
          { value: 'tab4uke', label: 'Ukulele tab — four lines' },
          { value: 'staffTab', label: 'Staff over tab — notation and tab paired' }
        ]
      },
      {
        id: 'rastral', label: 'Staff height', type: 'select', default: 'r1',
        options: [
          { value: 'r0', label: '9.2 mm — rastral No. 0, largest' },
          { value: 'r1', label: '7.9 mm — rastral No. 1' },
          { value: 'r2', label: '7.4 mm — rastral No. 2' },
          { value: 'r3', label: '7.0 mm — rastral No. 3' },
          { value: 'r4', label: '6.5 mm — rastral No. 4' },
          { value: 'r5', label: '6.0 mm — rastral No. 5' },
          { value: 'r6', label: '5.5 mm — rastral No. 6' },
          { value: 'r7', label: '4.8 mm — rastral No. 7' },
          { value: 'r8', label: '3.7 mm — rastral No. 8, smallest' },
          { value: 'custom', label: 'Custom — set the millimetres below' }
        ],
        hint: 'Bottom line to top line of a five-line staff. Rastral numbers are the engraver’s ' +
          'traditional names for exactly that measurement, so they are presets on it.'
      },
      {
        id: 'staffHeight', label: 'Custom staff height (mm)', type: 'number', default: 7.9,
        min: 2.5, max: 25, step: 0.1,
        hint: 'Used only when the staff height above is set to Custom.'
      },
      {
        id: 'systems', label: 'Systems per page', type: 'number', default: 10,
        min: 1, max: 30, step: 1,
        hint: 'A grand staff or a staff-and-tab pair is one system, not two.'
      },
      {
        id: 'tabSpacing', label: 'Tab line spacing (mm)', type: 'number', default: 4,
        min: 2, max: 12, step: 0.1,
        hint: 'The gap between two strings. It has to hold a two-digit fret number, which is what sets it.'
      },
      {
        id: 'tabLines', label: 'Tab lines (strings)', type: 'number', default: 0,
        min: 0, max: 9, step: 1,
        hint: 'Zero uses the staff type’s own count — six for guitar, four for bass and ukulele. ' +
          'Set it for a five-string bass, a seven-string guitar, a banjo or a baritone uke.'
      },
      {
        id: 'bars', label: 'Bar lines per stave', type: 'number', default: 4,
        min: 0, max: 16, step: 1,
        hint: 'Zero draws none. The line closing the right-hand end is always drawn.'
      },
      { id: 'header', label: 'Title and composer rules at the top', type: 'checkbox', default: true },
      { id: 'tabLabel', label: 'Print TAB down the left of a tab staff', type: 'checkbox', default: true },
      {
        id: 'colour', label: 'Line colour', type: 'select', default: 'black',
        options: [
          { value: 'black', label: 'Black' },
          { value: 'grey', label: 'Grey' },
          { value: 'blue', label: 'Blue' }
        ]
      },
      {
        id: 'lineWidth', label: 'Line width (mm)', type: 'number', default: 0.18,
        min: 0.05, max: 0.6, step: 0.01,
        hint: 'Below about 0.1 mm some inkjets drop the line altogether.'
      },
      { id: 'caption', label: 'Print the measurements at the foot of the sheet', type: 'checkbox', default: false }
    ],

    render: function (v) {
      var margin = num(v.margin, 12, 0, 200);
      var left = margin;
      var right = v.page.w - margin;
      var top = margin;
      var bottom = v.page.h - margin;

      if (right - left < 30 || bottom - top < 30) {
        throw new Error('A ' + round(margin, 1) + ' mm margin leaves almost nothing to rule on a ' +
          round(v.page.w, 1) + ' by ' + round(v.page.h, 1) +
          ' mm sheet. Reduce the margin or use a larger paper size.');
      }

      var spec = lookup(SYSTEMS, v.system, SYSTEMS.staff5);
      var colour = lookup(LINE_COLOURS, v.colour, LINE_COLOURS.black);
      var lineWidth = num(v.lineWidth, 0.18, 0.05, 0.6);
      var staffHeight = v.rastral === 'custom'
        ? num(v.staffHeight, 7.9, 2.5, 25)
        : lookup(RASTRAL, v.rastral, RASTRAL.r1);
      var tabSpacing = num(v.tabSpacing, 4, 2, 12);
      var tabLines = Math.round(num(v.tabLines, 0, 0, 9));
      if (tabLines > 0 && tabLines < 3) tabLines = 3;
      var systems = Math.round(num(v.systems, 10, 1, 30));
      var bars = Math.round(num(v.bars, 4, 0, 16));
      var staffSpace = staffHeight / 4;

      var out = '';

      if (v.header) {
        var titleY = top + 8;
        var composerY = top + 17;
        out += text('Title', left, titleY - 1.2, HEADER_FONT);
        out += path(rule(left + labelWidth('Title', HEADER_FONT), right, titleY), colour, lineWidth);
        var composerLeft = left + (right - left) * 0.5;
        out += text('Composer', composerLeft, composerY - 1.2, HEADER_FONT);
        out += path(rule(composerLeft + labelWidth('Composer', HEADER_FONT), right, composerY), colour, lineWidth);
        top += HEADER_BLOCK;
      }

      if (v.caption) bottom -= CAPTION_BLOCK;

      var geom = systemGeometry(spec, staffHeight, tabSpacing, tabLines);
      var usableH = bottom - top;
      var totalInk = geom.height * systems;

      if (totalInk > usableH) {
        /* Say how many actually fit rather than "does not fit": the number is
           the thing the visitor is about to work out by trial and error. */
        var fits = Math.max(1, Math.floor(usableH / geom.height));
        throw new Error(systems + ' × ' + round(geom.height, 1) + ' mm of ' +
          spec.label.toLowerCase() + ' is ' + round(totalInk, 1) + ' mm of ruling in ' +
          round(usableH, 1) + ' mm of page. At this staff height ' + fits +
          ' fit. Reduce the systems per page, choose a smaller staff height, or use a larger sheet.');
      }

      /* Systems are spread evenly with the first at the top of the usable area
         and the last ending at the bottom of it, which is what a ruled
         manuscript page looks like. */
      var gap = systems > 1 ? (usableH - totalInk) / (systems - 1) : 0;
      var minGap = Math.max(2, staffSpace * 1.5);
      if (systems > 1 && gap < minGap) {
        var roomy = Math.max(1, Math.floor((usableH + minGap) / (geom.height + minGap)));
        throw new Error('At ' + systems + ' systems the gap between them falls to ' +
          round(gap, 1) + ' mm, which leaves nowhere to write. ' + roomy +
          ' systems is the most this sheet holds at ' + round(staffHeight, 1) +
          ' mm staff height.');
      }

      /* A brace hangs to the left of the staff, so the staff has to start
         further in on a grand staff or it would print into the margin. */
      var braceRoom = spec.kind === 'staff' && spec.staves === 2
        ? Math.min(geom.height * 0.10, 5) + 2.5
        : 0;
      var tabRoom = v.tabLabel && (spec.kind === 'tab' || spec.kind === 'pair')
        ? tabSpacing * 1.3 + 1.5
        : 0;
      var staffLeft = left + Math.max(braceRoom, tabRoom);

      if (right - staffLeft < 20) {
        throw new Error('There is no room left to rule once the brace and labels are placed. ' +
          'Reduce the margin or use a larger paper size.');
      }

      var d = '';
      var i, s, sysTop, b, bi, y, blockTop, blockBottom;

      for (s = 0; s < systems; s++) {
        sysTop = top + s * (geom.height + gap);

        for (bi = 0; bi < geom.blocks.length; bi++) {
          b = geom.blocks[bi];
          blockTop = sysTop + b.top;
          for (i = 0; i < b.lines; i++) {
            d += rule(staffLeft, right, blockTop + i * b.step);
          }
        }

        var firstTop = sysTop + geom.blocks[0].top;
        var lastBlock = geom.blocks[geom.blocks.length - 1];
        blockBottom = sysTop + lastBlock.top + lastBlock.height;

        /* A single staff takes no opening barline — an initial vertical is a
           systemic barline, and a one-staff system has no system to bracket.
           Two-staff systems get one. */
        if (geom.blocks.length > 1) {
          d += vline(staffLeft, firstTop, blockBottom);
        }

        /* Bar lines run through the whole system, gap included, exactly as
           they do in printed music. */
        if (bars > 1) {
          for (i = 1; i < bars; i++) {
            var x = staffLeft + (right - staffLeft) * (i / bars);
            if (geom.blocks.length > 1) {
              d += vline(x, firstTop, blockBottom);
            } else {
              d += vline(x, firstTop, firstTop + geom.blocks[0].height);
            }
          }
        }

        /* The closing line at the right-hand end is always drawn: a stave that
           just stops is a stave someone has to rule the end of by hand. */
        if (geom.blocks.length > 1) {
          d += vline(right, firstTop, blockBottom);
        } else {
          d += vline(right, firstTop, firstTop + geom.blocks[0].height);
        }
      }

      out += path(d, colour, lineWidth);

      /* Braces and TAB labels are separate paths — the brace has round caps
         and the label is text, so neither can join the ruling path. */
      for (s = 0; s < systems; s++) {
        sysTop = top + s * (geom.height + gap);
        if (spec.kind === 'staff' && spec.staves === 2) {
          out += brace(left + 0.5, sysTop, sysTop + geom.height, colour, Math.max(lineWidth * 1.6, 0.3));
        }
        if (v.tabLabel && (spec.kind === 'tab' || spec.kind === 'pair')) {
          var tabBlock = geom.blocks[geom.blocks.length - 1];
          var tTop = sysTop + tabBlock.top;
          /* Three stacked capitals have to fit inside the tab staff itself —
             on a four-line ukulele or bass staff that is only three spaces
             tall, so the glyph is capped by the block as well as scaled by the
             spacing. A baseline sits about 0.35 em below a capital's visual
             centre, which is what centres the middle letter on the staff. */
          var glyph = Math.min(tabSpacing * 1.25, tabBlock.height / 2.6);
          var step = glyph * 0.95;
          var mid = tTop + tabBlock.height / 2 + glyph * 0.35;
          var letters = ['T', 'A', 'B'];
          for (i = 0; i < 3; i++) {
            out += text(letters[i], left + 0.5, mid + (i - 1) * step, glyph, null, colour);
          }
        }
      }

      if (v.caption) {
        var tabBlockForCaption = geom.blocks[geom.blocks.length - 1];
        var bits = [spec.label];
        if (spec.kind !== 'tab') bits.push(round(staffHeight, 2) + ' mm staff height');
        if (spec.kind === 'tab' || spec.kind === 'pair') {
          bits.push(tabBlockForCaption.lines + '-line tab at ' + round(tabSpacing, 2) + ' mm spacing');
        }
        bits.push(systems + (systems === 1 ? ' system' : ' systems'));
        if (bars > 0) bits.push(bars + (bars === 1 ? ' bar' : ' bars') + ' a stave');
        out += text(bits.join(' · '), right, v.page.h - margin - 1.5, CAPTION_FONT, 'end', '#777777');
      }

      return out;
    }
  });
}());
