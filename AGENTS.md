# AGENTS.md — machine contract for `@belenkadev/be-a11y`

This file is the stable, machine-oriented contract for driving be-a11y from
scripts, CI, and coding agents. Humans: see `README.md`.

be-a11y audits HTML / template projects (and live URLs) for WCAG 2.1 / EAA
accessibility issues. It runs 29 rules producing 36 issue types, and emits a
structured JSON report.

---

## Invocation

```bash
be-a11y <dir|file|url> [report.json] [--json] [--list-rules] [--help]
# or, from a checkout:
node index.js <dir|file|url> [report.json] [options]
```

- **Positional 1** — a directory (scanned recursively), a single file (scanned
  regardless of extension), or an `http(s)://` URL.
- **Positional 2** (optional) — path to write the JSON report to (written **even
  when clean**).
- Flags are position-independent. Unknown flags or a 3rd positional are a usage
  error (exit 2).

### Flags

| Flag | Effect |
|---|---|
| `--json` | Print the full JSON report (schema v2) to **stdout** and nothing else on stdout. |
| `--list-rules` | Print all rules + metadata as JSON to stdout, then exit 0. |
| `--help`, `-h` | Print usage to stdout, exit 0. |

### Exit codes (stable)

| Code | Meaning |
|---|---|
| `0` | No accessibility issues found. |
| `1` | Accessibility issues found. |
| `2` | Usage or environment error (no input, bad path, fetch failure / HTTP non-2xx, report-write failure, unknown flag). |

### stdout vs stderr

- **stdout** — the report only: the human report (incl. the `🚨 Accessibility
  Issues Found:` banner and summary), the `✅ No accessibility issues found!`
  line, or the JSON (`--json` / `--list-rules`).
- **stderr** — diagnostics only: usage/errors, the config warning, per-rule crash
  notices (`⚠️ Rule "<id>" crashed …`), and the `📦 Results exported…` info line.

**Recommended for agents:** run with `--json` and parse stdout. Do not grep the
human output.

---

## JSON report (schema v2)

Identical document for `--json` (stdout) and the report file.

```jsonc
{
  "schemaVersion": 2,
  "tool": { "name": "@belenkadev/be-a11y", "version": "3.0.0" },
  "target": "./public",                 // the scanned dir/file/URL, or null
  "timestamp": "2026-01-01T00:00:00.000Z",
  "summary": {
    "filesScanned": 12,
    "total": 9,
    "errors": 6,                        // count of severity:"error" issues
    "warnings": 3,                       // count of severity:"warning" issues
    "byType": { "missing-alt": 4, "…": 5 }  // keys sorted
  },
  "issues": [                            // sorted by (file, line, type)
    {
      "file": "public/index.html",       // legacy fields (v1-compatible)
      "line": 42,
      "type": "missing-alt",
      "message": "<img> is missing an alt attribute",
      "ruleId": "alt-attributes",        // enrichment (v2)
      "severity": "error",               // "error" | "warning"
      "wcag": ["1.1.1"],                  // Success Criteria; [] = best practice
      "hint": "Add a descriptive alt attribute, or alt=\"\" if decorative.",
      "snippet": "<img src=\"hero.jpg\">" // trimmed source line, ≤120 chars
      // "column": 5                      // present only if the rule provided one
    }
  ]
}
```

Field notes:
- `issues[]` always contains the four legacy keys (`file, line, type, message`)
  plus the enrichment keys (`ruleId, severity, wcag, hint, snippet`).
- An unknown emitted type enriches to `ruleId:null, severity:"error", wcag:[],
  hint:null` and prints one stderr warning.
- `severity` is the field to branch on. `errors` block CI (exit 1); treat
  `warnings` per your policy.

---

## `--list-rules`

```jsonc
{
  "schemaVersion": 2,
  "rules": [
    {
      "id": "alt-attributes",           // config key
      "description": "Images must have appropriate alt attributes",
      "defaultEnabled": true,
      "types": [
        { "type": "missing-alt", "severity": "error", "wcag": ["1.1.1"],
          "hint": "…", "label": "Missing ALT", "emoji": "🖼️" }
      ]
    }
  ]
}
```

29 rules, 36 types. `id` is the config key; each `types[].type` is what appears
as `issues[].type` in a report.

---

## Configuration (`a11y.config.json`, cwd-relative)

Missing file → silent defaults. Malformed JSON → stderr warning + defaults.

