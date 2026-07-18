const test = require("node:test");
const assert = require("node:assert");
const { rules, typeMeta } = require("../src/registry");

// The 14 historical config ids. These must never disappear — consuming projects
// depend on them in a11y.config.json.
const LEGACY_IDS = [
  "alt-attributes",
  "aria-invalid",
  "aria-role-invalid",
  "contrast",
  "empty-link",
  "heading-empty",
  "heading-order",
  "iframe-title-missing",
  "label-missing-for",
  "missing-landmark",
  "link-new-tab-warning",
  "missing-aria",
  "multiple-h1",
  "input-unlabeled",
];

test("every rule entry satisfies the contract", () => {
  for (const rule of rules) {
    assert.ok(rule.id && typeof rule.id === "string", `id present: ${rule.id}`);
    assert.ok(
      rule.description && typeof rule.description === "string",
      `description present: ${rule.id}`
    );
    assert.strictEqual(typeof rule.check, "function", `check is fn: ${rule.id}`);
    assert.ok(rule.types && typeof rule.types === "object", `types present: ${rule.id}`);
    assert.ok(Object.keys(rule.types).length >= 1, `>=1 type: ${rule.id}`);
  }
});

test("every emitted type has valid metadata", () => {
  for (const rule of rules) {
    for (const [type, meta] of Object.entries(rule.types)) {
      assert.ok(
        ["error", "warning"].includes(meta.severity),
        `severity of ${type} is error|warning`
      );
      assert.ok(Array.isArray(meta.wcag), `wcag of ${type} is array`);
      assert.ok(
        meta.wcag.every((w) => typeof w === "string"),
        `wcag of ${type} are strings`
      );
      assert.ok(meta.hint && typeof meta.hint === "string", `hint of ${type}`);
      assert.ok(meta.label && typeof meta.label === "string", `label of ${type}`);
      assert.ok(meta.emoji && typeof meta.emoji === "string", `emoji of ${type}`);
    }
  }
});

test("type ids are unique across all rules", () => {
  const seen = new Set();
  for (const rule of rules) {
    for (const type of Object.keys(rule.types)) {
      assert.ok(!seen.has(type), `duplicate type id: ${type}`);
      seen.add(type);
    }
  }
});

test("rule ids are unique", () => {
  const ids = rules.map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test("all 14 legacy config ids are present", () => {
  const ids = new Set(rules.map((r) => r.id));
  for (const id of LEGACY_IDS) assert.ok(ids.has(id), `legacy id present: ${id}`);
});

test("typeMeta is a consistent flat index of every type", () => {
  const total = rules.reduce((n, r) => n + Object.keys(r.types).length, 0);
  assert.strictEqual(Object.keys(typeMeta).length, total);
  for (const rule of rules) {
    for (const [type, meta] of Object.entries(rule.types)) {
      assert.strictEqual(typeMeta[type].ruleId, rule.id);
      assert.strictEqual(typeMeta[type].severity, meta.severity);
    }
  }
});
