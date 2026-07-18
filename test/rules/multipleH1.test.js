const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/multipleH1");

test("flags multiple h1 with per-instance lines", () => {
  const e = rule("<h1>a</h1>\n<h1>b</h1>", "f");
  assert.strictEqual(e.length, 2);
  assert.deepStrictEqual(e.map((x) => x.line), [1, 2]);
});

test("a single h1 passes", () => {
  assert.strictEqual(rule("<h1>a</h1>", "f").length, 0);
});

test("role=heading aria-level=1 counts as a top-level heading", () => {
  const e = rule('<h1>a</h1><div role="heading" aria-level="1">b</div>', "f");
  assert.strictEqual(e.length, 2);
});

test("an h1 demoted via aria-level is not counted", () => {
  assert.strictEqual(rule('<h1>a</h1><h1 aria-level="2">b</h1>', "f").length, 0);
});

test("hidden h1 is not counted", () => {
  assert.strictEqual(rule("<h1>a</h1><h1 hidden>b</h1>", "f").length, 0);
});
