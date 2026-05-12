# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`be-a11y` is a Node.js CLI / GitHub Action that scans HTML-based source files (or remote URLs) for accessibility issues and reports them grouped by rule type. It is published to npm as `@belenkadev/be-a11y` and as a GitHub Action via `action.yml`.

## Commands

- `npm install` — install dependencies (also what `npm test` runs).
- `node index.js <path-or-url> [report.json]` — main entry point. Accepts a directory to scan recursively, a single file, or an `http(s)://` URL. Optional second arg writes results to JSON.
- `npm run build` — bundles `index.js` (and all `src/` deps) into `dist/index.js` via `@vercel/ncc`. **Required before tagging a release**, because `action.yml` declares `main: 'dist/index.js'` — the GitHub Action runs the bundled file, not the source.

There is no test suite, linter, or formatter configured. `npm test` is aliased to `npm install`.

## Architecture

### Entry point (`index.js`)
Single orchestrator that:
1. Reads input from `@actions/core` (GitHub Action inputs `url` / `report`) and falls back to `process.argv` for local CLI use.
2. Loads `a11y.config.json` (via `src/utils/configuration.js`); missing file is non-fatal — all rules default to enabled.
3. Branches on input: URL → `node-fetch` → `analyzeContent()`; directory → `findFiles()` walks recursively, skipping `excludedDirs` and matching `allowedExtensions` (`.html .php .latte .twig .edge .tsx .jsx`).
4. Calls every rule module gated by `shouldRun("<rule-name>")`, concatenates returned error arrays, then prints via `src/utils/logger.js` and exits with code `1` when issues exist.

Note: the directory branch and URL branch each maintain their **own** copy of the rule-invocation list. When adding a new rule, both lists in `index.js` must be updated.

### Rules (`src/rules/*.js`)
Each rule is a CommonJS module exporting `function(content, file[, config]) → errors[]`. They all:
- Parse `content` with `cheerio` (the project standard — keep consistent).
- Use `src/utils/getLineNumber.js` to compute 1-based line numbers from a byte offset (uses `content.indexOf(tag)` — only the first occurrence on a line is reliable).
- Return error objects shaped `{ file, line, type, message }`. The `type` string is the key both `a11y.config.json` and `logger.js` use for grouping/labels, so new rule types must be added to `typeLabels` in `logger.js` to get a pretty header.

A single rule file can emit multiple `type` values (e.g. `altAttributes.js` emits `missing-alt`, `alt-empty`, `alt-too-long`, `alt-decorative-incorrect`, `alt-functional-empty`, `redundant-title`). The `shouldRun` gate in `index.js` is keyed to the **rule file's umbrella name** (e.g. `"alt-attributes"`), while sub-rule toggles like `redundant-title` are checked **inside** the rule by reading `config.rules[...]` directly — only `altAttributes` currently receives the `config` arg.

### Config (`a11y.config.json`)
Per-rule toggles under `rules`. A rule is enabled unless explicitly set to `false` (`shouldRun` in `index.js`). `allowedExtensions` and `excludedDirs` are present in the JSON but **currently ignored** — the actual lists are hardcoded constants at the top of `index.js`.

### Output (`src/utils/logger.js`)
`printErrors` groups by `type` and prints with `chalk` color labels from a `typeLabels` map; `printSummary` prints a `console.table` count per type.

## Conventions (from `docs/CONTRIBUTING.md`)

- Node.js ≥ 16, CommonJS (`"type": "commonjs"`).
- Keep `cheerio` as the DOM parser across rules.
- Use `chalk` for any user-facing CLI output rather than raw `console.log`.
- New checks belong in `src/rules/` as their own module and must be wired into both rule-invocation lists in `index.js`.
