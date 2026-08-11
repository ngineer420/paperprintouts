/* paperprintouts.com — blank clock face worksheets.
 *
 * The one thing this generator exists to get right: the hour hand moves
 * continuously. At 3:45 it sits three quarters of the way from the 3 to the 4,
 * because that is where it sits on every real clock. See hourAngle() below.
 *
 * All coordinates are millimetres. The framework supplies the <svg> wrapper.
 */
(function (PP) {
  'use strict';

  var INK = '#111';
  var SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif';

  /* Indexed by hour % 12, so index 0 is the twelve at the top. */
  var ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII',
    'VIII', 'IX', 'X', 'XI'];

  var COUNTS = [1, 2, 4, 6, 9, 12];
  var INCREMENTS = [60, 30, 15, 5, 1];
  var MINUTES_ON_A_FACE = 720; /* twelve hours; every increment divides it */

  /* ---------- small helpers ---------- */

  /* The framework supplies both of these. The fallbacks exist only so the file
     can be exercised against a bare PP stub outside the browser. */
  var round = PP.round || function (n, dp) {
    var f = Math.pow(10, dp === undefined ? 3 : dp);
    return Math.round(n * f) / f;
  };
  var esc = PP.esc || function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  function r2(n) { return round(n, 2); }

  function clamp(n, lo, hi) {
    if (!isFinite(n)) return lo;
    return n < lo ? lo : (n > hi ? hi : n);
  }

  /* Select values arrive from the DOM as strings, and the URL can carry
     anything at all, so every choice is validated against its own list. */
  function pickNumber(raw, list, fallback) {
    var n = parseInt(raw, 10);
    for (var i = 0; i < list.length; i++) if (list[i] === n) return n;
    return fallback;
  }

  function pickString(raw, list, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i] === raw) return raw;
    return fallback;
  }

  /* Math.imul as a plain ES5 function, so the PRNG below is exact everywhere. */
  function imul(a, b) {
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff;
    var bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
    return ((al * bl) + ((((ah * bl) + (al * bh)) << 16) >>> 0)) | 0;
  }

  /* mulberry32: tiny, deterministic, good enough for shuffling twelve times.
     Determinism is the point — a teacher printing the answer key must get the
     same sheet as the worksheet from the same URL. */
  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = imul(a ^ (a >>> 15), 1 | a);
      t = (t + imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* A point on the face. Twelve o'clock is straight up and degrees run
     clockwise; SVG's y grows downward, which is where the minus comes from. */
  function pt(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
  }

  function seg(cx, cy, r0, r1, deg, w, cap) {
    var a = pt(cx, cy, r0, deg);
    var b = pt(cx, cy, r1, deg);
    return '<line x1="' + r2(a.x) + '" y1="' + r2(a.y) +
      '" x2="' + r2(b.x) + '" y2="' + r2(b.y) +
      '" stroke="' + INK + '" stroke-width="' + r2(w) + '"' +
      (cap ? ' stroke-linecap="' + cap + '"' : '') + '/>';
  }

  /* Text is placed by its middle. dominant-baseline is unreliable in some
     print paths and in downloaded SVGs, so the baseline is nudged by hand:
     roughly half a cap height for these sans faces. */
  function label(x, y, size, text) {
    return '<text x="' + r2(x) + '" y="' + r2(y + size * 0.35) +
      '" font-family="' + SANS + '" font-size="' + r2(size) +
      '" fill="' + INK + '" text-anchor="middle">' + esc(text) + '</text>';
  }

  function timeLabel(mins) {
    var h = Math.floor(mins / 60) % 12;
    var m = mins % 60;
    return (h === 0 ? 12 : h) + ':' + (m < 10 ? '0' + m : String(m));
  }

  /* ---------- the geometry that matters ---------- */

  function hourAngle(mins) {
    /* Continuous: the hour hand is dragged round by the minutes. */
    var h = Math.floor(mins / 60) % 12;
    var m = mins % 60;
    return (h + m / 60) * 30;
  }

  function minuteAngle(mins) {
    return (mins % 60) * 6;
  }

  /* ---------- times ---------- */

  function buildTimes(count, increment, order, seed) {
    var slots = Math.round(MINUTES_ON_A_FACE / increment);
    var out = [];
    var i;

    if (order === 'sequential') {
      /* Start at 12:00 and step by the increment, wrapping after twelve hours. */
      for (i = 0; i < count; i++) out.push((i * increment) % MINUTES_ON_A_FACE);
      return out;
    }

    var rand = mulberry32(seed);

    if (count <= slots) {
      /* Sample without replacement so one page never repeats a time. With
         whole hours and twelve clocks this hands back all twelve, shuffled. */
      var pool = [];
      for (i = 0; i < slots; i++) pool.push(i);
      for (i = slots - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      for (i = 0; i < count; i++) out.push(pool[i] * increment);
      return out;
    }

    /* Cannot happen with the offered counts and increments, but a hand-edited
       URL should still draw something rather than run off the end of the pool. */
    for (i = 0; i < count; i++) out.push(Math.floor(rand() * slots) * increment);
    return out;
  }

  /* ---------- layout ---------- */

  /* Everything a single grid cell contains, derived from the cell's size.
     Used both to score candidate grids and to draw the chosen one, so the
     two can never drift apart. */
  function metrics(cellW, cellH, showBox) {
    var gutter = clamp(Math.min(cellW, cellH) * 0.10, 2, 10);
    var innerW = cellW - gutter;
    var innerH = cellH - gutter;
    var boxH = showBox ? clamp(innerH * 0.15, 6, 15) : 0;
    var gap = showBox ? clamp(boxH * 0.35, 1.5, 5) : 0;
    var d = Math.min(innerW, innerH - boxH - gap);
    if (!(d > 0)) d = 0;
    return {
      innerW: innerW,
      innerH: innerH,
      boxH: boxH,
      boxW: showBox ? Math.min(innerW, clamp(d * 0.55, 16, 60)) : 0,
      gap: gap,
      d: d
    };
  }

  /* Try every rectangular grid with the right number of cells and keep the one
     that yields the largest clock. On a portrait page six clocks land as 2 × 3;
     in landscape the same search picks 3 × 2 on its own. */
  function chooseGrid(count, usableW, usableH, showBox) {
    var best = null;
    for (var cols = 1; cols <= count; cols++) {
      if (count % cols !== 0) continue;
      var rows = count / cols;
      var m = metrics(usableW / cols, usableH / rows, showBox);
      if (!best || m.d > best.m.d + 0.001) {
        best = { cols: cols, rows: rows, m: m };
      }
    }
    return best;
  }

  /* ---------- the face ---------- */

  function drawFace(cx, cy, r, opts) {
    var out = [];
    var i;
    /* Fine detail shrinks with the face so a twelve-up sheet does not turn
       into a page of blobs. At r >= 20 mm these are the specified widths. */
    var k = Math.min(1, r / 20);
    var hourMarks = opts.numerals !== 'none';

    out.push('<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) +
      '" fill="none" stroke="' + INK + '" stroke-width="0.5"/>');

    if (opts.minuteTicks) {
      for (i = 0; i < 60; i++) {
        /* Where hour marks are drawn they stand in for those twelve ticks;
           on a face with no hour marks all sixty are drawn the same length. */
        if (i % 5 === 0 && hourMarks) continue;
        out.push(seg(cx, cy, r * 0.93, r * 0.97, i * 6, 0.25 * k));
      }
    }

    if (hourMarks) {
      for (i = 0; i < 12; i++) {
        out.push(seg(cx, cy, r * 0.87, r * 0.97, i * 30, 0.6 * k));
      }
    }

    if (opts.numerals === 'arabic' || opts.numerals === 'roman') {
      var roman = opts.numerals === 'roman';
      /* Roman numerals are set smaller because VIII is four glyphs wide. */
      var fs = r * (roman ? 0.17 : 0.24);
      var rp = r * (roman ? 0.75 : 0.73);
      for (i = 1; i <= 12; i++) {
        var p = pt(cx, cy, rp, i * 30);
        out.push(label(p.x, p.y, fs, roman ? ROMAN[i % 12] : String(i)));
      }
    }

    if (opts.mins !== null) {
      /* Minute hand first, hour hand over it, in the specified proportions. */
      out.push(seg(cx, cy, 0, r * 0.80, minuteAngle(opts.mins), 0.8 * k, 'round'));
      out.push(seg(cx, cy, 0, r * 0.55, hourAngle(opts.mins), 1.2 * k, 'round'));
    }

    /* The centre dot stays on blank faces too — it is the pivot a child draws
       their own hands from. */
    out.push('<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' +
      r2(Math.max(0.35, 0.9 * k)) + '" fill="' + INK + '"/>');

    return out.join('');
  }

  function drawBox(cx, top, w, h, text) {
    var out = '<rect x="' + r2(cx - w / 2) + '" y="' + r2(top) +
      '" width="' + r2(w) + '" height="' + r2(h) +
      '" rx="' + r2(Math.min(1.5, h * 0.15)) +
      '" fill="none" stroke="' + INK + '" stroke-width="0.4"/>';
    if (text) {
      /* Sized so five characters ("12:45") still clear the sides. */
      var fs = Math.min(h * 0.6, w * 0.30);
      out += label(cx, top + h / 2, fs, text);
    }
    return out;
  }

  /* ---------- registration ---------- */

  PP.register('blank-clock-faces', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'count', label: 'Clocks per page', type: 'select', default: '6',
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '4', label: '4' },
          { value: '6', label: '6' },
          { value: '9', label: '9' },
          { value: '12', label: '12' }
        ]
      },
      {
        id: 'mode', label: 'What is printed', type: 'select', default: 'hands',
        options: [
          { value: 'blank', label: 'Blank faces — the child draws the hands' },
          { value: 'hands', label: 'Hands drawn — the child writes the time' },
          { value: 'both', label: 'Hands drawn, with a digital box' }
        ]
      },
      {
        id: 'increment', label: 'Time increment', type: 'select', default: '15',
        options: [
          { value: '60', label: 'Whole hours' },
          { value: '30', label: 'Half hours' },
          { value: '15', label: 'Quarter hours' },
          { value: '5', label: 'Five minutes' },
          { value: '1', label: 'One minute' }
        ]
      },
      {
        id: 'times', label: 'Times', type: 'select', default: 'random',
        options: [
          { value: 'random', label: 'Random' },
          { value: 'sequential', label: 'Sequential from 12:00' }
        ]
      },
      {
        id: 'seed', label: 'Random seed', type: 'number', default: 1,
        min: 1, max: 9999, step: 1,
        hint: 'The same seed always prints the same times, so a worksheet and its answer key match. Change it for a fresh set.'
      },
      {
        id: 'numerals', label: 'Numerals', type: 'select', default: 'arabic',
        options: [
          { value: 'arabic', label: 'Arabic (1–12)' },
          { value: 'roman', label: 'Roman (I–XII)' },
          { value: 'ticks-only', label: 'Hour marks only, no numbers' },
          { value: 'none', label: 'Nothing — an empty ring' }
        ],
        hint: 'An empty ring drops the hour marks as well, for children who are filling the numbers in themselves.'
      },
      { id: 'minuteTicks', label: 'Draw the 60 minute ticks', type: 'checkbox', default: true },
      { id: 'digitalBox', label: 'Box under each clock for writing the time', type: 'checkbox', default: true },
      {
        id: 'answerKey', label: 'Answer key — fill in the digital time', type: 'checkbox', default: false,
        hint: 'On blank faces this prints the time to draw instead of the answer.'
      }
    ],

    render: function (v) {
      var count = pickNumber(v.count, COUNTS, 6);
      var increment = pickNumber(v.increment, INCREMENTS, 15);
      var mode = pickString(v.mode, ['blank', 'hands', 'both'], 'hands');
      var order = pickString(v.times, ['random', 'sequential'], 'random');
      var numerals = pickString(v.numerals,
        ['arabic', 'roman', 'ticks-only', 'none'], 'arabic');
      var seed = Math.floor(clamp(parseFloat(v.seed), 1, 9999)) || 1;

      /* 'both' means hands and a box, whatever the box checkbox says. */
      var showBox = !!v.digitalBox || mode === 'both';
      var showHands = mode !== 'blank';

      /* No upper clamp: an over-large margin should say so, not quietly
         redraw at a size nobody asked for. */
      var margin = Math.max(0, v.margin || 0);
      var ux = margin;
      var uy = margin;
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;

      if (usableW <= 0 || usableH <= 0) {
        throw new Error('The margin leaves no room on the page. Reduce it below half the page width.');
      }

      /* Below about 16 mm across, twelve numerals cannot be read and the sheet
         is not worth printing, so say so rather than draw a smudge. */
      var grid = chooseGrid(count, usableW, usableH, showBox);
      if (!grid || grid.m.d < 16) {
        throw new Error('There is not enough room for ' + count +
          ' clocks on this sheet. Use fewer clocks per page, a bigger paper size, or a smaller margin.');
      }

      var cellW = usableW / grid.cols;
      var cellH = usableH / grid.rows;
      var m = grid.m;
      var r = m.d / 2;

      /* The clock, its gap and its box are centred in the cell as one block. */
      var blockH = m.d + m.gap + m.boxH;

      var times = buildTimes(count, increment, order, seed);
      var parts = [];

      for (var i = 0; i < count; i++) {
        var col = i % grid.cols;
        var row = Math.floor(i / grid.cols);
        var cx = ux + col * cellW + cellW / 2;
        var blockTop = uy + row * cellH + (cellH - blockH) / 2;

        parts.push(drawFace(cx, blockTop + r, r, {
          numerals: numerals,
          minuteTicks: !!v.minuteTicks,
          mins: showHands ? times[i] : null
        }));

        if (showBox) {
          parts.push(drawBox(cx, blockTop + m.d + m.gap, m.boxW, m.boxH,
            v.answerKey ? timeLabel(times[i]) : ''));
        }
      }

      return parts.join('');
    }
  });
})(window.PP);
