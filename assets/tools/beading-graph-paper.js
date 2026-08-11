/* paperprintouts.com -- beading graph paper.
 *
 * Blank bead-by-bead charting paper for seven off-loom stitches, drawn from
 * bead dimensions rather than from a fixed PDF, so it comes off the printer at
 * the true size of the bead you are actually holding. Every coordinate is a
 * millimetre; the framework supplies the viewBox that makes a millimetre on
 * screen a millimetre on paper.
 *
 * TWO NUMBERS DESCRIBE A BEAD, and getting them the right way round is the
 * whole job:
 *
 *   D -- the diameter, across the hole. Miyuki quotes this first: a Delica
 *        11/0 is "1.6 x 1.3 mm", and 1.6 is D.
 *   L -- the length, along the hole. That is the 1.3.
 *
 * Which of the two ends up horizontal on the chart depends on which way the
 * thread runs through the fabric, and that is what makes each stitch's paper
 * different:
 *
 *   Brick    -- holes vertical, beads side by side in horizontal rows. A bead
 *               is D wide and L tall, so it reads as a brick lying down. Rows
 *               are offset horizontally by D/2.
 *   Peyote   -- the same fabric turned 90 degrees. Holes horizontal, so a bead
 *               is L wide and D tall, columns are offset vertically by D/2.
 *   Loom /   -- holes horizontal like peyote, but the beads line up instead of
 *   square      staggering, so the cell is L x D on a plain grid.
 *   2-drop   -- peyote where every stitch picks up two beads, which sit end to
 *   peyote      end along the hole. The unit is 2L wide, the stagger unchanged.
 *   Herring- -- holes vertical like brick, but stacked in columns and worked in
 *   bone        pairs; the thread crossing the top of each pair pulls the two
 *               beads' tops together, which is the lean that names the stitch.
 *   RAW      -- four beads in a ring around a hole, neighbouring rings sharing
 *               a bead. Ring pitch is L + D in both directions.
 *
 * Odd- and even-count peyote are the same lattice; what differs is the number
 * of columns, and that the odd-count edge needs its own turn every other row.
 * The generator therefore forces the column count to the right parity rather
 * than pretending the two are interchangeable.
 *
 * ENCODING. Every bead is one subpath of a single <path>, the way dot-grid-
 * paper draws its dots: a full sheet of 15/0 peyote is tens of thousands of
 * beads, and tens of thousands of <rect> elements is what makes a page crawl.
 * The path is filled white -- invisible on white paper, no ink -- so that the
 * right-angle weave guide lines drawn underneath it show only in the holes.
 *
 * Nothing here is user text: every value is a clamped number or comes out of a
 * map that is checked with hasOwnProperty first.
 */
