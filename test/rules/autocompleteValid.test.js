const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/autocompleteValid");

test("a valid single token passes", () => {
  assert.strictEqual(rule('<input autocomplete="email">', "f").length, 0);
});

test("on/off pass", () => {
  assert.strictEqual(rule('<input autocomplete="on"><input autocomplete="off">', "f").length, 0);
});

test("valid multi-token sequences pass", () => {
  assert.strictEqual(rule('<input autocomplete="shipping street-address">', "f").length, 0);
  assert.strictEqual(rule('<input autocomplete="section-a billing work email">', "f").length, 0);
});

test("a trailing webauthn token is allowed", () => {
  assert.strictEqual(rule('<input autocomplete="username webauthn">', "f").length, 0);
});

test("an unknown field token is flagged", () => {
  assert.strictEqual(rule('<input autocomplete="fullname">', "f")[0].type, "autocomplete-valid");
});

test("a contact modifier on a non-contact field is flagged", () => {
  assert.strictEqual(rule('<input autocomplete="work street-address">', "f").length, 1);
});

test("a templated value is skipped", () => {
  assert.strictEqual(rule('<input autocomplete="{{ x }}">', "f").length, 0);
});
