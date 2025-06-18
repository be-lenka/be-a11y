# be-a11y !

**be-a11y** is a Node.js-based CLI tool designed for automated evaluation and reporting of accessibility issues in HTML-based projects. It supports both local directory scanning and remote URL analysis to help developers identify common accessibility problems.

![Accessibility Checker](https://github.com/user-attachments/assets/40c82668-7894-4560-a7ed-77f892021bdd)

---

## Features

* ✅ Detects incorrect heading level order (e.g., `h1` → `h3` skipped)
* 🖼️ Evaluates `<img>` tags for appropriate `alt` attributes
  * ⬜ Flags empty `alt` attributes
  * ↔️ Detects excessively long `alt` texts (configurable)
  * 🌈 Verifies decorative images have empty or proper `alt`
  * 🔗 Highlights functional images missing descriptive `alt`
* ♿ Validates `aria-label` and `aria-labelledby` usage
* 👀 Detects elements that lack accessible names or labels (e.g., `<button>`, `<a>`, `<svg>`)
* 🎨 Evaluates color contrast between text and background against WCAG 2.1 AA criteria
* 📂 Analyzes local files in directories with supported extensions: `.html`, `.php`, `.latte`, `.twig`, `.edge`, `.tsx`, `.jsx`
* 🌐 Supports remote evaluation by analyzing pages via `URL`
* 📤 Optional `JSON` export of evaluation results
* 🎨 CLI output is grouped, color-coded, and includes file names with line numbers
* ▶️ Automatically excludes common build directories (e.g., `node_modules`, `dist`)
* 📝 CI-friendly: returns a non-zero exit code when issues are found
* 🗃️ Supports rule-based configuration via `a11y.config.json`
  * Enable or disable specific checks
  * Fine-tune behavior of sub-rules (e.g., `alt-too-long`)
* 🔗 Checks that `<label>` elements are correctly associated with form controls (via for or nesting)
* 📛 Checks that `<img>` elements does not have a `title` and `alt` tag with same content (`alt` preveils)
* ❗ Checks if the presented `h1-6` headings have not empty text or contains only whitespace (new!)
---

## Usage

### Install dependencies:

```bash
git clone git@github.com:be-lenka/be-a11y.git && cd be-a11y && npm install

# or

npm i @belenkadev/be-a11y
```

### Run the script:

```bash
node index.js /path/to/html/files/

# or

node index.js https://example.com
```

### Export results to JSON (optional):

```bash
node index.js /path/to/html/files report.json

# or

node index.js https://example.com report.json
```

### Example Configuration (`a11y.config.json`):

```json
{
  "rules": {
    "heading-order": true,
    "heading-empty": true,
    "missing-alt": true,
    "alt-empty": true,
    "alt-too-long": false,
    "alt-decorative-incorrect": true,
    "alt-functional-empty": true,
    "aria-invalid": true,
    "missing-aria": true,
    "aria-role-invalid": true,
    "missing-landmark": false,
    "contrast": true
  }
}
```

> Configuration allows per-rule toggling. All rules are enabled by default unless explicitly disabled.

---

## Future Tools

* GitHub Action support
* Rule severity levels (`warning` vs `error`)
* CI summary report in SARIF format
* VS Code plugin integration

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's a bug fix, feature proposal, or documentation update — your input is valuable.

Please read our [Contribution Guide](./docs/CONTRIBUTING.md) to get started.

---

## TL;DR: 🏩 European Accessibility Act (EAA) Compliance Support

The European Accessibility Act (EAA), effective from **June 28, 2025**, requires certain digital products and services to comply with accessibility standards across the EU.

While this tool does not guarantee full compliance, **be-a11y** supports teams in their evaluation efforts by:

* ⚠️ Detecting common accessibility issues as outlined in standards like WCAG 2.1
* ✅ Providing actionable findings to assist with remediation workflows
* 🏰 Promoting awareness and adoption of inclusive development practices

**More on EAA:** [European Commission's official page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en)

---

**Tool name:** `be-a11y`
**Repository:** [https://github.com/be-lenka/be-a11y](https://github.com/be-lenka/be-a11y)
