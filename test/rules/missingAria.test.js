const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/missingAria");

test("a bare svg with no name is flagged", () => {
  const e = rule("<svg></svg>", "f");
  assert.strictEqual(e[0].type, "missing-aria");
});

test("an svg with a <title> passes", () => {
  assert.strictEqual(rule("<svg><title>Sales chart</title></svg>", "f").length, 0);
});

test("svg[role=img] with no name is flagged", () => {
  assert.strictEqual(rule('<svg role="img"></svg>', "f").length, 1);
});

test("a decorative icon svg inside a NAMED button passes", () => {
  assert.strictEqual(rule("<button>Menu <svg></svg></button>", "f").length, 0);
});

test("an svg inside a NAMELESS button is still flagged", () => {
  assert.strictEqual(rule("<button><svg></svg></button>", "f").length, 1);
});

test("an aria-hidden svg is skipped", () => {
  assert.strictEqual(rule('<svg aria-hidden="true"></svg>', "f").length, 0);
});

test("a single unnamed nav is fine", () => {
  assert.strictEqual(rule('<nav><a href="/">Home</a></nav>', "f").length, 0);
});

test("two unnamed navs are both flagged", () => {
  const e = rule('<nav><a href="/">A</a></nav><nav><a href="/b">B</a></nav>', "f");
  assert.strictEqual(e.filter((i) => i.type === "missing-aria").length, 2);
});

test("with two navs, only the unnamed one is flagged", () => {
  const e = rule(
    '<nav aria-label="Primary"><a href="/">A</a></nav><nav><a href="/b">B</a></nav>',
    "f"
  );
  assert.strictEqual(e.length, 1);
});

test("dropped scope: a plain text input is NOT flagged by missingAria", () => {
  assert.strictEqual(rule('<input type="text">', "f").length, 0);
});

test("dropped scope: a plain link is NOT flagged by missingAria", () => {
  assert.strictEqual(rule('<a href="/x"></a>', "f").length, 0);
});
