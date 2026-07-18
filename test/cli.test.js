const test = require("node:test");
const assert = require("node:assert");
const { execFile } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const registry = require("../src/registry");

const CLI = path.join(__dirname, "..", "index.js");
const VIOL = path.join(__dirname, "fixtures", "violations");
const CLEAN = path.join(__dirname, "fixtures", "clean");

// Scrub Actions/INPUT_* env so the CLI's grammar is deterministic under CI.
const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) {
  if (key === "GITHUB_ACTIONS" || key.startsWith("INPUT_")) delete cleanEnv[key];
}

function run(args) {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { env: cleanEnv, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout, stderr });
      }
    );
  });
}

test("no args -> exit 2", async () => {
  const { code } = await run([]);
  assert.strictEqual(code, 2);
});

test("bad path -> exit 2", async () => {
  const { code } = await run([path.join(__dirname, "nope-xyz")]);
  assert.strictEqual(code, 2);
});

test("unknown flag -> exit 2", async () => {
  const { code } = await run([VIOL, "--nope"]);
  assert.strictEqual(code, 2);
});

test("violations -> exit 1 with banner on stdout", async () => {
  const { code, stdout } = await run([VIOL]);
  assert.strictEqual(code, 1);
  assert.match(stdout, /🚨 Accessibility Issues Found/);
});

test("single file with violations -> exit 1", async () => {
  const { code } = await run([path.join(VIOL, "page.html")]);
  assert.strictEqual(code, 1);
});

test("clean + report path -> exit 0, report written even when clean", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bea11y-cli-"));
  const reportPath = path.join(dir, "r.json");
  const { code } = await run([CLEAN, reportPath]);
  assert.strictEqual(code, 0);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  assert.strictEqual(report.schemaVersion, 2);
  assert.deepStrictEqual(report.issues, []);
});

test("--json emits pure schema-v2 JSON on stdout", async () => {
  const { stdout } = await run([VIOL, "--json"]);
  const report = JSON.parse(stdout);
  assert.strictEqual(report.schemaVersion, 2);
  assert.ok(Array.isArray(report.issues));
});

test("--list-rules parses and matches the registry", async () => {
  const { code, stdout } = await run(["--list-rules"]);
  assert.strictEqual(code, 0);
  const doc = JSON.parse(stdout);
  assert.strictEqual(doc.schemaVersion, 2);
  assert.strictEqual(doc.rules.length, registry.rules.length);
  assert.ok(doc.rules.length >= 14);
});

test("--help -> exit 0", async () => {
  const { code, stdout } = await run(["--help"]);
  assert.strictEqual(code, 0);
  assert.match(stdout, /Usage:/);
});
