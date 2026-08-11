/* paperprintouts.com - printer scale calibration.
 *
 * This is the sheet every other tool on the site leans on. You print it, put a
 * real ruler on it, and find out whether the printer handed you the page at
 * true size or quietly shrank it to clear its unprintable margin.
 *
 * So the only thing that matters here is that the numbers are right:
 *   - one inch is 25.4 mm, exactly, by definition. Every inch figure on the
 *     sheet is derived from that constant, never from a rounded 25 or 25.5.
 *   - four inches is 101.6 mm, which is why the inch square sticks out 1.6 mm
 *     past the metric one. That step is the tell-tale: it is drawn, not
 *     approximated, so a reader can see that both squares are honest.
 *
 * Layout, top-left origin, all millimetres:
 *
 *   y0  +-- inch ruler ------------------->
 *       |m
 *       |m ruler       +---------------+ - +
 *       |m             |               |   :  100 mm square (solid, black)
 *       |m             |   labels      |   :  4 in square  (dashed, red)
 *       |m             +---------------+   :  shared top-left corner
 *       |m             + - - - - - - - - - +
 *       |m             note about the 1.6 mm step
 *       |m
 *   y1  instruction + sheet description
 */
(function () {
  'use strict';

  /* Kept local rather than reached for off PP: this file is a plain <script>
     and should not depend on the order the browser evaluated it in. Each one
     is a one-liner, so self-contained costs nothing. Same call as graph-paper.js. */
  var MM_PER_INCH = 25.4;               /* exact: the inch is defined as this */
  function inch(n) { return n * MM_PER_INCH; }
  function round(n, dp) { var f = Math.pow(10, dp); return Math.round(n * f) / f; }
  function r(n) { return round(n, 3); } /* geometry to the micron is plenty */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Built from its code point so this file stays pure ASCII and cannot be
     mangled by a server that serves .js without a charset. */
  var TIMES = String.fromCharCode(215);   /* multiplication sign */

  /* The printed sheet is white paper with no stylesheet, so every colour is
     stated outright. Metric is the ink colour, imperial is red throughout, so
     the ruler at the top and the square it measures read as one system. */
  var INK = '#111111';
  var IMPERIAL = '#c62828';
  var MUTED = '#444444';

  var MM_SQUARE = 100;
  var IN_SQUARE = inch(4);              /* 101.6 */
  var EIGHTH = MM_PER_INCH / 8;         /* 3.175, exact at three decimals */

  /* Bands reserved around the drawing. */
  var LEFT_BAND = 16;                   /* mm ruler: 6.6 tick + numbers + air */
  var TOP_BAND = 12.5;                  /* inch ruler: 7.2 tick + numbers */
  var GAP_UNDER_TOP = 7.5;
  var GAP_NO_TOP = 4;                   /* when the inch ruler is switched off */
  var IN_END_RESERVE = 14;              /* room for the word "inches" */
  var MM_END_RESERVE = 6;               /* room for the word "mm" */
  var INSET = 0.25;                     /* keeps a stroke's outer half in bounds */

  /* Type sizes and their line heights. */
  var SZ_INSTR = 3.4, LH_INSTR = 4.6;
  var SZ_PAPER = 3, LH_PAPER = 4;
  var SZ_NOTE = 2.9, LH_NOTE = 3.6;
  var SZ_MM_NUM = 3;
  var SZ_IN_NUM = 3.2;

  /* Short names for the sheet description. PP.PAGES carries longer labels, but
     reading them would tie this module to app.js and they repeat the size we
     print alongside anyway. */
  var PAPER_NAMES = {
    letter: 'Letter', legal: 'Legal', tabloid: 'Tabloid',
    a3: 'A3', a4: 'A4', a5: 'A5', a6: 'A6'
  };

  /* Values arrive from the URL as well as the form, so a key can be any string
     at all, 'constructor' and '__proto__' included. Only ever accept a key the
     map genuinely owns. */
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

  function path(d, colour, width, dash) {
    return '<path d="' + d + '" fill="none" stroke="' + colour +
      '" stroke-width="' + r(width) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }

  function rect(x, y, w, h, colour, width, dash) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) +
      '" height="' + r(h) + '" fill="none" stroke="' + colour +
      '" stroke-width="' + r(width) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }

  /* Everything that reaches the SVG goes through esc() here, so no caller can
     forget. Callers pass raw strings. */
  function text(x, y, size, colour, anchor, s) {
    return '<text x="' + r(x) + '" y="' + r(y) + '" font-size="' + r(size) +
      '" fill="' + colour + '"' +
      (anchor && anchor !== 'start' ? ' text-anchor="' + anchor + '"' : '') +
      '>' + esc(s) + '</text>';
  }

  /* Helvetica averages a shade over half an em per character across mixed-case
     prose. 0.55 overestimates slightly, which is the safe direction: a line
     breaks one word early rather than running past the margin. */
  function textWidth(s, size) { return s.length * size * 0.55; }

  function wrap(s, size, maxWidth) {
    var words = String(s).split(' ');
    var lines = [];
    var cur = '';
    var i, probe;
    for (i = 0; i < words.length; i++) {
      probe = cur ? cur + ' ' + words[i] : words[i];
      if (cur && textWidth(probe, size) > maxWidth) {
        lines.push(cur);
        cur = words[i];
      } else {
        cur = probe;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function block(lines, x, top, size, lineHeight, colour) {
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      /* top is the top of the block; the first baseline sits one cap height in. */
      out += text(x, top + size + i * lineHeight, size, colour, 'start', lines[i]);
    }
    return out;
  }

  /* ---- the two rulers ---------------------------------------------------- */

  /* Millimetre ruler running down the left edge: a tick per millimetre, every
     fifth taller, every tenth taller still and numbered. Ticks point right,
     away from the paper edge. */
  function mmRuler(x, y, length) {
    var minor = '', mid = '', major = '', labels = '';
    var i, at, d;
    for (i = 0; i <= length; i++) {
      at = r(y + i);
      d = 'M' + r(x) + ' ' + at + 'h';
      if (i % 10 === 0) {
        major += d + '6.6';
        /* The zero label would push its cap height above the margin if it were
           centred on the line, so it hangs below the origin instead, which is
           how a ruler's zero is usually printed anyway. Every other number is
           centred on its tick: 1.05 is half the cap height at this size. */
        labels += text(x + 7.6, i === 0 ? y + 3.5 : y + i + 1.05,
          SZ_MM_NUM, INK, 'start', String(i));
      } else if (i % 5 === 0) {
        mid += d + '4.2';
      } else {
        minor += d + '2.4';
      }
    }
    return path('M' + r(x) + ' ' + r(y) + 'v' + r(length), INK, 0.3) +
      path(minor, INK, 0.15) +
      path(mid, INK, 0.22) +
      path(major, INK, 0.3) +
      labels +
      text(x + 7.6, y + length + 4.5, SZ_MM_NUM, MUTED, 'start', 'mm');
  }

  /* Inch ruler across the top: a tick per eighth, with the quarter, half and
     whole inch each a step taller, and the whole inches numbered. Every tick
     position is k * 25.4 / 8, so the subdivisions cannot drift. */
  function inchRuler(x, y, eighths) {
    var minor = '', quarter = '', half = '', whole = '', labels = '';
    var k, at, d;
    for (k = 0; k <= eighths; k++) {
      at = r(x + k * EIGHTH);
      d = 'M' + at + ' ' + r(y) + 'v';
      if (k % 8 === 0) {
        whole += d + '7.2';
        labels += text(x + k * EIGHTH, y + 10.75, SZ_IN_NUM, IMPERIAL, 'middle',
          String(k / 8));
      } else if (k % 4 === 0) {
        half += d + '4.8';
      } else if (k % 2 === 0) {
        quarter += d + '3.4';
      } else {
        minor += d + '2.2';
      }
    }
    return path('M' + r(x) + ' ' + r(y) + 'h' + r(eighths * EIGHTH), IMPERIAL, 0.3) +
      path(minor, IMPERIAL, 0.15) +
      path(quarter, IMPERIAL, 0.2) +
      path(half, IMPERIAL, 0.26) +
      path(whole, IMPERIAL, 0.3) +
      labels +
      text(x + eighths * EIGHTH + 2.5, y + 6, SZ_IN_NUM, MUTED, 'start', 'inches');
  }

  /* ---- the squares ------------------------------------------------------- */

  function squares(x, y, showInch) {
    var out = '';
    var i, at, len;
    var ticks = '';

    /* Ticks every 10 mm along the top and left edges, drawn inwards so the
       1.6 mm step at the far edges stays clear of them. The 50 mm mark is a
       little longer, which makes it easy to check the halfway point too. */
    for (i = 10; i < MM_SQUARE; i += 10) {
      len = (i === 50) ? 5 : 3;
      at = r(x + i);
      ticks += 'M' + at + ' ' + r(y) + 'v' + len;
      at = r(y + i);
      ticks += 'M' + r(x) + ' ' + at + 'h' + len;
    }

    out += rect(x, y, MM_SQUARE, MM_SQUARE, INK, 0.25);
    out += path(ticks, INK, 0.25);

    if (showInch) {
      /* Same top-left corner, so the two squares overlap along their top and
         left edges. Dashed and drawn last: on the shared edges the red dashes
         sit on top of the black line and both stay readable, and the right and
         bottom edges stand 1.6 mm clear where the whole point of the drawing
         is visible. */
      out += rect(x, y, IN_SQUARE, IN_SQUARE, IMPERIAL, 0.25, '2 1.6');
    }

    out += text(x + MM_SQUARE / 2, y + 47, 5, INK, 'middle',
      '100 mm ' + TIMES + ' 100 mm');
    if (showInch) {
      out += text(x + MM_SQUARE / 2, y + 54.5, 4, IMPERIAL, 'middle',
        '4 in ' + TIMES + ' 4 in = 101.6 mm');
    }
    return out;
  }

  /* ---- the sheet description -------------------------------------------- */

  /* Orientation is derived from the page the framework handed us rather than
     read off the control, so it describes what will actually come out of the
     printer even if the query string says something else. */
  function describeSheet(v, margin) {
    var name = lookup(PAPER_NAMES, v.paper, '');
    var wIn = round(v.page.w / MM_PER_INCH, 2);
    var hIn = round(v.page.h / MM_PER_INCH, 2);
    return 'Sheet: ' + (name ? name + ', ' : '') +
      round(v.page.w, 2) + ' ' + TIMES + ' ' + round(v.page.h, 2) + ' mm (' +
      wIn + ' ' + TIMES + ' ' + hIn + ' in), ' +
      (v.page.w > v.page.h ? 'landscape' : 'portrait') + ', ' +
      round(margin, 2) + ' mm margin.';
  }

  PP.register('print-calibration', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'showInch', label: 'Include the inch square and inch ruler',
        type: 'checkbox', default: true,
        hint: 'Four inches is 101.6 mm, so the inch square sits 1.6 mm outside the metric one.'
      },
      {
        id: 'rulerLength', label: 'Millimetre ruler length (mm)', type: 'number',
        default: 150, min: 50, max: 250, step: 10,
        hint: 'Shortened automatically if the sheet is not tall enough for it.'
      }
    ],

    render: function (v) {
      var margin = num(v.margin, 10, 0, 200);
      var x0 = margin, y0 = margin;
      var x1 = v.page.w - margin, y1 = v.page.h - margin;
      var usableW = x1 - x0, usableH = y1 - y0;
      var showInch = v.showInch === undefined ? true : !!v.showInch;

      /* The outer extent of the drawn squares: the inch one is the larger. */
      var squareSize = showInch ? IN_SQUARE : MM_SQUARE;

      var needW = LEFT_BAND + squareSize + 1;
      if (!(usableW >= needW)) {
        throw new Error('This sheet leaves only ' + round(usableW, 1) +
          ' mm of width inside the margin, and the calibration square with its ruler needs ' +
          Math.ceil(needW) + ' mm. Use a larger paper size, switch to landscape, or reduce the margin.');
      }

      /* Vertical stack: ruler band, squares, note, instruction, sheet
         description. All of it hangs off the square's left edge, which leaves
         the left band clear for the millimetre ruler to run the full height of
         the page however long the reader asked for. */
      var sqX = x0 + LEFT_BAND;
      var sqY = y0 + (showInch ? TOP_BAND + GAP_UNDER_TOP : GAP_NO_TOP);
      var sqBottom = sqY + squareSize;

      var noteLines = showInch
        ? wrap('The dashed square is 4 in = 101.6 mm, so it sits 1.6 mm outside the 100 mm square.',
            SZ_NOTE, x1 - sqX)
        : [];
      var noteTop = sqBottom + 2;
      var noteBottom = noteLines.length ? noteTop + noteLines.length * LH_NOTE : sqBottom;

      var textW = x1 - sqX;
      var instrLines = wrap(
        'Measure the 100 mm square, centre of line to centre of line. If it is not 100 mm your ' +
        'printer is scaling: set the print dialogue to 100% or "actual size" rather than ' +
        '"fit to page", then print again.', SZ_INSTR, textW);
      var paperLines = wrap(describeSheet(v, margin), SZ_PAPER, textW);

      var textH = instrLines.length * LH_INSTR + 1.8 + paperLines.length * LH_PAPER;
      var textTop = noteBottom + 6;

      if (textTop + textH > y1) {
        throw new Error('This sheet leaves only ' + round(usableH, 1) +
          ' mm of height inside the margin, and the calibration square with its notes needs ' +
          Math.ceil(textTop + textH - y0) +
          ' mm. Use a larger paper size, switch orientation, or reduce the margin.');
      }

      /* Every text baseline lands on a whole millimetre of nothing in
         particular; the two rulers are what has to be exact. */
      var out = '<g font-family="Helvetica, Arial, sans-serif" ' +
        'shape-rendering="geometricPrecision">';

      /* Millimetre ruler: as long as asked for, or as long as the sheet allows,
         whichever is shorter. Whole millimetres only, so the last tick is a
         round number a ruler can be lined up against. */
      var maxLen = Math.floor(y1 - MM_END_RESERVE - y0);
      var rulerLen = Math.floor(num(v.rulerLength, 150, 50, 250));
      if (rulerLen > maxLen) rulerLen = maxLen;
      out += mmRuler(x0 + INSET, y0 + INSET, rulerLen);

      if (showInch) {
        /* Whole eighths that fit, leaving room for the unit label. The ruler
           starts at the square's left edge, so its 0 and 4 inch marks line up
           with the two vertical edges of the inch square: a second check that
           costs nothing. */
        var eighths = Math.floor((x1 - sqX - IN_END_RESERVE) / EIGHTH);
        if (eighths >= 8) out += inchRuler(sqX, y0 + INSET, eighths);
      }

      out += squares(sqX, sqY, showInch);

      if (noteLines.length) {
        out += block(noteLines, sqX, noteTop, SZ_NOTE, LH_NOTE, MUTED);
      }
      out += block(instrLines, sqX, textTop, SZ_INSTR, LH_INSTR, INK);
      out += block(paperLines, sqX, textTop + instrLines.length * LH_INSTR + 1.8,
        SZ_PAPER, LH_PAPER, MUTED);

      return out + '</g>';
    }
  });
})();
