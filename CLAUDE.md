# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

be-a11y (`@belenkadev/be-a11y`) is a Node.js accessibility (a11y) auditor for HTML/template projects — shipped as a **CLI**, a `require()`-able **Node API**, and a **GitHub Action**. It scans a directory, a single file, or a URL, runs **29 rules** (36 issue types) covering WCAG 2.1 / EAA, and prints a grouped color report or a structured **JSON report (schema v2)**. It exits non-zero when issues are found, so it can gate CI.

- CommonJS (`"type": "commonjs"`). No framework, no database. Node ≥ 20.18.1.
- The Action ships as a single `@vercel/ncc` bundle (`dist/index.js`, committed — see Build).
- Dependencies: **cheerio** (HTML parsing, used with `sourceCodeLocationInfo`), **chalk** (color), **tinycolor2** (contrast math), **node-fetch** (URL fetch), **@actions/core** (Action inputs/outputs). `chalk` and `node-fetch` must stay CommonJS-compatible — see Gotchas.

## Commands

```bash
npm install                        # install deps
npm test                           # node --test test/ — the real suite (registry, config, analyzer, CLI, one file per rule)
npm run build                      # ncc build index.js -> dist/index.js (the Action entry point)

node index.js <dir>                # scan a directory recursively
node index.js <file>               # scan a single file (any extension)
node index.js <url>                # scan a remote http(s) URL
node index.js <dir> report.json    # scan + write the JSON report (written even when clean)
node index.js <target> --json      # print the JSON report to stdout
node index.js --list-rules         # print all rules + metadata as JSON
node index.js --help               # usage
```

Verify changes by running `npm test` and by scanning `test/fixtures/violations`
(should exit 1) and `test/fixtures/clean` (should exit 0).

> **Exit codes:** `0` clean · `1` issues found · `2` usage/environment error (no
> input, bad path, fetch failure / HTTP non-2xx, report-write failure, unknown
> flag).
>
> **Streams:** stdout = the report only (human report + summary, the `✅` clean
> line, or JSON; the `🚨` banner is on stdout). stderr = diagnostics (usage,
> errors, config warning, per-rule crash notices, `📦 Results exported…`).

## Build (the GitHub Action)

The Action's entry point is **`dist/index.js`** (`action.yml` → `runs.main`, `using: node20`), a committed `ncc` bundle (~3.8 MB). ⚠️ It is generated — never hand-edit it, and **rebuild + commit it (`npm run build`) whenever you change `index.js`, a rule, a util, the registry, or a dependency**, or the Action ships stale code. CI enforces this with a `git diff --quiet -- dist/` freshness gate. (The npm tarball excludes `dist/` via `package.json` `files`; the Action uses the committed bundle from the repo.)

## Architecture

`index.js` is **both the library and the CLI** (shebang line 1; `if (require.main === module) main()`).

**Library (pure — no `process.exit`, no stdout; stderr diagnostics only):**
- `analyzeContent(content, label, config?)` — THE runner: iterate enabled registry rules, **per-rule try/catch** (a crashing rule → stderr notice, skipped, no synthetic issue), type-level post-filter, enrich each issue from `typeMeta` (adds `ruleId, severity, wcag, hint, snippet`), sort by `(file, line, type)`.
- `scanPath(target, config?)` → `{ issues, filesScanned }` — directory (recursive, sorted, config-driven extensions/exclusions) **or single file**. ENOENT throws.
- `scanUrl(url, config?)` → `Promise<{ issues, filesScanned: 1 }>` — throws on network error **and on non-2xx**.
- `loadConfig(path?)`, `buildReport(issues, meta)`, `buildRuleList()`, `rules`.

**CLI (`main()`):** hand-rolled arg parsing (flags position-independent); resolves `@actions/core` inputs **only when `GITHUB_ACTIONS === "true"`**; sets `process.exitCode` (never `process.exit()` — that truncates piped stdout); emits Action outputs + job summary when in Actions.

**Rule modules** live in `src/rules/*.js` (29 of them). Each is a CommonJS module exporting one function:

```js
module.exports = function ruleName(content, file, config) {
  const $ = loadDocument(content);          // from src/utils/dom.js — never cheerio.load directly
  const errors = [];
  // inspect the DOM, push { file, line, type, message }
  return errors;
};
```

- Compute `line` with `getLine($, el, content)` (from `src/utils/dom.js`) — accurate against **raw source** via parse5 `sourceCodeLocation` (template noise no longer shifts lines).
- Use **cheerio** for traversal — never regex/string scraping.
- Error objects have exactly `{ file, line, type, message }`. Enrichment happens centrally in `analyzeContent`, never in a rule.

