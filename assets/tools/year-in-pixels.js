/* paperprintouts.com -- year in pixels.
 *
 * One cell per day of one year, to colour in daily against a legend you write
 * yourself. Every coordinate is a millimetre; the framework supplies the viewBox
 * that makes a millimetre on screen a millimetre on paper, which is what lets an
 * A6 sheet actually drop into an A6 binder.
 *
 * THE YEAR IS THE POINT. A static PDF of a 12 x 31 grid has to draw 372 cells
 * and pretend the missing seven do not matter, and it cannot know whether
 * February has 28 days or 29, or what weekday your January starts on. All three
 * come free the moment the sheet is generated for a named year, and all three
 * are what make the finished chart readable a year later.
 *
 * THREE LAYOUTS, ONE ENGINE:
 *
 *   grid      -- the classic. Twelve months against thirty-one days, with the
 *                cells that do not exist simply absent, so April really does
 *                stop at 30 and a leap year is visible at a glance.
 *   calendar  -- twelve mini months, each starting on its true weekday. Costs
 *                some cell size and buys you the ability to find a Tuesday.
 *   circular  -- one ring, one wedge a day, the year closing on itself. This is
 *                the variant people pay for on Etsy and no generator offers.
 *
 * The legend is the part that decides whether the sheet is still readable next
 * January, so it gets real room: a swatch to colour and either the label you
 * typed or a ruled line long enough to write on.
 *
 * ENCODING. Every cell is one subpath of a single <path>, the way dot grid paper
 * draws its dots -- 366 cells is not many, but one element beats 366 of them for
 * the Download SVG button and for anything that has to parse it back in.
 */
