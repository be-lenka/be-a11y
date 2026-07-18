const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/contrast");

test("low contrast is flagged", () => {
  const e = rule('<p style="color:#777;background-color:#888">Hi</p>', "f");
  assert.strictEqual(e[0].type, "contrast");
});

test("good contrast passes", () => {
  assert.strictEqual(rule('<p style="color:#000;background-color:#fff">Hi</p>', "f").length, 0);
});

test("a styled container with no DIRECT text is not flagged (old false positive)", () => {
  assert.strictEqual(
    rule('<div style="color:#777;background-color:#888"><span>Hi</span></div>', "f").length,
    0
  );
});

test("background shorthand: the first color token is used", () => {
  const e = rule('<p style="color:#777;background:#888 url(x.png) no-repeat">Hi</p>', "f");
  assert.strictEqual(e.length, 1);
});

test("translucent colors are skipped", () => {
  assert.strictEqual(
    rule('<p style="color:rgba(0,0,0,0.3);background-color:#fff">Hi</p>', "f").length,
    0
  );
  assert.strictEqual(
    rule('<p style="color:#777;background-color:transparent">Hi</p>', "f").length,
    0
  );
});

test("large text uses the 3:1 threshold, normal text uses 4.5:1", () => {
  const largeOk = '<p style="color:#8c8c8c;background-color:#fff;font-size:24px">Big</p>';
  assert.strictEqual(rule(largeOk, "f").length, 0, "~3.4:1 passes for large text");
  const normalBad = '<p style="color:#8c8c8c;background-color:#fff">Normal</p>';
  assert.strictEqual(rule(normalBad, "f").length, 1, "~3.4:1 fails for normal text");
});

test("a hidden element is skipped", () => {
  assert.strictEqual(
    rule('<p style="color:#777;background-color:#888;display:none">Hi</p>', "f").length,
    0
  );
});
