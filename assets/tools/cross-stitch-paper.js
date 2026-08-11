/* paperprintouts.com -- cross stitch pattern paper.
 *
 * A square grid at exactly one square per stitch, drawn at the size that stitch
 * will actually come out on the cloth. Every coordinate is a millimetre; the
 * framework supplies the viewBox that makes a millimetre on screen a millimetre
 * on paper, which is what lets you hold the printed sheet against the fabric.
 *
 * COUNT IS NOT STITCHES PER INCH, and that is the whole job here.
 *
 * Fabric is sold by count -- the number of threads, or of Aida blocks, to the
 * inch. On Aida one stitch covers one block, so count and stitches per inch are
 * the same number and nobody has to think about it. On evenweave and linen the
 * threads are single and far finer, so cross stitch is worked over two of them:
 *
 *   28 count evenweave, over two threads  ->  14 stitches per inch
 *   32 count linen,     over two threads  ->  16 stitches per inch
 *   22 count Hardanger, woven in pairs    ->  11 stitches per inch
 *
 * So 28 count linen and 14 count Aida make the same size stitch, and a sheet of
 * "28 count" paper drawn at 28 squares to the inch is wrong for almost everyone
 * who asks for it. The grid pitch here is therefore
 *
 *   25.4 mm / (count / threads per stitch)
 *
 * and the caption always prints both numbers, so the sheet can never quietly
 * mean something other than what its heading says.
 *
 * ENCODING. The grid is two <path> elements -- one for the fine lines, one for
 * the heavy tens -- rather than a few thousand <line>s, the same way graph paper
 * draws itself. Nothing here is user text: every value is a clamped number or
 * comes out of a map that is checked with hasOwnProperty first.
 */