(function () {
  'use strict';

  var PP = window.PP;

  function mm(n) { return PP.round(n, 3); }
  function n2(n) { return PP.round(n, 2); }

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

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* The Gregorian rule in full, rather than the divisible-by-four version that
     is right 96% of the time: 2100 is not a leap year, and a planner for 2100
     that says it is would be wrong on the one day it exists to record. */
  function isLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(y, m) {
    if (m === 1) return isLeap(y) ? 29 : 28;
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
  }

  /* Weekday of the first of a month, as an index into a week that starts where
     the reader's week starts. Built in UTC so no timezone can shunt it a day. */
  function firstWeekday(y, m, weekStartsMonday) {
    var dow = new Date(Date.UTC(y, m, 1)).getUTCDay(); /* 0 = Sunday */
    return weekStartsMonday ? (dow + 6) % 7 : dow;
  }

  var COLOURS = {
    'grey': { line: '#9aa3ad', ink: '#5c6672' },
    'light-grey': { line: '#c3c9d1', ink: '#8a929c' },
    'blue': { line: '#8fb3e0', ink: '#4a76b8' },
    'black': { line: '#333333', ink: '#111111' }
  };

  /* ---------- cell shapes ----------
   *
   * One subpath each, all sharing a path. Rounded corners are worth having:
   * a colouring grid of hard squares reads as graph paper, and the whole point
   * is that it should not.
   */
  function cellSubpath(x, y, w, h, shape) {
    var r, rr;
    if (shape === 'circle') {
      r = Math.min(w, h) / 2;
      rr = mm(r);
      return 'M' + mm(x + w / 2 - r) + ' ' + mm(y + h / 2) +
        'a' + rr + ' ' + rr + ' 0 1 0 ' + mm(r * 2) + ' 0' +
        'a' + rr + ' ' + rr + ' 0 1 0 ' + mm(-r * 2) + ' 0';
    }
    if (shape === 'rounded') {
      r = Math.min(w, h) * 0.22;
      rr = mm(r);
      return 'M' + mm(x + r) + ' ' + mm(y) +
        'H' + mm(x + w - r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + mm(x + w) + ' ' + mm(y + r) +
        'V' + mm(y + h - r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + mm(x + w - r) + ' ' + mm(y + h) +
        'H' + mm(x + r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + mm(x) + ' ' + mm(y + h - r) +
        'V' + mm(y + r) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + mm(x + r) + ' ' + mm(y) + 'Z';
    }
    return 'M' + mm(x) + ' ' + mm(y) + 'h' + mm(w) + 'v' + mm(h) + 'h' + mm(-w) + 'Z';
  }

  /* An annulus segment: one day of the circular year. */
  function wedgeSubpath(cx, cy, r1, r2, a1, a2) {
    function P(r, a) {
      return mm(cx + r * Math.cos(a)) + ' ' + mm(cy + r * Math.sin(a));
    }
    return 'M' + P(r2, a1) +
      'A' + mm(r2) + ' ' + mm(r2) + ' 0 0 1 ' + P(r2, a2) +
      'L' + P(r1, a2) +
      'A' + mm(r1) + ' ' + mm(r1) + ' 0 0 0 ' + P(r1, a1) + 'Z';
  }

  function text(x, y, s, size, fill, anchor, extra) {
    return '<text x="' + mm(x) + '" y="' + mm(y) + '" font-family="Helvetica, Arial, sans-serif"' +
      ' font-size="' + mm(size) + '" fill="' + fill + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') +
      (extra || '') + '>' + PP.esc(s) + '</text>';
  }

  /* Past about two and a half to one a cell stops reading as a cell, so that is
     as far as either side is allowed to stretch. */
  var MAX_ASPECT = 2.5;

  /* The largest cell that fits cols x rows into the space, allowed to be a
     rectangle. Returns the area actually covered, which is how the two possible
     arrangements of a year are compared. */
  function fitGrid(innerW, innerH, cols, rows) {
    var w = innerW / cols, h = innerH / rows;
    if (w > h * MAX_ASPECT) w = h * MAX_ASPECT;
    if (h > w * MAX_ASPECT) h = w * MAX_ASPECT;
    return { cols: cols, rows: rows, w: w, h: h, area: cols * w * rows * h };
  }

  /* ---------- legend ----------
   *
   * Sized before anything else is drawn, because whatever it needs the chart
   * does not get. A legend squeezed into the leftovers is how these sheets end
   * up with five colours and nowhere to say what they mean.
   */
  var LEGEND_SWATCH = 5;
  var LEGEND_ROW = 8.5;
  var LEGEND_MIN_ENTRY = 38;

  function legendLayout(width, count) {
    var perRow = Math.max(1, Math.floor(width / LEGEND_MIN_ENTRY));
    if (perRow > count) perRow = count;
    var rows = Math.ceil(count / perRow);
    return {
      perRow: perRow,
      rows: rows,
      entryW: width / perRow,
      height: rows * LEGEND_ROW + 3
    };
  }

  function legendSvg(x, y, layout, count, labels, shape, palette) {
    var out = [];
    var cells = [];
    var i, col, row, ex, ey, label;
    for (i = 0; i < count; i++) {
      col = i % layout.perRow;
      row = Math.floor(i / layout.perRow);
      ex = x + col * layout.entryW;
      ey = y + row * LEGEND_ROW;
      cells.push(cellSubpath(ex, ey, LEGEND_SWATCH, LEGEND_SWATCH, shape));
      label = labels[i];
      if (label) {
        out.push(text(ex + LEGEND_SWATCH + 2, ey + LEGEND_SWATCH * 0.82, label, 2.9, palette.ink));
      } else {
        /* Nothing typed, so leave a line to write on rather than a blank gap —
           the sheet has to be usable straight off the printer. */
        out.push('<path d="M' + mm(ex + LEGEND_SWATCH + 2) + ' ' + mm(ey + LEGEND_SWATCH) +
          'H' + mm(ex + layout.entryW - 3) + '" fill="none" stroke="' + palette.line +
          '" stroke-width="0.2"/>');
      }
    }
    out.unshift('<path d="' + cells.join('') + '" fill="none" stroke="' + palette.ink +
      '" stroke-width="0.3"/>');
    return out.join('');
  }

  PP.register('year-in-pixels', {
    defaultPaper: 'a5',
    defaultOrientation: 'portrait',
    defaultMargin: 10,

    controls: [
      {
        id: 'year', label: 'Year', type: 'number', default: new Date().getFullYear(),
        min: 1900, max: 2200, step: 1,
        hint: 'The month lengths, February and the starting weekday all come from this, which is the one thing a printed PDF cannot get right.'
      },
      {
        id: 'layout', label: 'Layout', type: 'select', default: 'grid',
        options: [
          { value: 'grid', label: 'Grid — 12 months by 31 days' },
          { value: 'calendar', label: 'Calendar — twelve mini months' },
          { value: 'circular', label: 'Circular — one ring, one wedge a day' }
        ]
      },
      {
        id: 'shape', label: 'Cell shape', type: 'select', default: 'square',
        options: [
          { value: 'square', label: 'Square' },
          { value: 'rounded', label: 'Rounded square' },
          { value: 'circle', label: 'Circle' }
        ],
        hint: 'The circular layout draws wedges whatever this says; it applies to the grid, the calendar and the legend swatches.'
      },
      {
        id: 'categories', label: 'Legend entries', type: 'number', default: 5,
        min: 1, max: 12, step: 1,
        hint: 'Five moods, or ten habits. Each gets a swatch to colour and a line to write on.'
      },
      {
        id: 'labels', label: 'Legend labels (one per line)', type: 'textarea', default: '',
        placeholder: 'Great\nGood\nOK\nLow\nRough',
        hint: 'Leave it empty and you get ruled lines to fill in by hand.'
      },
      {
        id: 'title', label: 'Title', type: 'text', default: '',
        placeholder: 'Mood',
        hint: 'Printed next to the year. Leave it empty for just the year.'
      },
      {
        id: 'weekStart', label: 'Week starts', type: 'select', default: 'monday',
        options: [
          { value: 'monday', label: 'Monday' },
          { value: 'sunday', label: 'Sunday' }
        ],
        hint: 'Used by the calendar layout.'
      },
      {
        id: 'dayNumbers', label: 'Print the day numbers', type: 'checkbox', default: false,
        hint: 'Fits on the calendar layout at most paper sizes. On the grid the days are numbered down the side either way.'
      },
      {
        id: 'colour', label: 'Line colour', type: 'select', default: 'grey',
        options: [
          { value: 'grey', label: 'Grey' },
          { value: 'light-grey', label: 'Light grey' },
          { value: 'blue', label: 'Blue' },
          { value: 'black', label: 'Black' }
        ]
      }
    ],

    render: function (v) {
      var year = Math.round(num(v.year, new Date().getFullYear(), 1900, 2200));
      var palette = lookup(COLOURS, v.colour, COLOURS.grey);
      var shape = (v.shape === 'circle' || v.shape === 'rounded') ? v.shape : 'square';
      var layoutKey = (v.layout === 'calendar' || v.layout === 'circular') ? v.layout : 'grid';
      var weekStartsMonday = v.weekStart !== 'sunday';
      var categories = Math.round(num(v.categories, 5, 1, 12));
      var dayNumbers = !!v.dayNumbers;

      /* Split on newlines only, rather than reaching for PP.names, which also
         splits on commas: "Good, but tired" is one legend entry, not two. */
      var labels = String(v.labels || '').split(/\r?\n/)
        .map(function (s) { return s.trim().slice(0, 40); })
        .filter(function (s) { return s.length > 0; })
        .slice(0, categories);
      var title = String(v.title || '').slice(0, 60);

      var margin = num(v.margin, 10, 0, 200);
      var x0 = margin, y0 = margin;
      var usableW = v.page.w - margin * 2;
      var usableH = v.page.h - margin * 2;
      if (usableW < 40 || usableH < 40) {
        throw new Error('A margin of ' + n2(margin) +
          ' mm leaves too little of this sheet to draw a year on. Reduce the margin, or use a larger paper size.');
      }

      var out = [];

      /* ---- heading ---- */
      var headSize = Math.max(5, Math.min(9, usableW * 0.055));
      out.push(text(x0, y0 + headSize, String(year), headSize, palette.ink, null, ' font-weight="bold"'));
      if (title) {
        out.push(text(x0 + headSize * String(year).length * 0.62 + 3, y0 + headSize,
          title, headSize * 0.62, palette.ink));
      }
      var headH = headSize + 3.5;

      /* ---- legend takes its room first ---- */
      var legend = legendLayout(usableW, categories);
      var chartTop = y0 + headH;
      var chartH = usableH - headH - legend.height;
      var chartW = usableW;
      if (chartH < 25) {
        throw new Error('There is no room left for the chart once the heading and a ' + categories +
          ' entry legend are drawn. Reduce the legend entries, the margin, or use a larger paper size.');
      }

      var cells = [];
      var grid, m, d, i;

      if (layoutKey === 'grid') {
        /* Twelve against thirty-one, arranged whichever way round makes the
           cells bigger. That is not a cosmetic choice: this is a sheet somebody
           has to put a mark inside 365 times, so the larger cell wins, and the
           orientation control is the lever if they disagree. */
        var labelGutter = 7;
        var headerBand = 5;
        var innerW = chartW - labelGutter;
        var innerH = chartH - headerBand;

        /* Cells are rectangles, not squares. Twelve against thirty-one is a tall
           narrow shape and no sheet of paper has that proportion, so insisting
           on square cells leaves a third of the page white and the cells half
           the size they could be. Real year-in-pixels charts have wide month
           columns for exactly this reason. The stretch is capped, because past
           about two and a half to one a cell stops reading as a cell. */
        /* Whichever way round covers more of the sheet. Ties go to months
           across, which is the arrangement people picture. */
        var across = fitGrid(innerW, innerH, 12, 31);
        var down = fitGrid(innerW, innerH, 31, 12);
        var g = across.area >= down.area ? across : down;
        var acrossIsBetter = g === across;
        var cellW = g.w, cellH = g.h;
        if (Math.min(cellW, cellH) < 1.2) {
          throw new Error('The cells come out at ' + n2(Math.min(cellW, cellH)) +
            ' mm, too small to colour in. Use a larger paper size, or fewer legend entries.');
        }

        var gw = g.cols * cellW, gh = g.rows * cellH;
        var gx = x0 + labelGutter + (innerW - gw) / 2;
        var gy = chartTop + headerBand + (innerH - gh) / 2;
        var daySize = Math.max(1.6, Math.min(2.6, cellH * 0.62));
        var monSize = Math.max(1.6, Math.min(2.8, Math.min(cellW * 0.48, cellH * 0.9)));

        for (m = 0; m < 12; m++) {
          for (d = 1; d <= daysInMonth(year, m); d++) {
            var cxx = gx + (acrossIsBetter ? m : d - 1) * cellW;
            var cyy = gy + (acrossIsBetter ? d - 1 : m) * cellH;
            /* A hair of padding so neighbouring cells read as separate things
               to colour rather than as one ruled grid. */
            cells.push(cellSubpath(cxx + cellW * 0.06, cyy + cellH * 0.06,
              cellW * 0.88, cellH * 0.88, shape));
          }
        }

        /* Month names along the band, day numbers down the gutter — or the other
           way about when the grid is turned. */
        for (m = 0; m < 12; m++) {
          if (acrossIsBetter) {
            out.push(text(gx + (m + 0.5) * cellW, gy - cellH * 0.3,
              MONTHS_SHORT[m], monSize, palette.ink, 'middle'));
          } else {
            out.push(text(gx - 1.5, gy + (m + 0.5) * cellH + monSize * 0.36,
              MONTHS_SHORT[m], monSize, palette.ink, 'end'));
          }
        }
        for (d = 1; d <= 31; d++) {
          if (acrossIsBetter) {
            out.push(text(gx - 1.5, gy + (d - 0.5) * cellH + daySize * 0.36,
              String(d), daySize, palette.ink, 'end'));
          } else if (d % 2 === 1 || cellW > 5) {
            out.push(text(gx + (d - 0.5) * cellW, gy - cellH * 0.28,
              String(d), Math.min(daySize, cellW * 0.62), palette.ink, 'middle'));
          }
        }

      } else if (layoutKey === 'calendar') {
        /* Twelve mini months. Laid out in whichever arrangement of the twelve
           gives the biggest day cell on this sheet — 3 x 4 on a portrait A5,
           6 x 2 on a landscape tabloid. */
        var ARRANGEMENTS = [[2, 6], [3, 4], [4, 3], [6, 2], [1, 12], [12, 1]];
        var best = null;
        for (i = 0; i < ARRANGEMENTS.length; i++) {
          var ac = ARRANGEMENTS[i][0], ar = ARRANGEMENTS[i][1];
          var blockW = chartW / ac, blockH = chartH / ar;
          /* Each block is a month name, a weekday header and six week rows over
             seven columns. */
          var c = Math.min((blockW - 1.5) / 7, (blockH - 1.5) / 8.2);
          if (!best || c > best.cell) best = { cols: ac, rows: ar, cell: c, blockW: blockW, blockH: blockH };
        }
        if (best.cell < 1.6) {
          throw new Error('The calendar layout needs cells of at least 1.6 mm and this sheet gives ' +
            n2(best.cell) + ' mm. Use a larger paper size, or switch to the grid layout.');
        }

        var cell2 = best.cell;
        var monthW = cell2 * 7;
        var monthH = cell2 * 8.2;
        var offX = x0 + (chartW - best.cols * best.blockW) / 2;
        var offY = chartTop + (chartH - best.rows * best.blockH) / 2;
        var nameSize = Math.max(2, Math.min(3.4, cell2 * 0.78));
        var dowSize = Math.max(1.4, Math.min(2.2, cell2 * 0.5));
        var dayFont = Math.max(1.3, Math.min(2.4, cell2 * 0.48));
        var dowLetters = weekStartsMonday
          ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
          : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        for (m = 0; m < 12; m++) {
          var bc = m % best.cols, br = Math.floor(m / best.cols);
          var bx = offX + bc * best.blockW + (best.blockW - monthW) / 2;
          var by = offY + br * best.blockH + (best.blockH - monthH) / 2;

          out.push(text(bx, by + nameSize, MONTHS_SHORT[m], nameSize, palette.ink, null, ' font-weight="bold"'));
          for (i = 0; i < 7; i++) {
            out.push(text(bx + (i + 0.5) * cell2, by + nameSize + 1 + dowSize,
              dowLetters[i], dowSize, palette.line, 'middle'));
          }
          var gridTop = by + nameSize + 1 + dowSize + 1;
          var start = firstWeekday(year, m, weekStartsMonday);
          for (d = 1; d <= daysInMonth(year, m); d++) {
            var slot = start + d - 1;
            var col2 = slot % 7, row2 = Math.floor(slot / 7);
            var px = bx + col2 * cell2, py = gridTop + row2 * cell2;
            cells.push(cellSubpath(px + cell2 * 0.07, py + cell2 * 0.07,
              cell2 * 0.86, cell2 * 0.86, shape));
            if (dayNumbers && cell2 >= 3) {
              out.push(text(px + cell2 * 0.5, py + cell2 * 0.5 + dayFont * 0.36,
                String(d), dayFont, palette.line, 'middle'));
            }
          }
        }

      } else {
        /* Circular. One wedge a day around a ring, the year closing on itself,
           with the month boundaries ticked and named outside it. */
        var side = Math.min(chartW, chartH);
        var cx = x0 + chartW / 2;
        var cy = chartTop + chartH / 2;
        /* Room outside the ring for the month names. */
        var labelRoom = Math.max(5, Math.min(9, side * 0.07));
        var r2 = side / 2 - labelRoom;
        if (r2 < 12) {
          throw new Error('There is not enough room for a ring on this sheet: it comes out ' +
            n2(r2 * 2) + ' mm across. Use a larger paper size, or fewer legend entries.');
        }
        /* Ring width. A day is a degree, so the wedge is always narrow; what
           decides whether it reads as a row of strips or as a starburst is how
           much it tapers, and the taper is the ratio of the two radii. At 0.58
           a wedge is only about half again as wide at the outer edge as at the
           inner, and the hole left in the middle is big enough to carry the
           year. */
        var r1 = r2 * 0.58;
        var total = isLeap(year) ? 366 : 365;
        var TAU = Math.PI * 2;
        var startAngle = -Math.PI / 2;

        /* A gap between wedges, as a fraction of one day's angle. Without it,
           366 wedges sharing edges print as one solid band of ink and there is
           nothing to colour between the lines. */
        var GAP = 0.18;
        var dayAngle = TAU / total;
        var day = 0;
        for (m = 0; m < 12; m++) {
          for (d = 1; d <= daysInMonth(year, m); d++) {
            var a1 = startAngle + (day + GAP / 2) * dayAngle;
            var a2 = startAngle + (day + 1 - GAP / 2) * dayAngle;
            cells.push(wedgeSubpath(cx, cy, r1, r2, a1, a2));
            day++;
          }
        }

        /* Month divisions: a tick that runs the full depth of the ring and a
           little beyond, so the twelve blocks are findable without counting. */
        var ticks = '';
        var running = 0;
        for (m = 0; m < 12; m++) {
          var ta = startAngle + (running / total) * TAU;
          ticks += 'M' + mm(cx + r1 * Math.cos(ta)) + ' ' + mm(cy + r1 * Math.sin(ta)) +
            'L' + mm(cx + (r2 + labelRoom * 0.25) * Math.cos(ta)) + ' ' +
            mm(cy + (r2 + labelRoom * 0.25) * Math.sin(ta));
          /* The name sits at the middle of its own arc, not at the boundary. */
          var midA = startAngle + ((running + daysInMonth(year, m) / 2) / total) * TAU;
          var lr = r2 + labelRoom * 0.62;
          var mSize = Math.max(2, Math.min(3.2, side * 0.028));
          out.push(text(cx + lr * Math.cos(midA), cy + lr * Math.sin(midA) + mSize * 0.36,
            MONTHS_SHORT[m], mSize, palette.ink, 'middle'));
          running += daysInMonth(year, m);
        }
        out.push('<path d="' + ticks + '" fill="none" stroke="' + palette.ink +
          '" stroke-width="0.3"/>');

        /* The year in the hole in the middle, which is where the circular
           versions people buy put it. */
        var midSize = Math.min(r1 * 0.62, 14);
        out.push(text(cx, cy + midSize * 0.34, String(year), midSize, palette.ink, 'middle', ' font-weight="bold"'));
        if (title) {
          out.push(text(cx, cy + midSize * 0.34 + midSize * 0.72, title,
            Math.max(2.2, midSize * 0.38), palette.ink, 'middle'));
        }
      }

      /* Cell outlines last of the chart, one path, so the sheet stays light. */
      var cellStroke = layoutKey === 'circular' ? 0.18 : 0.22;
      out.push('<path d="' + cells.join('') + '" fill="none" stroke="' + palette.line +
        '" stroke-width="' + cellStroke + '" shape-rendering="geometricPrecision"/>');

      /* ---- legend, in the room set aside for it ---- */
      out.push(legendSvg(x0, y0 + usableH - legend.height + 3, legend,
        categories, labels, shape, palette));

      return out.join('');
    }
  });
})();
