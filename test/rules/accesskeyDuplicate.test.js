const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/accesskeyDuplicate");

test("a duplicate accesskey is flagged", () => {
  const e = rule('<a accesskey="s">A</a>\n<button accesskey="s">B</button>', "f");
  assert.strictEqual(e.length, 1);
  assert.match(e[0].message, /first used at line 1/);
});

test("duplicate detection is case-insensitive", () => {
  assert.strictEqual(rule('<a accesskey="S">A</a><b accesskey="s">B</b>', "f").length, 1);
});

test("unique accesskeys pass", () => {
  assert.strictEqual(rule('<a accesskey="a">A</a><b accesskey="b">B</b>', "f").length, 0);
});

test("templated accesskeys are skipped", () => {
  assert.strictEqual(rule('<a accesskey="{{ k }}">A</a><b accesskey="{{ k }}">B</b>', "f").length, 0);
});
