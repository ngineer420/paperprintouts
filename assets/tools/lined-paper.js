/* paperprintouts.com — lined paper and handwriting paper.
 *
 * Two modes share one sheet layout:
 *
 *   Ruled mode      one horizontal rule per writing row. The rule is the
 *                   *bottom* of the row, so the first rule sits one full
 *                   spacing below the top of the usable area and there is
 *                   somewhere to write above it.
 *
 *   Handwriting     each row is a group of guides — solid top line, dashed
 *                   midline at the x-height, solid baseline, and an optional
 *                   descender line under it.
 *
 * Every coordinate is a millimetre. The framework supplies the viewBox that
 * makes a millimetre here a millimetre on paper, so nothing may be scaled.
 */
(function () {
  'use strict';

  /* Ruled spacings in millimetres. These are the US paper standards, not
     roundings of them: wide ruled is 11/32 in, college is 9/32 in and narrow
     is 1/4 in, which come to 8.73, 7.14 and 6.35 mm. The site advertises
     8.7 / 7.1 / 6.4, so those are the numbers used, to a tenth. */
  var PRESETS = {
    wide: 8.7,
    college: 7.1,
    narrow: 6.4
  };

  var LINE_COLOURS = {
    blue: '#7fa8d8',
    grey: '#a8afb8',
    black: '#333333'
  };

  var MARGIN_COLOURS = {
    red: '#d98b8b',
    blue: '#7fa8d8',
    grey: '#a8afb8'
  };

  /* The header labels are ink, not rule, whatever colour the rules are. */
  var TEXT_COLOUR = '#333333';

  /* Vertical space the name/date block takes off the top of the usable area,
     and where its rule sits inside that block. */
  var HEADER_BLOCK = 14;
  var HEADER_RULE_Y = 8;
  var HEADER_FONT = 3.6;

  /* Values arrive from the URL query string as well as from the form, so a key
     can be any string at all — including '__proto__' or 'constructor', which
     would otherwise resolve to something inherited and land in the output.
     Only ever accept a key the map genuinely owns. */
  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  /* Same reasoning for numbers: never let NaN or a hostile string through.
     Clamp to the range the control advertises. */
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

  /* Coordinates to the nearest micron. round() returns a Number, so trailing
     zeroes disappear on concatenation — worth having across a few hundred
     line segments. */
  function mm(n) {
    return round(n, 3);
  }

  /* Mix a #rrggbb colour towards white. Used for the midline and descender
     guides: the brief asks for them to read as visibly lighter than the solid
     lines, and a genuinely lighter ink survives printing more reliably than
     stroke-opacity, which some drivers dither into a mess. */
  function lighten(hex, amount) {
    var out = '#';
    var i, part;
    for (i = 0; i < 3; i++) {
      part = parseInt(hex.substr(1 + i * 2, 2), 16);
      part = Math.round(part + (255 - part) * amount);
      out += (part < 16 ? '0' : '') + part.toString(16);
    }
    return out;
  }

  function path(d, colour, width, dash) {
    return '<path d="' + d +
      '" fill="none" stroke="' + colour +
      '" stroke-width="' + round(width, 3) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') +
      ' shape-rendering="geometricPrecision"/>';
  }

  /* One horizontal rule as a path segment. */
  function rule(x1, x2, y) {
    return 'M' + mm(x1) + ' ' + mm(y) + 'H' + mm(x2);
  }

  /* No text is measurable before it is in the document, so the gap left for a
     label is estimated: 0.58 em per character is a safe average for the
     handful of short Latin words used here, plus 1.6 mm of air. Over-estimating
     only shortens the rule slightly; under-estimating would run text into it. */
  function labelWidth(text) {
    return text.length * HEADER_FONT * 0.58 + 1.6;
  }

  function label(text, x, y) {
    return '<text x="' + mm(x) + '" y="' + mm(y) +
      '" font-family="Helvetica, Arial, sans-serif" font-size="' + HEADER_FONT +
      '" fill="' + TEXT_COLOUR + '">' + text + '</text>';
  }

  /* Name and date fields across the top of the usable area. Returns the SVG
     for the block; the caller has already reserved HEADER_BLOCK mm for it. */
  function header(left, right, top, colour, width) {
    var usableW = right - left;
    var ruleY = top + HEADER_RULE_Y;
    /* The label sits on the rule, lifted just clear of the stroke. */
    var textY = ruleY - 1;
    var gutter = 8;
    var out = '';
    var nameRight, dateLeft;

    if (usableW < 60) {
      /* Too narrow to split honestly — one field, and the writer can put the
         date wherever they like on it. */
      nameRight = right;
      dateLeft = null;
    } else {
      /* A name needs roughly twice the room a written date does. */
      nameRight = left + (usableW - gutter) * 0.62;
      dateLeft = nameRight + gutter;
    }

    out += label('Name', left, textY);
    out += path(rule(left + labelWidth('Name'), nameRight, ruleY), colour, width);

    if (dateLeft !== null) {
      out += label('Date', dateLeft, textY);
      out += path(rule(dateLeft + labelWidth('Date'), right, ruleY), colour, width);
    }
    return out;
  }

  /* Where the vertical margin rules go. Throws rather than drawing a margin
     line off the sheet or through the middle of the writing area. */
  function marginXs(mode, offset, page, margin) {
    var left = margin;
    var right = page.w - margin;
    var xs = [];
    var wantLeft = mode === 'left' || mode === 'both';
    var wantRight = mode === 'right' || mode === 'both';
    var lx, rx;

    if (wantLeft) {
      lx = offset;
      if (lx < left || lx > right) {
        throw new Error('A margin line ' + round(offset, 1) + ' mm from the left edge falls outside the ' +
          round(margin, 1) + ' mm page margin on a sheet ' + round(page.w, 1) +
          ' mm wide. Reduce the offset, reduce the margin, or use a larger paper size.');
      }
      xs.push(lx);
    }
    if (wantRight) {
      rx = page.w - offset;
      if (rx < left || rx > right) {
        throw new Error('A margin line ' + round(offset, 1) + ' mm from the right edge falls outside the ' +
          round(margin, 1) + ' mm page margin on a sheet ' + round(page.w, 1) +
          ' mm wide. Reduce the offset, reduce the margin, or use a larger paper size.');
      }
      xs.push(rx);
    }
    if (wantLeft && wantRight && rx - lx < 10) {
      /* The two rules have met in the middle, or crossed over each other, so
         quote the largest offset that still leaves 10 mm between them rather
         than reporting a negative width. */
      throw new Error('Margin lines ' + round(offset, 1) +
        ' mm in from each edge leave nothing to write between them on a sheet ' +
        round(page.w, 1) + ' mm wide. Use an offset below ' +
        round((page.w - 10) / 2, 1) + ' mm, or a larger paper size.');
    }
    return xs;
  }

  PP.register('lined-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'preset', label: 'Ruling', type: 'select', default: 'college',
        options: [
          { value: 'wide', label: 'Wide ruled (8.7 mm)' },
          { value: 'college', label: 'College ruled (7.1 mm)' },
          { value: 'narrow', label: 'Narrow ruled (6.4 mm)' },
          { value: 'handwriting', label: 'Handwriting practice (baseline, midline, top line)' },
          { value: 'custom', label: 'Custom spacing' }
        ],
        hint: 'Handwriting practice uses the three guide controls at the bottom instead of the spacing.'
      },
      {
        id: 'spacing', label: 'Custom line spacing (mm)', type: 'number', default: 7.1,
        min: 3, max: 30, step: 0.1,
        hint: 'Used only when the ruling above is set to Custom spacing.'
      },
      {
        id: 'marginLine', label: 'Margin line', type: 'select', default: 'left',
        options: [
          { value: 'none', label: 'None' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'both', label: 'Both edges' }
        ]
      },
      {
        id: 'marginOffset', label: 'Margin line offset (mm)', type: 'number', default: 32,
        min: 10, max: 80, step: 1,
        hint: 'Measured from the edge of the paper, not from the printing margin.'
      },
      {
        id: 'lineColour', label: 'Line colour', type: 'select', default: 'blue',
        options: [
          { value: 'blue', label: 'Blue' },
          { value: 'grey', label: 'Grey' },
          { value: 'black', label: 'Black' }
        ]
      },
      {
        id: 'marginColour', label: 'Margin line colour', type: 'select', default: 'red',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' },
          { value: 'grey', label: 'Grey' }
        ]
      },
      {
        id: 'lineWidth', label: 'Line width (mm)', type: 'number', default: 0.15,
        min: 0.05, max: 0.5, step: 0.01,
        hint: 'Below about 0.1 mm some inkjets drop the line altogether.'
      },
      { id: 'header', label: 'Name and date line at the top', type: 'checkbox', default: false },
      {
        id: 'bodyHeight', label: 'Handwriting: baseline to top line (mm)', type: 'number', default: 10,
        min: 5, max: 25, step: 0.5,
        hint: 'The height of a capital letter. 10 mm suits early writers; 6 to 7 mm suits older ones.'
      },
      {
        id: 'xHeightRatio', label: 'Handwriting: midline position', type: 'number', default: 0.5,
        min: 0.3, max: 0.7, step: 0.05,
        hint: 'Height of a lower-case x as a fraction of the capital height. 0.5 puts the dashed line half way up.'
      },
      { id: 'descender', label: 'Handwriting: draw the descender line', type: 'checkbox', default: true }
    ],

    render: function (v) {
      var margin = num(v.margin, 10, 0, 200);
      var left = margin;
      var right = v.page.w - margin;
      var top = margin;
      var bottom = v.page.h - margin;

      if (right - left < 20 || bottom - top < 20) {
        throw new Error('A ' + round(margin, 1) + ' mm margin leaves almost nothing to rule on a ' +
          round(v.page.w, 1) + ' by ' + round(v.page.h, 1) + ' mm sheet. Reduce the margin or use a larger paper size.');
      }

      var lineWidth = num(v.lineWidth, 0.15, 0.05, 0.5);
      var lineColour = lookup(LINE_COLOURS, v.lineColour, LINE_COLOURS.blue);
      var marginColour = lookup(MARGIN_COLOURS, v.marginColour, MARGIN_COLOURS.red);
      /* 45% towards white is enough to read as a secondary guide at every one
         of the three line colours, and still dark enough to print. */
      var guideColour = lighten(lineColour, 0.45);
      /* Secondary guides are thinner as well as lighter, so they stay quiet
         even on a printer that fattens everything. */
      var guideWidth = Math.max(lineWidth * 0.85, 0.05);

      var out = '';

      /* The header eats off the top of the usable area before any rule is
         placed, so the rules below it are still whole rows. */
      var rulesTop = top;
      if (v.header) {
        /* A field rule wants a little more presence than a writing rule. */
        out += header(left, right, top, lineColour, Math.max(lineWidth * 1.5, 0.2));
        rulesTop = top + HEADER_BLOCK;
      }

      var avail = bottom - rulesTop;
      var solid = '';
      var dashed = '';
      var light = '';
      var i, y0, rows;

      if (v.preset === 'handwriting') {
        var bodyHeight = num(v.bodyHeight, 10, 5, 25);
        var ratio = num(v.xHeightRatio, 0.5, 0.3, 0.7);
        var xHeight = bodyHeight * ratio;

        /* Classic three-zone handwriting paper gives the descender the same
           depth below the baseline as the x-height above it. Capped at half the
           body so a tall x-height setting cannot push the descender line down
           into the next row's territory. */
        var descDepth = Math.min(xHeight, bodyHeight * 0.5);

        /* Clear air between one row's descender line and the next row's top
           line. Proportional to the body so the sheet keeps its look at any
           size, with a floor so small settings do not fuse into a block. */
        var gap = Math.max(bodyHeight * 0.5, 3);

        var rowH = bodyHeight + descDepth;   /* top line down to descender */
        var pitch = rowH + gap;              /* top line to next top line */

        /* n rows need n row heights and only n-1 gaps, hence the + gap. */
        rows = Math.floor((avail + gap) / pitch + 1e-9);
        if (rows < 1) {
          throw new Error('One handwriting row needs ' + round(rowH, 1) +
            ' mm and only ' + round(avail, 1) +
            ' mm is free inside the margin. Reduce the baseline-to-top-line height, reduce the margin' +
            (v.header ? ', turn the name and date line off,' : ',') + ' or use a larger paper size.');
        }

        var blockH = rows * rowH + (rows - 1) * gap;
        /* Split the leftover evenly so the sheet does not look as though it
           slipped in the printer. */
        y0 = rulesTop + (avail - blockH) / 2;

        for (i = 0; i < rows; i++) {
          var topLineY = y0 + i * pitch;
          var baseY = topLineY + bodyHeight;
          solid += rule(left, right, topLineY);
          solid += rule(left, right, baseY);
          dashed += rule(left, right, baseY - xHeight);
          /* The descender space is reserved whether or not its guide is drawn —
             letters descend either way, so the row pitch must not change when
             the checkbox does. */
          if (v.descender) light += rule(left, right, baseY + descDepth);
        }
      } else {
        var spacing = lookup(PRESETS, v.preset, null);
        if (spacing === null) spacing = num(v.spacing, 7.1, 3, 30);

        /* Each rule is the bottom of a writing row, so a row of clear space
           sits above the first rule. That is why rows, not rules, are counted
           and why the loop starts at 1. */
        rows = Math.floor(avail / spacing + 1e-9);
        if (rows < 1) {
          throw new Error('A ' + round(spacing, 1) + ' mm line does not fit in the ' +
            round(avail, 1) + ' mm free inside the margin. Reduce the spacing, reduce the margin' +
            (v.header ? ', turn the name and date line off,' : ',') + ' or use a larger paper size.');
        }
        y0 = rulesTop + (avail - rows * spacing) / 2;
        for (i = 1; i <= rows; i++) {
          solid += rule(left, right, y0 + i * spacing);
        }
      }

      if (solid) out += path(solid, lineColour, lineWidth);
      /* 1.5 mm of dash to 1 mm of gap: short enough to read as a guide rather
         than a rule, long enough that it does not vanish on a laser printer. */
      if (dashed) out += path(dashed, guideColour, guideWidth, '1.5 1');
      if (light) out += path(light, guideColour, guideWidth);

      /* Margin rules last, so they sit over the writing lines the way the red
         line does on real paper, and run the full height of the usable area
         including past the header. */
      var xs = marginXs(v.marginLine, num(v.marginOffset, 32, 0, 500), v.page, margin);
      if (xs.length) {
        var d = '';
        for (i = 0; i < xs.length; i++) {
          d += 'M' + mm(xs[i]) + ' ' + mm(top) + 'V' + mm(bottom);
        }
        /* A shade heavier than the rules it crosses, which is what makes it
           read as a margin rather than as one more line. */
        out += path(d, marginColour, Math.min(lineWidth * 1.2, 0.6));
      }

      return out;
    }
  });
})();
