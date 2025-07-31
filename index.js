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
const { printErrors, printSummary } = require("./src/utils/logger");

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

// If running in GitHub Actions, use @actions/core to get inputs
let input, outputJson;
let coreAvailable = false;
try {
  // Dynamically require @actions/core if available
  const core = require("@actions/core");
  coreAvailable = true;
  input = core.getInput("url") || core.getInput("input") || "";
  outputJson = core.getInput("report") || "";
} catch (e) {
  // fallback to CLI arguments for local/testing use
  input = process.argv[2];
  outputJson = process.argv[3];
}

let config = configuration("a11y.config.json");

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
