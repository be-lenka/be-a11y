const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/headingOrder");

test("flags a skipped level (h1 -> h3)", () => {
  const e = rule("<h1>a</h1><h3>b</h3>", "f");
  assert.strictEqual(e.length, 1);
  assert.match(e[0].message, /h1 to h3/);
});

test("proper descending order passes", () => {
  assert.strictEqual(rule("<h1>a</h1><h2>b</h2><h3>c</h3>", "f").length, 0);
});

test("going back up any number of levels is allowed", () => {
  assert.strictEqual(rule("<h1>a</h1><h2>b</h2><h1>c</h1>", "f").length, 0);
});

test("role=heading with aria-level participates", () => {
  const e = rule('<h1>a</h1><div role="heading" aria-level="4">b</div>', "f");
  assert.strictEqual(e.length, 1);
});

test("hidden headings are excluded from the sequence", () => {
  const e = rule('<h1>a</h1><h2 hidden>x</h2><h3>b</h3>', "f");
  assert.strictEqual(e.length, 1, "h1 -> h3 skip is detected across the hidden h2");
});
