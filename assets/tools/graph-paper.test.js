/* Geometry tests for graph-paper.js. Run with:  node assets/tools/graph-paper.test.js
 *
 * No framework and no dependencies — Node's built-in test runner plus assert.
 * The tool file is a browser IIFE that ends in a PP.register() call, so it is
 * loaded into a VM context with PP.register stubbed out; that hands back the
 * real definition object, and every assertion below runs the real render().
 *
 * Asserting on the emitted SVG rather than on internal helpers is deliberate.
 * The property that actually matters — nothing is drawn outside the usable
 * area, and no fragment of a shape is stranded in the margin — is a property of
 * the output, and only the output can be checked for it.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadTool() {
  let captured = null;
  const sandbox = { PP: { register: (slug, def) => { captured = def; } }, Math: Math };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "graph-paper.js"), "utf8"), sandbox);
  if (!captured) throw new Error("graph-paper.js did not call PP.register");
  return captured;
}

const TOOL = loadTool();
const LETTER = { w: 215.9, h: 279.4 };
const A4 = { w: 210, h: 297 };

/* Defaults matching what app.js would hand in from the control declarations. */
function draw(overrides) {
  return TOOL.render(Object.assign({
    page: LETTER, margin: 10,
    geometry: "square", preset: "5mm", spacing: 5, units: "mm",
    hexSide: 10, polarStep: 10, polarSpoke: 15,
    accentEvery: 5, lineWidth: 0.12, accentWidth: 0.25, colour: "grey",
    border: false, axes: false, showCaption: false,
  }, overrides));
}

/* Every absolute coordinate in the emitted SVG. Path data here is only ever
   absolute M/L/V/H plus the relative arc pairs used by the polar rings, so the
   arc payloads are dropped and the ring extremes are checked separately. */
function coords(svg) {
  const out = [];
  const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  for (const d of paths) {
    // Split into commands. Lowercase 'a' payloads are relative — skip those.
    const cmds = d.match(/[A-Za-z][^A-Za-z]*/g) || [];
    let cx = 0, cy = 0;
    for (const c of cmds) {
      const op = c[0];
      const n = (c.slice(1).match(/-?\d*\.?\d+/g) || []).map(Number);
      if (op === "M" || op === "L") {
        for (let i = 0; i + 1 < n.length; i += 2) { cx = n[i]; cy = n[i + 1]; out.push([cx, cy]); }
      } else if (op === "V") { cy = n[n.length - 1]; out.push([cx, cy]); }
      else if (op === "H") { cx = n[n.length - 1]; out.push([cx, cy]); }
      else if (op === "a") { cx += n[5]; cy += n[6]; out.push([cx, cy]); }
    }
  }
  for (const m of svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/g)) {
    out.push([Number(m[1]), Number(m[2])]);
    out.push([Number(m[1]) + Number(m[3]), Number(m[2]) + Number(m[4])]);
  }
  return out;
}

function bounds(svg) {
  const pts = coords(svg);
  assert.ok(pts.length > 0, "nothing was drawn");
  return {
    x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])),
    n: pts.length,
  };
}

/* The one rule every geometry has to obey. `slack` allows for the arc
   approximation on polar rings, which are exact but reported via their
   extremes. */
function assertInsideMargin(svg, page, margin, label, slack = 0.01) {
  const b = bounds(svg);
  assert.ok(b.x0 >= margin - slack, `${label}: ink at x=${b.x0} is inside the ${margin}mm margin`);
  assert.ok(b.y0 >= margin - slack, `${label}: ink at y=${b.y0} is inside the ${margin}mm margin`);
  assert.ok(b.x1 <= page.w - margin + slack, `${label}: ink at x=${b.x1} spills past ${page.w - margin}`);
  assert.ok(b.y1 <= page.h - margin + slack, `${label}: ink at y=${b.y1} spills past ${page.h - margin}`);
  return b;
}

