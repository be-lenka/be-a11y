const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const chalk = require("chalk");
const fetch = require("node-fetch"); // v2 for CommonJS

// SET OF RULES
const headingOrder = require("./src/rules/headingOrder");
const headingEmpty = require("./src/rules/headingEmpty");
const altAttributes = require("./src/rules/altAttributes");
const ariaLabels = require("./src/rules/ariaLabels");
const missingAria = require("./src/rules/missingAria");
const linksOpenNewTab = require("./src/rules/linksOpenNewTab");
const contrast = require("./src/rules/contrast");
const landmarkRoles = require("./src/rules/landmarkRoles");
const iframeTitles = require("./src/rules/iframeTitles");
const ariaRoles = require("./src/rules/ariaRoles");
const labelsWithoutFor = require("./src/rules/labelsWithoutFor");
const multipleH1 = require("./src/rules/multipleH1");
const emptyLinks = require("./src/rules/emptyLinks");
const unlabeledInputs = require("./src/rules/unlabeledInputs");

// HELPERS
const getLineNumber = require("./src/utils/getLineNumber");

const allowedExtensions = [
  ".latte",
  ".html",
  ".php",
  ".twig",
  ".edge",
  ".tsx",
  ".jsx",
];

const excludedDirs = [
  "node_modules",
  "vendor",
  "dist",
  "build",
  "temp",
  ".idea",
  ".git",
  "log",
  "bin",
];

const input = process.argv[2];
const outputJson = process.argv[3];

let config = {};

try {
  config = JSON.parse(fs.readFileSync("a11y.config.json", "utf-8"));
} catch (err) {
  console.warn(
    chalk.yellow(
      "⚠️  No config file found or invalid JSON. Using default rules.",
    ),
  );
  config = { rules: {} }; // fallback to default: all enabled
}

if (!input) {
  console.error(
    chalk.red("Please provide a directory path or URL as the first argument."),
  );
  process.exit(1);
}

/**
 * Determines if a rule should run based on configuration.
 * Defaults to enabled unless explicitly set to false.
 * @param {string} rule - Rule name from config.rules keys.
 * @returns {boolean} Whether the rule is enabled.
 */
const shouldRun = (rule) => config.rules[rule] !== false;

/**
 * Recursively finds files with allowed extensions in a directory.
 * Ignores directories listed in `excludedDirs`.
 * @param {string} dir - Directory path to search.
 * @returns {string[]} Array of matched file paths.
 */
function findFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirs.includes(entry.name)) return [];
      return findFiles(fullPath);
    }
    if (allowedExtensions.includes(path.extname(entry.name))) return [fullPath];
    return [];
  });
}

/**
 * Groups an array of errors by their `type` property.
 * @param {object[]} errors - List of error objects.
 * @returns {object} Errors grouped by type.
 */
function groupErrors(errors) {
  return errors.reduce((acc, error) => {
    if (!acc[error.type]) acc[error.type] = [];
    acc[error.type].push(error);
    return acc;
  }, {});
}

/**
 * Prints detailed accessibility issues to the console.
 * Issues are grouped by type with color-coded headings.
 * @param {object[]} errors - List of error objects.
 */
function printErrors(errors) {
  const grouped = groupErrors(errors);

  const typeLabels = {
    "heading-order": chalk.yellow.bold("📐 Heading Order"),
    "heading-empty": chalk.red.bold("❗ Empty Headings"),
    "missing-alt": chalk.cyan.bold("🖼️  Missing ALT"),
    "alt-empty": chalk.white.bold("⬜  AL T Empty"),
    "alt-too-long": chalk.red.bold("↔️  ALT Too Long"),
    "alt-decorative-incorrect": chalk.gray.bold("🌈  ALT Decorative"),
    "alt-functional-empty": chalk.blueBright.bold("🔗  ALT Functional"),
    "aria-invalid": chalk.magenta.bold("♿  ARIA Issues"),
    "missing-aria": chalk.blue.bold("👀  Missing ARIA"),
    "aria-role-invalid": chalk.blue.bold("🧩  ARIA Role Issues"),
    "missing-landmark": chalk.yellowBright.bold("🏛️  Landmark Elements"),
    "contrast": chalk.red.bold("🎨  Contrast Issues"),
    "label-for-missing": chalk.red.bold("🔗  Broken Label Association"),
    "label-missing-for": chalk.yellow.bold("🏷️  Unassociated Label"),
    "redundant-title": chalk.gray.bold("📛  Redundant Title Text"),
    "multiple-h1": chalk.yellow.bold("🧱  Multiple H1s"),
    "input-unlabeled": chalk.magenta.bold("🔘  Unlabeled Checkboxes/Radios"),
    "empty-link": chalk.red.bold("📭  Empty or Useless Link"),
    "iframe-title-missing": chalk.blue.bold("🖼️  Missing <iframe> Title"),
    "link-new-tab-warning": chalk.yellow.bold("🧭  New Tab Warning"),
  };

  console.error(chalk.red("\n🚨 Accessibility Issues Found:\n"));

  for (const [type, list] of Object.entries(grouped)) {
    const label = typeLabels[type] || chalk.white.bold(type);
    console.log(`\n${label}`);
    for (const { file, line, message } of list) {
      console.log(
        `  ${chalk.gray("-")} ${chalk.green(file)}:${chalk.yellow(
          line,
        )} – ${chalk.white(message)}`,
      );
    }
  }
}

