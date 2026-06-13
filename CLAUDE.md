# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

be-a11y (`@belenkadev/be-a11y`) is a Node.js CLI tool — also packaged as a reusable GitHub Action — that audits HTML-based projects for accessibility (a11y) issues relevant to WCAG 2.1 and the European Accessibility Act (EAA). It scans a local directory of templates or a remote URL, runs a set of rule modules, and prints a grouped, color-coded report (optionally exported to JSON). It exits non-zero when issues are found, so it can gate CI.

- CommonJS (`"type": "commonjs"`). No framework, no database. The Action ships as a single file bundled with `@vercel/ncc` (see Build).
- Dependencies: **cheerio** (HTML parsing), **chalk** (colored output), **tinycolor2** (contrast math), **node-fetch** (URL fetch), **@actions/core** (reads inputs when run as a GitHub Action). `chalk` and `node-fetch` must stay on CommonJS-compatible majors — see Gotchas.

## Commands

```bash
npm install                       # install deps (also what `npm test` runs — there is no real test suite)
node index.js <dir>               # scan a directory of templates
node index.js <url>               # scan a remote http(s) URL
node index.js <dir> report.json   # scan + write the full error list to JSON
node index.js ./public            # exactly what the CI accessibility-check runs
npm run build                     # bundle index.js -> dist/index.js with ncc (the Action entry point)
```

No linters, formatters, or automated tests are configured; `npm test` is a no-op alias for `npm install`. Verify changes by running `node index.js` against a sample directory or URL and reading the output (`🚨` report, or `✅ No accessibility issues found!`).

> **Inputs:** run as a GitHub Action, `index.js` reads `url`/`input`/`report` via `@actions/core` (`core.getInput`); outside Actions those return `""` and it falls back to `process.argv[2]` (dir/URL) and `process.argv[3]` (JSON path) — `index.js:49-62`.
> The directory branch only runs when the argument is an existing directory (`index.js:160`); a missing/mistyped path or a single file matches neither branch, so the tool exits 0 with no output. There is no `./public` in this repo — that invocation is meaningful in consuming projects.

## Build (the GitHub Action)

The Action's entry point is **`dist/index.js`** (`action.yml` → `runs.main`, `using: node20`), a single CommonJS bundle produced by `npm run build` (`ncc build index.js -o dist`). `dist/index.js` is **committed** and ~3.8 MB. ⚠️ It is generated — never hand-edit it, and **rebuild + commit it (`npm run build`) whenever you change `index.js`, a rule, or a dependency**, or the Action ships stale code. (ncc inlines ESM deps, so the bundle tolerates an ESM chalk even though the direct `node index.js` path does not — see Gotchas.)

## Architecture

`index.js` is the orchestrator (top-level IIFE at `index.js:150`):
1. Resolves input from `@actions/core` inputs, falling back to `process.argv` (`index.js:49-62`).
2. Loads `a11y.config.json` via `src/utils/configuration.js` (`index.js:64`).
3. URL input → `fetch` HTML → `analyzeContent()` (`index.js:151-159`); directory input → `findFiles()` recursive walk → read each file → run rules inline (`index.js:160-201`).
4. Aggregates error objects, then calls `printErrors()` + `printSummary()` from `src/utils/logger.js` and `process.exit(1)` if any (URL path `index.js:140-144`; directory path `index.js:193-197`).

**Rule modules** live in `src/rules/*.js` (14 of them: `altAttributes`, `ariaLabels`, `ariaRoles`, `contrast`, `emptyLinks`, `headingEmpty`, `headingOrder`, `iframeTitles`, `labelsWithoutFor`, `landmarkRoles`, `linksOpenNewTab`, `missingAria`, `multipleH1`, `unlabeledInputs`). Each is a CommonJS module exporting one function:

```js
module.exports = function ruleName(content, file /*, config */) {
  const $ = cheerio.load(content);
  const errors = [];
  // inspect the DOM, push { file, line, type, message }
  return errors;
};
```

- `content` is the raw HTML string; `file` is the path/URL label shown in output.
- Use **cheerio** for DOM traversal — never regex/string scraping.
- Compute `line` with `getLineNumber(content, tagIndex)` from `src/utils/getLineNumber.js`.
- Every error object has exactly the keys `{ file, line, type, message }`. `type` is a kebab-case category that maps to an emoji/label in the `typeLabels` map (defined **inside `printErrors()`** in `logger.js`); add an entry there for any new `type`, otherwise it falls back to `chalk.white.bold(type)`.