**Shared utils (`src/utils/`):**
- `dom.js` — `loadDocument` (cheerio + `sourceCodeLocationInfo` + single-entry parse cache), `getLine`/`getLocation` (parse5 → `startIndex` → legacy indexOf → line 1), `isFullDocument` (regex on raw source).
- `accessibleName.js` — `getAccessibleName($, el)` (simplified accname).
- `visibility.js` — `isHidden` (self+ancestors: aria-hidden, `hidden`, inline display:none/visibility:hidden), `parseInlineStyle`.
- `ids.js` — `collectIds($)` → `{ idSet, byId, duplicates }` (memoized; Map lookups replace `$("#" + id)`, killing the selector-injection crash class).
- `looksTemplated.js` — detects `{{ }}`, `{% %}`, `${ }`, `<?php`, `<% %>`, `{ }`.
- `configuration.js` — `loadConfig`; `logger.js` — `printErrors`/`printSummary` (labels/emoji from `typeMeta`).

**`src/registry.js` is the single source of truth** — an array of `{ id, description, check, types }`, plus a flat `typeMeta` index. It replaced the two hand-duplicated rule lists and the inline `typeLabels` map.

### Rule / config model

- **`id`** is the config key. `config.rules[id] !== false` → rule enabled.
- **Type toggle:** `config.rules[<type>] === false` drops just that emitted type (central post-filter in `analyzeContent`) — this is how sub-rules like `alt-too-long` / `redundant-title` are silenced.
- **`options`** namespace: per-rule settings, e.g. `options["alt-attributes"].maxLength`, `options["link-new-tab"].phrases`/`.extraClasses`. Config is passed to **every** rule on **both** paths.
- `allowedExtensions` / `excludedDirs` are now honored: object-map form merges over defaults (`true` adds, `false` removes), array form replaces.

### Gotchas (verified, non-obvious)

- **chalk and node-fetch must stay on CommonJS majors.** `index.js` does `require("chalk")` / `require("node-fetch")`, so chalk is pinned to **^4** and node-fetch to **^2** (their last CJS majors). chalk v5 / node-fetch v3 are ESM-only; `require()`-ing them breaks the CLI. chalk is imported in `index.js` and `src/utils/{logger,configuration}.js`. Upgrading requires an ESM migration first.
- **`dist/index.js` is a committed, generated ncc bundle** — rebuild with `npm run build` after any source/dependency change (CI has a freshness gate).
- **Adding a rule touches `src/registry.js` in exactly one place** (plus the new rule file, its test, and `a11y.config.json`). There are no longer two drifting rule lists in `index.js`.
- **Use `process.exitCode`, not `process.exit()`** — `process.exit()` truncates buffered piped stdout (e.g. large `--json` / `--list-rules` output).
- **`@actions/core` inputs are consulted only when `GITHUB_ACTIONS === "true"`** — a stray local `INPUT_URL` env var will not hijack a CLI run.
- **Line numbers come from parse5 `sourceCodeLocation`** (via `loadDocument`/`getLine`). Implied `html`/`head`/`body` have `null` locations — rules that target them (html-lang, document-title, landmark, skip-link) gate on the raw source or fall back.
- **`@actions/core` pulls a vulnerable `undici`** (flagged by `npm audit`); only exercised in the Actions runtime. Clearing it means bumping `@actions/core` (major) or adding an `overrides` — a documented follow-up.

## Conventions

- CommonJS, 2-space indentation, JSDoc on exported functions.
- User-facing output goes through **chalk**; reuse `logger.js` helpers.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `deps:`, `docs:`, `test:`, `build:`). Default branch is `master`.
- Tests are `node:test` under `test/` (`npm test`); one `test/rules/<rule>.test.js` per rule, plus registry/config/analyze/scan/cli scaffolds and `test/fixtures/`.
- **AGENTS.md** documents the machine contract; **docs/CONTRIBUTING.md** the add-a-rule flow.

## CI / Action

- **`.github/workflows/accessibility-check.yml`** runs on push/PR to **`master` and `main`**: Node 20, `npm ci`, `npm test`, CLI smokes (violations→exit 1, clean→exit 0 + report), a bundle smoke on `dist/index.js`, the **dist-freshness gate**, and uploads a sample report artifact.
- **`.github/workflows/be-a11y-demo.yml`** is `workflow_dispatch`-only; runs the local action (`uses: ./`) and echoes the outputs.
- **`action.yml`** (`using: node20`, `main: dist/index.js`): inputs `url` (alias `input`) and `report` (all optional); outputs `total`, `errors`, `warnings`, `report-path`.
