const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/linksOpenNewTab");

test("target=_blank without a warning is flagged", () => {
  const e = rule('<a href="/x" target="_blank">Docs</a>', "f");
  assert.strictEqual(e[0].type, "link-new-tab-warning");
});

test("visible text mentioning a new tab passes", () => {
  assert.strictEqual(
    rule('<a href="/x" target="_blank">Docs (opens in a new tab)</a>', "f").length,
    0
  );
});

test("aria-label mentioning a new window passes", () => {
  assert.strictEqual(
    rule('<a href="/x" target="_blank" aria-label="Docs, opens in new window">Docs</a>', "f").length,
    0
  );
});

test("a screen-reader-only note passes", () => {
  assert.strictEqual(
    rule('<a href="/x" target="_blank">Docs <span class="sr-only">(opens in a new tab)</span></a>', "f").length,
    0
  );
});

test("target matching is case-insensitive", () => {
  assert.strictEqual(rule('<a href="/x" target="_BLANK">Docs</a>', "f").length, 1);
});

test("phrases are configurable for non-English projects", () => {
  const cfg = { options: { "link-new-tab": { phrases: ["nová karta"] } } };
  assert.strictEqual(
    rule('<a href="/x" target="_blank">Dokumenty (nová karta)</a>', "f", cfg).length,
    0
  );
});

test("a hidden link is skipped", () => {
  assert.strictEqual(rule('<a href="/x" target="_blank" hidden>Docs</a>', "f").length, 0);
});