(function () {
  'use strict';

  var PP = window.PP;
  var MM_PER_INCH = 25.4;

  /* Path coordinates to the nearest micron. round() hands back a Number, so
     trailing zeroes vanish on concatenation. */
  function mm(n) { return PP.round(n, 3); }
  function n2(n) { return PP.round(n, 2); }

  /* Values arrive from the query string as well as the form, so a key can be
     any string at all -- including '__proto__'. Only ever take a key the map
     genuinely owns. */
  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  /* Same reasoning for numbers: never let NaN or a hostile string reach the
     output, and clamp to the range the control advertises. */
  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  /* How many fabric threads one stitch spans. This is the control that turns a
     count into a stitch size, and it is the one no other generator offers. */
  var FABRICS = {
    'aida': {
      label: 'Aida — one stitch per block',
      threads: 1,
      name: 'Aida',
      note: 'one stitch per block'
    },
    'evenweave': {
      label: 'Evenweave, linen or Hardanger — over two threads',
      threads: 2,
      name: 'evenweave',
      note: 'over two threads'
    }
  };

  var COLOURS = {
    'grey': { line: '#9aa3ad', guide: '#5c6672' },
    'light-grey': { line: '#c3c9d1', guide: '#9aa3ad' },
    'blue': { line: '#8fb3e0', guide: '#4a76b8' },
    'green': { line: '#93c9a5', guide: '#4a8c62' },
    'black': { line: '#333333', guide: '#000000' }
  };

  /* Centre marks are drawn in ink rather than in the grid colour: they are the
     one thing on the sheet you line up against a folded piece of fabric, so
     they have to read as a mark and not as part of the paper. */
  var MARK_COLOUR = '#111111';

  /* The arrow that marks the centre of the field, drawn just outside the grid
     so it never sits on top of a square you are going to colour in. Each is an
     isosceles triangle pointing at the grid edge. */
  function centreArrow(x, y, dir, size) {
    var h = size, w = size * 0.9;
    var pts;
    if (dir === 'down') {
      pts = [[x, y], [x - w / 2, y - h], [x + w / 2, y - h]];
    } else if (dir === 'up') {
      pts = [[x, y], [x - w / 2, y + h], [x + w / 2, y + h]];
    } else if (dir === 'right') {
      pts = [[x, y], [x - h, y - w / 2], [x - h, y + w / 2]];
    } else {
      pts = [[x, y], [x + h, y - w / 2], [x + h, y + w / 2]];
    }
    return 'M' + mm(pts[0][0]) + ' ' + mm(pts[0][1]) +
      'L' + mm(pts[1][0]) + ' ' + mm(pts[1][1]) +
      'L' + mm(pts[2][0]) + ' ' + mm(pts[2][1]) + 'Z';
  }

  PP.register('cross-stitch-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'count', label: 'Fabric count', type: 'number', default: 14,
        min: 6, max: 40, step: 1,
        hint: 'The number on the bolt: threads or Aida blocks to the inch. 11, 14, 16 and 18 are the common Aidas; 25, 28 and 32 are evenweave and linen.'
      },
      {
        id: 'fabric', label: 'How it is stitched', type: 'select', default: 'aida',
        options: [
          { value: 'aida', label: FABRICS.aida.label },
          { value: 'evenweave', label: FABRICS.evenweave.label }
        ],
        hint: 'Evenweave and linen are worked over two threads, so 28 count comes out at 14 stitches per inch — the same size stitch as 14 count Aida. Get this wrong and you order the wrong amount of fabric.'
      },
      {
        id: 'stitchesWide', label: 'Stitches across (0 fills the page)', type: 'number', default: 0,
        min: 0, max: 400, step: 1,
        hint: 'Set these to your design size and the sheet becomes the design. Leave them at zero and the grid fills the paper.'
      },
      {
        id: 'stitchesHigh', label: 'Stitches down (0 fills the page)', type: 'number', default: 0,
        min: 0, max: 600, step: 1
      },
      {
        id: 'accentEvery', label: 'Heavy line every N stitches', type: 'number', default: 10,
        min: 0, max: 50, step: 1,
        hint: '0 turns them off. Ten is the convention every published chart uses, and it is what makes a chart countable.'
      },
      {
        id: 'numbers', label: 'Number the edges', type: 'checkbox', default: true
      },
      {
        id: 'centre', label: 'Mark the centre', type: 'checkbox', default: true,
        hint: 'Arrows on all four edges. You start from the centre of the fabric, so the chart has to say where its own centre is.'
      },
      {
        id: 'colour', label: 'Line colour', type: 'select', default: 'grey',
        options: [
          { value: 'grey', label: 'Grey' },
          { value: 'light-grey', label: 'Light grey' },
          { value: 'blue', label: 'Blue' },
          { value: 'green', label: 'Green' },
          { value: 'black', label: 'Black' }
        ]
      },
      {
        id: 'showCaption', label: 'Print the size caption', type: 'checkbox', default: true
      }
    ],

    render: function (v) {
      var count = Math.round(num(v.count, 14, 6, 40));
      var fabric = lookup(FABRICS, v.fabric, FABRICS.aida);
      var palette = lookup(COLOURS, v.colour, COLOURS.grey);

      /* The one line that matters. Everything below is layout. */
      var perInch = count / fabric.threads;
      var pitch = MM_PER_INCH / perInch;

      var showNumbers = !!v.numbers;
      var showCentre = !!v.centre;
      var showCaption = v.showCaption !== false;
      var accentEvery = Math.round(num(v.accentEvery, 10, 0, 50));
      var labelEvery = accentEvery >= 1 ? accentEvery : 10;

      /* ---- room on the sheet ---- */
      var margin = num(v.margin, 10, 0, 200);
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;
      if (usableW <= 2 || usableH <= 2) {
        throw new Error('A margin of ' + n2(margin) +
          ' mm leaves no printable area on this sheet. Reduce the margin.');
      }

      /* Numbers and centre arrows live outside the grid, so their room comes off
         the drawable area rather than being borrowed from the margin — a margin
         of zero is a legal setting, and an arrow drawn into it would print off
         the edge of the paper.

         They also get a band each rather than sharing one. The centre of a grid
         a hundred squares wide falls within a square or two of the label for 50,
         and an arrowhead printed through a numeral is worse than either. So the
         arrow keeps the strip against the grid edge, where it has to be to point
         at anything, and the numbers move out beyond it. */
      var markPad = showCentre ? 3.0 : 0;
      var numGutterL = showNumbers ? 7 : 0;
      var numGutterT = showNumbers ? 4 : 0;
      var padL = markPad + numGutterL;
      var padT = markPad + numGutterT;
      var padR = markPad;
      var padB = markPad;
      var captionH = showCaption ? 9 : 0;

      var availW = usableW - padL - padR;
      var availH = usableH - padT - padB - captionH;
      if (availW <= 1 || availH <= 1) {
        throw new Error('Once the margin, the numbering and the caption are taken out there is nothing left to draw on. Reduce the margin, or turn the numbering or the caption off.');
      }

      /* ---- how many stitches ---- */
      /* Whole squares only, so no half stitch is left hanging at the edge. The
         epsilon absorbs float error in the cases that divide exactly. */
      var fitX = Math.floor(availW / pitch + 1e-9);
      var fitY = Math.floor(availH / pitch + 1e-9);

      var wantX = Math.round(num(v.stitchesWide, 0, 0, 400));
      var wantY = Math.round(num(v.stitchesHigh, 0, 0, 600));
      var nx = wantX > 0 ? wantX : fitX;
      var ny = wantY > 0 ? wantY : fitY;

      if (nx < 1 || ny < 1) {
        throw new Error('Not one ' + n2(pitch) +
          ' mm stitch fits inside the margin on this sheet. Reduce the margin, or use a larger paper size.');
      }

      var gridW = nx * pitch;
      var gridH = ny * pitch;
      if (gridW > availW + 1e-6 || gridH > availH + 1e-6) {
        throw new Error(
          nx + ' x ' + ny + ' stitches at ' + count + ' count needs ' +
          n2(gridW) + ' x ' + n2(gridH) + ' mm, but there is only ' +
          n2(availW) + ' x ' + n2(availH) + ' mm inside the margin. Ask for ' +
          fitX + ' x ' + fitY + ' or fewer, or use a larger sheet.'
        );
      }

      /* Centre the grid in what is left: the remainder that will not make a
         whole square is split between the two edges, which is what stops the
         sheet looking as though it slipped in the printer. */
      var x0 = margin + padL + (availW - gridW) / 2;
      var y0 = margin + padT + (availH - gridH) / 2;

      /* ---- ink weights ----
         Derived from the pitch rather than typed, because a line weight that
         reads well at 11 count fills in the squares at 32. The floor is what an
         inkjet will still lay down reliably. */
      var stroke = num(pitch * 0.075, 0.12, 0.06, 0.22);
      var accentStroke = stroke * 2.2;

      var left = mm(x0), top = mm(y0);
      var right = mm(x0 + gridW), bottom = mm(y0 + gridH);

      var thin = '', accent = '', i, at, seg;

      /* Accents count from the first line, so the block of ten starts flush with
         the top-left corner of the grid and any remainder lands at the far edge.
         That matches how a chart is read: from its corner, in tens. */
      for (i = 0; i <= nx; i++) {
        at = mm(x0 + i * pitch);
        seg = 'M' + at + ' ' + top + 'V' + bottom;
        if (accentEvery && i % accentEvery === 0) accent += seg; else thin += seg;
      }
      for (i = 0; i <= ny; i++) {
        at = mm(y0 + i * pitch);
        seg = 'M' + left + ' ' + at + 'H' + right;
        if (accentEvery && i % accentEvery === 0) accent += seg; else thin += seg;
      }

      var out = [];
      if (thin) {
        out.push('<path d="' + thin + '" fill="none" stroke="' + palette.line +
          '" stroke-width="' + mm(stroke) + '" shape-rendering="geometricPrecision"/>');
      }
      if (accent) {
        out.push('<path d="' + accent + '" fill="none" stroke="' + palette.guide +
          '" stroke-width="' + mm(accentStroke) + '" shape-rendering="geometricPrecision"/>');
      }

      /* ---- numbering ----
         The label sits on the middle of the tenth square rather than on the line
         after it, which is where printed charts put it: you count squares, not
         boundaries. Column 1 is labelled too, because a chart that starts at 10
         gives you nothing to orient the first block against. */
      if (showNumbers) {
        var fontSize = Math.max(1.7, Math.min(2.6, pitch * 1.4));
        var textAttrs = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
          mm(fontSize) + '" fill="' + palette.guide + '"';
        var c, r;
        for (c = 1; c <= nx; c++) {
          if (c !== 1 && c % labelEvery !== 0) continue;
          out.push('<text x="' + mm(x0 + (c - 0.5) * pitch) +
            '" y="' + mm(y0 - markPad - 1.2) + '" text-anchor="middle"' + textAttrs +
            '>' + c + '</text>');
        }
        for (r = 1; r <= ny; r++) {
          if (r !== 1 && r % labelEvery !== 0) continue;
          out.push('<text x="' + mm(x0 - markPad - 1.4) +
            '" y="' + mm(y0 + (r - 0.5) * pitch + fontSize * 0.36) +
            '" text-anchor="end"' + textAttrs + '>' + r + '</text>');
        }
      }

      /* ---- centre marks ----
         The true geometric centre of the field. With an even number of squares
         that lands on a grid line; with an odd number it lands in the middle of
         the centre square. Both are honest, and both are what you get when you
         fold the fabric in half twice. */
      if (showCentre) {
        var cx = x0 + gridW / 2;
        var cy = y0 + gridH / 2;
        /* Capped so the arrow always fits inside markPad: 0.4 clear of the grid
           plus 2.4 of arrow is 2.8, against the 3.0 reserved. */
        var size = Math.max(1.6, Math.min(2.4, pitch * 1.3));
        var marks =
          centreArrow(cx, y0 - 0.4, 'down', size) +
          centreArrow(cx, y0 + gridH + 0.4, 'up', size) +
          centreArrow(x0 - 0.4, cy, 'right', size) +
          centreArrow(x0 + gridW + 0.4, cy, 'left', size);
        out.push('<path d="' + marks + '" fill="' + MARK_COLOUR + '" stroke="none"/>');
      }

      /* ---- caption ----
         Both numbers, always, because the sheet is meant to settle the argument
         rather than join it. */
      if (showCaption) {
        var line1 = count + ' count ' + fabric.name + ', ' + fabric.note +
          ' | ' + n2(perInch) + ' stitches per inch | ' + n2(pitch) + ' mm squares';
        var line2 = nx + ' x ' + ny + ' stitches | design area ' +
          n2(gridW) + ' x ' + n2(gridH) + ' mm (' +
          n2(gridW / MM_PER_INCH) + ' x ' + n2(gridH / MM_PER_INCH) + ' in)';

        /* Helvetica runs a bit over half its point size per character, so
           estimate the line length from that, shrink the type to fit, and let
           the renderer compress anything that still overruns. */
        var EM = 0.55;
        var longest = Math.max(line1.length, line2.length);
        var capSize = num(usableW / (EM * longest), 2.8, 1.7, 2.8);
        var capAttrs = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
          mm(capSize) + '" fill="#111111"';
        var bottomEdge = v.page.h - margin;

        var captionLine = function (text, baseline) {
          var fit = EM * capSize * text.length > usableW
            ? ' textLength="' + mm(usableW) + '" lengthAdjust="spacingAndGlyphs"'
            : '';
          return '<text x="' + mm(margin) + '" y="' + mm(baseline) + '"' +
            capAttrs + fit + '>' + PP.esc(text) + '</text>';
        };

        out.push(captionLine(line1, bottomEdge - 5.2));
        out.push(captionLine(line2, bottomEdge - 1.2));
      }

      return out.join('');
    }
  });
})();
