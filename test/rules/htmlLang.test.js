const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/htmlLang");

test("a literal <html> missing lang is flagged", () => {
  const e = rule("<!DOCTYPE html><html><head></head><body></body></html>", "f");
  assert.strictEqual(e[0].type, "html-lang");
});

test("a valid lang passes", () => {
  assert.strictEqual(rule('<html lang="en"><body></body></html>', "f").length, 0);
});

test("a valid lang with region subtag passes", () => {
  assert.strictEqual(rule('<html lang="en-US"><body></body></html>', "f").length, 0);
});

test("an invalid lang value is flagged", () => {
  assert.strictEqual(rule('<html lang="english"><body></body></html>', "f").length, 1);
});

test("a templated lang is skipped", () => {
  assert.strictEqual(rule('<html lang="{{ locale }}"><body></body></html>', "f").length, 0);
});

test("a fragment without a literal <html> is exempt", () => {
  assert.strictEqual(rule("<div>fragment</div>", "f").length, 0);
});
