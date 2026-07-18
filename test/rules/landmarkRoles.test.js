const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/landmarkRoles");

test("a full document with no landmarks is flagged", () => {
  const e = rule("<!DOCTYPE html><html><body><div>hi</div></body></html>", "f");
  assert.strictEqual(e[0].type, "missing-landmark");
});

test("a full document with <main> passes", () => {
  assert.strictEqual(
    rule("<!DOCTYPE html><html><body><main>hi</main></body></html>", "f").length,
    0
  );
});

test("a role-based landmark passes", () => {
  assert.strictEqual(
    rule('<!DOCTYPE html><html><body><div role="main">hi</div></body></html>', "f").length,
    0
  );
});

test("a partial/fragment is exempt (only full documents are checked)", () => {
  assert.strictEqual(rule("<div>just a fragment</div>", "f").length, 0);
});

test("the finding is anchored at the <body> line", () => {
  const e = rule("<!DOCTYPE html>\n<html>\n<body>\n<div>hi</div>\n</body>\n</html>", "f");
  assert.strictEqual(e[0].line, 3);
});
