const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/metaRefresh");

test("a timed refresh is flagged", () => {
  assert.strictEqual(rule('<meta http-equiv="refresh" content="5">', "f")[0].type, "meta-refresh");
});

test("a timed redirect with a url is flagged", () => {
  assert.strictEqual(rule('<meta http-equiv="refresh" content="10; url=/next">', "f").length, 1);
});

test("a delay of 0 (immediate redirect) is exempt", () => {
  assert.strictEqual(rule('<meta http-equiv="refresh" content="0; url=/next">', "f").length, 0);
});

test("a delay of >= 20 hours is exempt", () => {
  assert.strictEqual(rule('<meta http-equiv="refresh" content="72000">', "f").length, 0);
});