/**
 * Prints a summary table of accessibility issue counts by type.
 * @param {object[]} errors - List of error objects.
 */
function printSummary(errors) {
  const grouped = groupErrors(errors);
  const summary = Object.entries(grouped).map(([type, list]) => ({
    "Issue Type": type,
    Count: list.length,
  }));

  console.log(chalk.bold("\n📊 Accessibility Checksum Summary:"));
  console.table(summary);
}

/**
 * Exports the full list of errors to a JSON file.
 * @param {object[]} errors - List of error objects.
 * @param {string} outputPath - Path to save the JSON file.
 */
function exportToJson(errors, outputPath) {
  try {
    fs.writeFileSync(outputPath, JSON.stringify(errors, null, 2), "utf-8");
    console.log(chalk.blue(`📦 Results exported to ${outputPath}`));
  } catch (err) {
    console.error(chalk.red(`Failed to export JSON: ${err.message}`));
  }
}

/**
 * Runs all accessibility checks on a single HTML content string.
 * Used for analyzing remote HTML via URL input.
 * @param {string} content - Raw HTML string.
 * @param {string} label - Display name (usually file path or URL).
 */
async function analyzeContent(content, label) {
  const errors = [
    ...(shouldRun("alt-attributes") ? altAttributes(content, label) : []),
    ...(shouldRun("aria-invalid") ? ariaLabels(content, label) : []),
    ...(shouldRun("missing-aria") ? missingAria(content, label) : []),
    ...(shouldRun("contrast") ? contrast(content, label) : []),
    ...(shouldRun("aria-role-invalid") ? ariaRoles(content, label) : []),
    ...(shouldRun("missing-landmark") ? landmarkRoles(content, label) : []),
    ...(shouldRun("label-missing-for") ? labelsWithoutFor(content, label) : []),
    ...(shouldRun("input-unlabeled") ? unlabeledInputs(content, label) : []),
    ...(shouldRun("empty-link") ? emptyLinks(content, label) : []),
    ...(shouldRun("iframe-title-missing") ? iframeTitles(content, label) : []),
    ...(shouldRun("multiple-h1") ? multipleH1(content, label) : []),
    ...(shouldRun("heading-order") ? headingOrder(content, label) : []),
    ...(shouldRun("heading-empty") ? headingEmpty(content, label) : []),
    ...(shouldRun("link-new-tab-warning") ? linksOpenNewTab(content, label) : []),
  ];

  if (errors.length > 0) {
    printErrors(errors);
    printSummary(errors);
    if (outputJson) exportToJson(errors, outputJson);
    process.exit(1);
  } else {
    console.log(chalk.green.bold("✅ No accessibility issues found!"));
  }
}

(async () => {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const res = await fetch(input);
      const html = await res.text();
      await analyzeContent(html, input);
    } catch (err) {
      console.error(chalk.red(`Failed to load URL: ${err.message}`));
      process.exit(1);
    }
  } else if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
    const files = findFiles(input);
    let allErrors = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");

      allErrors.push(
        ...(shouldRun("alt-attributes") ? altAttributes(content, file, config) : []),
        ...(shouldRun("aria-invalid") ? ariaLabels(content, file) : []),
        ...(shouldRun("missing-aria") ? missingAria(content, file) : []),
        ...(shouldRun("contrast") ? contrast(content, file) : []),
        ...(shouldRun("aria-role-invalid") ? ariaRoles(content, file) : []),
        ...(shouldRun("label-missing-for") ? labelsWithoutFor(content, file) : []),
        ...(shouldRun("input-unlabeled") ? unlabeledInputs(content, file) : []),
        ...(shouldRun("empty-link") ? emptyLinks(content, file) : []),
        ...(shouldRun("iframe-title-missing") ? iframeTitles(content, file) : []),
        ...(shouldRun("multiple-h1") ? multipleH1(content, file) : []),
        ...(shouldRun("heading-order") ? headingOrder(content, file) : []),
        ...(shouldRun("heading-empty") ? headingEmpty(content, file) : []),
        ...(shouldRun("link-new-tab-warning") ? linksOpenNewTab(content, file) : []),
        // ...(shouldRun("missing-landmark") ? landmarkRoles(content, file) : []),
      );
    }

    if (allErrors.length) {
      printErrors(allErrors);
      printSummary(allErrors);
      if (outputJson) exportToJson(allErrors, outputJson);
      process.exit(1);
    } else {
      console.log(chalk.green.bold("✅ No accessibility issues found!"));
    }
  }
})();