(function () {
  'use strict';

  var PP = window.PP;

  /* Coordinates to 0.01 mm. A 600 dpi printer resolves 42 microns, so ten is
     already past the point of visibility, and across tens of thousands of
     beads the byte count is worth more than the digit. */
  function mm(n) { return PP.round(n, 2); }
  function n2(n) { return PP.round(n, 2); }

  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  /* Values arrive from the query string as well as the form, so a key can be
     any string at all -- including '__proto__'. Only ever take a key the map
     genuinely owns. */
  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  /* ---------- beads ----------
   *
   * d = diameter across the hole, l = length along it, both in millimetres.
   *
   * The four cylinder sizes are Miyuki's own published Delica dimensions. The
   * round figures are Miyuki's published rocaille diameters, and a diameter is
   * ALL that is published -- rocailles are sold by it, because the squash along
   * the hole varies by maker and by batch, which is exactly why cylinder beads
   * are preferred for patterns that have to be exact. So the length along the
   * hole is not asserted here: the 'roundHeight' control derives it from the
   * diameter, defaulting to a stated 80% that the caption always prints, and
   * anyone who has measured their own stash can set it or type both numbers
   * straight in with the custom size.
   */
  var BEADS = {
    'delica-15': { label: 'Delica cylinder 15/0 (1.30 x 1.15 mm)', name: 'Delica 15/0', d: 1.3, l: 1.15 },
    'delica-11': { label: 'Delica cylinder 11/0 (1.60 x 1.30 mm)', name: 'Delica 11/0', d: 1.6, l: 1.3 },
    'delica-10': { label: 'Delica cylinder 10/0 (2.20 x 1.70 mm)', name: 'Delica 10/0', d: 2.2, l: 1.7 },
    'delica-8': { label: 'Delica cylinder 8/0 (3.00 x 2.80 mm)', name: 'Delica 8/0', d: 3.0, l: 2.8 },
    'round-15': { label: 'Round seed bead 15/0 (1.5 mm across)', name: 'Round 15/0', d: 1.5, round: true },
    'round-11': { label: 'Round seed bead 11/0 (2.0 mm across)', name: 'Round 11/0', d: 2.0, round: true },
    'round-8': { label: 'Round seed bead 8/0 (3.0 mm across)', name: 'Round 8/0', d: 3.0, round: true },
    'round-6': { label: 'Round seed bead 6/0 (4.0 mm across)', name: 'Round 6/0', d: 4.0, round: true },
    'custom': { label: 'Custom size (set the two boxes below)', name: 'Custom bead', custom: true }
  };

  var BEAD_ORDER = [
    'delica-15', 'delica-11', 'delica-10', 'delica-8',
    'round-15', 'round-11', 'round-8', 'round-6', 'custom'
  ];

  /* ---------- stitches ---------- */

  /* The lean on a herringbone pair is set by thread tension, not by the bead,
     so there is no measurement to quote. Ten degrees is the drawing convention
     -- enough to read as a chevron, small enough that the cell is still a cell
     you can colour in. */
  var TILT_DEG = 10;
  var TILT = TILT_DEG * Math.PI / 180;

  var STITCHES = {
    'peyote-even': { label: 'Peyote, even count', unit: 'bead', parity: 'even' },
    'peyote-odd': { label: 'Peyote, odd count', unit: 'bead', parity: 'odd' },
    'peyote-2drop': { label: 'Peyote, two-drop', unit: 'two-bead column' },
    'brick': { label: 'Brick stitch', unit: 'bead' },
    'loom': { label: 'Loom / square stitch', unit: 'bead' },
    'herringbone': { label: 'Herringbone (Ndebele)', unit: 'bead', parity: 'even' },
    'raw': { label: 'Right-angle weave', unit: 'unit' }
  };

  var STITCH_ORDER = [
    'peyote-even', 'peyote-odd', 'peyote-2drop',
    'brick', 'loom', 'herringbone', 'raw'
  ];

  /* Field size is always cols * unitW + padW by rows * unitH + padH. The pads
     are the overhang the stagger adds beyond the last whole cell: half a bead
     for peyote and brick, a bead's diameter for the ring beads that stick out
     past the outermost right-angle weave unit. Herringbone's pad is negative
     because unitW carries half a pair-gap that the last column does not use. */
  function metrics(key, D, L) {
    var bw, bh, gap;
    if (key === 'peyote-even' || key === 'peyote-odd') {
      return { unitW: L, unitH: D, padW: 0, padH: D / 2, drop: 1 };
    }
    if (key === 'peyote-2drop') {
      return { unitW: 2 * L, unitH: D, padW: 0, padH: D / 2, drop: 2 };
    }
    if (key === 'brick') {
      return { unitW: D, unitH: L, padW: D / 2, padH: 0 };
    }
    if (key === 'loom') {
      return { unitW: L, unitH: D, padW: 0, padH: 0 };
    }
    if (key === 'herringbone') {
      /* A D x L rectangle leaned by TILT projects this wide and this tall, so
         these pitches are the exact separation at which leaned beads stop
         touching their neighbours. */
      bw = D * Math.cos(TILT) + L * Math.sin(TILT);
      bh = L * Math.cos(TILT) + D * Math.sin(TILT);
      /* The lean opens a gap where two pairs meet bottom to bottom. Drawing it
         is what makes the pairing legible on a blank sheet. */
      gap = L * Math.sin(TILT);
      return { unitW: bw + gap / 2, unitH: bh, padW: -gap, padH: 0, bw: bw, bh: bh, gap: gap };
    }
    /* Right-angle weave. */
    return { unitW: L + D, unitH: L + D, padW: D, padH: D };
  }

  /* ---------- bead outlines ----------
   *
   * One subpath per bead, so the whole sheet is a single <path>. Local
   * coordinates are the bead's own axes; P() rotates them into the page, which
   * is what lets herringbone lean without a per-element transform.
   */
  function beadSubpath(b, shape) {
    var ca = Math.cos(b.rot), sa = Math.sin(b.rot);
    var hw = b.w / 2, hh = b.h / 2;
    var r, rr, deg;

    function P(lx, ly) {
      return mm(b.x + lx * ca - ly * sa) + ' ' + mm(b.y + lx * sa + ly * ca);
    }

    if (shape === 'oval') {
      deg = mm(b.rot * 180 / Math.PI);
      /* Two half-turn arcs, left point to right point and back. The ellipse
         carries its own x-axis rotation, so a leaned oval needs no transform
         either. */
      return 'M' + P(-hw, 0) +
        'A' + mm(hw) + ' ' + mm(hh) + ' ' + deg + ' 1 1 ' + P(hw, 0) +
        'A' + mm(hw) + ' ' + mm(hh) + ' ' + deg + ' 1 1 ' + P(-hw, 0) + 'Z';
    }

    r = shape === 'rounded' ? Math.min(hw, hh) * 0.42 : 0;
    if (r < 0.02) {
      return 'M' + P(-hw, -hh) + 'L' + P(hw, -hh) + 'L' + P(hw, hh) + 'L' + P(-hw, hh) + 'Z';
    }
    rr = mm(r);
    /* Clockwise on screen -- y points down -- so every corner sweeps 1. */
    return 'M' + P(-hw + r, -hh) +
      'L' + P(hw - r, -hh) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + P(hw, -hh + r) +
      'L' + P(hw, hh - r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + P(hw - r, hh) +
      'L' + P(-hw + r, hh) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + P(-hw, hh - r) +
      'L' + P(-hw, -hh + r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + P(-hw + r, -hh) + 'Z';
  }

  /* ---------- the lattices ----------
   *
   * Each returns bead centres in a field whose top-left corner is (0, 0).
   */
  function buildBeads(key, D, L, m, cols, rows) {
    var beads = [], c, r, j, u, val, half, horiz, pair, side, cx;

    if (key === 'peyote-even' || key === 'peyote-odd' || key === 'peyote-2drop') {
      for (c = 0; c < cols; c++) {
        for (r = 0; r < rows; r++) {
          for (j = 0; j < m.drop; j++) {
            beads.push({
              x: c * m.unitW + j * L + L / 2,
              y: (c % 2) * (D / 2) + r * D + D / 2,
              w: L, h: D, rot: 0
            });
          }
        }
      }
      return beads;
    }

    if (key === 'brick') {
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          beads.push({
            x: (r % 2) * (D / 2) + c * D + D / 2,
            y: r * L + L / 2,
            w: D, h: L, rot: 0
          });
        }
      }
      return beads;
    }

    if (key === 'loom') {
      for (c = 0; c < cols; c++) {
        for (r = 0; r < rows; r++) {
          beads.push({ x: c * L + L / 2, y: r * D + D / 2, w: L, h: D, rot: 0 });
        }
      }
      return beads;
    }

    if (key === 'herringbone') {
      for (c = 0; c < cols; c++) {
        pair = Math.floor(c / 2);
        side = c % 2;
        cx = pair * (2 * m.bw + m.gap) + side * m.bw + m.bw / 2;
        for (r = 0; r < rows; r++) {
          /* Left of the pair leans its top to the right, right of the pair
             leans its top to the left: tops together, which is the chevron. */
          beads.push({
            x: cx, y: r * m.bh + m.bh / 2,
            w: D, h: L, rot: side === 0 ? TILT : -TILT
          });
        }
      }
      return beads;
    }

    /* Right-angle weave. Beads sit on a half-unit lattice wherever u + v is
       odd; u odd puts the hole horizontal, v odd puts it vertical. Rings share
       their edge beads with the ring next door, which is what the lattice says
       for free -- each shared bead is emitted exactly once. */
    half = m.unitW / 2;
    for (u = 0; u <= 2 * cols; u++) {
      for (val = 0; val <= 2 * rows; val++) {
        if ((u + val) % 2 === 0) continue;
        horiz = (u % 2) === 1;
        beads.push({
          x: u * half + D / 2,
          y: val * half + D / 2,
          w: horiz ? L : D,
          h: horiz ? D : L,
          rot: 0
        });
      }
    }
    return beads;
  }

  /* ---------- counting guides ----------
   *
   * A guide has to run along a cell boundary or it slices beads in half. On a
   * staggered lattice that boundary is a staircase, so the guide is drawn as
   * one, stepping by half a bead at every column (peyote) or row (brick).
   */
  function buildGuides(key, D, L, m, cols, rows, every, fieldW, fieldH) {
    var d = '', c, r, y, x;

    if (key === 'peyote-even' || key === 'peyote-odd' || key === 'peyote-2drop') {
      for (c = every; c < cols; c += every) {
        /* One neighbour starts at the top of the field and the other ends at
           the bottom of it, so the full height is exactly their union. */
        d += 'M' + mm(c * m.unitW) + ' 0V' + mm(fieldH);
      }
      for (r = every; r < rows; r += every) {
        d += 'M0 ' + mm(r * D);
        for (c = 0; c < cols; c++) {
          d += 'H' + mm((c + 1) * m.unitW);
          if (c + 1 < cols) d += 'V' + mm(((c + 1) % 2) * (D / 2) + r * D);
        }
      }
      return d;
    }

    if (key === 'brick') {
      for (r = every; r < rows; r += every) {
        d += 'M0 ' + mm(r * L) + 'H' + mm(fieldW);
      }
      for (c = every; c < cols; c += every) {
        d += 'M' + mm(c * D) + ' 0';
        for (r = 0; r < rows; r++) {
          d += 'V' + mm((r + 1) * L);
          if (r + 1 < rows) d += 'H' + mm(((r + 1) % 2) * (D / 2) + c * D);
        }
      }
      return d;
    }

    if (key === 'loom') {
      for (c = every; c < cols; c += every) d += 'M' + mm(c * L) + ' 0V' + mm(fieldH);
      for (r = every; r < rows; r += every) d += 'M0 ' + mm(r * D) + 'H' + mm(fieldW);
      return d;
    }

    if (key === 'herringbone') {
      /* Only pair boundaries are free of beads, so the step is rounded up to
         the next whole pair. */
      var step = every % 2 === 0 ? every : every * 2;
      for (c = step; c < cols; c += step) {
        d += 'M' + mm((c / 2) * (2 * m.bw + m.gap) - m.gap / 2) + ' 0V' + mm(fieldH);
      }
      for (r = every; r < rows; r += every) d += 'M0 ' + mm(r * m.bh) + 'H' + mm(fieldW);
      return d;
    }

    /* Right-angle weave: no straight line misses every bead, so these are
       drawn underneath the white-filled beads and show only in the holes. */
    for (c = every; c < cols; c += every) {
      x = c * m.unitW + D / 2;
      d += 'M' + mm(x) + ' 0V' + mm(fieldH);
    }
    for (r = every; r < rows; r += every) {
      y = r * m.unitH + D / 2;
      d += 'M0 ' + mm(y) + 'H' + mm(fieldW);
    }
    return d;
  }

  /* ---------- palette ---------- */

  var COLOURS = {
    'grey': { line: '#9aa3ad', guide: '#5c6672' },
    'light-grey': { line: '#c3c9d1', guide: '#9aa3ad' },
    'blue': { line: '#8fb3e0', guide: '#4a76b8' },
    'black': { line: '#333333', guide: '#000000' }
  };

  function stitchOptions() {
    var out = [], i;
    for (i = 0; i < STITCH_ORDER.length; i++) {
      out.push({ value: STITCH_ORDER[i], label: STITCHES[STITCH_ORDER[i]].label });
    }
    return out;
  }

  function beadOptions() {
    var out = [], i;
    for (i = 0; i < BEAD_ORDER.length; i++) {
      out.push({ value: BEAD_ORDER[i], label: BEADS[BEAD_ORDER[i]].label });
    }
    return out;
  }

  /* The whole sheet is one path, so the cost that bites is the browser parsing
     it back in, not building it. A3 of 15/0 peyote is about 72,000 beads and
     13 MB of path data, which takes a moment but is a sheet somebody genuinely
     wants; much past that it stops being usable, so it is refused with an
     explanation rather than left to hang. */
  var MAX_BEADS = 90000;

  PP.register('beading-graph-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'stitch', label: 'Stitch', type: 'select', default: 'peyote-even',
        options: stitchOptions(),
        hint: 'Peyote and brick are the same fabric turned 90 degrees, which is why their paper is the same paper rotated.'
      },
      {
        id: 'bead', label: 'Bead size', type: 'select', default: 'delica-11',
        options: beadOptions(),
        hint: 'Cylinder sizes are Miyuki’s published Delica dimensions: diameter across the hole first, length along it second.'
      },
      {
        id: 'beadWidth', label: 'Custom bead diameter (mm)', type: 'number', default: 1.6,
        min: 0.5, max: 15, step: 0.05,
        hint: 'Across the hole. Used only when the size above is set to Custom.'
      },
      {
        id: 'beadLength', label: 'Custom bead length (mm)', type: 'number', default: 1.3,
        min: 0.5, max: 15, step: 0.05,
        hint: 'Along the hole. Used only when the size above is set to Custom.'
      },
      {
        id: 'roundHeight', label: 'Round bead length (% of diameter)', type: 'number', default: 80,
        min: 50, max: 100, step: 5,
        hint: 'Rocailles are doughnuts, so they are shorter along the hole than they are wide, but only the diameter is ever published. 80% is a working default — measure yours and change it. Cylinder sizes ignore this.'
      },
      {
        id: 'scale', label: 'Scale (× actual size)', type: 'number', default: 1,
        min: 1, max: 8, step: 0.25,
        hint: '1 is true bead size, which is what you want for checking a finished width. Enlarge it if you are going to colour the chart in by hand.'
      },
      {
        id: 'cols', label: 'Columns across (0 fills the page)', type: 'number', default: 0,
        min: 0, max: 400, step: 1,
        hint: 'Set this to the bead count your piece is wide and the sheet becomes the piece. Two-drop counts two-bead columns; right-angle weave counts rings.'
      },
      {
        id: 'rows', label: 'Rows down (0 fills the page)', type: 'number', default: 0,
        min: 0, max: 600, step: 1
      },
      {
        id: 'shape', label: 'Bead outline', type: 'select', default: 'auto',
        options: [
          { value: 'auto', label: 'Match the bead (rounded, or oval for rounds)' },
          { value: 'rounded', label: 'Rounded rectangle' },
          { value: 'rectangle', label: 'Plain rectangle' },
          { value: 'oval', label: 'Oval' }
        ]
      },
      {
        id: 'colour', label: 'Line colour', type: 'select', default: 'grey',
        options: [
          { value: 'grey', label: 'Grey' },
          { value: 'light-grey', label: 'Light grey' },
          { value: 'blue', label: 'Blue' },
          { value: 'black', label: 'Black' }
        ]
      },
      {
        id: 'accentEvery', label: 'Counting line every N', type: 'number', default: 10,
        min: 0, max: 50, step: 1,
        hint: '0 turns them off. The line follows the cell boundary, so on a staggered stitch it steps rather than slicing beads in half.'
      },
      {
        id: 'numbers', label: 'Number the columns and rows', type: 'checkbox', default: false
      },
      {
        id: 'showCaption', label: 'Print the size caption', type: 'checkbox', default: true
      }
    ],

    render: function (v) {
      var stitchKey = Object.prototype.hasOwnProperty.call(STITCHES, v.stitch) ? v.stitch : 'peyote-even';
      var stitch = STITCHES[stitchKey];
      var beadKey = Object.prototype.hasOwnProperty.call(BEADS, v.bead) ? v.bead : 'delica-11';
      var bead = BEADS[beadKey];
      var palette = lookup(COLOURS, v.colour, COLOURS.grey);

      var scale = num(v.scale, 1, 0.25, 12);
      var roundPct = num(v.roundHeight, 80, 30, 100);

      /* D across the hole, L along it, both after scaling. */
      var D, L, beadNote;
      if (bead.custom) {
        D = num(v.beadWidth, 1.6, 0.2, 30);
        L = num(v.beadLength, 1.3, 0.2, 30);
        beadNote = 'custom ' + n2(D) + ' x ' + n2(L) + ' mm';
      } else if (bead.round) {
        D = bead.d;
        L = bead.d * roundPct / 100;
        beadNote = bead.name + ', ' + n2(D) + ' mm across the hole, ' +
          n2(L) + ' mm along it (' + Math.round(roundPct) + '%)';
      } else {
        D = bead.d;
        L = bead.l;
        beadNote = bead.name + ', ' + n2(D) + ' x ' + n2(L) + ' mm';
      }
      D = D * scale;
      L = L * scale;

      var m = metrics(stitchKey, D, L);
      var showNumbers = !!v.numbers;
      var showCaption = v.showCaption !== false;
      var accentEvery = Math.round(num(v.accentEvery, 10, 0, 50));
      var labelEvery = accentEvery >= 1 ? accentEvery : 10;

      /* ---- room on the sheet ---- */
      var margin = num(v.margin, 10, 0, 200);
      var x0 = margin, y0 = margin;
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;
      if (usableW <= 2 || usableH <= 2) {
        throw new Error('A margin of ' + n2(margin) + ' mm leaves no printable area on this sheet. Reduce the margin.');
      }

      /* Numbers live outside the bead field; the caption lives under it. */
      var gutterL = showNumbers ? 7 : 0;
      var gutterT = showNumbers ? 4 : 0;
      var captionH = showCaption ? 9 : 0;

      var availW = usableW - gutterL;
      var availH = usableH - gutterT - captionH;
      if (availW <= 1 || availH <= 1) {
        throw new Error('Once the margin, the numbering gutter and the caption are taken out there is nothing left to draw on. Reduce the margin, or turn the numbering or the caption off.');
      }

      /* ---- how many cells ---- */
      var fitCols = Math.floor((availW - m.padW) / m.unitW + 1e-9);
      var fitRows = Math.floor((availH - m.padH) / m.unitH + 1e-9);

      var wantCols = Math.round(num(v.cols, 0, 0, 400));
      var wantRows = Math.round(num(v.rows, 0, 0, 600));
      var cols = wantCols > 0 ? wantCols : fitCols;
      var rows = wantRows > 0 ? wantRows : fitRows;

      /* Even-count peyote and herringbone need an even column count; odd-count
         peyote needs an odd one. Silently drawing the wrong parity would make
         the sheet lie about which stitch it is for. */
      var parityNote = '';
      if (stitch.parity === 'even' && cols % 2 === 1) {
        /* Rounding down is right everywhere except at 1, where it would leave
           nothing to draw and the failure would get blamed on the paper size. */
        if (cols > 1) { cols -= 1; parityNote = ' (rounded down to keep the count even)'; }
        else { cols += 1; parityNote = ' (rounded up: this stitch works in pairs)'; }
      } else if (stitch.parity === 'odd' && cols % 2 === 0) {
        if (cols > 1) { cols -= 1; parityNote = ' (rounded down to keep the count odd)'; }
        else { cols += 1; parityNote = ' (rounded up to the smallest odd count)'; }
      }

      if (cols < 1 || rows < 1) {
        throw new Error('One ' + stitch.unit + ' at this size does not fit inside the margin on this sheet. Reduce the scale or the margin, or move to a larger paper size.');
      }

      var fieldW = cols * m.unitW + m.padW;
      var fieldH = rows * m.unitH + m.padH;
      if (fieldW > availW + 1e-6 || fieldH > availH + 1e-6) {
        throw new Error(
          cols + ' x ' + rows + ' needs ' + n2(fieldW) + ' x ' + n2(fieldH) +
          ' mm, but there is only ' + n2(availW) + ' x ' + n2(availH) +
          ' mm inside the margin. Ask for ' + fitCols + ' x ' + fitRows +
          ' or fewer, reduce the scale, or use a larger sheet.'
        );
      }

      var total = cols * rows * (m.drop || 1);
      if (stitchKey === 'raw') total = (2 * cols + 1) * (2 * rows + 1) / 2;
      if (total > MAX_BEADS) {
        throw new Error('That is about ' + Math.round(total) +
          ' beads, which is more than this page will draw quickly. Increase the scale, increase the margin, or choose a larger bead.');
      }

      /* ---- centre the field ---- */
      var fx = x0 + gutterL + (availW - fieldW) / 2;
      var fy = y0 + gutterT + (availH - fieldH) / 2;

      /* ---- ink weights ---- */
      var smallest = Math.min(L, D);
      var stroke = num(smallest * 0.09, 0.15, 0.06, 0.3);
      var guideStroke = stroke * 2.2;

      var shape = v.shape;
      if (shape !== 'rounded' && shape !== 'rectangle' && shape !== 'oval') {
        shape = bead.round ? 'oval' : 'rounded';
      }

      /* ---- draw ---- */
      var out = [];
      out.push('<g transform="translate(' + mm(fx) + ',' + mm(fy) + ')">');

      var guides = accentEvery >= 1
        ? buildGuides(stitchKey, D, L, m, cols, rows, accentEvery, fieldW, fieldH)
        : '';
      var guideEl = guides
        ? '<path d="' + guides + '" fill="none" stroke="' + palette.guide +
          '" stroke-width="' + mm(guideStroke) + '" stroke-linecap="square"/>'
        : '';

      /* On right-angle weave no straight rule misses every bead, so the guides
         go underneath and the white bead fill masks them back to the holes. */
      if (guideEl && stitchKey === 'raw') out.push(guideEl);

      var beads = buildBeads(stitchKey, D, L, m, cols, rows);
      var d = [], i;
      for (i = 0; i < beads.length; i++) d.push(beadSubpath(beads[i], shape));
      out.push('<path d="' + d.join('') + '" fill="#ffffff" stroke="' + palette.line +
        '" stroke-width="' + mm(stroke) + '"/>');

      if (guideEl && stitchKey !== 'raw') out.push(guideEl);

      /* ---- numbering ---- */
      if (showNumbers) {
        var fontSize = Math.max(1.8, Math.min(2.6, Math.min(m.unitW, m.unitH) * 1.1));
        var textAttrs = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
          mm(fontSize) + '" fill="' + palette.guide + '"';
        var c, r;
        for (c = 1; c <= cols; c++) {
          if (c !== 1 && c % labelEvery !== 0) continue;
          out.push('<text x="' + mm(m.padW / 2 + (c - 1) * m.unitW + m.unitW / 2) +
            '" y="-1" text-anchor="middle"' + textAttrs + '>' + c + '</text>');
        }
        for (r = 1; r <= rows; r++) {
          if (r !== 1 && r % labelEvery !== 0) continue;
          out.push('<text x="-1.4" y="' +
            mm(m.padH / 2 + (r - 1) * m.unitH + m.unitH / 2 + fontSize * 0.36) +
            '" text-anchor="end"' + textAttrs + '>' + r + '</text>');
        }
      }

      out.push('</g>');

      /* ---- caption ---- */
      if (showCaption) {
        var scaleText = scale === 1 ? 'actual size' : n2(scale) + 'x actual size';
        var line1 = stitch.label + ' | ' + beadNote + ' | ' + scaleText;
        if (stitchKey === 'herringbone') {
          line1 += ' | pairs leaned ' + TILT_DEG + ' degrees';
        }

        var acrossUnits = stitchKey === 'peyote-2drop'
          ? cols + ' two-bead columns (' + (cols * 2) + ' beads)'
          : stitchKey === 'raw'
            ? cols + ' rings'
            : cols + ' beads';
        var line2 = acrossUnits + parityNote + ' across x ' + rows +
          (stitchKey === 'raw' ? ' rings' : ' rows') + ' down | field ' +
          n2(fieldW) + ' x ' + n2(fieldH) + ' mm | cell ' +
          n2(stitchKey === 'brick' || stitchKey === 'herringbone' ? D : L) + ' x ' +
          n2(stitchKey === 'brick' || stitchKey === 'herringbone' ? L : D) + ' mm';

        /* Helvetica runs a bit over half its point size per character, so
           estimate the line length from that, shrink the type to fit, and let
           the renderer compress anything that still overruns. */
        var EM = 0.55;
        var longest = Math.max(line1.length, line2.length);
        var capSize = num(usableW / (EM * longest), 2.8, 1.7, 2.8);
        var capAttrs = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
          mm(capSize) + '" fill="#111111"';
        var bottom = v.page.h - margin;

        var captionLine = function (text, baseline) {
          var fit = EM * capSize * text.length > usableW
            ? ' textLength="' + mm(usableW) + '" lengthAdjust="spacingAndGlyphs"'
            : '';
          return '<text x="' + mm(x0) + '" y="' + mm(baseline) + '"' +
            capAttrs + fit + '>' + PP.esc(text) + '</text>';
        };

        out.push(captionLine(line1, bottom - 5.2));
        out.push(captionLine(line2, bottom - 1.2));
      }

      return out.join('');
    }
  });
})();
