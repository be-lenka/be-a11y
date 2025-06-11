const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const tinycolor = require("tinycolor2");
const chalk = require("chalk");
const fetch = require("node-fetch"); // v2 for CommonJS

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
      "⚠️ No config file found or invalid JSON. Using default rules.",
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
 * Returns the line number where a specific tag index appears in the content.
 * @param {string} content - File content as a string.
 * @param {number} tagIndex - Index of the tag within the content.
 * @returns {number} Line number (1-based).
 */
function getLineNumber(content, tagIndex) {
  return content.slice(0, tagIndex).split("\n").length;
}

/**
 * Checks if headings (h1-h6) are used in the correct order (no jumps).
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of heading order errors.
 */
function checkHeadingOrder(content, file) {
  const $ = cheerio.load(content);
  let lastLevel = 0;
  const errors = [];

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.name.substring(1));
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if (lastLevel && level - lastLevel > 1) {
      errors.push({
        file,
        line: lineNumber,
        type: "heading-order",
        message: `<${el.name}> follows <h${lastLevel}>`,
      });
    }

    lastLevel = level;
  });

  return errors;
}

/**
 * Validates that all <img> tags have appropriate `alt` attributes.
 * Checks for missing, empty, decorative, functional, or overly long alt texts.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of alt attribute errors.
 */
function checkAltAttributes(content, file) {
  const $ = cheerio.load(content);
  const errors = [];
  const seen = new Set();

  $("img").each((_, el) => {
    const $el = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);
    const locationKey = `${file}:${lineNumber}`;
    if (seen.has(locationKey)) return;
    seen.add(locationKey);

    const alt = $el.attr("alt");
    const role = $el.attr("role");
    const isDecorative =
      role === "presentation" || role === "none" || alt === "";
    const isInLinkOrButton = $el.parents("a, button").length > 0;

    // Case 1: Missing alt attribute entirely
    if (typeof alt === "undefined") {
      errors.push({
        file,
        line: lineNumber,
        type: "missing-alt",
        message: `<img> tag is missing an alt attribute`,
      });
      return;
    }

    // Case 2: Decorative image with non-empty alt
    if (isDecorative && alt !== "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-decorative-incorrect",
        message: `Decorative image should have empty alt="" or role="presentation"`,
      });
      return;
    }

    // Case 3: Functional image with empty alt
    if (isInLinkOrButton && alt.trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-functional-empty",
        message: `Functional image inside <a> or <button> needs descriptive alt text`,
      });
      return;
    }

    // Case 4: alt exists but only contains whitespace
    if (alt.trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-empty",
        message: `alt attribute exists but is empty; ensure this is intentional (e.g., decorative image)`,
      });
    }

    // Case 5: alt is too long
    if (alt.length > 30) {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-too-long",
        message: `alt attribute exceeds 30 characters (${alt.length} characters)`,
      });
    }
  });

  return errors;
}

/**
 * Checks for invalid or missing values in `aria-label` and `aria-labelledby`.
 * Ensures `aria-labelledby` points to existing IDs.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of ARIA label errors.
 */
function checkAriaLabels(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("[aria-label], [aria-labelledby]").each((_, el) => {
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if ($(el).attr("aria-label") && $(el).attr("aria-label").trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "aria-invalid",
        message: `aria-label is empty`,
      });
    }

    if ($(el).attr("aria-labelledby")) {
      const id = $(el).attr("aria-labelledby");
      if (!$(`#${id}`).length) {
        errors.push({
          file,
          line: lineNumber,
          type: "aria-invalid",
          message: `aria-labelledby references a non-existent ID: ${id}`,
        });
      }
    }
  });

  return errors;
}

/**
 * Checks if important elements lack visible text or an ARIA label.
 * Applies to elements like buttons, links, SVGs, etc.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of missing ARIA label issues.
 */
function checkMissingAria(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  const selectors = [
    "button",
    "a[href]",
    'input[type="text"]',
    "svg",
    "form",
    "section",
    "nav",
    "aside",
    "main",
    "dialog",
  ];

  $(selectors.join(",")).each((_, el) => {
    const $el = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const hasAria = $el.attr("aria-label") || $el.attr("aria-labelledby");
    const hasText = $el.text().trim().length > 0;

    if (!hasAria && !hasText) {
      errors.push({
        file,
        line: lineNumber,
        type: "missing-aria",
        message: `<${el.name}> element should have an aria-label or visible text`,
      });
    }
  });

  return errors;
}

/**
 * Evaluates inline styles for text/background color contrast ratio.
 * Flags contrast ratios below WCAG AA threshold (4.5).
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of contrast issues.
 */
function checkContrast(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("*").each((_, el) => {
    const style = $(el).attr("style");
    if (
      style &&
      style.includes("color") &&
      style.includes("background-color")
    ) {
      const inlineStyles = style.split(";").reduce((acc, rule) => {
        const [key, value] = rule.split(":");
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});

      const fg = tinycolor(inlineStyles["color"]);
      const bg = tinycolor(inlineStyles["background-color"]);

      if (fg.isValid() && bg.isValid()) {
        const contrast = tinycolor.readability(bg, fg);
        if (contrast < 4.5) {
          const html = $.html(el);
          const tagIndex = content.indexOf(html);
          const lineNumber = getLineNumber(content, tagIndex);
          errors.push({
            file,
            line: lineNumber,
            type: "contrast",
            message: `Low contrast ratio (${contrast.toFixed(2)}): ${inlineStyles["color"]} on ${inlineStyles["background-color"]}`,
          });
        }
      }
    }
  });

  return errors;
}

