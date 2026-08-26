/* paperprintouts.com — bubble / scantron answer sheet.
 *
 * Every coordinate in this file is a millimetre on the printed page. The
 * framework wraps what render() returns in an <svg> whose viewBox is the paper
 * size in millimetres, so 5.2 here is 5.2 mm under a ruler.
 *
 * ES5 only, one IIFE, no dependencies — the site has no build step for JS.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- geometry
   * Bubble radius and the gap between bubbles are fixed: they are what makes a
   * sheet feel like an answer sheet, and a marker has to be able to fill one
   * without touching its neighbour.
   */
  var R = 2;                  /* bubble radius */
  var BGAP = 1.2;             /* clear gap between neighbouring bubbles */
  var PITCH = R * 2 + BGAP;   /* 5.2 mm centre to centre — across a row, and down the ID grid */
  /* Rows are packed at ROW_MIN when the page is full and eased apart towards
     ROW_MAX when it is not, so a fifty-question sheet uses the whole sheet
     instead of stopping half way down. Paging is always worked out at ROW_MIN,
     so easing can never push a row off the page. */
  var ROW_MIN = 6.6;          /* 4 mm of bubble, 2.6 mm of air — as tight as stays markable */
  var ROW_MAX = 9.5;
  var MIN_GUTTER = 5;         /* least white space allowed between two answer columns */
  var GUTTER = 6;             /* and what it prefers */
  var PAD_MAX = 22;           /* most padding a column panel puts either side of its bubbles */
  var FOOT = 7;               /* strip reserved at the foot of every page for the page number */
  var PANEL = 3;              /* a column panel's own border and padding, above and below its rows */

  /* ------------------------------------------------------------------- ink
   * The sheet prints on white paper with no stylesheet, so every colour is
   * spelled out. Nothing here is currentColor and nothing is a CSS variable.
   */
  var INK = '#222222';
  var SOFT = '#555555';
  var GREY = '#777777';
  var LINE = '#999999';
  var HAIR = '#cccccc';
  var PALE = '#aaaaaa';
  var WHITE = '#ffffff';
  /* Unquoted family names keep the attribute free of nested quotes; both faces
     are metrically close enough that the width estimates below hold. */
  var FONT = 'Helvetica, Arial, sans-serif';

  var PLAIN = 'ABCDEF';
  var ACT_ODD = 'ABCDEF';   /* the ACT letters odd-numbered questions carry */
  var ACT_EVEN = 'FGHJKL';  /* and the ones even-numbered questions carry */

  /* PP supplies both of these on the site. The fallbacks exist only so the file
     still runs under a bare harness that stubs PP.register and nothing else;
     in the browser the framework's own helpers are always the ones used. */
  function mm(x) {
    if (PP.round) return PP.round(x, 2);
    return Math.round(x * 100) / 100;
  }

  function esc(s) {
    if (PP.esc) return PP.esc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clampInt(value, lo, hi, fallback) {
    var k = parseInt(value, 10);
    if (isNaN(k)) k = fallback;
    return Math.max(lo, Math.min(hi, k));
  }

  function clampNum(value, lo, hi, fallback) {
    var k = parseFloat(value);
    if (isNaN(k)) k = fallback;
    return Math.max(lo, Math.min(hi, k));
  }

  /* Rough width of a run of text. Caps and digits in Helvetica/Arial sit near
     0.62 em, which over-estimates slightly — the slack lands in white space,
     never in an overlap. Used only to place rules after labels and to trim
     over-long user text; nothing structural depends on it being exact. */
  function wid(s, size, spacing) {
    var len = String(s).length;
    if (!len) return 0;
    return len * size * 0.62 + (len - 1) * (spacing || 0);
  }

  /* SVG text neither wraps nor clips, so a long title would run off the paper.
     Trim it to what the space can hold and mark the cut with an ellipsis. */
  function fit(s, maxW, size) {
    s = String(s == null ? '' : s);
    if (!s || wid(s, size) <= maxW) return s;
    var chars = Math.floor(maxW / (size * 0.62)) - 1;
    return chars > 0 ? s.slice(0, chars) + '…' : '';
  }

  /* ------------------------------------------------------- SVG primitives */

  /* The one place text turns into markup, so escaping happens here exactly
     once. Callers pass raw strings — never pre-escaped ones, or the escape
     doubles up and the reader sees &amp;amp;. */
  function txt(x, y, s, size, o) {
    o = o || {};
    var xx = x;
    /* letter-spacing adds a trailing gap after the final glyph, which drags
       centred text off centre by half a space. Take that half back. */
    if (o.anchor === 'middle' && o.spacing) xx -= o.spacing / 2;
    var out = '<text x="' + mm(xx) + '" y="' + mm(y) + '" font-family="' + FONT +
      '" font-size="' + mm(size) + '" fill="' + (o.fill || INK) + '"';
    if (o.anchor) out += ' text-anchor="' + o.anchor + '"';
    if (o.weight) out += ' font-weight="' + o.weight + '"';
    if (o.spacing) out += ' letter-spacing="' + mm(o.spacing) + '"';
    return out + '>' + esc(s) + '</text>';
  }

  /* Centred on cy. 0.355 em is about half the cap height of a sans face; doing
     the arithmetic beats dominant-baseline, which print engines disagree on. */
  function txtMid(x, cy, s, size, o) {
    return txt(x, cy + size * 0.355, s, size, o);
  }

  function line(x1, y1, x2, y2, colour, w) {
    return '<line x1="' + mm(x1) + '" y1="' + mm(y1) + '" x2="' + mm(x2) + '" y2="' + mm(y2) +
      '" stroke="' + colour + '" stroke-width="' + w + '"/>';
  }

  function rect(x, y, w, h, o) {
    o = o || {};
    var out = '<rect x="' + mm(x) + '" y="' + mm(y) + '" width="' + mm(w) + '" height="' + mm(h) + '"';
    if (o.r) out += ' rx="' + mm(o.r) + '"';
    out += ' fill="' + (o.fill || 'none') + '"';
    if (o.stroke) out += ' stroke="' + o.stroke + '" stroke-width="' + o.w + '"';
    return out + '/>';
  }

  function circle(cx, cy, r, fill, stroke, w) {
    var out = '<circle cx="' + mm(cx) + '" cy="' + mm(cy) + '" r="' + mm(r) + '" fill="' + fill + '"';
    if (stroke) out += ' stroke="' + stroke + '" stroke-width="' + w + '"';
    return out + '/>';
  }

  /* An answer bubble. Empty: hairline outline, letter in grey inside. Filled by
     the answer key: solid ink, letter reversed to white so it stays readable. */
  function bubble(cx, cy, label, filled) {
    return circle(cx, cy, R, filled ? INK : 'none', INK, 0.25) +
      txtMid(cx, cy, label, 2.6, { anchor: 'middle', fill: filled ? WHITE : GREY });
  }

  /* -------------------------------------------------------- option labels */

  /* The ACT alternates lettering by question so a reader cannot slip a row
     without noticing. Beyond four options the two runs simply continue. */
  function labelsFor(mode, q, count) {
    var set = PLAIN;
    if (mode === 'act') set = (q % 2 === 1) ? ACT_ODD : ACT_EVEN;
    else if (mode === 'truefalse') set = 'TF';
    else if (mode === 'numbers') set = '123456';
    return set.slice(0, count);
  }

  /* Which bubble does a character mean for a given question? Checked against
     that question's own labels first, then against plain A–F (someone marking
     an ACT-lettered sheet will still write A–D), then against digits. */
  function optionIndex(ch, q, mode, opts) {
    var set = labelsFor(mode, q, opts);
    var i = set.indexOf(ch);
    if (i >= 0) return i;
    i = PLAIN.indexOf(ch);
    if (i >= 0 && i < opts) return i;
    if (ch >= '1' && ch <= '9') {
      i = ch.charCodeAt(0) - 49;
      if (i < opts) return i;
    }
    return -1;
  }

  /* ----------------------------------------------------------- answer key */

  /* Read a key the way a human would write one. All of these work:
   *     ABCDA BCDAB      answers in order, unnumbered
   *     1A 2C 3D         numbered, glued together
   *     1. A, 2. B       numbered, separated
   *     A                one per line
   * Unreadable fragments are skipped rather than thrown: a key half-typed into
   * the box should still preview. The footer reports how many marks landed, so
   * a silent miss is still visible.
   */
  function parseKey(raw, mode, opts, questions) {
    var map = {};
    var text = String(raw == null ? '' : raw).toUpperCase();
    if (!/[0-9A-Z]/.test(text)) return map;

    var tokens = text.split(/[\s,;|]+/);
    var next = 1;      /* question the next unnumbered answer belongs to */
    var pending = 0;   /* a question number seen alone, waiting for its answer */
    var i, t, m, c, q;

    function put(qn, ch) {
      if (qn < 1 || qn > questions) return;
      var idx = optionIndex(ch, qn, mode, opts);
      if (idx >= 0) map[qn] = idx;
    }

    function run(chars) {
      for (c = 0; c < chars.length; c++) {
        q = pending || next;
        put(q, chars.charAt(c));
        next = q + 1;
        pending = 0;
      }
    }

    for (i = 0; i < tokens.length; i++) {
      t = tokens[i].replace(/^[^0-9A-Z]+/, '').replace(/[^0-9A-Z]+$/, '');
      if (!t) continue;

      /* "12A", "12.A", "12)A" — a question number and its answer in one token */
      m = t.match(/^(\d+)[^0-9A-Z]*([A-Z])$/);
      if (m) {
        put(parseInt(m[1], 10), m[2]);
        next = parseInt(m[1], 10) + 1;
        pending = 0;
        continue;
      }

      /* "12.3" — when the answers are digits the question number has to be
         separated from them, because "123" cannot be read either way. */
      m = t.match(/^(\d+)[^0-9A-Z]+(\d)$/);
      if (m) {
        put(parseInt(m[1], 10), m[2]);
        next = parseInt(m[1], 10) + 1;
        pending = 0;
        continue;
      }

      if (/^[A-Z]+$/.test(t)) { run(t); continue; }

      if (/^\d+$/.test(t)) {
        if (mode === 'numbers') {
          /* the answers themselves are digits, so a bare run is a run of answers */
          run(t);
        } else {
          pending = parseInt(t, 10);   /* "12" alone: its answer is the next token */
          next = pending;
        }
        continue;
      }
      /* mixed junk: ignored */
    }
    return map;
  }

  /* ---------------------------------------------------------------- render */

  function draw(v) {
    var page = v.page;
    var margin = clampNum(v.margin, 0, 60, 10);
    var x0 = margin, y0 = margin;
    var x1 = page.w - margin, y1 = page.h - margin;
    var W = x1 - x0, H = y1 - y0;
    var i, s;

    if (W < 45 || H < 60) {
      throw new Error('A ' + mm(margin) + ' mm margin leaves only ' + Math.round(W) + ' × ' +
        Math.round(H) + ' mm to draw in. Reduce the margin or choose a larger paper size.');
    }

    var questions = clampInt(v.questions, 1, 200, 50);
    var mode = String(v.labels || 'ABCDEF');
    if (mode !== 'act' && mode !== 'truefalse' && mode !== 'numbers') mode = 'ABCDEF';
    /* True/false is two options by definition; the option count is ignored. */
    var opts = mode === 'truefalse' ? 2 : clampInt(v.options, 2, 6, 4);
    var cols = clampInt(v.columns, 1, 5, 2);
    var idOn = !!v.idGrid;
    var idDigits = clampInt(v.idDigits, 3, 10, 6);
    var title = String(v.title == null ? '' : v.title).replace(/^\s+/, '').replace(/\s+$/, '');

    var key = parseKey(v.answerKey, mode, opts, questions);
    var keyed = 0, kq;
    for (kq in key) { if (Object.prototype.hasOwnProperty.call(key, kq)) keyed++; }

    /* ---- one answer column -------------------------------------------- */

    /* The number sits to the left of its row, right-aligned so the units digit
       lines up all the way down, with a 2.2 mm channel before the first bubble.
       Reserve for the widest number the sheet will actually print. */
    var numW = Math.max(5.5, wid(String(questions) + '.', 2.9) + 2.2);
    var colW = numW + 2 * R + (opts - 1) * PITCH;

    var slack = W - cols * colW;
    if (slack < (cols - 1) * MIN_GUTTER) {
      throw new Error(cols + ' column' + (cols === 1 ? '' : 's') + ' of ' + opts +
        ' options need about ' + Math.ceil(cols * colW + (cols - 1) * MIN_GUTTER) +
        ' mm across, and this page gives ' + Math.floor(W) +
        ' mm. Use fewer columns, fewer options, wider paper or a smaller margin.');
    }
    /* Each column is a boxed panel taking its share of the width, with the
       bubbles centred inside it. Past PAD_MAX the panel would be mostly empty
       paper, so it stops growing and the whole block centres instead — better
       than one stretched box with a cluster of bubbles adrift in the middle. */
    var gutter = cols > 1 ? Math.min(GUTTER, slack / (cols - 1)) : 0;
    var slotW = (W - (cols - 1) * gutter) / cols;
    var boxW = Math.min(slotW, colW + 2 * PAD_MAX);
    var boxPad = (boxW - colW) / 2;
    var blockW = cols * boxW + (cols - 1) * gutter;
    var blockX = x0 + (W - blockW) / 2;

    /* ---- header band --------------------------------------------------- */

    /* A key and a score box are mutually exclusive: you do not score the key,
       and the badge is the warning that stops one being handed out by mistake. */
    var showBadge = keyed > 0;
    var showScore = !!v.scoreBox && !showBadge;
    var BADGE_H = 9, SCORE_H = 17;
    /* The box may take at most a third of the band and must leave 40 mm for a
       name to be written in. On paper too narrow for both, it goes: the key is
       still called out along the foot, so nothing silently disappears. */
    var rightW = 0;
    if (showBadge || showScore) {
      rightW = Math.min(44, W / 3);
      if (rightW < 28 || W - rightW - 6 < 40) rightW = 0;
    }
    if (!rightW) { showBadge = false; showScore = false; }
    var rightH = showBadge ? BADGE_H : (showScore ? SCORE_H : 0);
    var titleH = title ? 9 : 0;
    var fieldsH = v.header ? 12 : 0;
    var headH = Math.max(titleH + fieldsH, rightH);
    if (headH > 0) headH += 5;            /* air, then the rule that closes the band */
    var leftW = W - (rightW ? rightW + 6 : 0);

    function headerSVG() {
      var out = '';
      var fx, fwid, lead, names, share, fgap, room, k;

      if (title) out += txt(x0, y0 + 6.2, fit(title, leftW, 5.6), 5.6, { weight: 700, fill: INK });

      if (v.header) {
        var fy = y0 + titleH + 8.4;       /* the writing rules sit on this baseline */
        names = ['NAME', 'DATE', 'CLASS'];
        share = [0.5, 0.25, 0.25];
        fgap = 5;
        room = leftW - fgap * 2;
        /* On narrow paper three fields would each be too short to write in. */
        if (room < 66) { names = ['NAME']; share = [1]; fgap = 0; room = leftW; }
        fx = x0;
        for (k = 0; k < names.length; k++) {
          fwid = room * share[k];
          lead = wid(names[k], 2.5, 0.4) + 2;
          out += txt(fx, fy - 1, names[k], 2.5, { weight: 700, fill: SOFT, spacing: 0.4 });
          out += line(fx + lead, fy, fx + fwid, fy, INK, 0.3);
          fx += fwid + fgap;
        }
      }

      if (showScore) {
        out += rect(x1 - rightW, y0, rightW, SCORE_H, { stroke: INK, w: 0.35, r: 1 });
        out += txt(x1 - rightW + 3, y0 + 4.8, 'SCORE', 2.5, { weight: 700, fill: SOFT, spacing: 0.5 });
        /* the denominator, printed light so the marked score reads first */
        out += txt(x1 - 3, y0 + SCORE_H - 3, '/ ' + questions, 5.5, { anchor: 'end', fill: PALE });
      }
      if (showBadge) {
        out += rect(x1 - rightW, y0, rightW, BADGE_H, { fill: INK, r: 1 });
        out += txtMid(x1 - rightW / 2, y0 + BADGE_H / 2, 'ANSWER KEY', 3.2,
          { anchor: 'middle', fill: WHITE, weight: 700, spacing: 0.6 });
      }
      if (headH > 0) out += line(x0, y0 + headH - 2.5, x1, y0 + headH - 2.5, INK, 0.4);
      return out;
    }

    /* ---- student ID band (first page only) ----------------------------- */

    var ID_PAD = 3;
    var ID_CAP = 4.4;    /* caption line above the boxes */
    var ID_BOX = 6.5;    /* the boxes the digits get written into */
    var ID_AIR = 2;      /* between those boxes and the first bubble row */
    var idInnerW = idDigits * PITCH;
    var idBlockW = idInnerW + ID_PAD * 2;
    var idBlockH = ID_PAD * 2 + ID_BOX + ID_AIR + 10 * PITCH;
    var idBand = idOn ? ID_CAP + idBlockH + 6 : 0;

    if (idOn && idBlockW > W) {
      throw new Error('A student ID grid of ' + idDigits + ' digits needs ' + Math.ceil(idBlockW) +
        ' mm across, and this page gives ' + Math.floor(W) +
        ' mm. Use fewer ID digits, wider paper or a smaller margin.');
    }

    function idSVG(top) {
      var out = '';
      var boxY = top + ID_CAP;
      var gx = x0 + ID_PAD;                       /* left edge of the bubble columns */
      var bubTop = boxY + ID_PAD + ID_BOX + ID_AIR;
      var d, r, cx;

      out += txt(x0, top + 3.2, 'STUDENT ID NUMBER', 2.5, { weight: 700, fill: SOFT, spacing: 0.5 });
      out += rect(x0, boxY, idBlockW, idBlockH, { stroke: LINE, w: 0.25, r: 1.5 });

      /* write-in boxes, one per digit column, each centred over its bubbles */
      out += rect(gx, boxY + ID_PAD, idInnerW, ID_BOX, { stroke: INK, w: 0.3 });
      for (d = 1; d < idDigits; d++) {
        out += line(gx + d * PITCH, boxY + ID_PAD, gx + d * PITCH, boxY + ID_PAD + ID_BOX, LINE, 0.25);
      }

      /* digits 0–9 down, one column per ID digit across */
      for (d = 0; d < idDigits; d++) {
        cx = gx + PITCH / 2 + d * PITCH;
        for (r = 0; r <= 9; r++) {
          out += bubble(cx, bubTop + PITCH / 2 + r * PITCH, String(r), false);
        }
      }
      return out;
    }

    /* Marking instructions share the ID band, which is otherwise empty paper.
       Drawn only when there is width for the longest line to sit unclipped. */
    function marksSVG(top) {
      var ix = x0 + idBlockW + 8;
      var iw = x1 - ix;
      if (iw < 80) return '';
      var boxY = top + ID_CAP;
      var pad = 4;
      var out = '';
      var lines = [
        'Use a soft pencil (No. 2 or HB).',
        'Fill one bubble per question, completely.',
        'Erase changes cleanly — stray marks count.'
      ];
      var k, ly, dy, dx, step, exTop;

      out += txt(ix, top + 3.2, 'HOW TO MARK', 2.5, { weight: 700, fill: SOFT, spacing: 0.5 });
      /* the same height as the ID block beside it, so the band reads as one row
         of two panels rather than a tall box next to a stub */
      out += rect(ix, boxY, iw, idBlockH, { stroke: LINE, w: 0.25, r: 1.5 });
      for (k = 0; k < lines.length; k++) {
        ly = boxY + pad + 3 + k * 4.4;
        out += txt(ix + pad, ly, fit(lines[k], iw - pad * 2, 2.8), 2.8, { fill: INK });
      }

      /* Worked examples, spread down whatever height is left: the mark that
         counts, and the two that markers most often make instead. */
      exTop = boxY + pad + 3 + lines.length * 4.4 + 2;
      step = (idBlockH - (exTop - boxY) - pad) / 3;
      dx = ix + pad + R;

      dy = exTop + step * 0.5;
      out += bubble(dx, dy, 'B', true);
      out += txtMid(dx + R + 2.5, dy, 'like this', 2.6, { fill: SOFT });

      dy = exTop + step * 1.5;
      out += bubble(dx, dy, 'B', false);
      /* a tick laid across the bubble: the commonest wrong mark */
      out += '<path d="M ' + mm(dx - 1.6) + ' ' + mm(dy) + ' L ' + mm(dx - 0.4) + ' ' + mm(dy + 1.5) +
        ' L ' + mm(dx + 2.1) + ' ' + mm(dy - 2.2) + '" fill="none" stroke="' + INK +
        '" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round"/>';
      out += txtMid(dx + R + 2.5, dy, 'not a tick', 2.6, { fill: SOFT });

      /* a half-hearted fill, drawn bare so the grey dot is not sitting on a letter */
      dy = exTop + step * 2.5;
      out += circle(dx, dy, R, 'none', INK, 0.25) + circle(dx, dy, 1.1, GREY);
      out += txtMid(dx + R + 2.5, dy, 'not a light mark', 2.6, { fill: SOFT });
      return out;
    }

    /* ---- pagination ---------------------------------------------------- */

    /* The first page carries the ID band, so it holds fewer rows than the rest.
       Both capacities are worked out before anything is drawn. */
    var top1 = y0 + headH + idBand;
    var topN = y0 + headH;
    var bottom = y1 - FOOT;
    /* PANEL comes off the height here as well as in the pitch below, so the two
       always agree and a fully packed column cannot grow into the footer. */
    var rows1 = Math.floor((bottom - top1 - PANEL) / ROW_MIN);
    var rowsN = Math.floor((bottom - topN - PANEL) / ROW_MIN);

    if (rows1 < 1) {
      throw new Error(idOn
        ? 'The header and the student ID grid use the whole page, leaving no room for answer rows. Turn off the ID grid, shrink the margin, or use a longer page.'
        : 'The header uses the whole page, leaving no room for answer rows. Shrink the margin or use a longer page.');
    }

    var cap1 = rows1 * cols, capN = rowsN * cols;
    var pages = questions <= cap1 ? 1 : 1 + Math.ceil((questions - cap1) / capN);

    /* Share the questions out in proportion to what each page can hold, not
       equally: the first page holds less once the ID band is on it, and an
       equal split would pack it tight while the next page ran a third empty.
       Each page also takes at least what the pages after it cannot fit, so the
       last one is never handed more than its capacity. */
    var counts = [];
    var rest = questions;
    var p, cap, capLeft, take, mustTake;
    for (p = 0; p < pages; p++) {
      cap = p === 0 ? cap1 : capN;
      capLeft = cap + (pages - 1 - p) * capN;
      take = Math.min(cap, Math.round(rest * cap / capLeft), rest);
      mustTake = rest - (pages - 1 - p) * capN;
      if (take < mustTake) take = Math.min(cap, mustTake);
      counts.push(take);
      rest -= take;
    }

    /* One row pitch for the whole document — flipping between pages that space
       their rows differently looks like a mistake. Take the tightest page's
       share of its own height, and never stretch past ROW_MAX. */
    var pitch = ROW_MAX;
    var rowsOn = [];
    for (p = 0; p < pages; p++) {
      rowsOn[p] = Math.ceil(counts[p] / cols);
      if (rowsOn[p] > 0) {
        pitch = Math.min(pitch, (bottom - (p === 0 ? top1 : topN) - PANEL) / rowsOn[p]);
      }
    }
    pitch = Math.max(pitch, ROW_MIN);   /* capacity was measured at ROW_MIN, so this is a floor, not a squeeze */

    /* ---- a page -------------------------------------------------------- */

    function pageSVG(index, firstQ, count) {
      var out = '';
      /* an explicit white ground, so the downloaded SVG is not read on a dark one */
      out += rect(0, 0, page.w, page.h, { fill: WHITE });
      out += headerSVG();

      var top = y0 + headH;
      if (index === 0 && idOn) {
        out += idSVG(top);
        out += marksSVG(top);
        top += idBand;
      }
      /* A single short sheet centres its rows in what is left; a continued one
         stays top-aligned so every page in the run reads the same way. */
      if (pages === 1) top += Math.max(0, (bottom - top - rowsOn[0] * pitch) / 2);

      /* Questions run down a column, then to the top of the next one. Spread
         the remainder so no column is left conspicuously short. */
      var base = Math.floor(count / cols);
      var extra = count % cols;
      var q = firstQ;
      var c, r, colCount, cx0, cy, labels, k;

      for (c = 0; c < cols; c++) {
        colCount = base + (c < extra ? 1 : 0);
        if (!colCount) continue;
        cx0 = blockX + c * (boxW + gutter) + boxPad;

        /* every panel is drawn to the tallest column's height, so a short last
           column does not leave a stubby box beside a full one */
        out += rect(cx0 - boxPad, top - 2, boxW, rowsOn[index] * pitch + 4, { stroke: HAIR, w: 0.25, r: 1.5 });

        for (r = 0; r < colCount; r++, q++) {
          cy = top + pitch / 2 + r * pitch;
          out += txtMid(cx0 + numW - 2.2, cy, String(q) + '.', 2.9, { anchor: 'end', fill: SOFT });
          labels = labelsFor(mode, q, opts);
          for (k = 0; k < opts; k++) {
            out += bubble(cx0 + numW + R + k * PITCH, cy, labels.charAt(k), key[q] === k);
          }
          /* a hairline every five questions: the eye keeps its place, and a
             misaligned overlay shows up immediately */
          if (q % 5 === 0 && r < colCount - 1) {
            out += line(cx0 - boxPad + 1.5, top + (r + 1) * pitch,
              cx0 - boxPad + boxW - 1.5, top + (r + 1) * pitch, HAIR, 0.2);
          }
        }
      }

      /* ---- foot ---- */
      var foot = '';
      if (keyed > 0) {
        /* the long form reports the parse, which is how a mistyped key gets
           noticed; narrow paper gets the short form so the two feet cannot meet */
        foot += txt(x0, y1 - 1.4,
          W < 110 ? 'ANSWER KEY' : 'ANSWER KEY · ' + keyed + ' of ' + questions + ' marked',
          2.8, { weight: 700, fill: INK, spacing: 0.3 });
      }
      if (pages > 1) {
        /* centred on its own, pushed to the right margin when the key shares the foot */
        foot += keyed > 0
          ? txt(x1, y1 - 1.4, 'Page ' + (index + 1) + ' of ' + pages, 2.8, { anchor: 'end', fill: GREY })
          : txt(x0 + W / 2, y1 - 1.4, 'Page ' + (index + 1) + ' of ' + pages, 2.8, { anchor: 'middle', fill: GREY });
      }
      if (foot) out += line(x0, y1 - 5, x1, y1 - 5, HAIR, 0.25) + foot;
      return out;
    }

    var out = [];
    var start = 1;
    for (p = 0; p < pages; p++) {
      out.push(pageSVG(p, start, counts[p]));
      start += counts[p];
    }
    return out.length === 1 ? out[0] : out;
  }

  /* ---------------------------------------------------------------- wiring */

  PP.register('bubble-answer-sheet', {
    filename: function (v) { return [v.questions + '-questions']; },
    defaultPaper: 'letter',
    defaultOrientation: 'portrait',
    defaultMargin: 10,
    controls: [
      {
        id: 'title', label: 'Title', type: 'text', default: '',
        placeholder: 'Biology — Unit 3 quiz'
      },
      {
        id: 'questions', label: 'Questions', type: 'number', default: 50,
        min: 1, max: 200, step: 1,
        hint: 'More than fits on one page prints as several, numbered straight through.'
      },
      {
        id: 'options', label: 'Options per question', type: 'number', default: 4,
        min: 2, max: 6, step: 1,
        hint: 'Ignored for true/false, which is always two.'
      },
      {
        id: 'labels', label: 'Option labels', type: 'select', default: 'ABCDEF',
        options: [
          { value: 'ABCDEF', label: 'A B C D E F' },
          { value: 'act', label: 'ACT style — A B C D, then F G H J' },
          { value: 'truefalse', label: 'True / False' },
          { value: 'numbers', label: '1 2 3 4 5 6' }
        ]
      },
      { id: 'columns', label: 'Columns', type: 'number', default: 2, min: 1, max: 5, step: 1 },
      { id: 'header', label: 'Name, date and class fields', type: 'checkbox', default: true },
      { id: 'scoreBox', label: 'Score box', type: 'checkbox', default: true },
      {
        id: 'idGrid', label: 'Student ID bubble grid', type: 'checkbox', default: false,
        hint: 'Printed on the first page only, with the marking instructions beside it.'
      },
      { id: 'idDigits', label: 'Digits in the ID grid', type: 'number', default: 6, min: 3, max: 10, step: 1 },
      {
        id: 'answerKey', label: 'Answer key', type: 'textarea', default: '',
        placeholder: 'ABCDA BCDAB\nor 1A 2C 3D',
        hint: 'Fills the matching bubbles so the sheet prints as a marking overlay. Letters with or without question numbers, separated by spaces, commas or newlines. The foot of the sheet reports how many were read.'
      }
    ],
    render: draw
  });
})();
