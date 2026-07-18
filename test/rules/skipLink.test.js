const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/skipLink");

test("a full document with no skip mechanism is flagged", () => {
  const e = rule("<!DOCTYPE html><html><body><div>content</div></body></html>", "f");
  assert.strictEqual(e[0].type, "skip-link");
});

test("a <main> landmark satisfies the check", () => {
  assert.strictEqual(rule("<!DOCTYPE html><html><body><main>x</main></body></html>", "f").length, 0);
});

test("an <h1> satisfies the check", () => {
  assert.strictEqual(rule("<!DOCTYPE html><html><body><h1>x</h1></body></html>", "f").length, 0);
});

test("an in-page fragment skip link satisfies the check", () => {
  const html =
    '<!DOCTYPE html><html><body><a href="#content">Skip</a><div id="content">x</div></body></html>';
  assert.strictEqual(rule(html, "f").length, 0);
});

test("a fragment/partial is exempt", () => {
  assert.strictEqual(rule("<div>fragment</div>", "f").length, 0);
});
