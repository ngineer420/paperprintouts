/* Tests for bubble-answer-sheet.js. Run with:  node assets/tools/bubble-answer-sheet.test.js
 *
 * No framework and no dependencies. The tool file is a browser IIFE that ends
 * in a PP.register() call, so it is loaded into a VM context with PP.register
 * stubbed out. That hands back the real definition object, and every assertion
 * below runs the real render() and reads the SVG it emits.
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
  vm.runInContext(fs.readFileSync(path.join(__dirname, "bubble-answer-sheet.js"), "utf8"), sandbox);
  if (!captured) throw new Error("bubble-answer-sheet.js did not call PP.register");
  return captured;
}

const TOOL = loadTool();
const LETTER = { w: 215.9, h: 279.4 };
const INK = "#222222";

/* Defaults matching what app.js hands in from the control declarations. */
function draw(overrides) {
  const out = TOOL.render(Object.assign({
    page: LETTER, margin: 10,
    title: "", questions: 50, options: 4, labels: "ABCDEF", columns: 2,
    header: true, scoreBox: true, idGrid: false, idDigits: 6,
    answerKey: "", versions: "1", sheets: "both",
  }, overrides));
  return Array.isArray(out) ? out : [out];
}

/* The filled option of every answer row on a page, in row order. A row is a
   run of bubbles after a "<n>." label. A filled bubble is a circle with an ink
   fill. Returns an array of option indexes, or -1 for an unmarked row. */
function marksOn(svg) {
  const rows = [];
  const parts = svg.split(/<text [^>]*>(\d+)\.<\/text>/);
  for (let i = 1; i < parts.length; i += 2) {
    const body = parts[i + 1];
    const circles = [...body.matchAll(/<circle [^>]*r="2" fill="([^"]+)"/g)].map((m) => m[1]);
    /* the ID grid on a first page is not an answer row, but it never follows a "n." label */
    let filled = -1;
    circles.slice(0, 6).forEach((fill, k) => { if (fill === INK) filled = k; });
    rows.push({ question: Number(parts[i]), filled });
  }
  return rows;
}

function texts(svg) {
  return [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
}

const KEY = "A,B,C,D,A,B,C,D,A,B";
const KEY_INDEX = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];

test("a 10-question, 3-version job prints 6 pages", () => {
  const pages = draw({ questions: 10, versions: "3", answerKey: KEY });
  assert.equal(pages.length, 6);
});

test("student sheets carry no marks and their own version stamp", () => {
  const pages = draw({ questions: 10, versions: "3", answerKey: KEY });
  ["A", "B", "C"].forEach((letter, i) => {
    const rows = marksOn(pages[i]);
    assert.equal(rows.length, 10);
    assert.ok(rows.every((r) => r.filled === -1), `version ${letter} student sheet has a filled bubble`);
    assert.ok(texts(pages[i]).includes("VERSION " + letter), `version ${letter} stamp missing`);
    assert.ok(!texts(pages[i]).some((t) => /ANSWER KEY/.test(t)), `version ${letter} student sheet reads as a key`);
  });
});

test("each key matches its version", () => {
  const pages = draw({ questions: 10, versions: "3", answerKey: KEY });
  const keyA = marksOn(pages[3]);
  assert.deepEqual(keyA.map((r) => r.filled), KEY_INDEX, "version A key is the pasted key in order");

  ["B", "C"].forEach((letter, i) => {
    const page = pages[4 + i];
    const rows = marksOn(page);
    assert.ok(texts(page).includes("VERSION " + letter));
    assert.ok(texts(page).some((t) => t.indexOf("ANSWER KEY · VERSION " + letter) === 0), `key ${letter} foot`);
    /* the map beside each row names the original question, and the filled
       bubble is the pasted answer to that question */
    const map = texts(page).filter((t) => /^A\d+$/.test(t)).map((t) => Number(t.slice(1)));
    assert.equal(map.length, 10, `key ${letter} has a map entry per row`);
    assert.deepEqual([...map].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `key ${letter} map is a permutation`);
    assert.notDeepEqual(map, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `key ${letter} is shuffled`);
    rows.forEach((r, pos) => {
      assert.equal(r.filled, KEY_INDEX[map[pos] - 1], `key ${letter} row ${pos + 1} = A${map[pos]}`);
    });
  });
  const mapB = texts(pages[4]).filter((t) => /^A\d+$/.test(t));
  const mapC = texts(pages[5]).filter((t) => /^A\d+$/.test(t));
  assert.notDeepEqual(mapB, mapC, "versions B and C differ");
});

test("a version's order is the same on every render", () => {
  const one = draw({ questions: 37, versions: "2", answerKey: "ABCD" });
  const two = draw({ questions: 37, versions: "2", answerKey: "ABCD" });
  assert.equal(one[3], two[3]);
});

test("a key alone prints the sheet and its key, and the two share one layout", () => {
  const pages = draw({ questions: 20, answerKey: "ABCDABCDABCDABCDABCD" });
  assert.equal(pages.length, 2);
  const student = marksOn(pages[0]);
  const key = marksOn(pages[1]);
  assert.ok(student.every((r) => r.filled === -1));
  assert.equal(key.filter((r) => r.filled >= 0).length, 20);
  /* overlay geometry: every row label sits at the same place on both sheets */
  const labelPositions = (svg) => [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>\d+\.<\/text>/g)].map((m) => m[1] + "," + m[2]);
  assert.deepEqual(labelPositions(pages[0]), labelPositions(pages[1]));
  assert.ok(!texts(pages[0]).some((t) => /^VERSION/.test(t)), "a single version carries no stamp");
});

test("no key prints student sheets only", () => {
  assert.equal(draw({ questions: 10, versions: "3" }).length, 3);
  assert.equal(draw({ questions: 10 }).length, 1);
});

test("the print control selects the sheets", () => {
  assert.equal(draw({ questions: 10, versions: "3", answerKey: KEY, sheets: "students" }).length, 3);
  assert.equal(draw({ questions: 10, versions: "3", answerKey: KEY, sheets: "keys" }).length, 3);
  assert.throws(() => draw({ questions: 10, sheets: "keys" }), /No answer key/);
});

test("a multi-page sheet keeps its page numbers per version", () => {
  const pages = draw({ questions: 200, versions: "2", answerKey: "ABCD", columns: 2 });
  const perSheet = pages.length / 4;
  assert.ok(perSheet > 1 && Number.isInteger(perSheet), `expected 4 equal runs, got ${pages.length} pages`);
  assert.ok(texts(pages[0]).includes("Page 1 of " + perSheet));
  assert.ok(texts(pages[perSheet]).includes("Page 1 of " + perSheet), "version B restarts at page 1");
});

test("the download name carries the versions and the key", () => {
  /* joined, because an array made inside the VM context has a different Array prototype */
  assert.equal(TOOL.filename({ questions: 10, versions: "3", sheets: "both" }).join(","), "10-questions,3-versions");
  assert.equal(TOOL.filename({ questions: 10, versions: "1", sheets: "keys" }).join(","), "10-questions,key");
});
