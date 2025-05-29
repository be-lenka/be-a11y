# Be-Accesible !

Accessibility Checker is a Node.js-based CLI tool designed to scan and report common accessibility issues in HTML-based projects. It supports both local directory scanning and remote URL analysis, making it ideal for developers and QA engineers aiming to ensure their HTML templates and frontend code adhere to accessibility best practices.

![Bez názvu](https://github.com/user-attachments/assets/40c82668-7894-4560-a7ed-77f892021bdd)


## Features

- ✅ Checks heading level order (e.g., h1 → h3 skipped)
- 🖼️ Verifies `<img>` tags have `alt` attributes
- ↔️ Checks `<img>` alt have a certain length
- ♿ Detects missing or invalid `aria-label` and `aria-labelledby`
- 👀 Identifies elements that should have accessible labels (like `<button>`, `<a>`, `<svg>`)
- 🎨 Checks color contrast between text and background (WCAG 2.1 AA level)
- 📂 Supports scanning entire directories with `.html`, `.php`, `.latte`, `.twig`, `.edge` templates
- 🌐 Supports analyzing live pages via URL
- 📤 Optional JSON export of results
- 🎨 Color-coded, grouped CLI output for easy readability (reports file + line number)
- ▶️ Ignores common build and vendor directories
- 📝 CI-friendly (non-zero exit on issues)

## Usage

#### Install dependencies:

```bash
npm install
```

#### Run the script

You can analyze either a local directory or a remote URL.

```bash
node index.js /path/to/html/files/

# or

node index.js https://google.com
```

#### Export results to JSON (optional)

```bash
node index.js /path/to/html/files report.json

# or

node index.js https://google.com report.json
```

## Future Tools

- GitHub Action support

## TLDR

🏛️ European Accessibility Act (EAA) Compliance

The European Accessibility Act (EAA), effective from June 28, 2025, mandates that a range of products and services, including websites and mobile applications, meet accessibility requirements to ensure equal access for persons with disabilities across the EU. This directive aims to harmonize accessibility standards, facilitating easier cross-border trade and enhancing the availability of accessible products and services .

Accessibility Checker assists organizations in aligning with EAA requirements by:

- Identifying Non-Compliance: Detects common accessibility issues that could lead to non-compliance with EAA standards.
- Facilitating Remediation: Provides detailed reports, enabling developers to address and rectify accessibility shortcomings effectively.
- Supporting Inclusive Design: Encourages the adoption of accessibility best practices, contributing to the creation of inclusive digital environments.

By integrating Accessibility Checker into your development workflow, you can proactively address accessibility concerns, ensuring your digital products and services are compliant with the EAA and accessible to all users.

For more information on the European Accessibility Act, visit the [European Commission's official page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en).
