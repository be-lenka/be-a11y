const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/listStructure");

test("a <div> directly inside <ul> is flagged", () => {
  assert.strictEqual(rule("<ul><div>x</div></ul>", "f")[0].type, "list-structure");
});

test("a proper list passes", () => {
  assert.strictEqual(rule("<ul><li>a</li><li>b</li></ul>", "f").length, 0);
});

test("an <li> outside a list is flagged", () => {
  assert.strictEqual(rule("<section><li>x</li></section>", "f").length, 1);
});

test("a <dl> with an invalid child is flagged", () => {
  assert.strictEqual(rule("<dl><span>x</span></dl>", "f").length, 1);
});

test("a <dl> with dt/dd passes", () => {
  assert.strictEqual(rule("<dl><dt>Term</dt><dd>Definition</dd></dl>", "f").length, 0);
});

test("template control-flow (text nodes) produces no false positive", () => {
  assert.strictEqual(rule("<ul>{% for x in y %}<li>{{ x }}</li>{% endfor %}</ul>", "f").length, 0);
});

test("a list repurposed by role is skipped", () => {
  assert.strictEqual(rule('<ul role="tablist"><div role="tab">A</div></ul>', "f").length, 0);
});
