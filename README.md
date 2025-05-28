# Be-Accesible ! 

Simple, scriptable tools to help developers build a more accessible web.  
Starting with a CLI check for correct heading hierarchy in HTML-like files.

---

## ✅ Features

- Detects skipped heading levels (e.g., `<h1>` → `<h3>`)
- Works with `.html`, `.php`, `.latte`
- Ignores common build and vendor directories
- Reports file + line number
- CI-friendly (non-zero exit on issues)

---

## 🚀 Usage

1. Install dependencies:

```bash
npm install
```

2. Run the script:

```bash
node check-headings-order.js
```

---

## 🛠 Future Tools

- Contrast checker
- Missing alt text detection
- ARIA role validation
- GitHub Action support

---

## 🤝 Contribute

Ideas and PRs welcome!  
MIT Licensed.

