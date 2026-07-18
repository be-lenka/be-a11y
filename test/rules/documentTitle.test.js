const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/documentTitle");

test("a document head with no title is flagged", () => {
  const e = rule("<html><head></head><body></body></html>", "f");
  assert.strictEqual(e[0].type, "document-title");
});

test("a non-empty title passes", () => {
  assert.strictEqual(rule("<html><head><title>Home</title></head></html>", "f").length, 0);
});

test("an empty title is flagged", () => {
  assert.strictEqual(rule("<head><title>   </title></head>", "f").length, 1);
});

test("a templated title passes", () => {
  assert.strictEqual(rule("<head><title>{{ pageTitle }}</title></head>", "f").length, 0);
});

test("a fragment without a head is exempt", () => {
  assert.strictEqual(rule("<div>fragment</div>", "f").length, 0);
});
