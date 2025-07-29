const chalk = require("chalk");

/**
 * Groups an array of errors by their `type` property.
 *
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
 *
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
 *
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
 *
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

module.exports = { printErrors, printSummary, exportToJson }
