const chalk = require("chalk");
const { typeMeta } = require("../registry");

/**
 * Metadata for a type, with a safe fallback for unregistered types so the
 * logger never throws on unexpected input.
 */
function metaFor(type) {
  return (
    typeMeta[type] || {
      severity: "error",
      label: type,
      emoji: "•",
      wcag: [],
      hint: null,
    }
  );
}

/** Effective severity of an issue (enriched field, or looked up by type). */
function severityOf(issue) {
  return issue.severity || metaFor(issue.type).severity;
}

/** Groups issues by type into a Map preserving insertion order. */
function groupByType(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    if (!grouped.has(issue.type)) grouped.set(issue.type, []);
    grouped.get(issue.type).push(issue);
  }
  return grouped;
}

/** Orders types: errors before warnings, then alphabetically. */
function orderTypes(types) {
  return [...types].sort((a, b) => {
    const sa = metaFor(a).severity;
    const sb = metaFor(b).severity;
    if (sa !== sb) return sa === "error" ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/**
 * Prints the grouped, color-coded accessibility report to stdout. The banner is
 * intentionally on stdout (not stderr) so CI greps of stdout can detect it.
 *
 * @param {object[]} issues - Enriched issue objects.
 */
function printErrors(issues) {
  const grouped = groupByType(issues);

  console.log(chalk.red.bold("\n🚨 Accessibility Issues Found:\n"));

  for (const type of orderTypes(grouped.keys())) {
    const meta = metaFor(type);
    const color = meta.severity === "error" ? chalk.red.bold : chalk.yellow.bold;
    const wcag =
      meta.wcag && meta.wcag.length
        ? chalk.gray(`  WCAG ${meta.wcag.join(", ")}`)
        : chalk.gray("  Best practice");

    console.log(
      `\n${meta.emoji}  ${color(meta.label)} ${chalk.gray(`[${meta.severity}]`)}${wcag}`
    );

    for (const issue of grouped.get(type)) {
      console.log(
        `  ${chalk.gray("-")} ${chalk.green(issue.file)}:${chalk.yellow(
          issue.line
        )} – ${chalk.white(issue.message)}`
      );
      if (issue.hint) console.log(`    ${chalk.gray(`↳ ${issue.hint}`)}`);
    }
  }
}

/**
 * Prints a summary table (Issue Type / Severity / Count) plus an eslint-style
 * totals line to stdout.
 *
 * @param {object[]} issues - Enriched issue objects.
 */
function printSummary(issues) {
  const grouped = groupByType(issues);
  const rows = orderTypes(grouped.keys()).map((type) => ({
    "Issue Type": type,
    Severity: metaFor(type).severity,
    Count: grouped.get(type).length,
  }));

  console.log(chalk.bold("\n📊 Accessibility Summary:"));
  console.table(rows);

  const errors = issues.filter((i) => severityOf(i) === "error").length;
  const warnings = issues.length - errors;
  const plural = (n) => (n === 1 ? "" : "s");
  const color = errors > 0 ? chalk.red.bold : chalk.yellow.bold;
  console.log(
    color(
      `\n✖ ${issues.length} problem${plural(issues.length)} ` +
        `(${errors} error${plural(errors)}, ${warnings} warning${plural(warnings)})`
    )
  );
}

module.exports = { printErrors, printSummary };
