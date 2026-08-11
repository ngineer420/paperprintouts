/* paperprintouts.com -- goal and savings colouring charts.
 *
 * One engine: given a goal, a number of cells and a distribution, solve for N
 * labelled cells that sum to the goal EXACTLY, then tessellate them into
 * squares, circles, hexagons or a honeycomb. Colour one in as you go.
 *
 * That word "exactly" is the entire product. A chart whose hundred envelopes
 * add up to 4,999.97 of a 5,000 goal is not a chart, it is a bug you print a
 * hundred copies of, and it is exactly the arithmetic a static PDF cannot do.
 * So the money never touches a float:
 *
 *   1. The goal is converted once to an integer number of minor units --
 *      pennies, cents, or whole units when the decimals are set to zero.
 *   2. The distribution produces WEIGHTS, not amounts.
 *   3. Those weights are turned into integers that sum to the total by the
 *      largest-remainder method: floor every share, then hand the shortfall
 *      out one unit at a time, biggest fractional part first. Floors can only
 *      ever undershoot, and the shortfall is by construction the number of
 *      units needed, so the sum is the total by identity rather than by luck.
 *   4. Rounding to whole notes divides the total into `step` chunks first and
 *      allocates those. Whatever is left over is smaller than one chunk and
 *      cannot be spread without breaking the rounding, so it is carried by the
 *      largest cell and the sheet says so in print.
 *   5. Only at the very end is an integer turned into a string, by inserting a
 *      decimal point into its digits. No amount is ever formatted from a float.
 *
 * Every coordinate is a millimetre. The framework wraps the output in an SVG
 * whose viewBox is the page in millimetres, which is what makes an A6 insert
 * come off the printer at A6.
 */