**Config gating.** `a11y.config.json` has a `rules` map of kebab-case keys → boolean. `index.js` defines `shouldRun(rule)` = `config.rules[rule] !== false` (enabled unless explicitly `false`, `index.js:79`) and wraps every rule call in it.

### Gotchas (verified, non-obvious)
- **chalk and node-fetch must stay on CommonJS-compatible majors.** `index.js:3-4` does `require("chalk")` / `require("node-fetch")`, so both are pinned to their last CJS major: **chalk `^4`** and **node-fetch `^2`**. Do not bump them in isolation — chalk **v5** and node-fetch **v3** are ESM-only, so `require()` returns a `{ default, … }` namespace with no usable members (chalk 5 makes every `chalk.yellow.bold(...)` throw `TypeError: Cannot read properties of undefined`). That breaks `node index.js` and the CI accessibility-check, which runs on **Node 18** (where `require(esm)` does not exist at all). chalk is imported in `index.js`, `src/utils/logger.js`, and `src/utils/configuration.js`. Upgrading either requires migrating the project to ESM first.
- **`dist/index.js` is a committed, generated ncc bundle** — rebuild with `npm run build` after any source/dependency change (see Build).
- **Adding a rule touches `index.js` in three places**: the `require(...)` at the top (`index.js:8-21`), the rule list in `analyzeContent()` (URL path, `index.js:122-137`), and the **duplicated** rule list in the directory path (`index.js:168-188`). The two lists are hand-maintained and can drift.
- **The two paths differ**: `missing-landmark` (`landmarkRoles`) runs on the URL path (`index.js:127`) but is **commented out** on the directory path (`index.js:189`), and is `false` by default in `a11y.config.json`.
- **`allowedExtensions` and `excludedDirs` are hardcoded** at the top of `index.js` (`index.js:27-35` and `index.js:37-47`), not read from config. `a11y.config.json` also defines those sections, but `index.js` ignores them — only `config.rules` is consumed.
- **Config key ≠ error `type`**: the config key `alt-attributes` enables `altAttributes`, which emits types `missing-alt`, `alt-empty`, `alt-too-long`, `alt-decorative-incorrect`, `alt-functional-empty`, and `redundant-title`. The key→module wiring is manual.
- **`config` is passed to only one rule** (`altAttributes`, directory path only — `index.js:168-170`, three args). Every other rule call gets just `(content, label/file)`.
- **`@actions/core` pulls a vulnerable `undici`** (`@actions/core → @actions/http-client → undici@5.29.0`), which `npm audit` flags. It is only exercised in the Actions runtime; clearing it means bumping `@actions/core` to v3 (a major bump) or adding an `overrides` entry.

## Conventions

- CommonJS (`require`/`module.exports`), 2-space indentation, JSDoc (`@param`/`@returns`) on exported functions — match the existing source style.
- All user-facing output goes through **chalk**; reuse the `logger.js` helpers (`printErrors`/`printSummary`) for reports.
- Commit history follows **Conventional Commits** (`feat:`, `refactor:`, `deps:`, `docs:`, `chore:`); feature work merges into `master` via a `dev` branch (see PRs in `git log`). `master` is the default branch.
- `docs/CONTRIBUTING.md` documents how to add a new rule, a Code Style section, and a PR checklist. (It does not describe the commit/branch conventions above — those are observed from git history.)

## CI / Action

- **`.github/workflows/accessibility-check.yml`** runs on push/PR to **`main`** (note: the default branch is `master` — a mismatch): sets up **Node 18**, `npm install`, then `node index.js ./public > output.txt`, and fails the build via `grep "🚨 Accessibility Issues Found" output.txt && exit 1`; uploads `output.txt` as the **`accessibility-report`** artifact (`if: always()`).
- **`.github/workflows/be-a11y-demo.yml.yml`** (note the doubled `.yml.yml`) is `workflow_dispatch`-only; it runs the local action (`uses: ./`) against a `url` input.
- **`action.yml`** exposes the reusable Action (`using: node20`, `main: dist/index.js`) with inputs `url` (required) and `report` (optional).
