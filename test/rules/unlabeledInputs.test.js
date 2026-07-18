const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/unlabeledInputs");

test("a bare text input -> input-unlabeled", () => {
  const e = rule('<input type="text">', "f");
  assert.strictEqual(e[0].type, "input-unlabeled");
});

test("all name-needing input types are flagged when unlabeled", () => {
  for (const t of ["email", "tel", "url", "search", "password", "number", "date", "file", "color", "range", "checkbox", "radio"]) {
    assert.strictEqual(rule(`<input type="${t}">`, "f").length, 1, `type=${t}`);
  }
});

test("select and textarea are flagged when unlabeled", () => {
  assert.strictEqual(rule("<select></select>", "f").length, 1);
  assert.strictEqual(rule("<textarea></textarea>", "f").length, 1);
});

test("label[for] provides a name", () => {
  assert.strictEqual(
    rule('<label for="e">Email</label><input id="e" type="email">', "f").length,
    0
  );
});

test("a wrapping label provides a name", () => {
  assert.strictEqual(rule("<label>Name <input></label>", "f").length, 0);
});

test("aria-label provides a name", () => {
  assert.strictEqual(rule('<input aria-label="Search">', "f").length, 0);
});

test("placeholder-only -> input-placeholder-only warning", () => {
  const e = rule('<input type="text" placeholder="Search">', "f");
  assert.strictEqual(e[0].type, "input-placeholder-only");
});

test("submit/reset/button/hidden/image are exempt", () => {
  for (const t of ["submit", "reset", "button", "hidden", "image"]) {
    assert.strictEqual(rule(`<input type="${t}">`, "f").length, 0, `type=${t}`);
  }
});

test("a hidden input is skipped", () => {
  assert.strictEqual(rule('<input type="text" style="display:none">', "f").length, 0);
});
