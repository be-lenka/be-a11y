const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/headingEmpty");

test("flags an empty heading", () => {
  const e = rule("<h2></h2>", "f");
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].type, "heading-empty");
});

test("flags a whitespace-only heading", () => {
  assert.strictEqual(rule("<h2>   </h2>", "f").length, 1);
});

test("a heading named by a child image passes", () => {
  assert.strictEqual(rule('<h2><img alt="Section title"></h2>', "f").length, 0);
});

test("flags an empty role=heading element", () => {
  assert.strictEqual(rule('<div role="heading" aria-level="2"></div>', "f").length, 1);
});

test("skips hidden headings", () => {
  assert.strictEqual(rule("<h2 hidden></h2>", "f").length, 0);
  assert.strictEqual(rule('<h2 aria-hidden="true"></h2>', "f").length, 0);
});

test("skips role-overridden native headings", () => {
  assert.strictEqual(rule('<h2 role="presentation"></h2>', "f").length, 0);
});

test("a non-empty heading passes", () => {
  assert.strictEqual(rule("<h1>Hello</h1>", "f").length, 0);
});
