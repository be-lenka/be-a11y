# Be-Accessible !

Accessibility Checker is a Node.js-based CLI tool designed to scan and report common accessibility issues in HTML-based projects. It supports both local directory scanning and remote URL analysis, making it ideal for developers and QA engineers aiming to ensure their HTML templates and frontend code adhere to accessibility best practices.

![Accessibility Checker](https://github.com/user-attachments/assets/40c82668-7894-4560-a7ed-77f892021bdd)

---

## Features

* ✅ Checks heading level order (e.g., h1 → h3 skipped)
* 🖼️ Verifies `<img>` tags have `alt` attributes
  * ⬜ Detects empty `alt` attributes
  * ↔️ Warns about excessively long `alt` texts (configurable)
  * 🌈 Flags decorative images with incorrect `alt`
  * 🔗 Detects functional images missing descriptive `alt`
* ♿ Detects missing or invalid `aria-label` and `aria-labelledby`
* 👀 Identifies elements that should have accessible labels (like `<button>`, `<a>`, `<svg>`)
* 🎨 Checks color contrast between text and background (WCAG 2.1 AA level)
* 📂 Supports scanning entire directories with `.html`, `.php`, `.latte`, `.twig`, `.edge` templates
* 🌐 Supports analyzing live pages via URL
* 📤 Optional JSON export of results
* 🎨 Color-coded, grouped CLI output for easy readability (reports file + line number)
* ▶️ Ignores common build and vendor directories
* 📝 CI-friendly (non-zero exit on issues)
* 🗃️ Configurable rule-based architecture using `a11y.config.json`
  * Disable or enable specific rules
  * Granular control over sub-rules (e.g., `alt-too-long`)

---

## Usage

### Install dependencies:

```bash
npm install
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

## TL;DR: 🏩 European Accessibility Act (EAA) Compliance

The European Accessibility Act (EAA), effective from **June 28, 2025**, mandates that a range of products and services, including websites and mobile applications, meet accessibility requirements to ensure equal access for persons with disabilities across the EU. This directive aims to harmonize accessibility standards, facilitate cross-border trade, and enhance the availability of accessible digital content.

Accessibility Checker helps teams prepare by:

* ⚠️ Identifying Non-Compliance: Surfaces common issues aligned with EAA requirements
* ✅ Facilitating Remediation: Produces detailed output to assist in debugging and fixing violations
* 🏰 Supporting Inclusive Design: Encourages building experiences usable by all

By integrating Accessibility Checker into your CI/CD pipelines and code reviews, you can **ensure compliance proactively**.

**More on EAA:** [European Commission's official page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en)
