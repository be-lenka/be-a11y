const test = require("node:test");
const assert = require("node:assert");
const { analyzeContent } = require("..");
const registry = require("../src/registry");

/** Runs `fn` with stderr suppressed (rule-crash / unknown-type diagnostics). */
function quiet(fn) {
  const orig = process.stderr.write;
  process.stderr.write = () => true;
  try {
    return fn();
  } finally {
    process.stderr.write = orig;
  }
}

test("enriches issues with registry metadata + source snippet", () => {
  const issues = analyzeContent(`<img src="x.jpg">`, "inline.html");
  const missing = issues.find((i) => i.type === "missing-alt");
  assert.ok(missing, "missing-alt emitted");
  assert.strictEqual(missing.ruleId, "alt-attributes");
  assert.strictEqual(missing.severity, "error");
  assert.deepStrictEqual(missing.wcag, ["1.1.1"]);
  assert.ok(missing.hint && typeof missing.hint === "string");
  assert.ok(missing.snippet.includes("<img"), "snippet is the source line");
});

test("snippet is trimmed and capped at ~120 chars", () => {
  const longLine = `<img src="${"a".repeat(200)}">`;
  const missing = analyzeContent(longLine, "x.html").find((i) => i.type === "missing-alt");
  assert.ok(missing.snippet.length <= 121, "capped");
  assert.ok(missing.snippet.endsWith("…"), "ellipsis appended");
});

test("a crashing rule is contained — scan still returns other issues", () => {
  const boom = {
    id: "__boom__",
    description: "always throws",
    check() {
      throw new Error("boom");
    },
    types: {},
  };
  registry.rules.push(boom);
  try {
    const issues = quiet(() => analyzeContent(`<img src="x.jpg">`, "x.html"));
    assert.ok(
      issues.some((i) => i.type === "missing-alt"),
      "other rules still ran despite the crash"
    );
  } finally {
    registry.rules.pop();
  }
});

test("module-level toggle disables a whole rule", () => {
  const issues = analyzeContent(`<img src="x.jpg">`, "x.html", {
    rules: { "alt-attributes": false },
  });
  assert.ok(!issues.some((i) => i.type === "missing-alt"));
});

test("type-level toggle drops one type but keeps the rule running", () => {
  const html = `<img src="a.jpg">\n<img alt="${"x".repeat(200)}" src="b.jpg">`;
  const issues = analyzeContent(html, "x.html", { rules: { "missing-alt": false } });
  assert.ok(!issues.some((i) => i.type === "missing-alt"), "missing-alt suppressed");
  assert.ok(
    issues.some((i) => i.type === "alt-too-long"),
    "sibling type from the same rule still emitted"
  );
});

test("issues are returned sorted by line", () => {
  const html = `<img src="a.jpg">\n<img src="b.jpg">\n<img src="c.jpg">`;
  const lines = analyzeContent(html, "x.html")
    .filter((i) => i.type === "missing-alt")
    .map((i) => i.line);
  assert.deepStrictEqual(lines, [...lines].sort((a, b) => a - b));
});
