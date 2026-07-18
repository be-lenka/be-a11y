const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/metaViewport");

test("user-scalable=no is flagged", () => {
  const e = rule('<meta name="viewport" content="width=device-width, user-scalable=no">', "f");
  assert.strictEqual(e[0].type, "meta-viewport");
});

test("maximum-scale below 2 is flagged", () => {
  assert.strictEqual(
    rule('<meta name="viewport" content="width=device-width, maximum-scale=1.0">', "f").length,
    1
  );
});

test("a normal viewport passes", () => {
  assert.strictEqual(
    rule('<meta name="viewport" content="width=device-width, initial-scale=1">', "f").length,
    0
  );
});

test("maximum-scale of 5 passes", () => {
  assert.strictEqual(rule('<meta name="viewport" content="maximum-scale=5">', "f").length, 0);
});

test("a non-viewport meta is ignored", () => {
  assert.strictEqual(rule('<meta name="description" content="user-scalable=no">', "f").length, 0);
});
