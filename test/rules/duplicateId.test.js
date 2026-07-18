const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/duplicateId");

test("a duplicate id is flagged at the later occurrence", () => {
  const e = rule('<div id="a"></div>\n<div id="a"></div>', "f");
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].line, 2);
  assert.match(e[0].message, /first defined at line 1/);
});

test("unique ids pass", () => {
  assert.strictEqual(rule('<div id="a"></div><div id="b"></div>', "f").length, 0);
});

test("a triple duplicate yields two findings", () => {
  assert.strictEqual(rule('<i id="x"></i><i id="x"></i><i id="x"></i>', "f").length, 2);
});

test("templated ids are ignored", () => {
  assert.strictEqual(rule('<div id="{{ i }}"></div><div id="{{ i }}"></div>', "f").length, 0);
});
