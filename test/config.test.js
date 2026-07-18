const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const loadConfig = require("../src/utils/configuration");

function writeTmp(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bea11y-cfg-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

function quiet(fn) {
  const orig = process.stderr.write;
  process.stderr.write = () => true;
  try {
    return fn();
  } finally {
    process.stderr.write = orig;
  }
}

test("missing file -> silent defaults", () => {
  const cfg = loadConfig(path.join(os.tmpdir(), "bea11y-definitely-missing.json"));
  assert.deepStrictEqual(cfg.rules, {});
  assert.deepStrictEqual(cfg.options, {});
  assert.ok(cfg.allowedExtensions.includes(".html"));
  assert.ok(cfg.excludedDirs.includes("node_modules"));
});

test("malformed JSON -> defaults", () => {
  const p = writeTmp("bad.json", "{ not valid json ");
  const cfg = quiet(() => loadConfig(p));
  assert.deepStrictEqual(cfg.rules, {});
  assert.ok(cfg.allowedExtensions.includes(".html"));
});

test("allowedExtensions object-map merges over defaults (true adds, false removes)", () => {
  const p = writeTmp(
    "c.json",
    JSON.stringify({ allowedExtensions: { ".vue": true, ".php": false } })
  );
  const cfg = loadConfig(p);
  assert.ok(cfg.allowedExtensions.includes(".vue"), "added .vue");
  assert.ok(!cfg.allowedExtensions.includes(".php"), "removed .php");
  assert.ok(cfg.allowedExtensions.includes(".html"), "kept default .html");
});

test("allowedExtensions array replaces defaults", () => {
  const p = writeTmp("c.json", JSON.stringify({ allowedExtensions: [".html", ".vue"] }));
  const cfg = loadConfig(p);
  assert.deepStrictEqual([...cfg.allowedExtensions].sort(), [".html", ".vue"]);
});

test("excludedDirs object-map merges over defaults", () => {
  const p = writeTmp(
    "c.json",
    JSON.stringify({ excludedDirs: { cache: true, vendor: false } })
  );
  const cfg = loadConfig(p);
  assert.ok(cfg.excludedDirs.includes("cache"), "added cache");
  assert.ok(!cfg.excludedDirs.includes("vendor"), "removed vendor");
  assert.ok(cfg.excludedDirs.includes("node_modules"), "kept default");
});

test("options namespace is preserved", () => {
  const p = writeTmp(
    "c.json",
    JSON.stringify({ options: { "alt-attributes": { maxLength: 200 } } })
  );
  const cfg = loadConfig(p);
  assert.strictEqual(cfg.options["alt-attributes"].maxLength, 200);
});

test("rules map is passed through", () => {
  const p = writeTmp("c.json", JSON.stringify({ rules: { contrast: false } }));
  const cfg = loadConfig(p);
  assert.strictEqual(cfg.rules.contrast, false);
});
