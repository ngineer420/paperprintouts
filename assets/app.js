/* paperprintouts.com — shared tool framework.
 *
 * Every generator registers itself with PP.register(slug, definition) and gets,
 * for free: the control panel, paper size / orientation / margin handling,
 * URL state, localStorage persistence, print, and SVG download.
 *
 * A generator's render() returns SVG *children* as a string, with all
 * coordinates in millimetres. The framework wraps that in
 *   <svg width="210mm" height="297mm" viewBox="0 0 210 297">
 * which is what makes the printed sheet come out at true physical scale.
 *
 * Returning an array of strings produces one printed page per entry — that is
 * how roster autofill prints thirty named sheets in a single job.
 */
(function (global) {
  "use strict";

  var PP = {};

  /* Page sizes in millimetres, portrait. */
  PP.PAGES = {
    letter: { label: 'Letter (8.5 × 11 in)', w: 215.9, h: 279.4 },
    legal: { label: 'Legal (8.5 × 14 in)', w: 215.9, h: 355.6 },
    tabloid: { label: 'Tabloid (11 × 17 in)', w: 279.4, h: 431.8 },
    a3: { label: 'A3 (297 × 420 mm)', w: 297, h: 420 },
    a4: { label: 'A4 (210 × 297 mm)', w: 210, h: 297 },
    a5: { label: 'A5 (148 × 210 mm)', w: 148, h: 210 },
    a6: { label: 'A6 (105 × 148 mm)', w: 105, h: 148 }
  };

  PP.MM_PER_INCH = 25.4;
  PP.inch = function (n) { return n * PP.MM_PER_INCH; };
  PP.round = function (n, dp) {
    var f = Math.pow(10, dp === undefined ? 3 : dp);
    return Math.round(n * f) / f;
  };
  PP.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  /* Split a pasted roster into trimmed, non-empty names. Newlines or commas. */
  PP.names = function (text) {
    return String(text || '')
      .split(/[\n,]/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* Controls every tool inherits. */
  function pageControls(def) {
    var base = [
      {
        id: 'paper', label: 'Paper size', type: 'select', default: def.defaultPaper || 'letter',
        options: Object.keys(PP.PAGES).map(function (k) {
          return { value: k, label: PP.PAGES[k].label };
        })
      },
      {
        id: 'orientation', label: 'Orientation', type: 'select', default: def.defaultOrientation || 'portrait',
        options: [
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' }
        ]
      },
      {
        id: 'margin', label: 'Margin (mm)', type: 'number',
        default: def.defaultMargin === undefined ? 10 : def.defaultMargin,
        min: 0, max: 40, step: 1,
        hint: 'Most printers cannot print closer than about 5 mm to the edge.'
      }
    ];
    return def.hidePageControls ? [] : base;
  }

  /* A landing page can declare what it is a page *about*:

       <script>window.PP_PRESET = {"count": 28, "fabric": "evenweave"};</script>

     Those values replace the tool's own defaults, so Reset returns to what the
     page is for and the address stays clean while the page shows it. They also
     outrank the last-used settings in local storage, because somebody who opened
     the 28 count page asked for 28 count by opening it, and a page that quietly
     showed 14 because that is what they used yesterday would be lying about its
     own heading. Settings the preset does not mention — paper size, colour —
     still come from storage, so a preference carries from page to page.

     An explicit query parameter still beats everything: that is a link somebody
     chose to share. */
  function presetted(c) {
    var p = global.PP_PRESET;
    return !!p && Object.prototype.hasOwnProperty.call(p, c.id);
  }

  function defaultOf(c) {
    return presetted(c) ? global.PP_PRESET[c.id] : c.default;
  }

  function controlDefaults(controls) {
    var out = {};
    controls.forEach(function (c) { out[c.id] = defaultOf(c); });
    return out;
  }

  function readState(controls) {
    var values = controlDefaults(controls);
    var stored;
    try { stored = JSON.parse(localStorage.getItem(PP._key) || 'null'); } catch (e) { stored = null; }
    if (stored) {
      controls.forEach(function (c) {
        if (stored[c.id] !== undefined && !presetted(c)) values[c.id] = stored[c.id];
      });
    }
    /* The URL wins over storage, so a shared link always shows what was shared. */
    var params = new URLSearchParams(location.search);
    controls.forEach(function (c) {
      if (!params.has(c.id)) return;
      var raw = params.get(c.id);
      if (c.type === 'checkbox') values[c.id] = raw === '1' || raw === 'true';
      else if (c.type === 'number' || c.type === 'range') values[c.id] = parseFloat(raw);
      else values[c.id] = raw;
    });
    return values;
  }

  function writeState(controls, values) {
    try { localStorage.setItem(PP._key, JSON.stringify(values)); } catch (e) { /* private mode */ }
    var params = new URLSearchParams();
    controls.forEach(function (c) {
      var v = values[c.id];
      if (v === defaultOf(c) || v === undefined || v === '') return;
      params.set(c.id, c.type === 'checkbox' ? (v ? '1' : '0') : v);
    });
    var qs = params.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  function field(c, value) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var id = 'f-' + c.id;

    if (c.type === 'checkbox') {
      var line = document.createElement('div');
      line.className = 'inline';
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.id = id;
      box.checked = !!value;
      var lab = document.createElement('label');
      lab.htmlFor = id;
      lab.textContent = c.label;
      line.appendChild(box);
      line.appendChild(lab);
      wrap.appendChild(line);
      wrap._input = box;
    } else {
      var label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = c.label;
      wrap.appendChild(label);

      var input;
      if (c.type === 'select') {
        input = document.createElement('select');
        (c.options || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          input.appendChild(opt);
        });
        input.value = value;
      } else if (c.type === 'textarea') {
        input = document.createElement('textarea');
        input.value = value == null ? '' : value;
        if (c.placeholder) input.placeholder = c.placeholder;
      } else {
        input = document.createElement('input');
        input.type = c.type === 'range' ? 'range' : (c.type || 'text');
        if (c.min !== undefined) input.min = c.min;
        if (c.max !== undefined) input.max = c.max;
        if (c.step !== undefined) input.step = c.step;
        if (c.placeholder) input.placeholder = c.placeholder;
        input.value = value == null ? '' : value;
      }
      input.id = id;
      wrap.appendChild(input);
      wrap._input = input;
    }

    if (c.hint) {
      var hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = c.hint;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  function readField(c, el) {
    if (c.type === 'checkbox') return el.checked;
    if (c.type === 'number' || c.type === 'range') {
      var n = parseFloat(el.value);
      return isNaN(n) ? c.default : n;
    }
    return el.value;
  }

  PP.register = function (slug, def) {
    PP._key = 'pp-' + slug;

    document.addEventListener('DOMContentLoaded', function () {
      var panel = document.getElementById('controls');
      var stage = document.getElementById('stage');
      if (!panel || !stage) return;

      var controls = pageControls(def).concat(def.controls || []);
      var values = readState(controls);
      var inputs = {};

      controls.forEach(function (c) {
        var f = field(c, values[c.id]);
        panel.appendChild(f);
        inputs[c.id] = f._input;
        f._input.addEventListener('input', update);
        f._input.addEventListener('change', update);
      });

      var actions = document.createElement('div');
      actions.className = 'actions';
      actions.innerHTML =
        '<button type="button" class="btn" id="do-print">Print</button>' +
        '<button type="button" class="btn secondary" id="do-svg">Download SVG</button>' +
        '<button type="button" class="btn secondary" id="do-reset">Reset</button>';
      panel.appendChild(actions);

      actions.querySelector('#do-print').addEventListener('click', function () { global.print(); });
      actions.querySelector('#do-svg').addEventListener('click', downloadSVG);
      actions.querySelector('#do-reset').addEventListener('click', function () {
        var d = controlDefaults(controls);
        Object.keys(d).forEach(function (k) {
          values[k] = d[k];
          var el = inputs[k];
          if (!el) return;
          if (el.type === 'checkbox') el.checked = !!d[k];
          else el.value = d[k];
        });
        render();
      });

      function update() {
        controls.forEach(function (c) { values[c.id] = readField(c, inputs[c.id]); });
        render();
      }

      function currentPage() {
        var p = PP.PAGES[values.paper] || PP.PAGES.letter;
        return values.orientation === 'landscape'
          ? { w: p.h, h: p.w }
          : { w: p.w, h: p.h };
      }

      function render() {
        var page = currentPage();
        var v = Object.assign({}, values, { page: page, margin: values.margin || 0 });
        var out;
        try {
          out = def.render(v);
        } catch (err) {
          stage.innerHTML = '<p class="stage-note">This combination of settings could not be drawn. ' +
            PP.esc(err.message) + '</p>';
          return;
        }
        var pages = Array.isArray(out) ? out : [out];
        if (!pages.length) pages = [''];

        stage.innerHTML = '';
        var note = document.createElement('p');
        note.className = 'stage-note';
        note.textContent = pages.length > 1
          ? pages.length + ' pages — print at 100% scale, "Fit to page" will break the measurements.'
          : 'Print at 100% scale. "Fit to page" or "Shrink to fit" will break the measurements.';
        stage.appendChild(note);

        pages.forEach(function (body) {
          var svg = document.createElementNS(SVG_NS, 'svg');
          svg.setAttribute('xmlns', SVG_NS);
          svg.setAttribute('class', 'sheet');
          svg.setAttribute('width', page.w + 'mm');
          svg.setAttribute('height', page.h + 'mm');
          svg.setAttribute('viewBox', '0 0 ' + page.w + ' ' + page.h);
          svg.innerHTML = body;
          stage.appendChild(svg);
        });

        /* Match the printer's paper to the chosen sheet so nothing is rescaled. */
        var style = document.getElementById('page-rule') || document.createElement('style');
        style.id = 'page-rule';
        style.textContent = '@page { size: ' + page.w + 'mm ' + page.h + 'mm; margin: 0; }';
        document.head.appendChild(style);

        writeState(controls, values);
      }

      function downloadSVG() {
        var first = stage.querySelector('svg.sheet');
        if (!first) return;
        var blob = new Blob([first.outerHTML], { type: 'image/svg+xml' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = slug + '.svg';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }

      render();
    });
  };

  /* Theme toggle, shared by every page. The no-flash bootstrap lives inline in
     each document's <head>; this only handles the click. */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var root = document.documentElement;
      var now = root.getAttribute('data-theme');
      if (!now) {
        now = global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = now === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('pp-theme', next); } catch (e) { /* private mode */ }
      btn.setAttribute('aria-label', 'Switch to ' + (next === 'dark' ? 'light' : 'dark') + ' theme');
    });
  });

  /* ================================================================== *
   * toolbar v1 — the portfolio navigation pattern.                      *
   * Spec: github.com/ngineer420/ngineer420.github.io/issues/13          *
   *                                                                     *
   * Copied verbatim from the photoshrink pilot. Pure enhancement: with  *
   * JS off, <details>/<summary> still discloses the sheet, the rail is  *
   * still a native scroll container of real links, the edge fades are   *
   * still CSS and the scrim is still CSS. Only the active-chip          *
   * centring, Escape and click-outside are lost.                        *
   * ================================================================== */
  (function toolbar() {
    var bar = document.querySelector('.toolbar');
    if (!bar) return;
    var rail = bar.querySelector('.tb-rail');
    var menu = bar.querySelector('details.tb-menu');

    if (rail) {
      /* js-on hands the right-hand fade over to measurement. Until then the
         CSS keeps it on, so a JS-disabled visitor never gets a chip clipped
         mid-word with nothing to say there is more of the row. */
      rail.classList.add('js-on');
      var fades = function () {
        var max = rail.scrollWidth - rail.clientWidth;
        rail.classList.toggle('can-l', rail.scrollLeft > 1);
        rail.classList.toggle('can-r', rail.scrollLeft < max - 1);
      };
      /* Centre the current chip, measured from the rail's own box rather than
         through offsetLeft. The chips' offsetParent is .toolbar — the rail
         itself is not positioned — so offsetLeft carries the trigger's width
         with it, and centring on that number lands the active chip a whole
         trigger-width left of centre, half under the left fade at 320px. This
         is still a direct scrollLeft assignment and never scrollIntoView,
         which would also scroll every ancestor and the document and so drop a
         phone visitor below the header on arrival. */
      var current = rail.querySelector('[aria-current]');
      if (current) {
        var cbox = current.getBoundingClientRect();
        var rbox = rail.getBoundingClientRect();
        rail.scrollLeft += (cbox.left - rbox.left) - (rbox.width - cbox.width) / 2;
      }
      rail.addEventListener('scroll', fades, { passive: true });
      window.addEventListener('resize', fades);
      fades();
    }

    if (menu) {
      /* A disclosure, not a modal: focus is deliberately not trapped, Tab
         walks the links and straight out the other side. */
      window.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || !menu.open) return;
        menu.open = false;
        var summary = menu.querySelector('summary');
        if (summary) summary.focus();
      });
      document.addEventListener('click', function (e) {
        if (menu.open && !menu.contains(e.target)) menu.open = false;
      });
    }
  })();

  global.PP = PP;
})(window);
