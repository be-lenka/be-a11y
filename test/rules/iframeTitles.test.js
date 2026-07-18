const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/iframeTitles");

test("flags an iframe without a title", () => {
  const e = rule('<iframe src="x"></iframe>', "f");
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].type, "iframe-title-missing");
});

test("a title attribute passes", () => {
  assert.strictEqual(rule('<iframe src="x" title="Map of our office"></iframe>', "f").length, 0);
});

test("aria-label passes", () => {
  assert.strictEqual(rule('<iframe src="x" aria-label="Map"></iframe>', "f").length, 0);
});

test("aria-labelledby passes", () => {
  assert.strictEqual(
    rule('<span id="c">Caption</span><iframe src="x" aria-labelledby="c"></iframe>', "f").length,
    0
  );
});

test("a hidden (e.g. tracking) iframe is skipped", () => {
  assert.strictEqual(rule('<iframe src="x" aria-hidden="true"></iframe>', "f").length, 0);
  assert.strictEqual(rule('<iframe src="x" style="display:none"></iframe>', "f").length, 0);
});
