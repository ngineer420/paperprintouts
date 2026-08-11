/* paperprintouts.com — dot grid paper.
 *
 * A lattice of dots, centred inside the margin, drawn at true physical size.
 * Every coordinate here is a millimetre; the framework supplies the viewBox
 * that makes a millimetre on screen a millimetre on paper.
 *
 * ENCODING. Every dot is a two-arc circle subpath inside ONE <path>. The
 * obvious alternative — <defs><circle id="d"/></defs> and one <use> per dot —
 * is genuinely smaller on the wire: measured on 5 mm dots over A3 with a 10 mm
 * margin (4,536 dots) it is 142,738 characters against 201,570, about 31.5 a
 * dot against 44.4. It loses anyway, because the byte count is not the cost
 * that hurts: <use> also means 4,537 elements, each instantiating its own
 * shadow tree, against a single element for the path. One path also survives
 * the Download SVG button better, since <use> still wants an xlink:href to
 * open in older vector editors and a circle subpath wants nothing.
 *
 * A third encoding was rejected: a zero-length subpath ("M12 17h0") with
 * stroke-linecap="round" draws as a dot in every browser and is a third of the
 * bytes again, but several PDF and vector-editor pipelines drop zero-length
 * subpaths altogether, and this sheet exists to be printed.
 *
 * Nothing here is user text — colours come out of a fixed map and every other
 * value is a clamped number — so there is no PP.esc() call to look for.
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
  /* Coordinates to the nearest micron. round() hands back a Number, so trailing
     zeroes vanish on concatenation — worth having across thousands of dots. */
  function mm(n) {
    return round(n, 3);
  }

  var COLOURS = {
    'grey': '#9aa3ad',
    'light-grey': '#c3c9d1',
    'blue': '#8fb3e0',
    'black': '#333333'
  };

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
     output. Clamping to the range the control advertises is also what stops a
     hand-edited ?spacing=0.01 from asking the browser for a million dots. */
  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  /* '0.2' -> '.2', '-0.4' -> '-.4'. Legal SVG path number grammar. Only used on
     the arc string below, which is built once and then repeated on every dot. */
  function trim(n) {
    var s = String(n);
    if (s.indexOf('0.') === 0) return s.slice(1);
    if (s.indexOf('-0.') === 0) return '-' + s.slice(2);
    return s;
  }

  /* A full circle as two half-circle arcs, written relatively so one identical
     string closes every dot on the sheet. The pen is assumed to start at the
     circle's left-most point; the first arc sweeps right across the top to the
     right-most point, the second comes back across the bottom, and the pen
     finishes exactly where it began.
     r must already be rounded, so that the chord the arcs are asked to span is
     derived from the same rounded radius they are drawn with — otherwise a
     rounding disagreement of a micron makes the arc unsatisfiable and the
     renderer has to scale the radii up to compensate. */
  function arcSuffix(r) {
    var rr = trim(r);
    var d = trim(mm(r * 2));
    return 'a' + rr + ' ' + rr + ' 0 1 0 ' + d + ' 0' +
      'a' + rr + ' ' + rr + ' 0 1 0 -' + d + ' 0';
  }

  /* One dot, as a subpath. cx/cy are the centre; the subpath starts at the left
     of the circle so that the shared arc suffix lands it back on itself. */
  function dot(cx, cy, r, suffix) {
    return 'M' + mm(cx - r) + ' ' + mm(cy) + suffix;
  }

  function pathOf(d, colour) {
    return '<path d="' + d + '" fill="' + colour +
      '" stroke="none" shape-rendering="geometricPrecision"/>';
  }

  /* The typed number is in whichever unit the box next to it says. */
  function resolveSpacing(v) {
    var typed = num(v.spacing, 5, 1, 30);
    return v.units === 'inch' ? inch(typed) : typed;
  }

  PP.register('dot-grid-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'spacing', label: 'Dot spacing', type: 'number', default: 5,
        min: 1, max: 30, step: 0.5,
        hint: '5 mm is the bullet journal standard — Leuchtturm1917 and Scribbles That Matter both use it.'
      },
      {
        id: 'units', label: 'Spacing unit', type: 'select', default: 'mm',
        options: [
          { value: 'mm', label: 'Millimetres' },
          { value: 'inch', label: 'Inches' }
        ]
      },
      {
        id: 'layout', label: 'Layout', type: 'select', default: 'square',
        options: [
          { value: 'square', label: 'Square' },
          { value: 'triangular', label: 'Triangular (isometric)' }
        ],
        hint: 'Triangular offsets every other row by half a step, which is the grid isometric drawing needs.'
      },
      {
        id: 'dotSize', label: 'Dot size (mm)', type: 'number', default: 0.4,
        min: 0.1, max: 2, step: 0.05,
        hint: 'Diameter. Below about 0.3 mm the dots disappear under ink; above 0.6 mm they start competing with your handwriting.'
      },
      {
        id: 'colour', label: 'Dot colour', type: 'select', default: 'grey',
        options: [
          { value: 'grey', label: 'Grey' },
          { value: 'light-grey', label: 'Light grey' },
          { value: 'blue', label: 'Blue' },
          { value: 'black', label: 'Black' }
        ]
      },
      {
        id: 'accentEvery', label: 'Larger dot every N', type: 'number', default: 0,
        min: 0, max: 20, step: 1,
        hint: '0 turns them off. 5 marks out the same blocks as engineering graph paper.'
      },
      {
        id: 'accentSize', label: 'Larger dot size (mm)', type: 'number', default: 0.8,
        min: 0.1, max: 3, step: 0.05,
        hint: 'Diameter. Used only when the setting above is 1 or more.'
      }
    ],

    render: function (v) {
      var spacing = resolveSpacing(v);
      var margin = num(v.margin, 10, 0, 200);
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;

      var dotD = num(v.dotSize, 0.4, 0.1, 2);
      var accentD = num(v.accentSize, 0.8, 0.1, 3);
      var accentEvery = Math.round(num(v.accentEvery, 0, 0, 20));
      var colour = lookup(COLOURS, v.colour, COLOURS.grey);
      var accentOn = accentEvery >= 1;

      /* Nearest-neighbour distance is one step in both layouts, so one test
         covers both. Dots that meet each other stop being dot grid and start
         being a grey rectangle, which is a whole sheet of ink; better to say so
         than to print it. An accent's neighbour is an ordinary dot, so what
         closes that gap is the average of the two diameters. */
      var widest = accentOn ? Math.max(dotD, (dotD + accentD) / 2) : dotD;
      if (widest >= spacing) {
        throw new Error('Dots that size run into each other at ' + round(spacing, 2) +
          ' mm spacing. Make the dots smaller, or space them further apart.');
      }

      var triangular = v.layout === 'triangular';
      /* Row pitch. A triangular lattice puts its rows sqrt(3)/2 of a step apart
         and shifts every other one across by half a step; that is precisely
         what makes the distance to all six neighbours one step, which is what
         makes the paper isometric rather than merely staggered. */
      var rowH = triangular ? spacing * Math.sqrt(3) / 2 : spacing;

      /* The margin has to hold the ink, not the centres. A dot centred on the
         margin line puts half of itself outside it — 0.2 mm by default but a
         whole millimetre at the largest dot size, and on the 5 mm margin that
         is most printers' hardware limit that outermost row is exactly what
         gets clipped. So the centres live in a box inset by the largest radius
         drawn, and the corner dot is always an accent (row 0, column 0), which
         is why the accent radius counts.
         The cost is a column or row whenever the usable size divides nearly
         exactly — 190 mm of A4 at 5 mm now fits 37 steps rather than 38. That
         is the right way round: a slightly wider white edge is a preference,
         a clipped row of dots is a defect. */
      var inset = accentOn ? Math.max(dotD, accentD) / 2 : dotD / 2;
      var spanW = usableW - inset * 2;
      var spanH = usableH - inset * 2;

      /* Whole steps only, so no half step is left hanging at the edge. The
         epsilon absorbs float error in cases that divide exactly. nx and ny
         count gaps, so there is one more dot than that in each direction. */
      var nx = Math.floor(spanW / spacing + 1e-9);
      var ny = Math.floor(spanH / rowH + 1e-9);
      if (nx < 1 || ny < 1) {
        throw new Error('Not one ' + round(spacing, 2) +
          ' mm step fits inside the margin on this sheet. Reduce the spacing, reduce the margin, or use a larger paper size.');
      }

      /* Centre the lattice in that box: the remainder that will not make a
         whole step is split evenly between the two edges, which is what stops
         the sheet looking as though it slipped in the printer. */
      var gridW = nx * spacing;
      var gridH = ny * rowH;
      var x0 = margin + inset + (spanW - gridW) / 2;
      var y0 = margin + inset + (spanH - gridH) / 2;

      /* Round the radius once, then derive everything from the rounded value,
         so the arcs and the start point agree to the micron. */
      var rNormal = mm(dotD / 2);
      var rAccent = mm(accentD / 2);
      var sNormal = arcSuffix(rNormal);
      var sAccent = arcSuffix(rAccent);

      var normal = [];
      var accent = [];
      var row, col, cy, rowX0, count, accentRow, odd, cx;

      for (row = 0; row <= ny; row++) {
        cy = y0 + row * rowH;
        odd = triangular && row % 2 === 1;
        /* An odd triangular row starts half a step in and so holds one dot
           fewer. That keeps it inside the same centred footprint as the even
           rows — it reads as inset by half a step at each end, which is the
           lattice being honest rather than the centring being wrong. Letting it
           keep the full count instead would hang half a step over the margin. */
        rowX0 = odd ? x0 + spacing / 2 : x0;
        count = odd ? nx : nx + 1;

        /* Accents are counted from the first dot, so the block pattern starts
           flush with the top-left corner and any remainder lands at the far
           edge. On a square grid this marks every Nth intersection, the usual
           graph-paper block. On a triangular grid an even N gives a clean
           rectangular lattice of accents; an odd N picks up rows of both
           parities, so those accent rows alternate their half-step offset,
           because the rows underneath them do. */
        accentRow = accentEvery >= 1 && row % accentEvery === 0;

        for (col = 0; col < count; col++) {
          cx = rowX0 + col * spacing;
          if (accentRow && col % accentEvery === 0) {
            accent.push(dot(cx, cy, rAccent, sAccent));
          } else {
            normal.push(dot(cx, cy, rNormal, sNormal));
          }
        }
      }

      /* Joined at the end rather than concatenated in the loop: the coarsest
         settings the clamps allow — 1 mm triangular across tabloid landscape
         with no margin — is 139,000 subpaths and about 7 MB of path data. That
         builds in around 30 ms; what costs is the browser parsing it back in.
         It is an extreme the controls genuinely permit, so it is left to work
         rather than being capped. */
      var out = '';
      if (normal.length) out += pathOf(normal.join(''), colour);
      if (accent.length) out += pathOf(accent.join(''), colour);
      return out;
    }
  });
})();