const SQRT3 = Math.sqrt(3);

/* ------------------------------------------------------------------ square */

test("square grid still draws whole squares, centred, inside the margin", () => {
  const svg = draw({});
  const b = assertInsideMargin(svg, LETTER, 10, "square");
  // 195.9mm usable width at 5mm = 39 whole squares = 195mm, centred.
  assert.equal(Math.round((b.x1 - b.x0) * 100) / 100, 195);
  // 259.4mm usable height at 5mm = 51 whole squares = 255mm.
  assert.equal(Math.round((b.y1 - b.y0) * 100) / 100, 255);
  assert.ok(Math.abs((b.x0 - 10) - (LETTER.w - 10 - b.x1)) < 1e-6, "not centred horizontally");
  assert.ok(Math.abs((b.y0 - 10) - (LETTER.h - 10 - b.y1)) < 1e-6, "not centred vertically");
});

test("square grid at 5mm on A4 divides exactly and is not eaten by float error", () => {
  // 190mm of usable A4 width at 5mm is exactly 38 squares. Without the epsilon
  // in the floor, this is the case that silently loses a column.
  const svg = draw({ page: A4, geometry: "square" });
  const b = bounds(svg);
  assert.equal(Math.round((b.x1 - b.x0) * 100) / 100, 190);
});

/* ------------------------------------------- isometric and triangular grids */

test("isometric grid reaches the boundary exactly and never crosses it", () => {
  const svg = draw({ geometry: "isometric", spacing: 10, preset: "custom" });
  const b = assertInsideMargin(svg, LETTER, 10, "isometric");
  // A clipped line family touches all four edges of the usable rectangle.
  assert.ok(Math.abs(b.x0 - 10) < 0.01, `left edge at ${b.x0}, expected 10`);
  assert.ok(Math.abs(b.y0 - 10) < 0.01, `top edge at ${b.y0}, expected 10`);
  assert.ok(Math.abs(b.x1 - (LETTER.w - 10)) < 0.01);
  assert.ok(Math.abs(b.y1 - (LETTER.h - 10)) < 0.01);
});

test("isometric grid draws three families, one of them vertical", () => {
  const svg = draw({ geometry: "isometric", spacing: 10, preset: "custom", accentEvery: 0 });
  const segs = [...svg.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)]
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]);
  const angles = segs.map(([x1, y1, x2, y2]) => {
    let a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    if (a < 0) a += 180;
    return Math.round(a);
  });
  const set = [...new Set(angles)].sort((a, b) => a - b);
  assert.deepEqual(set, [30, 90, 150], `got angles ${set.join(",")}`);
});

test("triangular grid is the isometric lattice turned a quarter turn", () => {
  const svg = draw({ geometry: "triangular", spacing: 10, preset: "custom", accentEvery: 0 });
  const angles = [...svg.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)].map((m) => {
    let a = (Math.atan2(Number(m[4]) - Number(m[2]), Number(m[3]) - Number(m[1])) * 180) / Math.PI;
    if (a < 0) a += 180;
    return Math.round(a);
  });
  assert.deepEqual([...new Set(angles)].sort((a, b) => a - b), [0, 60, 120]);
});

test("adjacent isometric lines sit one triangle height apart", () => {
  const side = 12;
  const svg = draw({ geometry: "isometric", spacing: side, preset: "custom", accentEvery: 0 });
  // The vertical family: collect distinct x values of vertical segments.
  const xs = [...svg.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)]
    .filter((m) => Math.abs(Number(m[1]) - Number(m[3])) < 1e-6)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
  assert.ok(xs.length > 5, "expected a family of vertical lines");
  const gaps = xs.slice(1).map((x, i) => Math.round((x - xs[i]) * 1000) / 1000);
  const expected = Math.round((side * SQRT3 / 2) * 1000) / 1000;
  // Ignore the two boundary lines, whose neighbours are clipped remnants.
  const interior = gaps.slice(1, -1);
  interior.forEach((g) => assert.ok(Math.abs(g - expected) < 0.002, `gap ${g}, expected ${expected}`));
});

