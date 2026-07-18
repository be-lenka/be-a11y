const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/emptyButton");

test("an empty button is flagged", () => {
  assert.strictEqual(rule("<button></button>", "f")[0].type, "empty-button");
});

test("a button with text passes", () => {
  assert.strictEqual(rule("<button>Save</button>", "f").length, 0);
});

test("aria-label provides a name", () => {
  assert.strictEqual(rule('<button aria-label="Close"></button>', "f").length, 0);
});

test("input[type=button] without a value is flagged", () => {
  assert.strictEqual(rule('<input type="button">', "f").length, 1);
});

test("input[type=submit] is exempt (UA default label)", () => {
  assert.strictEqual(rule('<input type="submit">', "f").length, 0);
});

test("an empty role=button is flagged", () => {
  assert.strictEqual(rule('<div role="button"></div>', "f").length, 1);
});

test("partition: a button with an unnamed svg is left to missingAria", () => {
  assert.strictEqual(rule("<button><svg></svg></button>", "f").length, 0);
});

test("a hidden button is skipped", () => {
  assert.strictEqual(rule("<button hidden></button>", "f").length, 0);
});
