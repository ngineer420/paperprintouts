/* paperprintouts.com — blank periodic table.
 *
 * Prints the 18 × 7 main table plus the lanthanide and actinide rails at true
 * physical size. Whichever of {number, symbol, name, weight} you switch OFF is
 * the thing the student writes in.
 *
 * All coordinates are millimetres. The framework supplies the <svg> wrapper.
 */
(function () {
  'use strict';

  /* ---- Element data -------------------------------------------------------
   * [ Z, symbol, name, weight, category, group, period, block ]
   *
   * Weights are IUPAC standard atomic weights given to four significant
   * figures. A value in [brackets] is the mass number of the most stable
   * isotope, used for the elements with no stable nuclide: Tc, Pm, and
   * everything from Po (84) onward except Th, Pa and U.
   *
   * group is 0 for the f-block; those elements are positioned by their index
   * along the rails rather than by a group number.
   */
  var ELEMENTS = [
    [1, 'H', 'Hydrogen', '1.008', 'nonmetal', 1, 1, 's'],
    [2, 'He', 'Helium', '4.003', 'noble', 18, 1, 's'],
    [3, 'Li', 'Lithium', '6.94', 'alkali', 1, 2, 's'],
    [4, 'Be', 'Beryllium', '9.012', 'alkaline', 2, 2, 's'],
    [5, 'B', 'Boron', '10.81', 'metalloid', 13, 2, 'p'],
    [6, 'C', 'Carbon', '12.01', 'nonmetal', 14, 2, 'p'],
    [7, 'N', 'Nitrogen', '14.01', 'nonmetal', 15, 2, 'p'],
    [8, 'O', 'Oxygen', '16.00', 'nonmetal', 16, 2, 'p'],
    [9, 'F', 'Fluorine', '19.00', 'halogen', 17, 2, 'p'],
    [10, 'Ne', 'Neon', '20.18', 'noble', 18, 2, 'p'],
    [11, 'Na', 'Sodium', '22.99', 'alkali', 1, 3, 's'],
    [12, 'Mg', 'Magnesium', '24.31', 'alkaline', 2, 3, 's'],
    [13, 'Al', 'Aluminium', '26.98', 'post', 13, 3, 'p'],
    [14, 'Si', 'Silicon', '28.09', 'metalloid', 14, 3, 'p'],
    [15, 'P', 'Phosphorus', '30.97', 'nonmetal', 15, 3, 'p'],
    [16, 'S', 'Sulfur', '32.06', 'nonmetal', 16, 3, 'p'],
    [17, 'Cl', 'Chlorine', '35.45', 'halogen', 17, 3, 'p'],
    [18, 'Ar', 'Argon', '39.95', 'noble', 18, 3, 'p'],
    [19, 'K', 'Potassium', '39.10', 'alkali', 1, 4, 's'],
    [20, 'Ca', 'Calcium', '40.08', 'alkaline', 2, 4, 's'],
    [21, 'Sc', 'Scandium', '44.96', 'transition', 3, 4, 'd'],
    [22, 'Ti', 'Titanium', '47.87', 'transition', 4, 4, 'd'],
    [23, 'V', 'Vanadium', '50.94', 'transition', 5, 4, 'd'],
    [24, 'Cr', 'Chromium', '52.00', 'transition', 6, 4, 'd'],
    [25, 'Mn', 'Manganese', '54.94', 'transition', 7, 4, 'd'],
    [26, 'Fe', 'Iron', '55.85', 'transition', 8, 4, 'd'],
    [27, 'Co', 'Cobalt', '58.93', 'transition', 9, 4, 'd'],
    [28, 'Ni', 'Nickel', '58.69', 'transition', 10, 4, 'd'],
    [29, 'Cu', 'Copper', '63.55', 'transition', 11, 4, 'd'],
    [30, 'Zn', 'Zinc', '65.38', 'transition', 12, 4, 'd'],
    [31, 'Ga', 'Gallium', '69.72', 'post', 13, 4, 'p'],
    [32, 'Ge', 'Germanium', '72.63', 'metalloid', 14, 4, 'p'],
    [33, 'As', 'Arsenic', '74.92', 'metalloid', 15, 4, 'p'],
    [34, 'Se', 'Selenium', '78.97', 'nonmetal', 16, 4, 'p'],
    [35, 'Br', 'Bromine', '79.90', 'halogen', 17, 4, 'p'],
    [36, 'Kr', 'Krypton', '83.80', 'noble', 18, 4, 'p'],
    [37, 'Rb', 'Rubidium', '85.47', 'alkali', 1, 5, 's'],
    [38, 'Sr', 'Strontium', '87.62', 'alkaline', 2, 5, 's'],
    [39, 'Y', 'Yttrium', '88.91', 'transition', 3, 5, 'd'],
    [40, 'Zr', 'Zirconium', '91.22', 'transition', 4, 5, 'd'],
    [41, 'Nb', 'Niobium', '92.91', 'transition', 5, 5, 'd'],
    [42, 'Mo', 'Molybdenum', '95.95', 'transition', 6, 5, 'd'],
    [43, 'Tc', 'Technetium', '[98]', 'transition', 7, 5, 'd'],
    [44, 'Ru', 'Ruthenium', '101.1', 'transition', 8, 5, 'd'],
    [45, 'Rh', 'Rhodium', '102.9', 'transition', 9, 5, 'd'],
    [46, 'Pd', 'Palladium', '106.4', 'transition', 10, 5, 'd'],
    [47, 'Ag', 'Silver', '107.9', 'transition', 11, 5, 'd'],
    [48, 'Cd', 'Cadmium', '112.4', 'transition', 12, 5, 'd'],
    [49, 'In', 'Indium', '114.8', 'post', 13, 5, 'p'],
    [50, 'Sn', 'Tin', '118.7', 'post', 14, 5, 'p'],
    [51, 'Sb', 'Antimony', '121.8', 'metalloid', 15, 5, 'p'],
    [52, 'Te', 'Tellurium', '127.6', 'metalloid', 16, 5, 'p'],
    [53, 'I', 'Iodine', '126.9', 'halogen', 17, 5, 'p'],
    [54, 'Xe', 'Xenon', '131.3', 'noble', 18, 5, 'p'],
    [55, 'Cs', 'Caesium', '132.9', 'alkali', 1, 6, 's'],
    [56, 'Ba', 'Barium', '137.3', 'alkaline', 2, 6, 's'],
    [57, 'La', 'Lanthanum', '138.9', 'lanthanide', 0, 6, 'f'],
    [58, 'Ce', 'Cerium', '140.1', 'lanthanide', 0, 6, 'f'],
    [59, 'Pr', 'Praseodymium', '140.9', 'lanthanide', 0, 6, 'f'],
    [60, 'Nd', 'Neodymium', '144.2', 'lanthanide', 0, 6, 'f'],
    [61, 'Pm', 'Promethium', '[145]', 'lanthanide', 0, 6, 'f'],
    [62, 'Sm', 'Samarium', '150.4', 'lanthanide', 0, 6, 'f'],
    [63, 'Eu', 'Europium', '152.0', 'lanthanide', 0, 6, 'f'],
    [64, 'Gd', 'Gadolinium', '157.3', 'lanthanide', 0, 6, 'f'],
    [65, 'Tb', 'Terbium', '158.9', 'lanthanide', 0, 6, 'f'],
    [66, 'Dy', 'Dysprosium', '162.5', 'lanthanide', 0, 6, 'f'],
    [67, 'Ho', 'Holmium', '164.9', 'lanthanide', 0, 6, 'f'],
    [68, 'Er', 'Erbium', '167.3', 'lanthanide', 0, 6, 'f'],
    [69, 'Tm', 'Thulium', '168.9', 'lanthanide', 0, 6, 'f'],
    [70, 'Yb', 'Ytterbium', '173.0', 'lanthanide', 0, 6, 'f'],
    [71, 'Lu', 'Lutetium', '175.0', 'lanthanide', 0, 6, 'f'],
    [72, 'Hf', 'Hafnium', '178.5', 'transition', 4, 6, 'd'],
    [73, 'Ta', 'Tantalum', '180.9', 'transition', 5, 6, 'd'],
    [74, 'W', 'Tungsten', '183.8', 'transition', 6, 6, 'd'],
    [75, 'Re', 'Rhenium', '186.2', 'transition', 7, 6, 'd'],
    [76, 'Os', 'Osmium', '190.2', 'transition', 8, 6, 'd'],
    [77, 'Ir', 'Iridium', '192.2', 'transition', 9, 6, 'd'],
    [78, 'Pt', 'Platinum', '195.1', 'transition', 10, 6, 'd'],
    [79, 'Au', 'Gold', '197.0', 'transition', 11, 6, 'd'],
    [80, 'Hg', 'Mercury', '200.6', 'transition', 12, 6, 'd'],
    [81, 'Tl', 'Thallium', '204.4', 'post', 13, 6, 'p'],
    [82, 'Pb', 'Lead', '207.2', 'post', 14, 6, 'p'],
    [83, 'Bi', 'Bismuth', '209.0', 'post', 15, 6, 'p'],
    [84, 'Po', 'Polonium', '[209]', 'post', 16, 6, 'p'],
    [85, 'At', 'Astatine', '[210]', 'halogen', 17, 6, 'p'],
    [86, 'Rn', 'Radon', '[222]', 'noble', 18, 6, 'p'],
    [87, 'Fr', 'Francium', '[223]', 'alkali', 1, 7, 's'],
    [88, 'Ra', 'Radium', '[226]', 'alkaline', 2, 7, 's'],
    [89, 'Ac', 'Actinium', '[227]', 'actinide', 0, 7, 'f'],
    [90, 'Th', 'Thorium', '232.0', 'actinide', 0, 7, 'f'],
    [91, 'Pa', 'Protactinium', '231.0', 'actinide', 0, 7, 'f'],
    [92, 'U', 'Uranium', '238.0', 'actinide', 0, 7, 'f'],
    [93, 'Np', 'Neptunium', '[237]', 'actinide', 0, 7, 'f'],
    [94, 'Pu', 'Plutonium', '[244]', 'actinide', 0, 7, 'f'],
    [95, 'Am', 'Americium', '[243]', 'actinide', 0, 7, 'f'],
    [96, 'Cm', 'Curium', '[247]', 'actinide', 0, 7, 'f'],
    [97, 'Bk', 'Berkelium', '[247]', 'actinide', 0, 7, 'f'],
    [98, 'Cf', 'Californium', '[251]', 'actinide', 0, 7, 'f'],
    [99, 'Es', 'Einsteinium', '[252]', 'actinide', 0, 7, 'f'],
    [100, 'Fm', 'Fermium', '[257]', 'actinide', 0, 7, 'f'],
    [101, 'Md', 'Mendelevium', '[258]', 'actinide', 0, 7, 'f'],
    [102, 'No', 'Nobelium', '[259]', 'actinide', 0, 7, 'f'],
    [103, 'Lr', 'Lawrencium', '[266]', 'actinide', 0, 7, 'f'],
    [104, 'Rf', 'Rutherfordium', '[267]', 'transition', 4, 7, 'd'],
    [105, 'Db', 'Dubnium', '[268]', 'transition', 5, 7, 'd'],
    [106, 'Sg', 'Seaborgium', '[269]', 'transition', 6, 7, 'd'],
    [107, 'Bh', 'Bohrium', '[270]', 'transition', 7, 7, 'd'],
    [108, 'Hs', 'Hassium', '[269]', 'transition', 8, 7, 'd'],
    [109, 'Mt', 'Meitnerium', '[278]', 'transition', 9, 7, 'd'],
    [110, 'Ds', 'Darmstadtium', '[281]', 'transition', 10, 7, 'd'],
    [111, 'Rg', 'Roentgenium', '[282]', 'transition', 11, 7, 'd'],
    [112, 'Cn', 'Copernicium', '[285]', 'transition', 12, 7, 'd'],
    [113, 'Nh', 'Nihonium', '[286]', 'post', 13, 7, 'p'],
    [114, 'Fl', 'Flerovium', '[289]', 'post', 14, 7, 'p'],
    [115, 'Mc', 'Moscovium', '[290]', 'post', 15, 7, 'p'],
    [116, 'Lv', 'Livermorium', '[293]', 'post', 16, 7, 'p'],
    [117, 'Ts', 'Tennessine', '[294]', 'halogen', 17, 7, 'p'],
    [118, 'Og', 'Oganesson', '[294]', 'noble', 18, 7, 'p']
  ];

  /* Turn the compact rows into objects once, at load. */
  var TABLE = ELEMENTS.map(function (row) {
    return {
      z: row[0], symbol: row[1], name: row[2], weight: row[3],
      cat: row[4], group: row[5], period: row[6], block: row[7]
    };
  });

  /* ---- Palettes -----------------------------------------------------------
   * Pale fills so a pencil still shows on top, each with a darker stroke of the
   * same hue. Ten distinct hues with a spread of lightness, so the sheet is
   * still readable when a classroom printer renders it in greyscale.
   */
  var CATEGORY = {
    alkali:     { label: 'Alkali metal',           fill: '#F3C9C2', stroke: '#A8615A', metal: 'metal' },
    alkaline:   { label: 'Alkaline earth metal',   fill: '#F8DDBE', stroke: '#B37D3E', metal: 'metal' },
    transition: { label: 'Transition metal',       fill: '#D9E4F2', stroke: '#5B7597', metal: 'metal' },
    post:       { label: 'Post-transition metal',  fill: '#DDE0E6', stroke: '#74808F', metal: 'metal' },
    metalloid:  { label: 'Metalloid',              fill: '#CFE3DD', stroke: '#4F8378', metal: 'metalloid' },
    nonmetal:   { label: 'Nonmetal',               fill: '#D8E9C8', stroke: '#6C8F4C', metal: 'nonmetal' },
    halogen:    { label: 'Halogen',                fill: '#F4EDBD', stroke: '#9A8B32', metal: 'nonmetal' },
    noble:      { label: 'Noble gas',              fill: '#E1D9F0', stroke: '#7568A4', metal: 'nonmetal' },
    lanthanide: { label: 'Lanthanide',             fill: '#F3D6E5', stroke: '#A76389', metal: 'metal' },
    actinide:   { label: 'Actinide',               fill: '#E6D8C6', stroke: '#8F7550', metal: 'metal' }
  };
  var CATEGORY_ORDER = ['alkali', 'alkaline', 'transition', 'post', 'metalloid',
    'nonmetal', 'halogen', 'noble', 'lanthanide', 'actinide'];

  var BLOCK = {
    s: { label: 's-block', fill: '#F3C9C2', stroke: '#A8615A' },
    p: { label: 'p-block', fill: '#D9E4F2', stroke: '#5B7597' },
    d: { label: 'd-block', fill: '#D8E9C8', stroke: '#6C8F4C' },
    f: { label: 'f-block', fill: '#F4EDBD', stroke: '#9A8B32' }
  };
  var BLOCK_ORDER = ['s', 'p', 'd', 'f'];

  var METAL = {
    metal:     { label: 'Metal',     fill: '#DCE6F2', stroke: '#5B7597' },
    metalloid: { label: 'Metalloid', fill: '#EFE3BE', stroke: '#93813C' },
    nonmetal:  { label: 'Nonmetal',  fill: '#D8E9CE', stroke: '#5F8A66' }
  };
  var METAL_ORDER = ['metal', 'metalloid', 'nonmetal'];

  var PLAIN = { label: '', fill: '#FFFFFF', stroke: '#3A3A3A' };

  var INK = '#141414';        /* symbol + atomic number */
  var INK_SOFT = '#3C3C3C';   /* name + weight */
  var INK_FAINT = '#5A5A5A';  /* group numbers, legend text */

  /* Which swatch a given element gets, under the chosen colour scheme. */
  function swatchFor(scheme, el) {
    if (scheme === 'block') return BLOCK[el.block] || PLAIN;
    if (scheme === 'metal') return METAL[(CATEGORY[el.cat] || {}).metal] || PLAIN;
    if (scheme === 'category') return CATEGORY[el.cat] || PLAIN;
    return PLAIN;
  }

  /* Legend entries for the chosen scheme, in a sensible reading order. */
  function legendFor(scheme) {
    var keys, src;
    if (scheme === 'category') { keys = CATEGORY_ORDER; src = CATEGORY; }
    else if (scheme === 'block') { keys = BLOCK_ORDER; src = BLOCK; }
    else if (scheme === 'metal') { keys = METAL_ORDER; src = METAL; }
    else return [];
    return keys.map(function (k) { return src[k]; });
  }

  /* ---- Small helpers ------------------------------------------------------
   * The framework's own PP.esc / PP.round are used whenever they exist, which
   * is always in the browser. The fallbacks exist only so this file can be
   * required by a bare Node smoke test that stubs PP.register and nothing else.
   */
  var esc = (typeof PP.esc === 'function') ? PP.esc : function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var round = (typeof PP.round === 'function') ? PP.round : function (n, dp) {
    var f = Math.pow(10, dp);
    return Math.round(n * f) / f;
  };

  function r(n) { return round(n, 2); }

  function clamp(n, lo, hi) {
    if (!isFinite(n)) return lo;
    return n < lo ? lo : (n > hi ? hi : n);
  }

  /* Rough advance width of a sans-serif string, in multiples of the font size.
     0.58 em per character is a safe average for mixed-case Helvetica/Arial;
     it over-estimates slightly, which is the direction we want. */
  function textWidth(s, size, factor) {
    return String(s).length * (factor || 0.58) * size;
  }

  /* Largest font size at which `s` still fits `maxW`, never above `base`. */
  function fitFont(s, maxW, base, factor) {
    var len = Math.max(1, String(s).length);
    return Math.max(0.5, Math.min(base, maxW / (len * (factor || 0.58))));
  }

  function rect(x, y, w, h, fill, stroke, sw) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) +
      '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + r(sw) + '"/>';
  }

  function text(x, y, size, anchor, fill, weight, s) {
    return '<text x="' + r(x) + '" y="' + r(y) + '" font-size="' + r(size) +
      '" text-anchor="' + anchor + '" fill="' + fill +
      (weight ? '" font-weight="' + weight : '') + '">' + esc(s) + '</text>';
  }

  /* ---- One cell -----------------------------------------------------------
   * The atomic number sits in the top-left corner. Symbol, name and weight are
   * stacked and vertically centred in whatever room is left, so a cell showing
   * only the symbol still looks deliberate rather than top-heavy.
   */
  function drawCell(x, y, w, h, el, v, sw) {
    var out = rect(x, y, w, h, sw.fill, sw.stroke, Math.max(0.12, h * 0.018));
    var pad = w * 0.07;
    var innerW = w - 2 * pad;

    if (v.showNumber) {
      var numF = clamp(h * 0.17, 0.9, 3.4);
      out += text(x + pad, y + pad + numF * 0.85, numF, 'start', INK, null, el.z);
    }

    /* Vertical stack of whatever else is switched on. */
    var items = [];
    if (v.showSymbol) {
      items.push({
        s: el.symbol,
        size: Math.min(h * 0.36, fitFont(el.symbol, innerW, h * 0.36, 0.66)),
        line: h * 0.40, fill: INK, weight: '700'
      });
    }
    if (v.showName) {
      items.push({
        s: el.name,
        size: fitFont(el.name, innerW, h * 0.155, 0.56),
        line: h * 0.20, fill: INK_SOFT, weight: null
      });
    }
    if (v.showWeight) {
      items.push({
        s: el.weight,
        size: fitFont(el.weight, innerW, h * 0.155, 0.56),
        line: h * 0.19, fill: INK_SOFT, weight: null
      });
    }
    if (!items.length) return out;

    var stackH = 0, i;
    for (i = 0; i < items.length; i++) stackH += items[i].line;

    /* Room below the atomic-number strip. */
    var top = y + (v.showNumber ? h * 0.24 : h * 0.06);
    var bottom = y + h - h * 0.07;
    var room = bottom - top;

    /* With all four fields switched on the stack is taller than the room left
       under the atomic number, so shrink it to fit rather than letting the
       weight line run over the cell border. Scale is 1 in every other case. */
    var scale = (stackH > room && stackH > 0) ? room / stackH : 1;

    var cursor = top + Math.max(0, (room - stackH * scale) / 2);

    for (i = 0; i < items.length; i++) {
      var line = items[i].line * scale;
      /* 0.78 of the line box puts the baseline where the optical centre wants it. */
      out += text(x + w / 2, cursor + line * 0.78, items[i].size * scale, 'middle',
        items[i].fill, items[i].weight, items[i].s);
      cursor += line;
    }
    return out;
  }

  /* The two "57-71" / "89-103" stand-ins at group 3 of periods 6 and 7.
     ASCII hyphens on purpose: a downloaded .svg carries no encoding
     declaration, and an en dash there is one mis-guessed charset away from
     turning into mojibake on someone's sheet. */
  function drawPlaceholder(x, y, w, h, range, symbols, sw) {
    var out = rect(x, y, w, h, sw.fill, sw.stroke, Math.max(0.12, h * 0.018));
    /* Both lines are bold-ish and mostly digits, so they need the wider
       0.62 em estimate rather than the mixed-case 0.56. */
    var f1 = fitFont(range, w * 0.82, h * 0.20, 0.62);
    var f2 = fitFont(symbols, w * 0.82, h * 0.18, 0.62);
    out += text(x + w / 2, y + h * 0.45, f1, 'middle', INK, '700', range);
    out += text(x + w / 2, y + h * 0.72, f2, 'middle', INK_SOFT, null, symbols);
    return out;
  }

  PP.register('blank-periodic-table', {
    defaultPaper: 'letter',
    defaultOrientation: 'landscape',
    defaultMargin: 10,

    controls: [
      {
        id: 'title', label: 'Title', type: 'text',
        default: 'Periodic Table of the Elements',
        hint: 'Leave empty for no heading.'
      },
      { id: 'showNumber', label: 'Show atomic number', type: 'checkbox', default: true },
      { id: 'showSymbol', label: 'Show symbol', type: 'checkbox', default: false },
      { id: 'showName', label: 'Show name', type: 'checkbox', default: false },
      {
        id: 'showWeight', label: 'Show atomic weight', type: 'checkbox', default: false,
        hint: 'Whatever you switch off is what the student fills in.'
      },
      {
        id: 'colour', label: 'Colour by', type: 'select', default: 'category',
        options: [
          { value: 'category', label: 'Category (10 groups)' },
          { value: 'block', label: 'Block (s / p / d / f)' },
          { value: 'metal', label: 'Metal / metalloid / nonmetal' },
          { value: 'none', label: 'No colour' }
        ]
      },
      { id: 'rails', label: 'Include lanthanide and actinide rails', type: 'checkbox', default: true },
      { id: 'legend', label: 'Print the colour key', type: 'checkbox', default: true }
    ],

    render: function (v) {
      var page = v.page;

      /* Never let the margin eat the sheet. */
      var m = Math.max(0, v.margin || 0);
      if (page.w - 2 * m < 20) m = Math.max(0, (page.w - 20) / 2);
      if (page.h - 2 * m < 20) m = Math.max(0, (page.h - 20) / 2);

      var usableW = Math.max(1, page.w - 2 * m);
      var usableH = Math.max(1, page.h - 2 * m);

      var scheme = v.colour || 'category';
      var showRails = v.rails !== false;
      var title = String(v.title == null ? '' : v.title).replace(/\s+$/, '');

      /* Column width is fixed by the spec: the 18 groups fill the usable width. */
      var cellW = usableW / 18;

      /* --- vertical budget, top to bottom ---------------------------------
         title | group-number strip | 7 periods | gap | 2 rails | legend      */

      var titleF = 0, titleH = 0;
      if (title) {
        titleF = clamp(usableW * 0.028, 3.2, 7);
        titleH = titleF * 1.9;
      }

      var headF = clamp(cellW * 0.20, 1.3, 3.2);
      var headH = headF * 1.7;

      /* Legend geometry has to be settled before cell height, because it eats
         into the height the table gets. */
      var entries = (v.legend !== false) ? legendFor(scheme) : [];
      var legCols = 1, legRows = 0, legF = 0, legRowH = 0, legendH = 0;
      if (entries.length) {
        legCols = Math.min(entries.length, 5);
        legRows = Math.ceil(entries.length / legCols);
        var colW = usableW / legCols;
        var longest = 0;
        entries.forEach(function (e) { longest = Math.max(longest, e.label.length); });
        /* Font must clear the swatch (1.8 em wide) plus a 1 em gap. */
        legF = clamp(Math.min(cellW * 0.20, colW / (longest * 0.55 + 3.0)), 1.2, 2.9);
        legRowH = legF * 2.0;
        legendH = legRows * legRowH + legF * 1.6;
      }

      /* Rows of cell-height the drawing needs: 7 periods, a half-height gap
         row, then the two rails. */
      var rowUnits = 7 + (showRails ? 2.5 : 0);
      var availH = usableH - titleH - headH - legendH;
      var cellH = Math.min(cellW * 1.15, availH / rowUnits);
      /* Absurd margins can drive this negative; draw something rather than
         nothing, as the spec asks. */
      if (!isFinite(cellH) || cellH < 0.6) cellH = 0.6;

      var tableH = rowUnits * cellH;
      /* On a portrait sheet the columns run out of width long before the page
         runs out of height, so there is slack. A quarter of it goes above the
         whole assembly and the rest below — and the title moves down with the
         table rather than being stranded at the top of the paper. */
      var slack = Math.max(0, availH - tableH);
      var blockTop = m + slack * 0.25;
      var gridTop = blockTop + titleH + headH;

      var out = '<g font-family="Helvetica, Arial, sans-serif">';

      /* --- title --- */
      if (title) {
        out += text(m + usableW / 2, blockTop + titleF * 1.15,
          Math.min(titleF, fitFont(title, usableW, titleF, 0.6)),
          'middle', INK, '700', title);
      }

      /* --- group numbers, sitting just above row 1 --- */
      var g;
      for (g = 1; g <= 18; g++) {
        out += text(m + (g - 0.5) * cellW, gridTop - headF * 0.55, headF, 'middle',
          INK_FAINT, null, g);
      }

      /* --- main table --- */
      TABLE.forEach(function (el) {
        if (el.group < 1) return;               /* f-block lives on the rails */
        var x = m + (el.group - 1) * cellW;
        var y = gridTop + (el.period - 1) * cellH;
        out += drawCell(x, y, cellW, cellH, el, v, swatchFor(scheme, el));
      });

      /* --- the two stand-in cells at group 3, periods 6 and 7 --- */
      var lanSw = swatchFor(scheme, { cat: 'lanthanide', block: 'f' });
      var actSw = swatchFor(scheme, { cat: 'actinide', block: 'f' });
      out += drawPlaceholder(m + 2 * cellW, gridTop + 5 * cellH, cellW, cellH,
        '57-71', 'La-Lu', lanSw);
      out += drawPlaceholder(m + 2 * cellW, gridTop + 6 * cellH, cellW, cellH,
        '89-103', 'Ac-Lr', actSw);

      /* --- rails ---
         Fifteen cells each, indented to start under group 3, which is where
         they detach from the main table. */
      var railTop = gridTop + 7.5 * cellH;
      if (showRails) {
        var lan = TABLE.filter(function (el) { return el.cat === 'lanthanide'; });
        var act = TABLE.filter(function (el) { return el.cat === 'actinide'; });
        lan.forEach(function (el, i) {
          out += drawCell(m + (2 + i) * cellW, railTop, cellW, cellH, el, v, swatchFor(scheme, el));
        });
        act.forEach(function (el, i) {
          out += drawCell(m + (2 + i) * cellW, railTop + cellH, cellW, cellH, el, v, swatchFor(scheme, el));
        });
      }

      /* --- legend --- */
      if (entries.length) {
        var legTop = gridTop + tableH + legF * 1.6;
        var swW = legF * 1.8;
        var swH = legF * 1.25;
        /* Columns are no wider than their content needs, so a three-entry key
           does not straggle across the full sheet. Whatever is left over
           centres the key under the table. */
        var natural = swW + legF * 0.6 + longest * 0.55 * legF + legF * 1.2;
        var legColW = Math.min(usableW / legCols, natural);
        var legLeft = m + (usableW - legColW * legCols) / 2;
        entries.forEach(function (e, i) {
          var row = Math.floor(i / legCols);
          var col = i % legCols;
          var x = legLeft + col * legColW;
          var y = legTop + row * legRowH;
          out += rect(x, y, swW, swH, e.fill, e.stroke, 0.2);
          out += text(x + swW + legF * 0.6, y + swH * 0.85, legF, 'start', INK_FAINT, null, e.label);
        });
      }

      out += '</g>';
      return out;
    }
  });
})();
