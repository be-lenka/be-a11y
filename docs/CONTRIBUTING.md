# Contributing to `be-a11y`

🎉 First off, thanks for taking the time to contribute!
We welcome contributions from developers, testers, accessibility advocates, and open source enthusiasts.

---

## 📦 Project Overview

**Accessibility Checker** is a Node.js CLI tool for detecting common accessibility issues in HTML files and templates. It helps identify WCAG and EAA-relevant problems like improper heading structure, missing alt text, invalid ARIA usage, and more.

---

## 🚀 Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/be-a11y.git
cd be-a11y
npm install
```

### 2. Run the Tool

```bash
node index.js ./example-site
```

### 3. Run with Config
```bash
node index.js ./example-site output.json
```

### 🛠️ Contribution Types

You can help in many ways:

- 💡 Feature Requests: Propose new rules or configuration features.
- 🐛 Bug Reports: Open an issue with reproduction steps and a minimal test case.
- 🧪 Rule Contributions: Implement new WCAG rules or extend existing ones.
- 🧹 Refactoring: Help improve code structure, CLI UX, or performance.
- 🌍 Localization/Docs: Improve the README or create documentation for non-English devs.

### 📄 Code Style & Guidelines

- Write clean, consistent, and readable JavaScript (Node.js ≥ 16).
- Keep rule logic modular and place new checks in checkXYZ() functions.
- Use shouldRun("rule-name") for config gating.
- Use chalk for CLI output (avoid raw console.log() for warnings/errors).
- Keep consistent with cheerio for DOM parsing.

### 🔍 Pull Request Checklist

- ✅ Code passes basic sanity (no runtime errors).
- ✅ Matches style and formatting conventions.
- ✅ Adds documentation if needed (README, comments, examples).
- ✅ Includes a meaningful description in the PR.
- ✅ References related issue(s), if applicable.

### 🤝 Code of Conduct

We follow the Contributor Covenant Code of Conduct.
Be respectful, inclusive, and constructive. All contributions are welcome.

### 📬 Got Questions?

Open an issue
Reach out via dev@belenka.com
We’re excited to collaborate with you! – The Be Lenka Dev Team 💚
