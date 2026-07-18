const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/tabindexPositive");

test("a positive tabindex is flagged", () => {
  assert.strictEqual(rule('<div tabindex="3">x</div>', "f")[0].type, "tabindex-positive");
});

test('tabindex="0" passes', () => {
  assert.strictEqual(rule('<div tabindex="0">x</div>', "f").length, 0);
});

test('tabindex="-1" passes', () => {
  assert.strictEqual(rule('<div tabindex="-1">x</div>', "f").length, 0);
});

test("a templated tabindex is skipped", () => {
  assert.strictEqual(rule('<div tabindex="{{ i }}">x</div>', "f").length, 0);
});
