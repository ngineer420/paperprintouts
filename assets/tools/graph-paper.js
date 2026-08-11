/* paperprintouts.com — graph paper.
 *
 * A square grid, centred inside the margin, drawn at true physical size.
 * Every coordinate here is a millimetre; the framework supplies the viewBox
 * that makes a millimetre on screen a millimetre on paper.
 *
 * The whole grid is emitted as two <path> elements — one for the normal lines
 * and one for the accents — rather than hundreds of <line> elements. At 1 mm
 * spacing on A3 that is roughly 700 lines, and the path form is about a third
 * of the bytes.
 */
(function () {
  'use strict';

  /* PP.inch and PP.round do exactly this, but reaching for them here would tie
     this module's evaluation to app.js having already run. Both are one-liners,
     so the module stays self-contained instead. */
  var MM_PER_INCH = 25.4;
  function inch(n) { return n * MM_PER_INCH; }
  function round(n, dp) {
    var f = Math.pow(10, dp);
    return Math.round(n * f) / f;
  }

  /* Spacing presets resolved to millimetres. The inch figures are exact:
     one inch is 25.4 mm by definition, so a quarter inch is 6.35 mm and is
     genuinely coarser than 5 mm paper. */
  var PRESETS = {
    '5mm': 5,
    '1cm': 10,
    '2mm': 2,
    '1mm': 1,
    'quarter-inch': inch(1 / 4),
    'half-inch': inch(1 / 2),
    'inch': inch(1),
    'eighth-inch': inch(1 / 8),
    'fifth-inch': inch(1 / 5),
    'tenth-inch': inch(1 / 10)
  };

  var COLOURS = {
    grey: '#9aa3ad',
    blue: '#8fb3e0',
    green: '#93c9a5',
    red: '#e0a0a0',
    black: '#333333'
  };

  /* Axes are for coordinate work, so they read as ink rather than as grid,
     whatever colour the grid itself is. */
  var AXIS_COLOUR = '#333333';

  /* Values arrive from the URL query string as well as from the form, so a key
     can be any string at all — including 'constructor' or '__proto__', which
     would otherwise resolve to something inherited and end up interpolated
     straight into the SVG. Only ever accept a key the map genuinely owns. */
  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  /* Same reasoning for numbers: never let NaN or a hostile string reach the
     output. Clamp to the range the control advertises. */
  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  /* Path coordinates to the nearest micron. round() hands back a Number, so
     trailing zeroes vanish on concatenation — worth having across 700 lines. */
  function mm(n) {
    return round(n, 3);
  }

  function path(d, colour, width) {
    return '<path d="' + d + '" fill="none" stroke="' + colour +
      '" stroke-width="' + round(width, 3) +
      '" shape-rendering="geometricPrecision"/>';
  }

  /* The preset wins; the typed spacing and its unit apply only under 'custom'
     (and as the fallback for any preset value we do not recognise). */
  function resolveSpacing(v) {
    var preset = lookup(PRESETS, v.preset, null);
    if (preset !== null) return preset;
    var typed = num(v.spacing, 5, 0.01, 1000);
    return v.units === 'inch' ? inch(typed) : typed;
  }

  PP.register('graph-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'preset', label: 'Grid spacing', type: 'select', default: '5mm',
        options: [
          { value: '5mm', label: '5 mm' },
          { value: '1cm', label: '1 cm' },
          { value: '2mm', label: '2 mm' },
          { value: '1mm', label: '1 mm' },
          { value: 'quarter-inch', label: '1/4 inch (6.35 mm) - 4 squares/inch' },
          { value: 'half-inch', label: '1/2 inch (12.7 mm)' },
          { value: 'inch', label: '1 inch (25.4 mm)' },
          { value: 'eighth-inch', label: '1/8 inch (3.175 mm) - 8 squares/inch' },
          { value: 'fifth-inch', label: '1/5 inch (5.08 mm) - 5 squares/inch' },
          { value: 'tenth-inch', label: '1/10 inch (2.54 mm) - 10 squares/inch' },
          { value: 'custom', label: 'Custom' }
        ],
        hint: 'Pick a standard size, or Custom to type your own below.'
      },
      {
        id: 'spacing', label: 'Custom spacing', type: 'number', default: 5,
        min: 0.5, max: 50, step: 0.1,
        hint: 'Used only when the spacing above is set to Custom.'
      },
      {
        id: 'units', label: 'Custom spacing unit', type: 'select', default: 'mm',
        options: [
          { value: 'mm', label: 'Millimetres' },
          { value: 'inch', label: 'Inches' }
        ]
      },
      {
        id: 'accentEvery', label: 'Heavy line every N squares', type: 'number', default: 5,
        min: 0, max: 20, step: 1,
        hint: '0 turns the heavy lines off. 5 gives the usual engineering block; on 1 mm paper, 10 marks the centimetres.'
      },
      {
        id: 'lineWidth', label: 'Line width (mm)', type: 'number', default: 0.12,
        min: 0.05, max: 0.5, step: 0.01,
        hint: 'Below about 0.1 mm some inkjets drop the line altogether.'
      },
      {
        id: 'accentWidth', label: 'Heavy line width (mm)', type: 'number', default: 0.25,
        min: 0.05, max: 0.8, step: 0.01
      },
      {
        id: 'colour', label: 'Line colour', type: 'select', default: 'grey',
        options: [
          { value: 'grey', label: 'Grey' },
          { value: 'blue', label: 'Blue' },
          { value: 'green', label: 'Green' },
          { value: 'red', label: 'Red' },
          { value: 'black', label: 'Black' }
        ]
      },
      { id: 'border', label: 'Draw the outer border', type: 'checkbox', default: false },
      { id: 'axes', label: 'Draw centre axes', type: 'checkbox', default: false }
    ],

    render: function (v) {
      var spacing = resolveSpacing(v);
      /* Written as a negated comparison so a NaN that somehow got this far
         fails here rather than silently drawing nothing. */
      if (!(spacing >= 0.5)) {
        throw new Error('That works out to ' + round(spacing, 3) +
          ' mm squares, which is too fine to print. Use 0.5 mm or more.');
      }

      var margin = num(v.margin, 10, 0, 200);
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;
      if (usableW < spacing || usableH < spacing) {
        throw new Error('Not one ' + round(spacing, 2) +
          ' mm square fits inside the margin on this sheet. Reduce the spacing, the margin, or use a larger paper size.');
      }

      /* Whole squares only, so no half square is left hanging at the edge.
         The epsilon absorbs the float error in cases that divide exactly,
         such as 190 mm of usable A4 width at 5 mm. */
      var nx = Math.floor(usableW / spacing + 1e-9);
      var ny = Math.floor(usableH / spacing + 1e-9);
      var gridW = nx * spacing;
      var gridH = ny * spacing;

      /* Centre the grid in the usable area: the remainder that will not make a
         whole square is split evenly between the two edges, which is what stops
         the sheet looking as though it slipped in the printer. */
      var x0 = margin + (usableW - gridW) / 2;
      var y0 = margin + (usableH - gridH) / 2;

      var lineWidth = num(v.lineWidth, 0.12, 0.05, 0.5);
      var accentWidth = num(v.accentWidth, 0.25, 0.05, 0.8);
      var accentEvery = Math.round(num(v.accentEvery, 5, 0, 20));
      var colour = lookup(COLOURS, v.colour, COLOURS.grey);

      var left = mm(x0);
      var top = mm(y0);
      var right = mm(x0 + gridW);
      var bottom = mm(y0 + gridH);

      var thin = '';
      var accent = '';
      var i, at, seg;

      /* Accents are counted from the first grid line, so the block pattern
         starts flush with the top-left corner of the grid rather than leaving
         a stray sliver of a block there. Any remainder lands at the far edge. */
      for (i = 0; i <= nx; i++) {
        at = mm(x0 + i * spacing);
        seg = 'M' + at + ' ' + top + 'V' + bottom;
        if (accentEvery && i % accentEvery === 0) accent += seg; else thin += seg;
      }
      for (i = 0; i <= ny; i++) {
        at = mm(y0 + i * spacing);
        seg = 'M' + left + ' ' + at + 'H' + right;
        if (accentEvery && i % accentEvery === 0) accent += seg; else thin += seg;
      }

      var out = '';
      if (thin) out += path(thin, colour, lineWidth);
      if (accent) out += path(accent, colour, accentWidth);

      if (v.axes) {
        /* The axes have to sit on grid lines, or they would cut a row of
           squares in half and make the paper useless for plotting. So we take
           the grid line nearest the middle: with an odd number of squares that
           is half a square off centre, which is the only honest option. */
        var axisWidth = Math.min(Math.max(accentWidth * 1.6, 0.3), 1);
        var ax = mm(x0 + Math.round(nx / 2) * spacing);
        var ay = mm(y0 + Math.round(ny / 2) * spacing);
        out += path(
          'M' + ax + ' ' + top + 'V' + bottom + 'M' + left + ' ' + ay + 'H' + right,
          AXIS_COLOUR, axisWidth
        );
      }

      if (v.border) {
        /* Drawn last, on top of the outermost grid lines, so the frame comes
           out one even weight the whole way round no matter where the accent
           pattern happens to fall at the edges. */
        out += '<rect x="' + left + '" y="' + top +
          '" width="' + mm(gridW) + '" height="' + mm(gridH) +
          '" fill="none" stroke="' + colour +
          '" stroke-width="' + round(accentWidth, 3) +
          '" shape-rendering="geometricPrecision"/>';
      }

      return out;
    }
  });
})();