```jsonc
{
  "rules": {
    "alt-attributes": true,       // module toggle: config.rules[ruleId] !== false → enabled
    "alt-too-long": false,        // TYPE toggle: config.rules[type] === false drops just that type
    "missing-landmark": true
  },
  "options": {
    "alt-attributes": { "maxLength": 125 },              // per-rule options
    "link-new-tab": { "phrases": ["nová karta"], "extraClasses": ["visually-hidden-focusable"] }
  },
  "allowedExtensions": { ".vue": true, ".php": false },  // object map MERGES over defaults
  "excludedDirs": [".git", "vendor"]                     // array REPLACES defaults
}
```

- **Module toggle** — set a **rule id** to `false` to disable the whole rule.
- **Type toggle** — set an emitted **type** to `false` to drop only that type
  (e.g. keep `alt-attributes` but silence `alt-too-long`).
- `allowedExtensions` / `excludedDirs`: object-map form merges over defaults
  (`true` adds, `false` removes); array form replaces defaults entirely.
- Defaults — extensions: `.latte .html .php .twig .edge .tsx .jsx`; excluded
  dirs: `node_modules vendor dist build temp .idea .git log bin`.

---

## Node API (`require('@belenkadev/be-a11y')`)

`require()` returns the API and has **no side effects** (no CLI, no exit, no
stdout).

```js
const {
  analyzeContent,  // (content: string, label: string, config?) => Issue[]
  scanPath,        // (targetPath: string, config?) => { issues: Issue[], filesScanned: number }   (throws on ENOENT)
  scanUrl,         // (url: string, config?) => Promise<{ issues, filesScanned: 1 }>  (throws on network / HTTP non-2xx)
  loadConfig,      // (path?='a11y.config.json') => NormalizedConfig
  buildReport,     // (issues, { target?, filesScanned?, timestamp? }) => ReportV2
  buildRuleList,   // () => { schemaVersion, rules }
  rules,           // the registry array
} = require("@belenkadev/be-a11y");
```

Example:

```js
const { scanPath, buildReport, loadConfig } = require("@belenkadev/be-a11y");

const config = loadConfig();                        // or pass {} for all-rules defaults
const { issues, filesScanned } = scanPath("./public", config);
const report = buildReport(issues, { target: "./public", filesScanned });
const failing = report.summary.errors > 0;
process.exitCode = failing ? 1 : 0;
```

---

## GitHub Action

```yaml
- uses: be-lenka/be-a11y@v3
  id: a11y
  continue-on-error: true
  with:
    url: ./public          # or a URL; `input` is an accepted alias
    report: a11y-report.json
- run: echo "total=${{ steps.a11y.outputs.total }} errors=${{ steps.a11y.outputs.errors }}"
```

- **Inputs:** `url` (or its alias `input`) and `report` — all optional, validated
  at runtime.
- **Outputs:** `total`, `errors`, `warnings`, `report-path`. A job summary is
  written to `$GITHUB_STEP_SUMMARY` when available.
- Action inputs are consulted **only** when `GITHUB_ACTIONS=true`, so `INPUT_*`
  env vars never hijack a local CLI run.

---

## Adding a rule (procedure)

1. Create `src/rules/<name>.js` exporting `(content, file, config) => Issue[]`
   where `Issue = { file, line, type, message }`. Use the shared utils
   (`src/utils/dom.js` `loadDocument`/`getLine`, `accessibleName`, `visibility`,
   `ids`, `looksTemplated`) — never `cheerio.load` or regex/string scraping
   directly.
2. Register it in `src/registry.js`: add an entry with `id`, `description`,
   `check: require("./rules/<name>")`, and a `types` map giving every emitted
   type its `severity`, `wcag`, `hint`, `label`, `emoji`.
3. Add a `test/rules/<name>.test.js` with bad/good inline HTML.
4. Add the id to `a11y.config.json` `rules`.
5. **Mandatory:** `npm run build` and commit the regenerated `dist/index.js`
   (the Action ships stale code otherwise).

---

## Conventions

- CommonJS. `chalk` pinned to v4 and `node-fetch` to v2 (both CJS-only majors).
- Node ≥ 20.18.1.
- Conventional Commits; default branch `master`.
- `dist/index.js` is a committed `@vercel/ncc` bundle — regenerate with
  `npm run build` after any source/dependency change.
