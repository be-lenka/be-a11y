# Contributing to `be-a11y`

🎉 First off, thanks for taking the time to contribute!
We welcome contributions from developers, testers, accessibility advocates, and
open source enthusiasts.

---

## 📦 Project Overview

**be-a11y** is a Node.js accessibility auditor for HTML files, templates, and
URLs. It ships as a CLI, a `require()`-able Node API, and a GitHub Action, and
detects WCAG 2.1 / EAA-relevant issues across 29 rules.

Architecture in one breath: `index.js` is the runner + CLI; every rule lives in
`src/rules/<name>.js` and is registered once in `src/registry.js` (the single
source of truth for rule metadata); shared helpers live in `src/utils/`.

---

## 🚀 Getting Started

### 1. Fork, clone, install (Node ≥ 20.18.1)

```bash
git clone https://github.com/<your-username>/be-a11y.git
cd be-a11y
npm install
```

### 2. Run the tool

```bash
node index.js ./example-site           # scan a directory
node index.js ./example-site r.json    # scan + write a JSON report
node index.js --list-rules             # list all rules as JSON
```

### 3. Run the tests

```bash
npm test          # node --test test/
```

`npm test` runs a real suite (`node:test`, zero extra dependencies): a registry
contract, config semantics, the analyzer/CLI, and one test file per rule.

---

## 🧪 Adding a new rule

1. **Write the rule** — `src/rules/<name>.js`, exporting a single function:

   ```js
   const { loadDocument, getLine } = require("../utils/dom");

   module.exports = function myRule(content, file, config) {
     const $ = loadDocument(content);
     const errors = [];
     // inspect the DOM, push { file, line, type, message }
     return errors;
   };
   ```

   - Use **cheerio via `loadDocument`** — never `cheerio.load` directly, and never
     regex/string scraping.
   - Compute lines with `getLine($, el, content)` (accurate against raw source).
   - Reuse the shared utils: `accessibleName`, `visibility` (`isHidden`),
     `ids` (`collectIds` — never `$("#" + id)`), `looksTemplated`.
   - Each error object has exactly `{ file, line, type, message }`. Enrichment
     (severity/WCAG/hint/snippet) is added centrally — do **not** add it in rules.

2. **Register it** — add an entry to `src/registry.js` with `id`, `description`,
   `check: require("./rules/<name>")`, and a `types` map giving each emitted
   `type` its `severity` (`error`|`warning`), `wcag` (array), `hint`, `label`,
   and `emoji`.

3. **Test it** — add `test/rules/<name>.test.js` with bad and good inline-HTML
   cases (and a line-number assertion where it matters).

4. **Wire config** — add the rule `id` to `a11y.config.json` under `rules`.

5. **Rebuild the bundle (mandatory)** — the Action runs the committed
   `dist/index.js`:

   ```bash
   npm run build      # ncc build index.js -o dist
   ```

   Commit the regenerated `dist/index.js` in the same PR, or the Action ships
   stale code. CI enforces this with a freshness check.

---

## 📄 Code Style

- CommonJS (`require` / `module.exports`), 2-space indentation, JSDoc
  (`@param` / `@returns`) on exported functions — match the surrounding source.
- All user-facing output goes through **chalk** (v4 — do not bump to v5, it is
  ESM-only); reuse the `src/utils/logger.js` helpers for reports.
- `chalk` (v4) and `node-fetch` (v2) must stay on their CommonJS majors.

---

## 🔍 Pull Request Checklist

- ✅ `npm test` passes.
- ✅ New/changed rules have tests.
- ✅ `npm run build` run and `dist/index.js` committed if any source changed.
- ✅ Conventional Commit messages (`feat:`, `fix:`, `refactor:`, `docs:`, …).
- ✅ Meaningful PR description; references related issue(s).

---

## 🤝 Code of Conduct

We follow the Contributor Covenant. Be respectful, inclusive, and constructive.

## 📬 Questions?

Open an issue or reach out via dev@belenka.com. – The Be Lenka Dev Team 💚
