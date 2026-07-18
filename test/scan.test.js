const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { scanPath, buildReport } = require("..");

const VIOL = path.join(__dirname, "fixtures", "violations");
const CLEAN = path.join(__dirname, "fixtures", "clean");

test("directory walk honors extensions and excluded dirs", () => {
  const { issues, filesScanned } = scanPath(VIOL);
  assert.strictEqual(filesScanned, 2, "only page.html + partial.latte");
  assert.ok(
    !issues.some((i) => i.file.split(path.sep).includes("vendor")),
    "vendor/ is excluded"
  );
  assert.ok(!issues.some((i) => i.file.endsWith(".txt")), "notes.txt ignored");
});

test("issues are sorted by file then line", () => {
  const { issues } = scanPath(VIOL);
  for (let i = 1; i < issues.length; i++) {
    const a = issues[i - 1];
    const b = issues[i];
    const inOrder =
      a.file < b.file || (a.file === b.file && a.line <= b.line);
    assert.ok(inOrder, `ordered at ${i}: ${a.file}:${a.line} -> ${b.file}:${b.line}`);
  }
});

test("single-file scan works (was a silent no-op)", () => {
  const { issues, filesScanned } = scanPath(path.join(VIOL, "page.html"));
  assert.strictEqual(filesScanned, 1);
  assert.ok(issues.length > 0);
});

test("ENOENT path throws", () => {
  assert.throws(() => scanPath(path.join(__dirname, "does-not-exist-xyz")));
});

test("buildReport: schema, clean shape, filesScanned", () => {
  const { issues, filesScanned } = scanPath(CLEAN);
  const report = buildReport(issues, { target: "test/fixtures/clean", filesScanned });
  assert.strictEqual(report.schemaVersion, 2);
  assert.ok(report.tool.name && report.tool.version, "tool identity present");
  assert.strictEqual(report.summary.total, 0);
  assert.strictEqual(report.summary.filesScanned, 1);
  assert.deepStrictEqual(report.issues, []);
  assert.strictEqual(report.target, "test/fixtures/clean");
});

test("buildReport: counts and byType sorting", () => {
  const { issues } = scanPath(VIOL);
  const report = buildReport(issues, { filesScanned: 2 });
  assert.strictEqual(report.summary.total, issues.length);
  assert.strictEqual(
    report.summary.errors + report.summary.warnings,
    issues.length
  );
  const keys = Object.keys(report.summary.byType);
  assert.deepStrictEqual(keys, [...keys].sort(), "byType keys sorted");
});
