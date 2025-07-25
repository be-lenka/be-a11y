const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const fetch = require("node-fetch"); // v2 for CommonJS

// Rules
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

// Utils
const configuration = require("./src/utils/configuration");
const shouldRun = require("./src/utils/runner");
const { printErrors, printSummary, exportToJson } = require("./src/utils/logger");

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

let config = configuration("a11y.config.json");

if (!input) {
  console.error(
    chalk.red("Please provide a directory path or URL as the first argument."),
  );
  process.exit(1);
}

/**
 * Recursively finds files with allowed extensions in a directory.
 * Ignores directories listed in `excludedDirs`.
 *
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
 * Runs all accessibility checks on a single HTML content string.
 * Used for analyzing remote HTML via URL input.
 *
 * @param {string} content - Raw HTML string.
 * @param {string} label - Display name (usually file path or URL).
 */
async function analyzeContent(content, label) {
  const errors = [
    ...(shouldRun(config, "alt-attributes") ? altAttributes(content, label) : []),
    ...(shouldRun(config, "aria-invalid") ? ariaLabels(content, label) : []),
    ...(shouldRun(config, "missing-aria") ? missingAria(content, label) : []),
    ...(shouldRun(config, "contrast") ? contrast(content, label) : []),
    ...(shouldRun(config, "aria-role-invalid") ? ariaRoles(content, label) : []),
    ...(shouldRun(config, "missing-landmark") ? landmarkRoles(content, label) : []),
    ...(shouldRun(config, "label-missing-for") ? labelsWithoutFor(content, label) : []),
    ...(shouldRun(config, "input-unlabeled") ? unlabeledInputs(content, label) : []),
    ...(shouldRun(config, "empty-link") ? emptyLinks(content, label) : []),
    ...(shouldRun(config, "iframe-title-missing") ? iframeTitles(content, label) : []),
    ...(shouldRun(config, "multiple-h1") ? multipleH1(content, label) : []),
    ...(shouldRun(config, "heading-order") ? headingOrder(content, label) : []),
    ...(shouldRun(config, "heading-empty") ? headingEmpty(content, label) : []),
    ...(shouldRun(config, "link-new-tab-warning") ? linksOpenNewTab(content, label) : []),
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
        ...(shouldRun(config, "alt-attributes") ? altAttributes(content, file, config) : []),
        ...(shouldRun(config, "aria-invalid") ? ariaLabels(content, file) : []),
        ...(shouldRun(config, "missing-aria") ? missingAria(content, file) : []),
        ...(shouldRun(config, "contrast") ? contrast(content, file) : []),
        ...(shouldRun(config, "aria-role-invalid") ? ariaRoles(content, file) : []),
        ...(shouldRun(config, "label-missing-for") ? labelsWithoutFor(content, file) : []),
        ...(shouldRun(config, "input-unlabeled") ? unlabeledInputs(content, file) : []),
        ...(shouldRun(config, "empty-link") ? emptyLinks(content, file) : []),
        ...(shouldRun(config, "iframe-title-missing") ? iframeTitles(content, file) : []),
        ...(shouldRun(config, "multiple-h1") ? multipleH1(content, file) : []),
        ...(shouldRun(config, "heading-order") ? headingOrder(content, file) : []),
        ...(shouldRun(config, "heading-empty") ? headingEmpty(content, file) : []),
        ...(shouldRun(config, "link-new-tab-warning") ? linksOpenNewTab(content, file) : []),
        // ...(shouldRun(config, "missing-landmark") ? landmarkRoles(content, file) : []),
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