test("a triangle too big for the sheet is refused with an explanation", () => {
  assert.throws(
    () => draw({ geometry: "isometric", preset: "custom", spacing: 400, page: { w: 105, h: 148 }, margin: 10 }),
    /will not fit/
  );
});

/* -------------------------------------------------------------- hexagonal */

test("pointy-top hexagons are whole cells only, inside the margin", () => {
  const svg = draw({ geometry: "hex-pointy", hexSide: 10 });
  assertInsideMargin(svg, LETTER, 10, "hex-pointy");
  const cells = (svg.match(/Z/g) || []).length;
  assert.ok(cells > 100, `expected a full sheet of hexes, drew ${cells}`);
  // Every subpath must have exactly six points.
  const subpaths = svg.match(/M[-\d. ]+(?:L[-\d. ]+){5}Z/g) || [];
  assert.equal(subpaths.length, cells, "a hexagon was emitted with the wrong number of vertices");
});

test("pointy-top hex dimensions follow from the side length", () => {
  const s = 10;
  const svg = draw({ geometry: "hex-pointy", hexSide: s });
  const first = svg.match(/M[-\d. ]+(?:L[-\d. ]+){5}Z/)[0];
  const pts = [...first.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
  const h = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
  assert.ok(Math.abs(w - s * SQRT3) < 0.01, `across the flats ${w}, expected ${s * SQRT3}`);
  assert.ok(Math.abs(h - 2 * s) < 0.01, `across the points ${h}, expected ${2 * s}`);
});

test("flat-top hex is the transpose of pointy-top", () => {
  const s = 10;
  const svg = draw({ geometry: "hex-flat", hexSide: s });
  assertInsideMargin(svg, LETTER, 10, "hex-flat");
  const first = svg.match(/M[-\d. ]+(?:L[-\d. ]+){5}Z/)[0];
  const pts = [...first.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
  const h = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
  assert.ok(Math.abs(w - 2 * s) < 0.01, `across the points ${w}`);
  assert.ok(Math.abs(h - s * SQRT3) < 0.01, `across the flats ${h}`);
});

test("hexagons tile without gaps: neighbouring centres are one pitch apart", () => {
  const s = 10;
  const svg = draw({ geometry: "hex-pointy", hexSide: s });
  const centres = (svg.match(/M[-\d. ]+(?:L[-\d. ]+){5}Z/g) || []).map((sp) => {
    const pts = [...sp.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  });
  const row0 = centres.filter((c) => Math.abs(c[1] - centres[0][1]) < 0.01).map((c) => c[0]).sort((a, b) => a - b);
  assert.ok(row0.length > 5, "expected a row of hexes");
  row0.slice(1).forEach((x, i) => {
    assert.ok(Math.abs(x - row0[i] - s * SQRT3) < 0.01, `column pitch ${x - row0[i]}, expected ${s * SQRT3}`);
  });
  // Rows are 1.5s apart vertically, which is what makes them interlock.
  const ys = [...new Set(centres.map((c) => Math.round(c[1] * 100) / 100))].sort((a, b) => a - b);
  assert.ok(Math.abs(ys[1] - ys[0] - 1.5 * s) < 0.02, `row pitch ${ys[1] - ys[0]}, expected ${1.5 * s}`);
});

test("alternate hex rows are staggered by half a cell", () => {
  const s = 10;
  const svg = draw({ geometry: "hex-pointy", hexSide: s });
  const centres = (svg.match(/M[-\d. ]+(?:L[-\d. ]+){5}Z/g) || []).map((sp) => {
    const pts = [...sp.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  });
  const rows = [...new Set(centres.map((c) => Math.round(c[1] * 100) / 100))].sort((a, b) => a - b);
  const firstX = (row) => Math.min(...centres.filter((c) => Math.abs(c[1] - row) < 0.01).map((c) => c[0]));
  assert.ok(Math.abs(firstX(rows[1]) - firstX(rows[0]) - s * SQRT3 / 2) < 0.01, "second row is not staggered");
  assert.ok(Math.abs(firstX(rows[2]) - firstX(rows[0])) < 0.01, "third row should line up with the first");
});

test("a hexagon too big for the sheet is refused with an explanation", () => {
  assert.throws(() => draw({ geometry: "hex-pointy", hexSide: 100, page: { w: 105, h: 148 } }), /fits inside the margin/);
});

test("one hexagon that only just fits is still drawn", () => {
  // A6 with no margin is 105 x 148. A 40mm pointy hex is 69.3 across the flats
  // and 80 across the points, so exactly one column and one row survive.
  const svg = draw({ geometry: "hex-pointy", hexSide: 40, page: { w: 105, h: 148 }, margin: 0 });
  assert.ok((svg.match(/Z/g) || []).length >= 1);
  assertInsideMargin(svg, { w: 105, h: 148 }, 0, "one hex");
});

/* ------------------------------------------------------------------ polar */

test("polar rings stay inside the shorter side of the usable area", () => {
  const svg = draw({ geometry: "polar", polarStep: 10, polarSpoke: 15 });
  assertInsideMargin(svg, LETTER, 10, "polar");
  // 195.9mm usable width gives a 97.95mm radius, so 9 whole 10mm rings.
  const b = bounds(svg);
  assert.equal(Math.round((b.x1 - b.x0) * 10) / 10, 180, "outer ring should be 9 rings across");
});

test("polar spokes are drawn once per diameter, not twice per radius", () => {
  const svg = draw({ geometry: "polar", polarStep: 10, polarSpoke: 15, accentEvery: 0 });
  const spokes = [...svg.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)];
  // 180/15 = 12 diameters covering all 24 spoke directions.
  assert.equal(spokes.length, 12);
});

test("polar spoke angle changes the spoke count", () => {
  const count = (deg) =>
    [...draw({ geometry: "polar", polarSpoke: deg, accentEvery: 0 }).matchAll(/M[-\d.]+ [-\d.]+L/g)].length;
  assert.equal(count(30), 6);
  assert.equal(count(15), 12);
  assert.equal(count(10), 18);
});

test("polar refuses a ring spacing larger than the sheet", () => {
  assert.throws(() => draw({ geometry: "polar", polarStep: 100, page: { w: 105, h: 148 }, margin: 10 }), /ring fits/);
});

/* ------------------------------------------------ input hardening + wiring */

test("an unknown geometry falls back to the square grid rather than drawing nothing", () => {
  assert.equal(draw({ geometry: "constructor" }), draw({ geometry: "square" }));
  assert.equal(draw({ geometry: "__proto__" }), draw({ geometry: "square" }));
  assert.equal(draw({ geometry: "nonsense" }), draw({ geometry: "square" }));
});

test("hostile hex and polar values are clamped, not trusted", () => {
  // NaN and out-of-range values resolve to the clamped end of the control's
  // advertised range, which draws normally.
  assert.ok(draw({ geometry: "hex-pointy", hexSide: "not a number" }).includes("<path"));
  assert.ok(draw({ geometry: "hex-pointy", hexSide: -50 }).includes("<path"));
  assert.ok(draw({ geometry: "polar", polarStep: -1 }).includes("<path"));
  assert.ok(draw({ geometry: "polar", polarSpoke: 0 }).includes("<path"));
  assert.ok(draw({ geometry: "polar", polarSpoke: 1e9 }).includes("<path"));
});

test("a value clamped to something that still will not fit fails loudly, not silently", () => {
  // 1e9 clamps to the control's 100mm maximum, which is larger than the radius
  // available on Letter. The right outcome is the human-readable error the
  // stage prints, never a blank sheet.
  assert.throws(() => draw({ geometry: "polar", polarStep: 1e9 }), /ring fits inside the margin/);
  // The same value on the hex grid clamps to a 100mm side, which does still fit
  // on Letter — one very large hexagon — so that one draws rather than throws.
  assert.ok(draw({ geometry: "hex-pointy", hexSide: 1e9 }).includes("<path"));
});

test("the border box wraps the drawn block, not the paper", () => {
  const svg = draw({ geometry: "hex-pointy", hexSide: 10, border: true });
  const m = svg.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/);
  assert.ok(m, "no border rect emitted");
  const [x, y, w, h] = m.slice(1).map(Number);
  assert.ok(x >= 10 - 0.01 && y >= 10 - 0.01);
  assert.ok(x + w <= LETTER.w - 10 + 0.01 && y + h <= LETTER.h - 10 + 0.01);
});

test("every geometry survives every paper size at its default settings", () => {
  const pages = [
    { w: 215.9, h: 279.4 }, { w: 215.9, h: 355.6 }, { w: 279.4, h: 431.8 },
    { w: 297, h: 420 }, { w: 210, h: 297 }, { w: 148, h: 210 }, { w: 105, h: 148 },
  ];
  const geoms = ["square", "isometric", "triangular", "hex-pointy", "hex-flat", "polar"];
  for (const page of pages) {
    for (const geometry of geoms) {
      const svg = draw({ page, geometry });
      assert.ok(svg.includes("<path"), `${geometry} on ${page.w}x${page.h} drew nothing`);
      assertInsideMargin(svg, page, 10, `${geometry} on ${page.w}x${page.h}`);
    }
  }
});

test("the caption prints the measurements and only when asked", () => {
  assert.ok(!draw({ geometry: "hex-pointy" }).includes("<text"));
  const svg = draw({ geometry: "hex-pointy", hexSide: 10, showCaption: true });
  assert.match(svg, /<text /);
  assert.match(svg, /10 mm side/);
  assert.match(svg, /17\.32 mm across the flats/);
});

test("the heavy polar spokes are the cardinal axes, not every Nth spoke", () => {
  const svg = draw({ geometry: "polar", polarStep: 10, polarSpoke: 15, accentEvery: 5 });
  // Two <path> elements: thin first, accent second. The accent path must hold
  // exactly the horizontal and vertical diameters plus the accented rings.
  const paths = [...svg.matchAll(/<path d="([^"]+)" fill="none" stroke="[^"]+" stroke-width="([\d.]+)"/g)];
  const accent = paths[paths.length - 1];
  const segs = [...accent[1].matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)];
  assert.equal(segs.length, 2, "expected exactly two heavy spokes (the two axes)");
  const angles = segs.map(([, x1, y1, x2, y2]) => {
    let a = (Math.atan2(Number(y2) - Number(y1), Number(x2) - Number(x1)) * 180) / Math.PI;
    if (a < 0) a += 180;
    return Math.round(a);
  }).sort((a, b) => a - b);
  assert.deepEqual(angles, [0, 90]);
});

test("a spoke angle that steps over 90 degrees marks only the axis it does hit", () => {
  // 7 degree spokes pass through 0 but step over 90 (84, then 91). The right
  // outcome is the horizontal diameter heavy and nothing heavy at 84 or 91 —
  // never a heavy line at an arbitrary angle just to make up the count.
  const svg = draw({ geometry: "polar", polarSpoke: 7, accentEvery: 5, polarStep: 20 });
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  const segs = [...paths[paths.length - 1].matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/g)];
  assert.equal(segs.length, 1);
  const [, x1, y1, x2, y2] = segs[0];
  assert.ok(Math.abs(Number(y2) - Number(y1)) < 1e-6, "the one heavy spoke should be the horizontal axis");
  assert.ok(Math.abs(Number(x2) - Number(x1)) > 1, "and it should have length");
});
