const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/deprecatedElements");

test("<marquee> is flagged", () => {
  assert.strictEqual(rule("<marquee>hi</marquee>", "f")[0].type, "deprecated-elements");
});

test("<blink> is flagged", () => {
  assert.strictEqual(rule("<blink>hi</blink>", "f").length, 1);
});

test("normal elements pass", () => {
  assert.strictEqual(rule("<div>hi</div>", "f").length, 0);
});