/**
 * Rule to validate correct usage of ARIA roles (e.g., role="button" on non-interactive tags like <div> without a tabindex and click handler is misleading).
 * @param {*} content
 * @param {*} file
 * @returns
 */
function checkAriaRoles(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("[role]").each((_, el) => {
    const role = $(el).attr("role");
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    // ... extend this list as needed
    const allowedRoles = [
      "button",
      "checkbox",
      "dialog",
      "link",
      "listbox",
      "menu",
      "navigation",
      "progressbar",
      "radio",
      "slider",
      "tab",
    ];

    if (!allowedRoles.includes(role)) {
      errors.push({
        file,
        line: lineNumber,
        type: "aria-role-invalid",
        message: `Unrecognized or inappropriate ARIA role: "${role}"`,
      });
    }
  });

  return errors;
}

/**
 * Verifies the presence of at least one semantic landmark element.
 * Expected tags include <main>, <nav>, <header>, <footer>, <aside>.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List containing missing landmark error, if any.
 */
function checkLandmarkRoles(content, file) {
  const $ = cheerio.load(content);
  const landmarks = ["main", "nav", "header", "footer", "aside"];
  const errors = [];

  const present = landmarks.filter((tag) => $(tag).length > 0);
  if (present.length === 0) {
    errors.push({
      file,
      line: 1,
      type: "missing-landmark",
      message: "No landmark elements (main, nav, header, footer, aside) found",
    });
  }

  return errors;
}

/**
 * Checks that each <label> element is properly associated with a form control.
 * It should either have a 'for' attribute pointing to an existing control ID
 * OR contain an input/select/textarea element inside.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of label association errors.
 */
function checkLabelsWithoutFor(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("label").each((_, el) => {
    const $label = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const forAttr = $label.attr("for");

    if (forAttr) {
      const inputMatch = $(`[id='${forAttr}']`);
      if (!inputMatch.length) {
        errors.push({
          file,
          line: lineNumber,
          type: "label-for-missing",
          message: `<label for="${forAttr}"> does not match any element with that ID`,
        });
      }
    } else {
      const hasNestedControl =
        $label.find("input, select, textarea").length > 0;
      if (!hasNestedControl) {
        errors.push({
          file,
          line: lineNumber,
          type: "label-missing-for",
          message: `<label> is not associated with any form control (missing 'for' or nested input)`,
        });
      }
    }
  });

  return errors;
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
    "missing-alt": chalk.cyan.bold("🖼️ Missing ALT"),
    "alt-empty": chalk.white.bold("⬜ ALT Empty"),
    "alt-too-long": chalk.red.bold("↔️ ALT Too Long"),
    "alt-decorative-incorrect": chalk.gray.bold("🌈 ALT Decorative"),
    "alt-functional-empty": chalk.blueBright.bold("🔗 ALT Functional"),
    "aria-invalid": chalk.magenta.bold("♿ ARIA Issues"),
    "missing-aria": chalk.blue.bold("👀 Missing ARIA"),
    "aria-role-invalid": chalk.blue.bold("🧩 ARIA Role Issues"),
    "missing-landmark": chalk.yellowBright.bold("🏛️ Landmark Elements"),
    contrast: chalk.red.bold("🎨 Contrast Issues"),
    "label-for-missing": chalk.red.bold("🔗 Broken Label Association"),
    "label-missing-for": chalk.yellow.bold("🏷️ Unassociated Label"),
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
    ...(shouldRun("heading-order") ? checkHeadingOrder(content, label) : []),
    ...(shouldRun("alt-attributes") ? checkAltAttributes(content, label) : []),
    ...(shouldRun("aria-invalid") ? checkAriaLabels(content, label) : []),
    ...(shouldRun("missing-aria") ? checkMissingAria(content, label) : []),
    ...(shouldRun("contrast") ? checkContrast(content, label) : []),
    ...(shouldRun("aria-role-invalid") ? checkAriaRoles(content, label) : []),
    ...(shouldRun("missing-landmark")
      ? checkLandmarkRoles(content, label)
      : []),
    ...(shouldRun("label-missing-for")
      ? checkLabelsWithoutFor(content, label)
      : []),
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
        ...(shouldRun("heading-order") ? checkHeadingOrder(content, file) : []),
        ...(shouldRun("alt-attributes")
          ? checkAltAttributes(content, file)
          : []),
        ...(shouldRun("aria-invalid") ? checkAriaLabels(content, file) : []),
        ...(shouldRun("missing-aria") ? checkMissingAria(content, file) : []),
        ...(shouldRun("contrast") ? checkContrast(content, file) : []),
        ...(shouldRun("aria-role-invalid")
          ? checkAriaRoles(content, file)
          : []),
        ...(shouldRun("missing-landmark")
          ? checkLandmarkRoles(content, file)
          : []),
        ...(shouldRun("label-missing-for")
          ? checkLabelsWithoutFor(content, file)
          : []),
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
