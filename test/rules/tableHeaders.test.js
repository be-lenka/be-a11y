const test = require("node:test");
const assert = require("node:assert");
const rule = require("../../src/rules/tableHeaders");

test("a data table with no header cells is flagged", () => {
  const html = "<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>";
  assert.strictEqual(rule(html, "f")[0].type, "table-headers");
});

test("a table with <th> passes", () => {
  const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
  assert.strictEqual(rule(html, "f").length, 0);
});

test('role="presentation" tables are skipped', () => {
  const html =
    '<table role="presentation"><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>';
  assert.strictEqual(rule(html, "f").length, 0);
});

test("a single-row table is not treated as a data table", () => {
  assert.strictEqual(rule("<table><tr><td>1</td><td>2</td></tr></table>", "f").length, 0);
});
