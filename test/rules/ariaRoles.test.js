const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/ariaRoles");

test("a valid role passes", () => {
  assert.strictEqual(rule('<div role="button">x</div>', "f").length, 0);
});

test("roles the old 12-role allow-list rejected are now valid", () => {
  for (const r of ["tab", "tooltip", "switch", "feed", "search", "term", "code", "time", "figure", "banner"]) {
    assert.strictEqual(rule(`<div role="${r}">x</div>`, "f").length, 0, `role=${r}`);
  }
});

test("an unrecognized role is flagged", () => {
  const e = rule('<div role="buton">x</div>', "f");
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].type, "aria-role-invalid");
});

test("an abstract role gets a specific message", () => {
  const e = rule('<div role="widget">x</div>', "f");
  assert.strictEqual(e.length, 1);
  assert.match(e[0].message, /abstract/);
});

test("a multi-token role list is valid if any token is known", () => {
  assert.strictEqual(rule('<div role="foo button">x</div>', "f").length, 0);
});

test("doc-* and graphics-* roles are accepted", () => {
  assert.strictEqual(rule('<div role="doc-chapter">x</div>', "f").length, 0);
  assert.strictEqual(rule('<div role="graphics-document">x</div>', "f").length, 0);
});

test("a templated role is skipped", () => {
  assert.strictEqual(rule('<div role="{{ role }}">x</div>', "f").length, 0);
});
