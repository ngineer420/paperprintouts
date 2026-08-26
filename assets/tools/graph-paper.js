/* paperprintouts.com — graph paper.
 *
 * Six geometries — square, isometric, triangular, two hexagonal orientations
 * and polar — centred inside the margin and drawn at true physical size. Every
 * coordinate here is a millimetre; the framework supplies the viewBox that
 * makes a millimetre on screen a millimetre on paper.
 *
 * The whole grid is emitted as two <path> elements — one for the normal lines
 * and one for the accents — rather than hundreds of <line> elements. At 1 mm
 * spacing on A3 that is roughly 700 lines, and the path form is about a third
 * of the bytes.
 *
 * The house rule that every geometry obeys: NOTHING is drawn outside the
 * usable area, and no fragment of a shape is left stranded near the edge. The
 * line geometries reach the boundary exactly, because a line clipped at the
 * boundary is a whole line; the hexagons draw whole cells only and centre the
 * block that results; polar keeps its outermost ring inside the shorter side.
 */
(function () {
  'use strict';

  var SQRT3 = Math.sqrt(3);
  var DEG = Math.PI / 180;

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

  /* ======================================================================
     Geometry helpers. Pure functions of numbers — no DOM, no PP, no state —
     so the arithmetic can be exercised directly by the test file next door.
     ====================================================================== */

  /* Clip the infinite line through (px,py) with direction (dx,dy) to the
     rectangle, and hand back the two endpoints. Liang-Barsky on the parameter
     t, which is what keeps a 30-degree line from spilling into the margin: the
     line is generated as infinite and the rectangle decides where it stops.
     Returns null when the line misses the rectangle entirely. */
  function clipLineToRect(px, py, dx, dy, x0, y0, x1, y1) {
    var tmin = -Infinity;
    var tmax = Infinity;

    /* Each edge is one inequality p*t <= q. A zero p means the line is
       parallel to that edge, so it either misses entirely or is unconstrained
       by it. */
    function slab(p, q) {
      if (p === 0) return q >= 0;
      var r = q / p;
      if (p < 0) {
        if (r > tmax) return false;
        if (r > tmin) tmin = r;
      } else {
        if (r < tmin) return false;
        if (r < tmax) tmax = r;
      }
      return true;
    }

    if (!slab(-dx, px - x0)) return null;
    if (!slab(dx, x1 - px)) return null;
    if (!slab(-dy, py - y0)) return null;
    if (!slab(dy, y1 - py)) return null;
    if (!(tmax > tmin)) return null;
    return [px + tmin * dx, py + tmin * dy, px + tmax * dx, py + tmax * dy];
  }

  /* One family of parallel lines: direction (dx,dy), `pitch` apart measured
     perpendicular, indexed outwards from the lattice origin (cx,cy) so that
     line 0 always passes through it. Every family in a triangular grid shares
     that origin, which is precisely what makes the three families meet at
     lattice points instead of drifting apart across the sheet. */
  function lineFamily(cx, cy, dx, dy, pitch, rect, accentEvery) {
    var nx = -dy;
    var ny = dx;
    var corners = [
      [rect.x0, rect.y0], [rect.x1, rect.y0],
      [rect.x0, rect.y1], [rect.x1, rect.y1]
    ];
    var reach = 0;
    var i, d;
    for (i = 0; i < 4; i++) {
      d = Math.abs((corners[i][0] - cx) * nx + (corners[i][1] - cy) * ny);
      if (d > reach) reach = d;
    }
    var n = Math.ceil(reach / pitch) + 1;
    var out = { thin: '', accent: '' };
    var k, seg;
    for (k = -n; k <= n; k++) {
      seg = clipLineToRect(
        cx + k * pitch * nx, cy + k * pitch * ny, dx, dy,
        rect.x0, rect.y0, rect.x1, rect.y1
      );
      if (!seg) continue;
      seg = 'M' + mm(seg[0]) + ' ' + mm(seg[1]) + 'L' + mm(seg[2]) + ' ' + mm(seg[3]);
      if (accentEvery && k % accentEvery === 0) out.accent += seg; else out.thin += seg;
    }
    return out;
  }

  /* A triangular lattice of side `side` has the same perpendicular distance
     between adjacent lines in all three of its directions: the height of one
     equilateral triangle. Everything about isometric and triangular paper
     falls out of that single number. */
  function triangularPitch(side) {
    return side * SQRT3 / 2;
  }

  /* How many whole hexagons of side `s` fit in a `w` by `h` rectangle, and how
     big the block they form is. Whole cells only — a hexagon clipped by the
     margin is exactly the "stray half-shape" this must not produce — so the
     count is a floor and the leftover becomes centring space.

     Pointy-top hexes are 2s across the points (vertical) and s*sqrt(3) across
     the flats (horizontal); flat-top is the transpose. Alternate rows sit half
     a cell across, so if there is more than one row the block needs that extra
     half cell of width. That gives the familiar ragged edge, which is what real
     hex paper looks like — a ragged edge of WHOLE hexes is not a half-shape. */
  function hexLayout(w, h, s, pointy) {
    var acrossFlats = s * SQRT3;
    var acrossPoints = 2 * s;
    var colPitch, rowPitch, cellW, cellH, cols, rows, stagger;

    if (pointy) {
      cellW = acrossFlats;
      cellH = acrossPoints;
      colPitch = acrossFlats;
      rowPitch = 1.5 * s;
      if (h + 1e-9 < cellH || w + 1e-9 < cellW) return null;
      rows = Math.floor((h - cellH) / rowPitch + 1e-9) + 1;
      stagger = rows > 1 ? colPitch / 2 : 0;
      cols = Math.floor((w - stagger) / colPitch + 1e-9);
      if (cols < 1) {
        /* One row of full-width hexes still fits even though a staggered pair
           does not, so fall back to that rather than refusing to draw. */
        rows = 1;
        stagger = 0;
        cols = Math.floor(w / colPitch + 1e-9);
        if (cols < 1) return null;
      }
      return {
        cols: cols, rows: rows, colPitch: colPitch, rowPitch: rowPitch,
        stagger: stagger, staggerAxis: 'x',
        blockW: cols * colPitch + stagger,
        blockH: (rows - 1) * rowPitch + cellH
      };
    }

    cellW = acrossPoints;
    cellH = acrossFlats;
    colPitch = 1.5 * s;
    rowPitch = acrossFlats;
    if (w + 1e-9 < cellW || h + 1e-9 < cellH) return null;
    cols = Math.floor((w - cellW) / colPitch + 1e-9) + 1;
    stagger = cols > 1 ? rowPitch / 2 : 0;
    rows = Math.floor((h - stagger) / rowPitch + 1e-9);
    if (rows < 1) {
      cols = 1;
      stagger = 0;
      rows = Math.floor(h / rowPitch + 1e-9);
      if (rows < 1) return null;
    }
    return {
      cols: cols, rows: rows, colPitch: colPitch, rowPitch: rowPitch,
      stagger: stagger, staggerAxis: 'y',
      blockW: (cols - 1) * colPitch + cellW,
      blockH: rows * rowPitch + stagger
    };
  }

  /* One hexagon as a closed subpath. Pointy-top puts a vertex straight up
     (-90 degrees), flat-top puts one straight out to the right (0 degrees).
     Neighbouring hexes restroke their shared edges, which is invisible here
     because every stroke is opaque and the same width — and it costs far
     fewer bytes than tracking which edges have already been drawn. */
  function hexPath(cx, cy, s, pointy) {
    var d = '';
    var i, a;
    for (i = 0; i < 6; i++) {
      a = (pointy ? 60 * i - 90 : 60 * i) * DEG;
      d += (i ? 'L' : 'M') + mm(cx + s * Math.cos(a)) + ' ' + mm(cy + s * Math.sin(a));
    }
    return d + 'Z';
  }

  /* Rings and spokes. The outermost ring has to fit inside the SHORTER side of
     the usable area or it would run off the page, so the radius available is
     half the smaller dimension and the ring count is a floor of that. */
  function polarLayout(w, h, step) {
    var maxR = Math.min(w, h) / 2;
    var rings = Math.floor(maxR / step + 1e-9);
    if (rings < 1) return null;
    return { rings: rings, radius: rings * step };
  }

  /* ======================================================================
     The geometries. Each one takes the usable rectangle and the resolved
     settings and returns the two path strings plus the box it actually filled,
     which is what the border and the caption measure against.
     ====================================================================== */

  function drawSquare(u, v) {
    var spacing = v.spacing;
    if (u.w < spacing || u.h < spacing) {
      throw new Error('Not one ' + round(spacing, 2) +
        ' mm square fits inside the margin on this sheet. Reduce the spacing, the margin, or use a larger paper size.');
    }

    /* Whole squares only, so no half square is left hanging at the edge.
       The epsilon absorbs the float error in cases that divide exactly,
       such as 190 mm of usable A4 width at 5 mm. */
    var nx = Math.floor(u.w / spacing + 1e-9);
    var ny = Math.floor(u.h / spacing + 1e-9);
    var gridW = nx * spacing;
    var gridH = ny * spacing;

    /* Centre the grid in the usable area: the remainder that will not make a
       whole square is split evenly between the two edges, which is what stops
       the sheet looking as though it slipped in the printer. */
    var x0 = u.x0 + (u.w - gridW) / 2;
    var y0 = u.y0 + (u.h - gridH) / 2;

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
      if (v.accentEvery && i % v.accentEvery === 0) accent += seg; else thin += seg;
    }
    for (i = 0; i <= ny; i++) {
      at = mm(y0 + i * spacing);
      seg = 'M' + left + ' ' + at + 'H' + right;
      if (v.accentEvery && i % v.accentEvery === 0) accent += seg; else thin += seg;
    }

    return {
      thin: thin, accent: accent,
      box: { x: x0, y: y0, w: gridW, h: gridH },
      counts: { nx: nx, ny: ny },
      caption: round(spacing, 3) + ' mm squares'
    };
  }

  /* Isometric and triangular are one lattice seen two ways, so they are one
     function with a rotation. Isometric is what you draw a cube on — a vertical
     and two lines 30 degrees off horizontal, which is exactly how the three
     axes of an isometric projection land on the page. Triangular is the same
     lattice turned a quarter turn: horizontal lines and two at 60 degrees. */
  function triangularGrid(u, v, vertical) {
    var side = v.spacing;
    var pitch = triangularPitch(side);
    if (u.w < pitch || u.h < pitch) {
      throw new Error('A ' + round(side, 2) +
        ' mm triangle will not fit inside the margin on this sheet. Reduce the spacing, the margin, or use a larger paper size.');
    }

    var cx = u.x0 + u.w / 2;
    var cy = u.y0 + u.h / 2;
    var rect = { x0: u.x0, y0: u.y0, x1: u.x0 + u.w, y1: u.y0 + u.h };

    /* Three directions, 60 degrees apart. Rotating the whole set by 90 degrees
       turns the triangular arrangement into the isometric one. */
    var base = vertical ? 90 : 0;
    var thin = '';
    var accent = '';
    var i, a, fam;
    for (i = 0; i < 3; i++) {
      a = (base + i * 60) * DEG;
      fam = lineFamily(cx, cy, Math.cos(a), Math.sin(a), pitch, rect, v.accentEvery);
      thin += fam.thin;
      accent += fam.accent;
    }

    return {
      thin: thin, accent: accent,
      box: { x: u.x0, y: u.y0, w: u.w, h: u.h },
      caption: round(side, 2) + ' mm triangle side · ' + round(pitch, 2) + ' mm between lines'
    };
  }

  function drawHex(u, v, pointy) {
    var s = v.hexSide;
    var layout = hexLayout(u.w, u.h, s, pointy);
    if (!layout) {
      throw new Error('Not one ' + round(s, 2) +
        ' mm hexagon fits inside the margin on this sheet. Reduce the side length, the margin, or use a larger paper size.');
    }

    var x0 = u.x0 + (u.w - layout.blockW) / 2;
    var y0 = u.y0 + (u.h - layout.blockH) / 2;
    var halfW = pointy ? s * SQRT3 / 2 : s;
    var halfH = pointy ? s : s * SQRT3 / 2;

    var d = '';
    var r, c, cx, cy, odd;
    for (r = 0; r < layout.rows; r++) {
      for (c = 0; c < layout.cols; c++) {
        if (layout.staggerAxis === 'x') {
          odd = r % 2 === 1;
          cx = x0 + halfW + c * layout.colPitch + (odd ? layout.stagger : 0);
          cy = y0 + halfH + r * layout.rowPitch;
        } else {
          odd = c % 2 === 1;
          cx = x0 + halfW + c * layout.colPitch;
          cy = y0 + halfH + r * layout.rowPitch + (odd ? layout.stagger : 0);
        }
        d += hexPath(cx, cy, s, pointy);
      }
    }

    return {
      thin: d, accent: '',
      box: { x: x0, y: y0, w: layout.blockW, h: layout.blockH },
      counts: { nx: layout.cols, ny: layout.rows },
      caption: layout.cols + ' x ' + layout.rows + ' hexagons · ' + round(s, 2) +
        ' mm side · ' + round(s * SQRT3, 2) + ' mm across the flats'
    };
  }

  function drawPolar(u, v) {
    var step = v.polarStep;
    var layout = polarLayout(u.w, u.h, step);
    if (!layout) {
      throw new Error('Not one ' + round(step, 2) +
        ' mm ring fits inside the margin on this sheet. Reduce the ring spacing, the margin, or use a larger paper size.');
    }

    var cx = u.x0 + u.w / 2;
    var cy = u.y0 + u.h / 2;
    var R = layout.radius;

    var thin = '';
    var accent = '';
    var i, r, seg;

    /* Circles as two half-arcs: a single arc of 360 degrees is degenerate in
       SVG (same start and end point, so nothing is drawn). */
    for (i = 1; i <= layout.rings; i++) {
      r = i * step;
      seg = 'M' + mm(cx - r) + ' ' + mm(cy) +
        'a' + mm(r) + ' ' + mm(r) + ' 0 1 0 ' + mm(2 * r) + ' 0' +
        'a' + mm(r) + ' ' + mm(r) + ' 0 1 0 ' + mm(-2 * r) + ' 0';
      if (v.accentEvery && i % v.accentEvery === 0) accent += seg; else thin += seg;
    }

    /* Spokes run from the centre to the outer ring. Only the half-turn is
       walked, because a spoke and the one opposite it are one straight line
       through the middle — drawing both halves separately would double the
       ink on every spoke.

       The heavy spokes are the two cardinal axes, not "every Nth spoke".
       Counting spokes puts the heavy lines at arbitrary angles — with 15
       degree spokes and a heavy-every-5 setting they land at 0, 75 and 150
       degrees, which looks like a mistake because it is one. Printed polar
       paper marks the axes, so this marks the axes. */
    var spoke = v.polarSpoke;
    var half = Math.round(180 / spoke);
    var a, dx, dy, deg;
    for (i = 0; i < half; i++) {
      deg = i * spoke;
      a = deg * DEG;
      dx = Math.cos(a) * R;
      dy = Math.sin(a) * R;
      seg = 'M' + mm(cx - dx) + ' ' + mm(cy - dy) + 'L' + mm(cx + dx) + ' ' + mm(cy + dy);
      if (v.accentEvery && Math.abs(deg % 90) < 1e-9) accent += seg; else thin += seg;
    }

    return {
      thin: thin, accent: accent,
      box: { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R },
      counts: { nx: layout.rings, ny: half * 2 },
      caption: layout.rings + ' rings at ' + round(step, 2) + ' mm · spokes every ' +
        round(spoke, 2) + ' degrees · ' + round(2 * R, 1) + ' mm across'
    };
  }

  var GEOMETRIES = {
    'square': {
      label: 'Square grid',
      note: 'the ordinary one',
      draw: function (u, v) { return drawSquare(u, v); }
    },
    'isometric': {
      label: 'Isometric',
      note: 'vertical plus 30 degrees, for 3D sketching',
      draw: function (u, v) { return triangularGrid(u, v, true); }
    },
    'triangular': {
      label: 'Triangular',
      note: 'horizontal plus 60 degrees',
      draw: function (u, v) { return triangularGrid(u, v, false); }
    },
    'hex-pointy': {
      label: 'Hexagonal, pointy-top',
      note: 'the tabletop map standard',
      draw: function (u, v) { return drawHex(u, v, true); }
    },
    'hex-flat': {
      label: 'Hexagonal, flat-top',
      note: 'the organic chemistry orientation',
      draw: function (u, v) { return drawHex(u, v, false); }
    },
    'polar': {
      label: 'Polar',
      note: 'rings and spokes',
      draw: function (u, v) { return drawPolar(u, v); }
    }
  };

  var GEOMETRY_ORDER = ['square', 'isometric', 'triangular', 'hex-pointy', 'hex-flat', 'polar'];

  function geometryOptions() {
    var opts = [];
    var i, k;
    for (i = 0; i < GEOMETRY_ORDER.length; i++) {
      k = GEOMETRY_ORDER[i];
      opts.push({ value: k, label: GEOMETRIES[k].label + ' (' + GEOMETRIES[k].note + ')' });
    }
    return opts;
  }

  /* The download name carries the measurement that defines the sheet:
     graph-paper-5mm-letter.pdf, graph-paper-hex-flat-10mm-a4.pdf. */
  function fileFragment(v) {
    var geom = lookup(GEOMETRIES, v.geometry, null) ? v.geometry : 'square';
    var parts = geom === 'square' ? [] : [geom];
    if (geom === 'hex-pointy' || geom === 'hex-flat') {
      parts.push(num(v.hexSide, 10, 2, 100) + 'mm');
    } else if (geom === 'polar') {
      parts.push(num(v.polarStep, 10, 1, 100) + 'mm');
    } else if (lookup(PRESETS, v.preset, null) !== null) {
      parts.push(v.preset);
    } else {
      parts.push(num(v.spacing, 5, 0.01, 1000) + (v.units === 'inch' ? 'in' : 'mm'));
    }
    return parts;
  }

  PP.register('graph-paper', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,
    filename: fileFragment,

    controls: [
      {
        id: 'geometry', label: 'Grid geometry', type: 'select', default: 'square',
        options: geometryOptions(),
        hint: 'Square, isometric and triangular use the spacing below. Hexagonal uses the side length, polar the ring spacing.'
      },
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
        hint: 'Pick a standard size, or Custom to type your own below. On the isometric and triangular grids this is the triangle side length.'
      },
      {
        id: 'hexSide', label: 'Hexagon side (mm)', type: 'number', default: 10,
        min: 2, max: 100, step: 0.5,
        hint: 'Used only by the two hexagonal geometries. A 10 mm side is 20 mm across the points and 17.3 mm across the flats.'
      },
      {
        id: 'polarStep', label: 'Polar ring spacing (mm)', type: 'number', default: 10,
        min: 1, max: 100, step: 1,
        hint: 'Used only by the polar geometry. The distance between one ring and the next.'
      },
      {
        id: 'polarSpoke', label: 'Polar spoke angle (degrees)', type: 'number', default: 15,
        min: 1, max: 90, step: 1,
        hint: 'Used only by the polar geometry. 15 gives 24 spokes, 30 gives 12, 10 gives 36.'
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
        hint: '0 turns the heavy lines off. 5 gives the usual engineering block; on 1 mm paper, 10 marks the centimetres. On polar paper it counts rings and spokes; the hexagonal grids have no heavy lines.'
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
      {
        id: 'axes', label: 'Draw centre axes', type: 'checkbox', default: false,
        hint: 'Square grid only — on the other geometries the grid supplies its own axes.'
      },
      { id: 'showCaption', label: 'Print the measurements at the foot', type: 'checkbox', default: false }
    ],

    render: function (v) {
      var geomKey = lookup(GEOMETRIES, v.geometry, null) ? v.geometry : 'square';
      var geom = GEOMETRIES[geomKey];

      var spacing = resolveSpacing(v);
      /* Written as a negated comparison so a NaN that somehow got this far
         fails here rather than silently drawing nothing. */
      if (!(spacing >= 0.5)) {
        throw new Error('That works out to ' + round(spacing, 3) +
          ' mm squares, which is too fine to print. Use 0.5 mm or more.');
      }

      var margin = num(v.margin, 10, 0, 200);
      var usable = {
        x0: margin, y0: margin,
        w: v.page.w - margin * 2,
        h: v.page.h - margin * 2
      };
      if (usable.w <= 0 || usable.h <= 0) {
        throw new Error('The margin leaves no room on this sheet. Reduce the margin or use a larger paper size.');
      }

      var settings = {
        spacing: spacing,
        hexSide: num(v.hexSide, 10, 2, 100),
        polarStep: num(v.polarStep, 10, 1, 100),
        polarSpoke: num(v.polarSpoke, 15, 1, 90),
        accentEvery: Math.round(num(v.accentEvery, 5, 0, 20))
      };

      var lineWidth = num(v.lineWidth, 0.12, 0.05, 0.5);
      var accentWidth = num(v.accentWidth, 0.25, 0.05, 0.8);
      var colour = lookup(COLOURS, v.colour, COLOURS.grey);

      var drawn = geom.draw(usable, settings);
      var box = drawn.box;

      var out = '';
      if (drawn.thin) out += path(drawn.thin, colour, lineWidth);
      if (drawn.accent) out += path(drawn.accent, colour, accentWidth);

      if (v.axes && geomKey === 'square') {
        /* The axes have to sit on grid lines, or they would cut a row of
           squares in half and make the paper useless for plotting. So we take
           the grid line nearest the middle: with an odd number of squares that
           is half a square off centre, which is the only honest option. */
        var axisWidth = Math.min(Math.max(accentWidth * 1.6, 0.3), 1);
        var ax = mm(box.x + Math.round(drawn.counts.nx / 2) * spacing);
        var ay = mm(box.y + Math.round(drawn.counts.ny / 2) * spacing);
        out += path(
          'M' + ax + ' ' + mm(box.y) + 'V' + mm(box.y + box.h) +
          'M' + mm(box.x) + ' ' + ay + 'H' + mm(box.x + box.w),
          AXIS_COLOUR, axisWidth
        );
      }

      if (v.border) {
        /* Drawn last, on top of the outermost grid lines, so the frame comes
           out one even weight the whole way round no matter where the accent
           pattern happens to fall at the edges. */
        out += '<rect x="' + mm(box.x) + '" y="' + mm(box.y) +
          '" width="' + mm(box.w) + '" height="' + mm(box.h) +
          '" fill="none" stroke="' + colour +
          '" stroke-width="' + round(accentWidth, 3) +
          '" shape-rendering="geometricPrecision"/>';
      }

      if (v.showCaption && drawn.caption) {
        /* The sheet documents its own scale, so a print that came out at 94%
           can be caught with a ruler against a figure printed on the page
           itself. Nothing here is user text — every figure is a clamped number
           and the geometry label comes from a fixed map — so there is no
           PP.esc() call to look for. */
        out += '<text x="' + mm(v.page.w / 2) + '" y="' + mm(v.page.h - margin / 2) +
          '" text-anchor="middle" font-family="sans-serif" font-size="3" fill="' +
          AXIS_COLOUR + '">' + geom.label + ' · ' + drawn.caption + '</text>';
      }

      return out;
    }
  });
})();