(function () {
  'use strict';

  var PP = window.PP;
  var SQRT3 = Math.sqrt(3);

  function num(value, fallback, min, max) {
    var n = parseFloat(value);
    if (!isFinite(n)) n = fallback;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function int(value, fallback, min, max) {
    return Math.round(num(value, fallback, min, max));
  }

  function lookup(map, key, fallback) {
    if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return fallback;
  }

  function n2(x) { return PP.round(x, 2); }
  function n3(x) { return PP.round(x, 3); }

  /* ---------- money as integers ----------
   *
   * toMinor is the only place a typed amount crosses from decimal text into a
   * number, and it lands on an integer immediately. fromMinor is the only place
   * an integer becomes text again, and it does it by cutting the digit string
   * rather than by asking a float to print itself.
   */
  function toMinor(value, dp) {
    var n = parseFloat(value);
    if (!isFinite(n) || n < 0) n = 0;
    return Math.round(n * Math.pow(10, dp));
  }

  function fromMinor(minor, dp) {
    var s = String(Math.abs(Math.round(minor)));
    var sign = minor < 0 ? '-' : '';
    if (dp <= 0) return sign + s;
    while (s.length <= dp) s = '0' + s;
    return sign + s.slice(0, s.length - dp) + '.' + s.slice(s.length - dp);
  }

  /* ---------- the distributions ----------
   *
   * Each returns a weight per cell. Weights are relative: doubling them all
   * changes nothing, which is what lets the same shape serve a 5,050 envelope
   * challenge and a 27.50 book of stamps.
   */
  function weightsFor(kind, n, ramp, cycle) {
    var w = [], i;
    for (i = 0; i < n; i++) {
      if (kind === 'fixed') {
        w.push(1);
      } else if (kind === 'cyclical') {
        /* 1, 2, ... cycle, 1, 2, ... -- no week is ever the brutal one twice
           in a row, which is the whole appeal of a cyclical challenge. */
        w.push(1 + (i % cycle));
      } else if (kind === 'progressive') {
        /* A straight ramp from 1 to `ramp`. Sequential is the special case
           where the last cell is n times the first, so this is the same shape
           with the steepness handed to the user. */
        w.push(n === 1 ? 1 : 1 + (ramp - 1) * i / (n - 1));
      } else {
        /* sequential and random: 1, 2, 3 ... n. On a goal of 5,050 over 100
           cells that is literally 1 to 100 -- the envelope challenge. */
        w.push(i + 1);
      }
    }
    return w;
  }

  /* ---------- exact integer allocation ----------
   *
   * Hand out `total` whole units in proportion to `weights`. The result sums to
   * `total` exactly, for any weights and any total, including totals that do
   * not divide by anything.
   */
  function allocate(weights, total) {
    var n = weights.length, i, sum = 0;
    for (i = 0; i < n; i++) sum += weights[i];

    var base = [], order = [], acc = 0, exact, floored;
    for (i = 0; i < n; i++) {
      exact = sum > 0 ? total * weights[i] / sum : 0;
      floored = Math.floor(exact);
      base.push(floored);
      acc += floored;
      order.push({ i: i, frac: exact - floored });
    }

    /* Biggest fractional part first. Ties go to the LATER cell, so a fixed
       chart reads as a run of equal cells with the odd penny at the end rather
       than a first cell that looks like a mistake. */
    order.sort(function (a, b) { return (b.frac - a.frac) || (b.i - a.i); });

    var left = total - acc, k = 0;
    while (left > 0 && n > 0) { base[order[k % n].i] += 1; left -= 1; k += 1; }
    /* Floors cannot overshoot, so this cannot run -- but if a future weight
       function ever made it run, the sum would still come out right. */
    k = 0;
    while (left < 0 && n > 0) {
      var j = order[(n - 1 - (k % n))].i;
      if (base[j] > 0) { base[j] -= 1; left += 1; }
      k += 1;
      if (k > n * 4) break;
    }
    return base;
  }

  /* Lehmer / MINSTD. Deterministic from the seed so a shared link, the preview
     and the print are the same sheet; every product stays under 2^53, so the
     arithmetic is exact. */
  function rng(seed) {
    var s = (Math.abs(Math.round(seed)) % 2147483646) + 1;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function shuffle(arr, seed) {
    var rand = rng(seed), i, j, t;
    for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(rand() * (i + 1));
      t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- the cells ----------
   *
   * Returns integer minor units, in the order they are printed, guaranteed to
   * sum to `total`.
   */
  function solve(kind, n, total, stepMinor, ramp, cycle, order, seed) {
    var i, vals = [];

    /* Round to whole notes by allocating chunks of `step` and carrying what is
       left over -- necessarily less than one chunk -- on the largest cell. */
    var chunks = Math.floor(total / stepMinor);
    var carry = total - chunks * stepMinor;

    var alloc = allocate(weightsFor(kind, n, ramp, cycle), chunks);

    /* A cell worth nothing is not a cell you can colour in. When the goal only
       just stretches to the cell count -- 5,050 in whole pounds over 150 cells
       starts the sequence below a pound -- lift every empty cell to one chunk
       and take that chunk from the fullest cell. The total is untouched, so
       exactness survives, and the run of minimum cells at the start is an
       honest picture of a goal that thin. Only a goal that will not divide into
       one chunk per cell at all is refused, by the caller. */
    var empties = [], top, j;
    for (i = 0; i < n; i++) if (alloc[i] === 0) empties.push(i);
    for (j = 0; j < empties.length; j++) {
      top = 0;
      for (i = 1; i < n; i++) if (alloc[i] > alloc[top]) top = i;
      if (alloc[top] < 2) break;
      alloc[top] -= 1;
      alloc[empties[j]] += 1;
    }

    for (i = 0; i < n; i++) vals.push(alloc[i] * stepMinor);

    var big = 0;
    for (i = 1; i < n; i++) if (vals[i] >= vals[big]) big = i;
    vals[big] += carry;

    if (kind === 'random' || order === 'random') shuffle(vals, seed);
    else if (order === 'down') vals.reverse();

    return { values: vals, carry: carry };
  }

  /* ---------- shapes ----------
   *
   * Every shape is laid out on a pitch and drawn slightly inside it, so the
   * gap between cells is a property of the drawing rather than of the lattice.
   * Honeycomb is the same hex lattice with the inset taken away, which is what
   * makes its cells share edges.
   */
  var SHAPES = {
    'square': { label: 'Squares', hex: false, inset: 0.07, textW: 0.84 },
    'circle': { label: 'Circles', hex: false, inset: 0.05, textW: 0.72 },
    'hexagon': { label: 'Hexagons', hex: true, inset: 0.07, textW: 0.78 },
    'honeycomb': { label: 'Honeycomb (cells share edges)', hex: true, inset: 0, textW: 0.78 }
  };

  /* Pitch and cell size for a given column count, or null if it cannot fit. */
  function fitGrid(shape, cols, rows, availW, availH) {
    if (cols < 1 || rows < 1) return null;
    if (SHAPES[shape].hex) {
      /* Point-top hexagons of circumradius R: sqrt(3)R across the flats, 2R
         point to point, rows 1.5R apart, odd rows shifted half a width. */
      var spanCols = rows > 1 ? cols + 0.5 : cols;
      var R = Math.min(availW / (SQRT3 * spanCols), availH / (1.5 * rows + 0.5));
      if (R <= 0) return null;
      return {
        R: R, pitchX: SQRT3 * R, pitchY: 1.5 * R,
        w: SQRT3 * R, h: 2 * R,
        fieldW: SQRT3 * R * spanCols, fieldH: R * (1.5 * rows + 0.5),
        size: R
      };
    }
    var p = Math.min(availW / cols, availH / rows);
    if (p <= 0) return null;
    return {
      R: p / 2, pitchX: p, pitchY: p, w: p, h: p,
      fieldW: p * cols, fieldH: p * rows, size: p
    };
  }

  function chooseGrid(shape, n, wantCols, availW, availH) {
    var best = null, cols, rows, g;
    if (wantCols > 0) {
      cols = Math.min(wantCols, n);
      rows = Math.ceil(n / cols);
      g = fitGrid(shape, cols, rows, availW, availH);
      if (g) { g.cols = cols; g.rows = rows; }
      return g;
    }
    for (cols = 1; cols <= n; cols++) {
      rows = Math.ceil(n / cols);
      g = fitGrid(shape, cols, rows, availW, availH);
      if (!g) continue;
      if (!best || g.size > best.size + 1e-9) {
        g.cols = cols; g.rows = rows;
        best = g;
      }
    }
    return best;
  }

  function hexPoints(cx, cy, R) {
    var pts = [], i, a;
    for (i = 0; i < 6; i++) {
      a = -Math.PI / 2 + i * Math.PI / 3;   /* -90 deg = a point straight up */
      pts.push(n3(cx + R * Math.cos(a)) + ',' + n3(cy + R * Math.sin(a)));
    }
    return pts.join(' ');
  }

  var STEPS ={ '0': 1, '1': 1, '5': 5, '10': 10, '25': 25, '50': 50, '100': 100 };

  PP.register('savings-challenge-chart', {
    defaultPaper: 'a4',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'title', label: 'Heading', type: 'text', default: '100 envelope challenge',
        placeholder: 'Leave blank for no heading'
      },
      {
        id: 'goal', label: 'Goal', type: 'number', default: 5050,
        min: 0, max: 100000000, step: 1,
        hint: 'The total the whole chart adds up to. 5050 over 100 cells is the envelope challenge; 1378 over 52 is the 52 week challenge.'
      },
      {
        id: 'count', label: 'Number of cells', type: 'number', default: 100,
        min: 1, max: 400, step: 1
      },
      {
        id: 'distribution', label: 'Distribution', type: 'select', default: 'sequential',
        options: [
          { value: 'sequential', label: 'Sequential — 1, 2, 3 … N, scaled to the goal' },
          { value: 'random', label: 'Randomised — the same amounts, shuffled' },
          { value: 'fixed', label: 'Fixed — every cell the same' },
          { value: 'progressive', label: 'Progressive — a ramp you set' },
          { value: 'cyclical', label: 'Cyclical — a repeating cycle' }
        ]
      },
      {
        id: 'ramp', label: 'Progressive: last cell vs first', type: 'number', default: 3,
        min: 1, max: 100, step: 0.5,
        hint: '3 means the last cell is three times the first. Used only by the progressive distribution.'
      },
      {
        id: 'cycle', label: 'Cyclical: length of the cycle', type: 'number', default: 4,
        min: 2, max: 52, step: 1,
        hint: 'Used only by the cyclical distribution.'
      },
      {
        id: 'order', label: 'Order', type: 'select', default: 'up',
        options: [
          { value: 'up', label: 'Smallest first' },
          { value: 'down', label: 'Largest first' },
          { value: 'random', label: 'Randomised' }
        ],
        hint: 'Largest first is the one debt payoff charts want. Randomised is already implied by the randomised distribution.'
      },
      {
        id: 'seed', label: 'Shuffle seed', type: 'number', default: 7,
        min: 1, max: 99999, step: 1,
        hint: 'Change it for a different shuffle. The same seed always gives the same sheet, so a shared link prints what you saw.'
      },
      {
        id: 'unit', label: 'Unit or currency symbol', type: 'text', default: '£',
        placeholder: 'e.g. £  $  €  kg  miles  pages',
        hint: 'Anything you like — this is what turns a savings chart into a mileage, weight or reading chart.'
      },
      {
        id: 'unitPos', label: 'Unit position', type: 'select', default: 'before',
        options: [
          { value: 'before', label: 'Before the number (£5)' },
          { value: 'after', label: 'After the number (5 miles)' }
        ]
      },
      {
        id: 'decimals', label: 'Decimal places', type: 'select', default: '0',
        options: [
          { value: '0', label: 'None — whole units' },
          { value: '2', label: 'Two — pennies and cents' }
        ]
      },
      {
        id: 'step', label: 'Round each cell to', type: 'select', default: '0',
        options: [
          { value: '0', label: 'No rounding — use the smallest unit' },
          { value: '1', label: 'Whole units' },
          { value: '5', label: 'Multiples of 5' },
          { value: '10', label: 'Multiples of 10' },
          { value: '25', label: 'Multiples of 25' },
          { value: '50', label: 'Multiples of 50' },
          { value: '100', label: 'Multiples of 100' }
        ],
        hint: 'Rounding cannot change the total, so whatever will not divide is carried by the largest cell and printed on the sheet.'
      },
      {
        id: 'shape', label: 'Cell shape', type: 'select', default: 'circle',
        options: [
          { value: 'circle', label: 'Circles' },
          { value: 'square', label: 'Squares' },
          { value: 'hexagon', label: 'Hexagons' },
          { value: 'honeycomb', label: 'Honeycomb (cells share edges)' }
        ]
      },
      {
        id: 'cols', label: 'Columns (0 fits the page)', type: 'number', default: 0,
        min: 0, max: 40, step: 1
      },
      {
        id: 'showTotals', label: 'Print the totals line', type: 'checkbox', default: true,
        hint: 'States what the cells add up to, so the sheet proves its own arithmetic.'
      }
    ],

    render: function (v) {
      var i;
      var dp = v.decimals === '2' || v.decimals === 2 ? 2 : 0;
      var n = int(v.count, 100, 1, 400);
      var kind = v.distribution;
      if (kind !== 'fixed' && kind !== 'progressive' && kind !== 'cyclical' &&
          kind !== 'random') kind = 'sequential';
      var order = v.order === 'down' || v.order === 'random' ? v.order : 'up';
      var shapeKey = Object.prototype.hasOwnProperty.call(SHAPES, v.shape) ? v.shape : 'circle';
      var shape = SHAPES[shapeKey];

      var total = toMinor(v.goal, dp);
      if (total <= 0) {
        var typed = parseFloat(v.goal);
        throw new Error(isFinite(typed) && typed > 0 && dp === 0
          ? 'A goal of ' + typed + ' rounds away to nothing with the decimal places set to none. Switch them on, or raise the goal.'
          : 'Set a goal above zero and the chart will divide it up.');
      }

      var stepMajor = lookup(STEPS, String(v.step), 1);
      var stepMinor = (v.step === '0' || v.step === 0) ? 1 : stepMajor * Math.pow(10, dp);
      if (stepMinor > total) {
        throw new Error('Rounding each cell to ' + stepMajor + ' cannot work on a goal of ' +
          fromMinor(total, dp) + ', because one cell would already be more than the whole goal. ' +
          'Choose a coarser goal or a finer rounding.');
      }

      var solved = solve(kind, n, total, stepMinor,
        num(v.ramp, 3, 1, 100), int(v.cycle, 4, 2, 52), order, int(v.seed, 7, 1, 99999));
      var values = solved.values;

      /* The solver lifts thin cells to the smallest amount it is allowed to
         draw. If cells are still empty, the goal genuinely will not divide this
         many ways at this granularity, and no arrangement of it can. */
      var zeros = 0;
      for (i = 0; i < n; i++) if (values[i] <= 0) zeros++;
      if (zeros > 0) {
        throw new Error('A goal of ' + fromMinor(total, dp) + ' will not divide into ' + n +
          ' cells of at least ' + fromMinor(stepMinor, dp) + ' each — ' + zeros +
          ' of them come out empty. Reduce the cell count' +
          (stepMinor > 1 ? ', round to something finer' : '') +
          (dp === 0 ? ', allow two decimal places' : '') + ', or raise the goal.');
      }

      /* ---- room on the sheet ---- */
      var margin = num(v.margin, 10, 0, 200);
      var x0 = margin, y0 = margin;
      var x1 = v.page.w - margin, y1 = v.page.h - margin;
      var usableW = x1 - x0, usableH = y1 - y0;
      if (usableW <= 5 || usableH <= 5) {
        throw new Error('A margin of ' + n2(margin) + ' mm leaves no printable area on this sheet. Reduce the margin.');
      }

      var heading = String(v.title == null ? '' : v.title).replace(/^\s+|\s+$/g, '');
      var showTotals = v.showTotals !== false;
      var headerH = heading ? 14 : 6;
      var footerH = showTotals ? 6 : 0;

      var availW = usableW;
      var availH = usableH - headerH - footerH;
      if (availH <= 5) {
        throw new Error('Once the margin, the heading and the totals line are taken out there is no room left for the chart. Reduce the margin, or turn the heading off.');
      }

      var grid = chooseGrid(shapeKey, n, int(v.cols, 0, 0, 40), availW, availH);
      if (!grid || grid.size <= 0) {
        throw new Error('This many cells will not fit on this sheet. Reduce the cell count, reduce the margin, or use a larger paper size.');
      }
      if (grid.fieldW > availW + 1e-6 || grid.fieldH > availH + 1e-6) {
        throw new Error(grid.cols + ' columns needs ' + n2(grid.fieldW) + ' x ' + n2(grid.fieldH) +
          ' mm, but there is only ' + n2(availW) + ' x ' + n2(availH) +
          ' mm inside the margin. Set the columns back to 0 to let the page choose, or use a larger sheet.');
      }
      if (grid.w < 4) {
        throw new Error('At ' + n + ' cells each one comes out ' + n2(grid.w) +
          ' mm across, which is too small to write in. Reduce the cell count or use a larger sheet.');
      }

      /* ---- labels ---- */
      var unit = String(v.unit == null ? '' : v.unit).replace(/^\s+|\s+$/g, '');
      var before = v.unitPos !== 'after';
      function label(minor) {
        var text = fromMinor(minor, dp);
        if (!unit) return text;
        return before ? unit + text : text + ' ' + unit;
      }

      var longest = 0;
      for (i = 0; i < n; i++) {
        var len = label(values[i]).length;
        if (len > longest) longest = len;
      }

      /* Helvetica digits are 0.556 em; 0.6 leaves room for a currency glyph and
         keeps the longest label inside the cell rather than over its edge. */
      var EM = 0.6;
      var fontSize = Math.min(
        grid.w * shape.textW / (EM * Math.max(longest, 1)),
        grid.h * 0.34,
        6
      );

      /* ---- draw ---- */
      var fx = x0 + (availW - grid.fieldW) / 2;
      var fy = y0 + headerH + (availH - grid.fieldH) / 2;

      var out = [];
      var inkLine = '#333333', inkText = '#111111', inkDim = '#555555';
      var strokeW = Math.max(0.2, Math.min(0.5, grid.size * 0.02));

      if (heading) {
        out.push('<text x="' + n3(x0) + '" y="' + n3(y0 + 5.6) +
          '" font-family="Helvetica, Arial, sans-serif" font-size="5.6" font-weight="bold" fill="' +
          inkText + '">' + PP.esc(heading) + '</text>');
      }

      var kindWord = {
        sequential: 'sequential', random: 'randomised', fixed: 'a fixed amount',
        progressive: 'progressive', cyclical: 'cyclical'
      }[kind];
      var specLine = 'Goal ' + label(total) + ' · ' + n + ' cells · ' + kindWord +
        ' · colour one in as you go';
      out.push('<text x="' + n3(x0) + '" y="' + n3(y0 + (heading ? 11.4 : 4.2)) +
        '" font-family="Helvetica, Arial, sans-serif" font-size="3.1" fill="' + inkDim + '">' +
        PP.esc(specLine) + '</text>');

      var cellFont = ' font-family="Helvetica, Arial, sans-serif" font-size="' +
        n3(fontSize) + '" fill="' + inkText + '" text-anchor="middle"';

      for (i = 0; i < n; i++) {
        var col = i % grid.cols, row = Math.floor(i / grid.cols);
        var cx, cy;
        if (shape.hex) {
          cx = fx + grid.pitchX * (col + (row % 2 === 1 ? 0.5 : 0)) + grid.w / 2;
          cy = fy + grid.pitchY * row + grid.h / 2;
          out.push('<polygon points="' + hexPoints(cx, cy, grid.R * (1 - shape.inset)) +
            '" fill="#ffffff" stroke="' + inkLine + '" stroke-width="' + n3(strokeW) + '"/>');
        } else {
          cx = fx + grid.pitchX * col + grid.w / 2;
          cy = fy + grid.pitchY * row + grid.h / 2;
          if (shapeKey === 'circle') {
            out.push('<circle cx="' + n3(cx) + '" cy="' + n3(cy) + '" r="' +
              n3(grid.R * (1 - shape.inset)) + '" fill="#ffffff" stroke="' + inkLine +
              '" stroke-width="' + n3(strokeW) + '"/>');
          } else {
            var side = grid.w * (1 - shape.inset);
            out.push('<rect x="' + n3(cx - side / 2) + '" y="' + n3(cy - side / 2) +
              '" width="' + n3(side) + '" height="' + n3(side) + '" fill="#ffffff" stroke="' +
              inkLine + '" stroke-width="' + n3(strokeW) + '"/>');
          }
        }
        out.push('<text x="' + n3(cx) + '" y="' + n3(cy + fontSize * 0.35) + '"' + cellFont + '>' +
          PP.esc(label(values[i])) + '</text>');
      }

      /* ---- the totals line, which is the point of the whole page ---- */
      if (showTotals) {
        var check = 0;
        for (i = 0; i < n; i++) check += values[i];
        var totalsLine = 'These ' + n + ' cells total exactly ' + label(check) + '.';
        if (solved.carry > 0) {
          totalsLine += ' Rounded to ' + stepMajor + ', with the odd ' +
            label(solved.carry) + ' carried by the largest cell.';
        }
        totalsLine += ' Cell ' + n2(grid.w) + ' × ' + n2(grid.h) + ' mm.';

        var capEM = 0.55;
        var capSize = num(usableW / (capEM * totalsLine.length), 3.1, 1.8, 3.1);
        var fit = capEM * capSize * totalsLine.length > usableW
          ? ' textLength="' + n3(usableW) + '" lengthAdjust="spacingAndGlyphs"'
          : '';
        out.push('<text x="' + n3(x0) + '" y="' + n3(y1 - 1.4) +
          '" font-family="Helvetica, Arial, sans-serif" font-size="' + n3(capSize) +
          '" fill="' + inkDim + '"' + fit + '>' + PP.esc(totalsLine) + '</text>');
      }

      return out.join('');
    }
  });
})();
