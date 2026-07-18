const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/fieldsetLegend");

const kinds = (html) => rule(html, "f").filter((i) => i.type === "fieldset-legend");

test("grouped radios not in a named group are flagged", () => {
  const html = '<form><input type="radio" name="color"><input type="radio" name="color"></form>';
  assert.strictEqual(kinds(html).length, 1);
});

test("grouped radios inside a named fieldset pass", () => {
  const html =
    '<fieldset><legend>Color</legend><input type="radio" name="c"><input type="radio" name="c"></fieldset>';
  assert.strictEqual(rule(html, "f").length, 0);
});

test("a fieldset without a legend is flagged (once, not doubled)", () => {
  const html =
    '<fieldset><input type="radio" name="c"><input type="radio" name="c"></fieldset>';
  assert.strictEqual(kinds(html).length, 1);
});

test("a single radio is not flagged", () => {
  assert.strictEqual(rule('<input type="radio" name="x">', "f").length, 0);
});

test("templated names are skipped", () => {
  const html = '<input type="radio" name="{{ n }}"><input type="radio" name="{{ n }}">';
  assert.strictEqual(rule(html, "f").length, 0);
});
