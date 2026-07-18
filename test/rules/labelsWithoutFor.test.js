const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/labelsWithoutFor");

test("a label with a valid for= passes", () => {
  assert.strictEqual(rule('<label for="e">Email</label><input id="e">', "f").length, 0);
});

test("for= pointing at no element -> label-for-missing", () => {
  const e = rule('<label for="nope">X</label>', "f");
  assert.strictEqual(e[0].type, "label-for-missing");
});

test("for= pointing at a non-labelable element -> label-for-missing", () => {
  const e = rule('<label for="d">X</label><div id="d"></div>', "f");
  assert.strictEqual(e[0].type, "label-for-missing");
  assert.match(e[0].message, /not a labelable/);
});

test("a label wrapping a control passes", () => {
  assert.strictEqual(rule("<label>Email <input></label>", "f").length, 0);
});

test("a label with neither for= nor a nested control -> label-missing-for", () => {
  const e = rule("<label>Orphan</label>", "f");
  assert.strictEqual(e[0].type, "label-missing-for");
});

test("a templated for= is skipped", () => {
  assert.strictEqual(rule('<label for="{{ id }}">X</label>', "f").length, 0);
});

test("CRASH-FIX: for= with selector metacharacters does not throw", () => {
  assert.doesNotThrow(() => rule('<label for="a.b">X</label><input id="a.b">', "f"));
  assert.strictEqual(rule('<label for="a.b">X</label><input id="a.b">', "f").length, 0);
});
