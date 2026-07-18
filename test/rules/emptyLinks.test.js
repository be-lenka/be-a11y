const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/emptyLinks");

test("an empty link WITH href is flagged (missed by the old rule)", () => {
  const e = rule('<a href="/products"></a>', "f");
  assert.strictEqual(e[0].type, "empty-link");
});

test("a link with text passes", () => {
  assert.strictEqual(rule('<a href="/x">Home</a>', "f").length, 0);
});

test("a link named by an img alt passes (old false positive)", () => {
  assert.strictEqual(rule('<a href="#"><img alt="Home"></a>', "f").length, 0);
});

test("aria-label provides a name", () => {
  assert.strictEqual(rule('<a href="/x" aria-label="Home"></a>', "f").length, 0);
});

test("partition: a link wrapping an unnamed img is NOT double-reported", () => {
  assert.strictEqual(rule('<a href="/x"><img src="a.jpg"></a>', "f").length, 0);
});

test("href-less anchors are ignored", () => {
  assert.strictEqual(rule("<a></a>", "f").length, 0);
  assert.strictEqual(rule('<a name="top"></a>', "f").length, 0);
});

test("a hidden link is skipped", () => {
  assert.strictEqual(rule('<a href="/x" aria-hidden="true"></a>', "f").length, 0);
});
