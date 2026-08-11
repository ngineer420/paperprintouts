/* paperprintouts.com — attendance sheet / gradebook grid.
 *
 * Paste a roster, get a ruled register with the names already printed down the
 * left-hand column. Three column layouts:
 *
 *   month     — one column per real calendar day of the chosen month, weekends
 *               optional, weekday initial above the day number.
 *   sessions  — a fixed number of plain numbered columns.
 *   gradebook — numbered assignment columns with a wider name column.
 *
 * Everything is drawn in millimetres; the framework supplies the <svg> wrapper
 * so the sheet prints at true physical size. Rows that do not fit continue on
 * further pages with the header repeated; columns that do not fit are split by
 * column range and each page is labelled in the footer.
 */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  /* Indexed by Date#getUTCDay(): 0 = Sunday. */
  var DOW_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  var FONT = 'Helvetica, Arial, sans-serif';
  var GRID = '#999999';       /* inner grid lines */
  var GRID_W = 0.2;
  var RULE = '#666666';       /* frame and the two structural separators */
  var RULE_W = 0.3;
  var INK = '#111111';
  var DIM = '#555555';
  var HEAD_FILL = '#eeeeee';
  var ROW_FILL = '#f5f5f5';   /* alternate-row shading */

  var TEXT_MM = 3;            /* body text height */
  var MIN_TEXT_MM = 2.2;      /* floor when squeezing a long name */
  var PAD = 2;                /* left padding inside the name column */
  var MAX_PAGES = 100;

  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }
  function num(x, d) { var n = parseFloat(x); return isNaN(n) ? d : n; }
  function trim(s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, ''); }

  /* The site always supplies PP.round / PP.esc / PP.names. The fallbacks below
     exist only so this module can be exercised by a bare test harness that
     stubs PP.register and nothing else; they behave identically. */
  function r(n) {
    if (PP.round) return PP.round(n, 2);
    return Math.round(n * 100) / 100;
  }
  function esc(s) {
    if (PP.esc) return PP.esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function roster(t) {
    if (PP.names) return PP.names(t);
    return String(t || '').split(/[\n,]/)
      .map(function (s) { return trim(s); })
      .filter(function (s) { return s.length > 0; });
  }

  /* Explicit UTC arguments, so output never depends on today's date or the
     browser's time zone. Date.UTC(y, m + 1, 0) is the last day of month m. */
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  function dayOfWeek(y, m, d) { return new Date(Date.UTC(y, m, d)).getUTCDay(); }

  /* Rough advance-width estimate, in mm, for Helvetica-ish text. There is no
     way to measure a string inside a static SVG, and we only need it to decide
     when a name has to be shrunk and whether the key fits beside the subtitle. */
  function textW(s, size) {
    var w = 0, i, ch;
    s = String(s);
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i);
      if (' iljtfrI.,:;\'!|[]()'.indexOf(ch) >= 0) w += 0.30;
      else if ('MWmw@'.indexOf(ch) >= 0) w += 0.87;
      else if (ch >= 'A' && ch <= 'Z') w += 0.68;
      else w += 0.53;
    }
    return w * size;
  }

  function fillRect(x, y, w, h, fill, opacity) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) +
      '" fill="' + fill + '"' +
      (opacity === undefined ? '' : ' fill-opacity="' + opacity + '"') + '/>';
  }

  function strokeRect(x, y, w, h, stroke, width) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) +
      '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '"/>';
  }

  function line(x1, y1, x2, y2, stroke, width) {
    return '<line x1="' + r(x1) + '" y1="' + r(y1) + '" x2="' + r(x2) + '" y2="' + r(y2) +
      '" stroke="' + stroke + '" stroke-width="' + width + '"/>';
  }

  /* Single choke point for text: everything that reaches the sheet is escaped here. */
  function text(x, y, s, size, anchor, fill, weight, extra) {
    return '<text x="' + r(x) + '" y="' + r(y) + '" font-family="' + FONT +
      '" font-size="' + r(size) + '" fill="' + fill + '"' +
      (anchor && anchor !== 'start' ? ' text-anchor="' + anchor + '"' : '') +
      (weight ? ' font-weight="' + weight + '"' : '') +
      (extra || '') + '>' + esc(s) + '</text>';
  }

  /* Baseline offset that visually centres text of this size in a band of height h.
     Cap height for these faces is about 0.7em, so half of it below the midline. */
  function centreBaseline(top, h, size) { return top + h / 2 + size * 0.35; }

  function build(v) {
    var page = v.page;
    var margin = clamp(num(v.margin, 10), 0, 60);
    var x0 = margin, x1 = page.w - margin;
    var y0 = margin, y1 = page.h - margin;
    var availW = x1 - x0, availH = y1 - y0;

    if (availW < 60 || availH < 60) {
      throw new Error('The margin leaves less than 60 mm of usable paper. Reduce the margin or choose a larger sheet.');
    }

    var layout = (v.layout === 'sessions' || v.layout === 'gradebook') ? v.layout : 'month';
    var rowH = clamp(num(v.rowHeight, 8), 5, 15);
    var monthIdx = clamp(Math.round(num(v.month, 8)), 0, 11);
    var year = clamp(Math.round(num(v.year, 2026)), 2000, 2100);
    var sessions = clamp(Math.round(num(v.sessions, 20)), 1, 40);
    var blanks = clamp(Math.round(num(v.blankRows, 4)), 0, 30);
    var shade = !!v.shade;

    /* ---- columns ------------------------------------------------------- */

    var cols = [];   /* {top, bottom, weekend} */
    var d, dow, weekend, i;
    if (layout === 'month') {
      var last = daysInMonth(year, monthIdx);
      for (d = 1; d <= last; d++) {
        dow = dayOfWeek(year, monthIdx, d);
        weekend = (dow === 0 || dow === 6);
        if (weekend && !v.weekends) continue;
        cols.push({ top: DOW_INITIAL[dow], bottom: String(d), weekend: weekend });
      }
    } else {
      for (i = 1; i <= sessions; i++) {
        cols.push({ top: '', bottom: String(i), weekend: false });
      }
    }
    if (!cols.length) {
      throw new Error('That month has no columns to draw. Turn on weekends, or pick another month.');
    }

    /* Narrowest a column may get before it stops being writable. Month columns
       hold one mark, gradebook columns often hold a two- or three-digit score. */
    var minColW = layout === 'month' ? 6 : (layout === 'gradebook' ? 9 : 7);

    var nameW = clamp(num(v.nameWidth, 45), 25, 90);
    /* The gradebook layout deliberately runs a wider first column: it usually
       carries "Surname, Forename" rather than a first name. */
    if (layout === 'gradebook') nameW = nameW * 1.35;
    /* The name column may never eat the sheet — always leave two usable columns. */
    nameW = Math.min(nameW, availW - minColW * 2);
    if (nameW < 18) {
      throw new Error('The sheet is too narrow for a name column plus two data columns. Reduce the margin, the name width, or use wider paper.');
    }

    var headerRowH = layout === 'month' ? 9 : 7;   /* month needs two lines of label */

    /* ---- heading block -------------------------------------------------- */

    var title = trim(v.title);
    var context = layout === 'month' ? (MONTHS[monthIdx] + ' ' + year) : '';
    var heading = title || context;
    var sub = (title && context) ? context : '';
    var legendText = v.legend ? 'Key: P = present, A = absent, L = late, E = excused' : '';

    var legendSize = 3.2;
    if (legendText) {
      /* On small paper, shrink the key rather than let it run past the margin. */
      var lw = textW(legendText, legendSize);
      if (lw > availW) legendSize = Math.max(2.2, legendSize * availW / lw);
    }

    var lines = [];   /* {items:[{t,size,anchor,fill,weight}], base} */
    if (heading) {
      lines.push({ items: [{ t: heading, size: 5, anchor: 'start', fill: INK, weight: 700 }] });
    }
    if (sub && legendText) {
      if (textW(sub, 3.2) + textW(legendText, legendSize) + 6 > availW) {
        lines.push({ items: [{ t: sub, size: 3.2, anchor: 'start', fill: DIM }] });
        lines.push({ items: [{ t: legendText, size: legendSize, anchor: 'start', fill: DIM }] });
      } else {
        lines.push({ items: [
          { t: sub, size: 3.2, anchor: 'start', fill: DIM },
          { t: legendText, size: legendSize, anchor: 'end', fill: DIM }
        ] });
      }
    } else if (sub) {
      lines.push({ items: [{ t: sub, size: 3.2, anchor: 'start', fill: DIM }] });
    } else if (legendText) {
      lines.push({ items: [{ t: legendText, size: legendSize, anchor: heading ? 'end' : 'start', fill: DIM }] });
    }

    var cursor = 0;
    lines.forEach(function (ln) {
      var s = 0;
      ln.items.forEach(function (it) { if (it.size > s) s = it.size; });
      ln.base = cursor + s * 1.05;     /* baseline, relative to y0 */
      cursor += s * 1.45;
    });
    var headBlockH = lines.length ? cursor + 2.2 : 0;

    /* ---- pagination ----------------------------------------------------- */

    function rowCapacity(footerH) {
      var top = y0 + headBlockH + headerRowH;
      return Math.floor((y1 - footerH - top) / rowH);
    }

    var names = roster(v.roster);
    var footerH = 0;
    var perPage = rowCapacity(footerH);
    if (perPage < 1) {
      throw new Error('There is no room for a single row. Reduce the row height or the margin, or use a taller sheet.');
    }
    /* With no roster the sheet is a blank register, so fill the page with rows. */
    var totalRows = names.length ? names.length + blanks : perPage;

    var colsPerPage = Math.max(1, Math.floor((availW - nameW) / minColW));
    var colPages = Math.ceil(cols.length / colsPerPage);
    var rowPages = Math.ceil(totalRows / perPage);

    if (colPages * rowPages > 1) {
      /* Multi-page runs need a footer label, which costs a strip of height, so
         the row capacity is recomputed once with that strip reserved. */
      footerH = 5;
      perPage = rowCapacity(footerH);
      if (perPage < 1) {
        throw new Error('There is no room for a single row. Reduce the row height or the margin, or use a taller sheet.');
      }
      if (!names.length) totalRows = perPage;
      rowPages = Math.ceil(totalRows / perPage);
    }

    if (colPages * rowPages > MAX_PAGES) {
      throw new Error('That would print ' + (colPages * rowPages) + ' pages. Shorten the roster, reduce the columns, or use larger paper.');
    }

    /* Split the columns as evenly as possible so a 31-day month across two
       pages comes out 16 + 15 rather than 20 + 11. Each page's table still
       fills the full width, so cell widths differ slightly between pages. */
    var groups = [];
    var base = Math.floor(cols.length / colPages);
    var extra = cols.length % colPages;
    var at = 0;
    for (i = 0; i < colPages; i++) {
      var n = base + (i < extra ? 1 : 0);
      groups.push({ start: at, count: n });
      at += n;
    }

    /* ---- drawing --------------------------------------------------------- */

    var maxNameW = nameW - PAD - 1;
    var footerLeft = title || context || '';

    function drawPage(group, rowStart, rowCount, pageNo, pageTotal) {
      var out = [];
      var colW = (availW - nameW) / group.count;
      var tableTop = y0 + headBlockH;
      var bodyTop = tableTop + headerRowH;
      var bodyBottom = bodyTop + rowCount * rowH;
      var gridX = x0 + nameW;   /* left edge of the first data column */
      /* Locals only — the page loop below owns its own counters. */
      var i, k, cx, col, y, name, size, w, extraAttr;

      /* heading block */
      lines.forEach(function (ln) {
        ln.items.forEach(function (it) {
          out.push(text(it.anchor === 'end' ? x1 : x0, y0 + ln.base, it.t,
            it.size, it.anchor, it.fill, it.weight));
        });
      });

      /* alternate-row shading, keyed on the roster index so the banding
         continues correctly across a page break */
      if (shade) {
        for (i = 0; i < rowCount; i++) {
          if ((rowStart + i) % 2 === 1) {
            out.push(fillRect(x0, bodyTop + i * rowH, availW, rowH, ROW_FILL));
          }
        }
      }

      /* header row fill */
      out.push(fillRect(x0, tableTop, availW, headerRowH, HEAD_FILL));

      /* weekend columns get a translucent band so it darkens whatever is under
         it — white, shaded row, or header fill — by the same amount */
      for (k = 0; k < group.count; k++) {
        if (cols[group.start + k].weekend) {
          out.push(fillRect(gridX + k * colW, tableTop, colW, bodyBottom - tableTop, '#000000', 0.05));
        }
      }

      /* grid */
      for (i = 1; i < rowCount; i++) {
        out.push(line(x0, bodyTop + i * rowH, x1, bodyTop + i * rowH, GRID, GRID_W));
      }
      for (k = 1; k < group.count; k++) {
        out.push(line(gridX + k * colW, tableTop, gridX + k * colW, bodyBottom, GRID, GRID_W));
      }
      /* the two structural separators: end of the name column, end of the header */
      out.push(line(gridX, tableTop, gridX, bodyBottom, RULE, RULE_W));
      out.push(line(x0, bodyTop, x1, bodyTop, RULE, RULE_W));
      out.push(strokeRect(x0, tableTop, availW, bodyBottom - tableTop, RULE, RULE_W));

      /* header labels */
      out.push(text(x0 + PAD, centreBaseline(tableTop, headerRowH, TEXT_MM), 'Name',
        TEXT_MM, 'start', INK, 700));
      for (k = 0; k < group.count; k++) {
        col = cols[group.start + k];
        cx = gridX + k * colW + colW / 2;
        if (col.top) {
          /* weekday initial sits on the upper line, day number below it */
          out.push(text(cx, tableTop + 3.3, col.top, 2.5, 'middle', DIM));
          out.push(text(cx, tableTop + 7.6, col.bottom, 3.2, 'middle', INK));
        } else {
          out.push(text(cx, centreBaseline(tableTop, headerRowH, 3.2), col.bottom, 3.2, 'middle', INK));
        }
      }

      /* names */
      for (i = 0; i < rowCount; i++) {
        name = names[rowStart + i];
        if (!name) continue;
        y = bodyTop + i * rowH;
        size = TEXT_MM;
        extraAttr = '';
        w = textW(name, size);
        if (w > maxNameW) {
          /* shrink first, and only condense the glyphs if it is still too long */
          size = Math.max(MIN_TEXT_MM, size * maxNameW / w);
          if (textW(name, size) > maxNameW) {
            extraAttr = ' textLength="' + r(maxNameW) + '" lengthAdjust="spacingAndGlyphs"';
          }
        }
        out.push(text(x0 + PAD, centreBaseline(y, rowH, size), name, size, 'start', INK, null, extraAttr));
      }

      /* footer: what this page is, so loose sheets can be reassembled */
      if (footerH) {
        var parts = [];
        if (colPages > 1) {
          parts.push(layout === 'month'
            ? 'days ' + cols[group.start].bottom + '-' + cols[group.start + group.count - 1].bottom
            : 'columns ' + (group.start + 1) + '-' + (group.start + group.count));
        }
        if (rowPages > 1) parts.push('rows ' + (rowStart + 1) + '-' + (rowStart + rowCount));
        parts.push('page ' + pageNo + ' of ' + pageTotal);
        if (footerLeft) out.push(text(x0, y1 - 1.4, footerLeft, 2.8, 'start', DIM));
        out.push(text(x1, y1 - 1.4, parts.join(' | '), 2.8, 'end', DIM));
      }

      return out.join('');
    }

    /* Row blocks outer, column groups inner: consecutive pages tape together
       left to right, then the roster continues below. */
    var pages = [];
    var total = colPages * rowPages;
    var rowStart, rowCount, g;
    for (rowStart = 0; rowStart < totalRows; rowStart += perPage) {
      rowCount = Math.min(perPage, totalRows - rowStart);
      for (g = 0; g < groups.length; g++) {
        pages.push(drawPage(groups[g], rowStart, rowCount, pages.length + 1, total));
      }
    }
    return pages;
  }

  PP.register('attendance-sheet', {
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,
    controls: [
      {
        id: 'roster', label: 'Roster', type: 'textarea', default: '',
        placeholder: 'Ada Lovelace\nAlan Turing\nGrace Hopper',
        hint: 'One name per line, or separated by commas. Leave it empty for a blank register.'
      },
      {
        id: 'layout', label: 'Columns', type: 'select', default: 'month',
        options: [
          { value: 'month', label: 'Month: a column per weekday' },
          { value: 'sessions', label: 'Sessions: numbered columns' },
          { value: 'gradebook', label: 'Gradebook: numbered, wider name column' }
        ]
      },
      {
        id: 'month', label: 'Month', type: 'select', default: '8',
        hint: 'Month layout only.',
        options: MONTHS.map(function (m, idx) { return { value: String(idx), label: m }; })
      },
      {
        id: 'year', label: 'Year', type: 'number', default: 2026,
        min: 2000, max: 2100, step: 1
      },
      {
        id: 'sessions', label: 'Number of columns', type: 'number', default: 20,
        min: 1, max: 40, step: 1,
        hint: 'Sessions and gradebook layouts only.'
      },
      {
        id: 'weekends', label: 'Include Saturday and Sunday', type: 'checkbox', default: false
      },
      {
        id: 'rowHeight', label: 'Row height (mm)', type: 'number', default: 8,
        min: 5, max: 15, step: 0.5
      },
      {
        id: 'nameWidth', label: 'Name column width (mm)', type: 'number', default: 45,
        min: 25, max: 90, step: 1
      },
      {
        id: 'blankRows', label: 'Blank rows after the roster', type: 'number', default: 4,
        min: 0, max: 30, step: 1,
        hint: 'For late arrivals. An empty roster fills the page with blank rows instead.'
      },
      {
        id: 'title', label: 'Title', type: 'text', default: '',
        placeholder: 'Year 9 Chemistry'
      },
      {
        id: 'legend', label: 'Print the P / A / L / E key', type: 'checkbox', default: true
      },
      {
        id: 'shade', label: 'Shade alternate rows', type: 'checkbox', default: true
      }
    ],
    render: build
  });
})();
