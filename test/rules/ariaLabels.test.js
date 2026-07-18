const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/ariaLabels");

test("an empty aria-label is flagged", () => {
  const e = rule('<div aria-label="">x</div>', "f");
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].type, "aria-invalid");
});

test("a valid aria-labelledby passes", () => {
  assert.strictEqual(
    rule('<span id="t">Title</span><div aria-labelledby="t">x</div>', "f").length,
    0
  );
});

test("a missing aria-labelledby id is flagged", () => {
  const e = rule('<div aria-labelledby="nope">x</div>', "f");
  assert.strictEqual(e.length, 1);
  assert.match(e[0].message, /non-existent/);
});

test("CRASH-FIX: ids with selector metacharacters do not throw", () => {
  const html = '<span id="a.b:c">T</span><div aria-labelledby="a.b:c">x</div>';
  assert.doesNotThrow(() => rule(html, "f"));
  assert.strictEqual(rule(html, "f").length, 0, "the id resolves — no false positive");
});

test("a templated aria-labelledby is skipped", () => {
  assert.strictEqual(rule('<div aria-labelledby="{{ id }}">x</div>', "f").length, 0);
});

test("multiple references, only the missing one is reported", () => {
  const e = rule('<span id="a">A</span><div aria-labelledby="a b">x</div>', "f");
  assert.strictEqual(e.length, 1);
  assert.match(e[0].message, /\bb\b/);
});
