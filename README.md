# be-a11y

**be-a11y** is a Node.js accessibility (a11y) auditor for HTML-based projects. It
scans a local directory of templates, a single file, or a remote URL, runs 29
rules covering WCAG 2.1 / EAA-relevant issues, and prints a grouped, color-coded
report — or a structured JSON document for CI and tooling. It exits non-zero when
issues are found, so it can gate a pipeline.

It ships three ways: a **CLI**, a **Node API** (`require()`-able), and a **GitHub
Action**.

![Accessibility Checker](https://github.com/user-attachments/assets/40c82668-7894-4560-a7ed-77f892021bdd)

> Working from a script or an agent? See **[AGENTS.md](./AGENTS.md)** for the
> machine contract (exit codes, JSON schema, Node API).

## Install

```bash
npm i @belenkadev/be-a11y      # requires Node >= 20.18.1

# or from source
git clone git@github.com:be-lenka/be-a11y.git && cd be-a11y && npm install
```

## Usage

```bash
be-a11y <dir|file|url> [report.json] [--json] [--list-rules] [--help]

# examples
node index.js ./public                 # scan a directory recursively
node index.js ./templates/page.latte   # scan a single file
node index.js https://example.com      # scan a live URL
node index.js ./public report.json     # scan + write a JSON report
node index.js ./public --json          # print the JSON report to stdout
node index.js --list-rules             # list all rules + metadata as JSON
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No issues found. |
| `1` | Accessibility issues found. |
| `2` | Usage/environment error (no input, bad path, fetch failure / HTTP non-2xx, report-write failure, unknown flag). |

### Output streams

- **stdout** — the report (human report + summary, the `✅` clean line, or JSON).
  The `🚨 Accessibility Issues Found:` banner is on stdout (so CI greps of stdout
  work).
- **stderr** — diagnostics only (errors, config warnings, per-rule crash notices,
  the `📦 Results exported…` line). This keeps `--json` stdout pure.

## Severity levels

Every issue has a **severity**: `error` or `warning`. The summary reports both,
e.g. `✖ 9 problems (6 errors, 3 warnings)`. In the JSON report, branch on
`issue.severity` (and `summary.errors` / `summary.warnings`).

## Rules (29)

All rules are enabled by default. Toggle them in `a11y.config.json`.

| Rule id (config key) | Emitted types (severity, WCAG) |
|---|---|
| `alt-attributes` | `missing-alt` (error, 1.1.1); `alt-empty` (warn, 1.1.1); `alt-too-long` (warn); `alt-decorative-incorrect` (warn, 1.1.1); `alt-functional-empty` (error, 1.1.1/2.4.4); `redundant-title` (warn) |
| `aria-invalid` | `aria-invalid` (error, 4.1.2) |
| `aria-role-invalid` | `aria-role-invalid` (error, 4.1.2) |
| `contrast` | `contrast` (error, 1.4.3) |
| `empty-link` | `empty-link` (error, 2.4.4/4.1.2) |
| `heading-empty` | `heading-empty` (error, 1.3.1/2.4.6) |
| `heading-order` | `heading-order` (warn, 1.3.1) |
| `iframe-title-missing` | `iframe-title-missing` (error, 4.1.2) |
| `label-missing-for` | `label-for-missing` (error, 1.3.1/4.1.2); `label-missing-for` (warn, 1.3.1) |
| `missing-landmark` | `missing-landmark` (warn, 1.3.1/2.4.1) |
| `link-new-tab-warning` | `link-new-tab-warning` (warn, 3.2.2) |
| `missing-aria` | `missing-aria` (warn, 4.1.2/1.1.1) |
| `multiple-h1` | `multiple-h1` (warn) |
| `input-unlabeled` | `input-unlabeled` (error, 1.3.1/4.1.2); `input-placeholder-only` (warn, 3.3.2) |
| `html-lang` | `html-lang` (error, 3.1.1) |
| `document-title` | `document-title` (error, 2.4.2) |
| `duplicate-id` | `duplicate-id` (error, 4.1.1) |
| `empty-button` | `empty-button` (error, 4.1.2) |
| `tabindex-positive` | `tabindex-positive` (warn, 2.4.3) |
| `meta-viewport` | `meta-viewport` (error, 1.4.4) |
| `table-headers` | `table-headers` (warn, 1.3.1) |
| `meta-refresh` | `meta-refresh` (error, 2.2.1) |
| `skip-link` | `skip-link` (warn, 2.4.1) |
| `fieldset-legend` | `fieldset-legend` (warn, 1.3.1/3.3.2) |
| `autocomplete-valid` | `autocomplete-valid` (error, 1.3.5) |
| `list-structure` | `list-structure` (error, 1.3.1) |
| `media-captions` | `media-captions` (warn, 1.2.2) |
| `accesskey-duplicate` | `accesskey-duplicate` (warn) |
| `deprecated-elements` | `deprecated-elements` (error, 2.2.2) |

`node index.js --list-rules` prints this as JSON, including each type's hint and
label.

## Configuration (`a11y.config.json`)

```jsonc
{
  "rules": {
    "contrast": false,          // module toggle: disable a whole rule by its id
    "alt-too-long": false,      // type toggle: silence one type, keep the rule
    "missing-landmark": true
  },
  "options": {
    "alt-attributes": { "maxLength": 125 },
    "link-new-tab": { "phrases": ["nová karta"], "extraClasses": [] }
  },
  "allowedExtensions": { ".vue": true },   // object map merges over defaults
  "excludedDirs": { "cache": true }        // (array form replaces defaults)
}
```

- **Module vs. type toggles** are both honored. A rule id (e.g. `alt-attributes`)
  disables the whole rule; an emitted type (e.g. `alt-too-long`, `redundant-title`)
  silences just that finding. *(This sub-rule toggling is now actually
  implemented.)*
- `duplicate-id` is a real, enabled rule *(it was previously documented but
  never implemented)*.
- `options` are per-rule settings (currently `alt-attributes.maxLength` and
  `link-new-tab.phrases` / `.extraClasses`).

## Node API

`require()` returns the API with **no side effects**:

```js
const { scanPath, buildReport, loadConfig } = require("@belenkadev/be-a11y");

const config = loadConfig();
const { issues, filesScanned } = scanPath("./public", config);
const report = buildReport(issues, { target: "./public", filesScanned });

console.log(report.summary);            // { filesScanned, total, errors, warnings, byType }
process.exitCode = report.summary.errors > 0 ? 1 : 0;
```

See **[AGENTS.md](./AGENTS.md)** for every export and the full JSON schema.

## GitHub Action

```yaml
jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: be-a11y Accessibility Checker
        id: a11y
        continue-on-error: true
        uses: be-lenka/be-a11y@v3
        with:
          url: ./public          # a URL, dir, or file (`input` is an accepted alias)
          report: a11y-report.json

      - name: Use the outputs
        run: |
          echo "total=${{ steps.a11y.outputs.total }}"
          echo "errors=${{ steps.a11y.outputs.errors }}"
          echo "warnings=${{ steps.a11y.outputs.warnings }}"
          echo "report=${{ steps.a11y.outputs.report-path }}"

      - name: Upload report
        if: ${{ github.event.inputs.report != '' }}
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: a11y-report.json
```

The Action exposes outputs `total`, `errors`, `warnings`, and `report-path`, and
writes a job summary.

## Migrating from v2

- **JSON report shape changed.** v1/v2 wrote a bare array of issues; v3 writes a
  `{ schemaVersion: 2, …, issues: [...] }` wrapper — read `report.issues`. The
  report is now written **even when the scan is clean** (`issues: []`).
- **Exit codes changed.** No input and fetch failures now exit `2` (were `1`); a
  bad path now exits `2` (was a silent `0`); a non-2xx HTTP response now fails.
- **`require()` no longer runs the CLI** — it returns the Node API.
- Issue verdicts are substantially more accurate (real line numbers, far fewer
  false positives, new true positives). Pin the Action to `@v3`.

## What this is not

be-a11y is a static, markup-level linter. It does not resolve external/embedded
CSS (contrast is inline-style only), does not execute JavaScript, and does not
replace manual testing or a full engine like axe-core. It surfaces common,
high-signal issues to speed up remediation.

## Contributing

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** — how to add a rule, run
the tests, and the mandatory `dist/` rebuild.

## European Accessibility Act (EAA)

The EAA (effective **June 28, 2025**) requires many digital products/services to
meet accessibility standards across the EU. be-a11y does not guarantee
compliance, but it helps teams detect common WCAG 2.1 issues, provides actionable
findings, and promotes inclusive development. More:
[European Commission](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en).

---

**Tool:** `@belenkadev/be-a11y` · **Repo:** <https://github.com/be-lenka/be-a11y> · MIT
