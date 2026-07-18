const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const rule = require("../../src/rules/altAttributes");

const types = (html, config) => rule(html, "f", config).map((i) => i.type);

test("missing alt is flagged", () => {
  assert.deepStrictEqual(types('<img src="a.jpg">'), ["missing-alt"]);
});

test('empty alt="" is valid decorative (no finding)', () => {
  assert.deepStrictEqual(types('<img src="a.jpg" alt="">'), []);
});

test("whitespace-only alt -> alt-empty", () => {
  assert.deepStrictEqual(types('<img src="a.jpg" alt=" ">'), ["alt-empty"]);
});

test("role=presentation with missing alt passes", () => {
  assert.deepStrictEqual(types('<img src="a.jpg" role="presentation">'), []);
});

test("role=presentation with non-empty alt -> alt-decorative-incorrect", () => {
  assert.deepStrictEqual(
    types('<img src="a.jpg" role="presentation" alt="Logo">'),
    ["alt-decorative-incorrect"]
  );
});

test('empty alt on sole content of a nameless link -> alt-functional-empty', () => {
  assert.deepStrictEqual(
    types('<a href="/x"><img src="a.jpg" alt=""></a>'),
    ["alt-functional-empty"]
  );
});

test("empty alt in a link that also has text is fine", () => {
  assert.deepStrictEqual(types('<a href="/x"><img src="a.jpg" alt=""> Home</a>'), []);
});

test("aria-label names the image (no missing-alt)", () => {
  assert.deepStrictEqual(types('<img src="a.jpg" aria-label="Company logo">'), []);
});

test("alt over the default 125 chars -> alt-too-long", () => {
  assert.ok(types(`<img src="a.jpg" alt="${"x".repeat(130)}">`).includes("alt-too-long"));
});

test("alt-too-long threshold is configurable", () => {
  const cfg = { options: { "alt-attributes": { maxLength: 30 } } };
  assert.ok(types(`<img src="a.jpg" alt="${"x".repeat(40)}">`, cfg).includes("alt-too-long"));
});

test("templated alt is exempt from alt-too-long", () => {
  assert.ok(!types(`<img src="a.jpg" alt="{{ ${"x".repeat(200)} }}">`).includes("alt-too-long"));
});

test("title duplicating alt -> redundant-title", () => {
  assert.ok(types('<img src="a.jpg" alt="Logo" title="Logo">').includes("redundant-title"));
});

test("input[type=image] without a name -> missing-alt", () => {
  assert.deepStrictEqual(types('<input type="image" src="s.png">'), ["missing-alt"]);
});

test("hidden image is skipped", () => {
  assert.deepStrictEqual(types('<img src="a.jpg" style="display:none">'), []);
});

test("distinct same-line images are both reported (offset de-dupe)", () => {
  const t = types('<img src="a.jpg"><img src="b.jpg">');
  assert.strictEqual(t.filter((x) => x === "missing-alt").length, 2);
});

test("LINE NUMBER: exact raw-source line on a .latte partial", () => {
  const fixture = path.join(__dirname, "..", "fixtures", "violations", "partial.latte");
  const content = fs.readFileSync(fixture, "utf-8");
  const missing = rule(content, fixture).find((i) => i.type === "missing-alt");
  assert.ok(missing, "missing-alt found in partial.latte");
  assert.strictEqual(missing.line, 4, "the <img> is on line 4 of the raw source");
});
