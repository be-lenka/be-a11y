# Be-Accesible ! 

**Accessibility Checker** is a Node.js-based CLI tool for scanning and reporting common accessibility issues in HTML-based projects. It supports both local directory scanning and remote URL analysis.

The tool is ideal for developers and QA engineers who want to ensure that their HTML templates and frontend code follow basic accessibility best practices.

The script will print grouped and color-coded accessibility issues directly in your terminal. If a file name is provided as a second argument, the results will also be saved as a structured JSON report.

![Bez názvu](https://github.com/user-attachments/assets/40c82668-7894-4560-a7ed-77f892021bdd)


## Features

- ✅ Checks heading level order (e.g., h1 → h3 skipped)
- 🖼️ Verifies `<img>` tags have `alt` attributes
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

## 🛠 Future Tools

- GitHub Action support


## 🤝 Contribute

Ideas and PRs welcome!  
MIT Licensed.

