/* paperprintouts.com -- English paper piecing template generator.
 *
 * Draws EPP paper pieces from geometry rather than from a fixed-size PDF, so a
 * quilter can print the exact side length they need. Every coordinate here is
 * in millimetres, because the framework wraps the output in an SVG whose
 * viewBox is the page in millimetres -- that is what makes the sheet come off
 * the printer at true physical size.
 *
 * Conventions used throughout this file:
 *   - y increases DOWNWARD (SVG), so "up" is negative y.
 *   - Shapes are built centred near the origin and translated into the grid.
 *   - Vertices are listed in order around the boundary; the offset routine
 *     works out which way is "outward" for itself, so winding does not matter.
 */
(function () {
  'use strict';

  var PP = window.PP;
  var SQRT3 = Math.sqrt(3);

  /* ---------- small numeric helpers ---------- */

  function clamp(n, lo, hi, fallback) {
    n = parseFloat(n);
    if (!isFinite(n)) n = fallback;
    if (n < lo) n = lo;
    if (n > hi) n = hi;
    return n;
  }

  function pt(x, y) { return { x: x, y: y }; }

  /* Two decimals is plenty for a caption; three for geometry. */
  function n2(x) { return String(PP.round(x, 2)); }
  function n3(x) { return String(PP.round(x, 3)); }

  function polyPoints(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push(n3(pts[i].x) + ',' + n3(pts[i].y));
    return out.join(' ');
  }

  function bboxOf(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].x < minX) minX = pts[i].x;
      if (pts[i].y < minY) minY = pts[i].y;
      if (pts[i].x > maxX) maxX = pts[i].x;
      if (pts[i].y > maxY) maxY = pts[i].y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY };
  }

  function centroidOf(pts) {
    /* Vertex average. For a convex polygon this is always strictly inside,
       which is all the outward-normal test below needs it to be. */
    var sx = 0, sy = 0;
    for (var i = 0; i < pts.length; i++) { sx += pts[i].x; sy += pts[i].y; }
    return pt(sx / pts.length, sy / pts.length);
  }

  /* All turns the same way => convex. Collinear vertices are tolerated. */
  function isConvex(pts) {
    var n = pts.length, sign = 0;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
      var cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-9) continue;
      var s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
    return true;
  }

  /* ---------- convex polygon offset (the seam allowance) ----------
   *
   * The seam allowance is the shape pushed OUTWARD by 'd' perpendicular to
   * every edge. Rather than compute each vertex bisector by hand, this slides
   * each edge outward along its own outward normal and intersects consecutive
   * offset edge lines. That intersection lands exactly d / sin(interior/2)
   * from the original vertex along the angle bisector, which is the miter the
   * spec asks for -- and it stays numerically well behaved at sharp points such
   * as the tips of a 45 degree diamond.
   */
  function offsetConvex(pts, d) {
    var n = pts.length, i;
    if (d <= 0) return pts.slice();
    var c = centroidOf(pts);
    var lines = [];

    for (i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var ex = b.x - a.x, ey = b.y - a.y;
      var len = Math.sqrt(ex * ex + ey * ey);
      if (len < 1e-9) throw new Error('This shape came out with a zero-length edge, which cannot be offset. Increase the side length.');
      /* Rotate the edge 90 degrees to get a normal, then flip it if it points
         back towards the middle of the shape. */
      var nx = ey / len, ny = -ex / len;
      var mx = (a.x + b.x) / 2 - c.x, my = (a.y + b.y) / 2 - c.y;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      lines.push({ px: a.x + nx * d, py: a.y + ny * d, dx: ex, dy: ey });
    }

    var out = [];
    for (i = 0; i < n; i++) {
      /* Vertex i is where edge i-1 meets edge i. */
      var L1 = lines[(i - 1 + n) % n], L2 = lines[i];
      var den = L1.dx * L2.dy - L1.dy * L2.dx;
      if (Math.abs(den) < 1e-9) {
        /* Adjacent edges parallel (a straight-through vertex): the plain
           perpendicular push is already the right answer. */
        out.push(pt(L2.px, L2.py));
      } else {
        var t = ((L2.px - L1.px) * L2.dy - (L2.py - L1.py) * L2.dx) / den;
        out.push(pt(L1.px + L1.dx * t, L1.py + L1.dy * t));
      }
    }
    return out;
  }

  /* ---------- the shapes ----------
   *
   * Each build(s) takes the side length in millimetres and returns its
   * vertices. Where a shape has an obvious "tall" and "wide" presentation the
   * point-top / tall version is used, and the caption says which.
   */

  /* Regular n-gon of side s, with a vertex straight up (point-top). */
  function regular(n, s) {
    var R = s / (2 * Math.sin(Math.PI / n));   /* circumradius from side */
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (2 * Math.PI * i) / n;   /* -90deg = straight up */
      pts.push(pt(R * Math.cos(a), R * Math.sin(a)));
    }
    return pts;
  }

  var SHAPES = {
    'hexagon': {
      label: 'Hexagon',
      note: 'regular, point-top',
      /* Regular hexagon: circumradius equals the side, so it measures 2s
         across the points (vertical here) and s*sqrt(3) across the flats. */
      build: function (s) { return regular(6, s); }
    },

    'diamond-60': {
      label: '60 degree diamond',
      note: '60/120 rhombus, long axis vertical',
      /* Rhombus of side s with 60 degree tips. Long diagonal s*sqrt(3)
         vertical, short diagonal s horizontal. Each edge is
         sqrt((s/2)^2 + (s*sqrt(3)/2)^2) = s. */
      build: function (s) {
        var hy = s * SQRT3 / 2, hx = s / 2;
        return [pt(0, -hy), pt(hx, 0), pt(0, hy), pt(-hx, 0)];
      }
    },

    'diamond-45': {
      label: '45 degree diamond',
      note: '45/135 rhombus, long axis vertical',
      /* Rhombus of side s with 45 degree tips. Half-diagonals are
         s*cos(22.5) along the long axis and s*sin(22.5) across, so the tip
         angle is 2*atan(sin22.5 / cos22.5) = 45 degrees. */
      build: function (s) {
        var hy = s * Math.cos(Math.PI / 8), hx = s * Math.sin(Math.PI / 8);
        return [pt(0, -hy), pt(hx, 0), pt(0, hy), pt(-hx, 0)];
      }
    },

    'jewel': {
      label: 'Jewel',
      note: 'elongated hexagon, all six edges equal',
      /* An s x s square with an equilateral triangle of side s stuck on the
         top and bottom edges: six edges, every one of them s. Corner angles
         are 90 + 60 = 150 degrees and the two tips are 60 degrees
         (4*150 + 2*60 = 720, as a hexagon must be). Convex. */
      build: function (s) {
        var h = s / 2, tip = s / 2 + s * SQRT3 / 2;
        return [pt(0, -tip), pt(h, -h), pt(h, h), pt(0, tip), pt(-h, h), pt(-h, -h)];
      }
    },

    'triangle': {
      label: 'Triangle',
      note: 'equilateral, point-top',
      /* Equilateral, side s, height s*sqrt(3)/2, sitting on its centroid so
         the apex is 2/3 of the height above and the base 1/3 below. */
      build: function (s) {
        var h = s * SQRT3 / 2;
        return [pt(0, -2 * h / 3), pt(s / 2, h / 3), pt(-s / 2, h / 3)];
      }
    },

    'square': {
      label: 'Square',
      note: 'side s',
      build: function (s) {
        var h = s / 2;
        return [pt(-h, -h), pt(h, -h), pt(h, h), pt(-h, h)];
      }
    },

    'pentagon': {
      label: 'Pentagon',
      note: 'regular, point-top',
      /* Regular pentagon: circumradius s / (2 sin 36deg). */
      build: function (s) { return regular(5, s); }
    },

    'kite': {
      label: 'Kite',
      note: 'one sixth of a hexagon of the same side',
      /* The EPP kite is literally a hexagon sixth: take a regular hexagon of
         side s, join its centre to one vertex and to the midpoints of the two
         edges meeting there. Six of these tile that hexagon exactly, which is
         why kites nest with hexagons of the same side.
         Angles come out 60 (centre), 90, 120 (hexagon vertex), 90.
         Sides: two long ones of s*sqrt(3)/2 from the centre (the hexagon's
         apothem) and two short ones of s/2 at the point.
         Note the size control is the HEXAGON side it partners with, not the
         kite's own longest edge -- that is what makes a 25 mm kite fit a
         25 mm hexagon. The caption spells the edge lengths out. */
      build: function (s) {
        return [
          pt(0, 0),                        /* hexagon centre */
          pt(s * SQRT3 / 4, -3 * s / 4),   /* midpoint of one adjacent edge */
          pt(0, -s),                       /* hexagon vertex, point-top */
          pt(-s * SQRT3 / 4, -3 * s / 4)   /* midpoint of the other edge */
        ];
      }
    },

    'half-hexagon': {
      label: 'Half hexagon',
      note: 'trapezoid, long edge down',
      /* A regular hexagon cut across the points, i.e. along the long diagonal.
         Parallel edges of 2s and s, two legs of s, height s*sqrt(3)/2,
         angles 60/120/120/60. */
      build: function (s) {
        var h = s * SQRT3 / 2;
        return [pt(-s, h / 2), pt(-s / 2, -h / 2), pt(s / 2, -h / 2), pt(s, h / 2)];
      }
    }
  };

  var SHAPE_ORDER = [
    'hexagon', 'diamond-60', 'diamond-45', 'jewel',
    'triangle', 'square', 'pentagon', 'kite', 'half-hexagon'
  ];

  function shapeOptions() {
    var opts = [];
    for (var i = 0; i < SHAPE_ORDER.length; i++) {
      var k = SHAPE_ORDER[i];
      opts.push({ value: k, label: SHAPES[k].label + ' (' + SHAPES[k].note + ')' });
    }
    return opts;
  }

  /* ---------- registration ---------- */

  PP.register('english-paper-piecing-templates', {
    filename: function (v) { return [v.shape, v.side + (v.units === 'inch' ? 'in' : 'mm')]; },
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'shape', label: 'Shape', type: 'select', default: 'hexagon',
        options: shapeOptions(),
        hint: 'Hexagons are drawn point-top. The kite is one sixth of a hexagon, so a 25 mm kite pieces with a 25 mm hexagon.'
      },
      {
        id: 'side', label: 'Side length', type: 'number', default: 25,
        min: 5, max: 80, step: 0.5,
        hint: 'The length of one edge. Working in inches? Switch the units below and type the value straight in -- 1 or 1.5 is typical, even though the stepper starts at 5.'
      },
      {
        id: 'units', label: 'Units', type: 'select', default: 'mm',
        options: [
          { value: 'mm', label: 'Millimetres' },
          { value: 'inch', label: 'Inches' }
        ]
      },
      {
        id: 'seam', label: 'Draw seam allowance', type: 'checkbox', default: false,
        hint: 'Adds a dashed cutting line around each piece. The solid line stays the paper piece.'
      },
      {
        id: 'seamWidth', label: 'Seam allowance (mm)', type: 'number', default: 6.35,
        min: 2, max: 15, step: 0.25,
        hint: '6.35 mm is a quarter inch.'
      },
      {
        id: 'gap', label: 'Gap between pieces (mm)', type: 'number', default: 3,
        min: 0, max: 20, step: 0.5
      },
      {
        id: 'showSize', label: 'Print the size caption', type: 'checkbox', default: true
      }
    ],

    render: function (v) {
      var key = SHAPES[v.shape] ? v.shape : 'hexagon';
      var def = SHAPES[key];

      var inches = v.units === 'inch';
      /* Entered value, in whatever unit the user picked. */
      var entered = clamp(v.side, 0.05, 400, 25);
      var side = inches ? entered * PP.inch(1) : entered;
      /* Below about 4 mm a paper piece is not sewable and the grid explodes. */
      side = clamp(side, 4, 2000, 25);

      var seamOn = !!v.seam;
      var seamW = seamOn ? clamp(v.seamWidth, 0.1, 30, 6.35) : 0;
      var gap = clamp(v.gap, 0, 40, 3);
      var showSize = v.showSize !== false;

      var inner = def.build(side);
      if (!isConvex(inner)) {
        /* None of the built-in shapes should ever trip this; it is here so a
           future shape cannot silently get a wrong seam allowance. */
        throw new Error('The ' + def.label.toLowerCase() + ' came out non-convex, so the seam allowance offset would be wrong. This is a bug in the template, not in your settings.');
      }
      var outer = seamOn ? offsetConvex(inner, seamW) : null;

      var innerBox = bboxOf(inner);
      /* The footprint that has to fit on the page is the outermost line drawn. */
      var box = outer ? bboxOf(outer) : innerBox;

      /* ---- usable area ---- */
      var x0 = v.margin, y0 = v.margin;
      var x1 = v.page.w - v.margin, y1 = v.page.h - v.margin;
      var usableW = x1 - x0, usableH = y1 - y0;
      if (usableW <= 1 || usableH <= 1) {
        throw new Error('A margin of ' + n2(v.margin) + ' mm leaves no printable area on this sheet. Reduce the margin.');
      }

      var captionH = showSize ? 9 : 0;   /* two lines of 2.8 mm type plus air */
      var gridH = usableH - captionH;
      if (gridH <= 1) {
        throw new Error('There is no room left for shapes once the margin and the size caption are taken out. Reduce the margin or turn the caption off.');
      }

      /* ---- plain row/column grid, no tessellation nesting ---- */
      var cellW = box.w + gap, cellH = box.h + gap;
      var cols = Math.floor((usableW + gap) / cellW);
      var rows = Math.floor((gridH + gap) / cellH);

      if (cols < 1 || rows < 1) {
        throw new Error(
          'One ' + def.label.toLowerCase() + ' at this size needs ' + n2(box.w) + ' x ' + n2(box.h) +
          ' mm, but the printable area is only ' + n2(usableW) + ' x ' + n2(gridH) +
          ' mm. Reduce the side length' + (seamOn ? ' or the seam allowance' : '') +
          ', reduce the margin, or choose a larger paper size.'
        );
      }

      /* Centre the whole block inside the usable area. Subtracting the
         bounding-box minimum turns "cell corner" into "shape origin". */
      var blockW = cols * cellW - gap;
      var blockH = rows * cellH - gap;
      var startX = x0 + (usableW - blockW) / 2 - box.minX;
      var startY = y0 + (gridH - blockH) / 2 - box.minY;

      /* ---- the piece, drawn once and reused by translation ---- */
      var piece = '';
      if (outer) {
        piece += '<polygon points="' + polyPoints(outer) +
          '" fill="none" stroke="#888" stroke-width="0.3" stroke-dasharray="1.5 1"/>';
      }
      /* Cut line last so it sits on top of the seam line where they are close. */
      piece += '<polygon points="' + polyPoints(inner) +
        '" fill="none" stroke="#111" stroke-width="0.3"/>';

      var svg = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          svg.push('<g transform="translate(' +
            n3(startX + c * cellW) + ',' + n3(startY + r * cellH) + ')">' + piece + '</g>');
        }
      }

      /* ---- caption ---- */
      if (showSize) {
        var sizeText = inches
          ? n2(entered) + ' in (' + n2(side) + ' mm)'
          : n2(side) + ' mm';

        var line1 = def.label + ' (' + def.note + ') | side ' + sizeText +
          ' | piece ' + n2(innerBox.w) + ' x ' + n2(innerBox.h) + ' mm';

        /* The kite's own edges are not the entered length, so say what they are. */
        if (key === 'kite') {
          line1 += ' | edges ' + n2(side * SQRT3 / 2) + ' and ' + n2(side / 2) + ' mm';
        }

        var line2 = (cols * rows) + ' per sheet (' + cols + ' x ' + rows + ')' +
          (seamOn
            ? ' | dashed line = ' + n2(seamW) + ' mm seam allowance, cut the fabric to it'
            : ' | no seam allowance shown, cut the fabric wider by hand');

        /* Keep the caption inside the margin on small sheets. Helvetica
           averages a bit over half its point size per character, so estimate
           the run length from that, shrink the type to fit, and if even the
           smallest size still overruns, let the renderer compress it to
           exactly the usable width. */
        var EM = 0.55;
        var longest = Math.max(line1.length, line2.length);
        var fontSize = clamp(usableW / (EM * longest), 1.7, 2.8, 2.8);
        var textAttrs = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
          n3(fontSize) + '" fill="#111"';

        /* Each line is measured on its own, so a short line is never stretched
           to fill the width alongside a long one. */
        var captionLine = function (text, baseline) {
          var fit = EM * fontSize * text.length > usableW
            ? ' textLength="' + n3(usableW) + '" lengthAdjust="spacingAndGlyphs"'
            : '';
          return '<text x="' + n3(x0) + '" y="' + n3(baseline) + '"' +
            textAttrs + fit + '>' + PP.esc(text) + '</text>';
        };

        svg.push(captionLine(line1, y1 - 5.2));
        svg.push(captionLine(line2, y1 - 1.2));
      }

      return svg.join('');
    }
  });
})();
