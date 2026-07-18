#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const fetch = require("node-fetch"); // v2 for CommonJS
const core = require("@actions/core");

const { rules, typeMeta } = require("./src/registry");
const loadConfig = require("./src/utils/configuration");
const { printErrors, printSummary } = require("./src/utils/logger");
const pkg = require("./package.json");

const SCHEMA_VERSION = 2;

// ---------------------------------------------------------------------------
// Node API — pure functions: no process.exit, no stdout. Diagnostics (rule
// crashes, unknown types) go to stderr only, so require()-ing this module never
// executes the CLI or writes a report.
// ---------------------------------------------------------------------------

const warnedUnknownTypes = new Set();

/** Trimmed source line at `line`, capped at 120 chars, or null. */
function snippetAt(lines, line) {
  if (typeof line !== "number" || line < 1) return null;
  const raw = lines[line - 1];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
}

/** Enriches a raw rule issue with registry metadata + a source snippet. */
function enrichIssue(issue, lines) {
  const meta = typeMeta[issue.type];
  if (!meta && !warnedUnknownTypes.has(issue.type)) {
    warnedUnknownTypes.add(issue.type);
    process.stderr.write(
      chalk.yellow(
        `⚠️  Unknown issue type "${issue.type}" emitted by a rule — not in the registry.\n`
      )
    );
  }
  const enriched = {
    file: issue.file,
    line: issue.line,
    type: issue.type,
    message: issue.message,
    ruleId: meta ? meta.ruleId : null,
    severity: meta ? meta.severity : "error",
    wcag: meta ? meta.wcag : [],
    hint: meta ? meta.hint : null,
    snippet: snippetAt(lines, issue.line),
  };
  if (issue.column != null) enriched.column = issue.column;
  return enriched;
}

/** Stable ordering: file, then line, then type. */
function compareIssues(a, b) {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return (a.line || 0) - (b.line || 0);
  return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
}

/**
 * Runs every enabled rule over one document and returns enriched issues.
 * This is THE runner: per-rule try/catch (a crash is logged to stderr and the
 * rule skipped — no synthetic issue), type-level post-filtering, enrichment,
 * and sorting.
 *
 * @param {string} content - Raw HTML/template source.
 * @param {string} label - Display name (file path or URL).
 * @param {object} [config] - Normalized config (rules/options).
 * @returns {object[]} Enriched issue objects.
 */
function analyzeContent(content, label, config = {}) {
  const rulesConfig = (config && config.rules) || {};
  const raw = [];

  for (const rule of rules) {
    if (rulesConfig[rule.id] === false) continue;
    let produced;
    try {
      produced = rule.check(content, label, config) || [];
    } catch (err) {
      process.stderr.write(
        chalk.yellow(
          `⚠️  Rule "${rule.id}" crashed on ${label} — skipped (${err.message})\n`
        )
      );
      continue;
    }
    for (const issue of produced) raw.push(issue);
  }

  const lines = content.split("\n");
  const enriched = raw
    .filter((issue) => rulesConfig[issue.type] !== false)
    .map((issue) => enrichIssue(issue, lines));
  enriched.sort(compareIssues);
  return enriched;
}

/**
 * Recursively collects scannable files under `dir`, honoring the config's
 * allowed extensions and excluded directories. Entries are sorted for
 * deterministic output.
 */
function findFiles(dir, config) {
  const allowed = config.allowedExtensions || loadConfig.DEFAULT_ALLOWED_EXTENSIONS;
  const excluded = new Set(config.excludedDirs || loadConfig.DEFAULT_EXCLUDED_DIRS);
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excluded.has(entry.name)) continue;
      files.push(...findFiles(fullPath, config));
    } else if (allowed.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Scans a directory (recursive) or a single file. Directory walks honor
 * config-driven extensions/exclusions; an explicit single file is scanned
 * regardless of extension. A non-existent path throws (ENOENT).
 *
 * @param {string} targetPath - Directory or file path.
 * @param {object} [config] - Normalized config.
 * @returns {{ issues: object[], filesScanned: number }}
 */
function scanPath(targetPath, config = {}) {
  const stat = fs.statSync(targetPath); // throws ENOENT for bad paths
  const files = stat.isDirectory() ? findFiles(targetPath, config) : [targetPath];

  const issues = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    issues.push(...analyzeContent(content, file, config));
  }
  issues.sort(compareIssues);
  return { issues, filesScanned: files.length };
}

/**
 * Fetches a URL and scans its HTML. Throws on network failure and on a non-OK
 * HTTP status (so an error page is never silently audited).
 *
 * @param {string} url - http(s) URL.
 * @param {object} [config] - Normalized config.
 * @returns {Promise<{ issues: object[], filesScanned: number }>}
 */
async function scanUrl(url, config = {}) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} while fetching ${url}`);
  }
  const html = await res.text();
  const issues = analyzeContent(html, url, config);
  return { issues, filesScanned: 1 };
}

/** Summarizes issues: totals, error/warning split, and a sorted byType map. */
function summarize(issues, filesScanned) {
  const byType = {};
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
    if (issue.severity === "warning") warnings++;
    else errors++;
  }
  const sortedByType = {};
  for (const key of Object.keys(byType).sort()) sortedByType[key] = byType[key];
  return {
    filesScanned: filesScanned ?? null,
    total: issues.length,
    errors,
    warnings,
    byType: sortedByType,
  };
}

/**
 * Builds the schema-v2 JSON report document.
 *
 * @param {object[]} issues - Enriched issues.
 * @param {object} [meta] - { target, filesScanned, timestamp }.
 * @returns {object} Report document.
 */
function buildReport(issues, meta = {}) {
  const sorted = [...issues].sort(compareIssues);
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: { name: pkg.name, version: pkg.version },
    target: meta.target != null ? meta.target : null,
    timestamp: meta.timestamp || new Date().toISOString(),
    summary: summarize(sorted, meta.filesScanned),
    issues: sorted,
  };
}

/** Builds the `--list-rules` document (schema v2). */
function buildRuleList() {
  return {
    schemaVersion: SCHEMA_VERSION,
    rules: rules.map((rule) => ({
      id: rule.id,
      description: rule.description,
      defaultEnabled: true,
      types: Object.entries(rule.types).map(([type, m]) => ({
        type,
        severity: m.severity,
        wcag: m.wcag,
        hint: m.hint,
        label: m.label,
        emoji: m.emoji,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `be-a11y — accessibility auditor for HTML / templates

Usage:
  be-a11y <dir|file|url> [report.json] [options]

Options:
  --json         Print the full JSON report (schema v${SCHEMA_VERSION}) to stdout
  --list-rules   Print all rules and their metadata as JSON, then exit
  --help, -h     Show this help

Exit codes:
  0  no issues found
  1  accessibility issues found
  2  usage or environment error
`;

/** Thrown for CLI grammar errors; mapped to exit code 2. */
class UsageError extends Error {}

/** Parses argv into positionals + flags (flags are position-independent). */
function parseArgs(argv) {
  const positionals = [];
  const flags = { json: false, listRules: false, help: false };
  for (const arg of argv) {
    if (arg === "--json") flags.json = true;
    else if (arg === "--list-rules") flags.listRules = true;
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg.startsWith("--") || arg.startsWith("-")) {
      throw new UsageError(`Unknown flag: ${arg}`);
    } else positionals.push(arg);
  }
  return { positionals, flags };
}

/** Emits GitHub Action outputs and a job summary (best-effort, gated on env). */
async function emitActionOutputs(report, reportPath) {
  const s = report.summary;
  try {
    if (process.env.GITHUB_OUTPUT) {
      core.setOutput("total", s.total);
      core.setOutput("errors", s.errors);
      core.setOutput("warnings", s.warnings);
      core.setOutput("report-path", reportPath || "");
    }
  } catch (_) {
    /* non-fatal */
  }
  try {
    if (process.env.GITHUB_STEP_SUMMARY) {
      core.summary
        .addHeading("be-a11y accessibility report")
        .addRaw(
          `**${s.total}** problem(s) — ${s.errors} error(s), ${s.warnings} ` +
            `warning(s) across ${s.filesScanned} file(s).`
        );
      const rows = Object.entries(s.byType).map(([type, count]) => [
        type,
        String(count),
      ]);
      if (rows.length) {
        core.summary.addTable([
          [
            { data: "Type", header: true },
            { data: "Count", header: true },
          ],
          ...rows,
        ]);
      }
      await core.summary.write();
    }
  } catch (_) {
    /* non-fatal */
  }
}

/**
 * Reports a usage/environment error and sets exit code 2. Returns undefined so
 * callers can `return fail(...)`. We set process.exitCode rather than calling
 * process.exit() so buffered stdout/stderr is flushed before the process ends.
 */
function fail(message) {
  process.stderr.write(`${chalk.red(message)}\n\n${USAGE}`);
  process.exitCode = 2;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    return fail(err.message);
  }
  const { positionals, flags } = parsed;

  if (flags.help) {
    process.stdout.write(USAGE);
    return;
  }

  if (flags.listRules) {
    process.stdout.write(`${JSON.stringify(buildRuleList(), null, 2)}\n`);
    return;
  }

  const config = loadConfig();

  // Resolve input. GitHub Action inputs are consulted ONLY inside Actions, so a
  // stray local INPUT_URL env var can't hijack a CLI run.
  let target = positionals[0];
  let reportPath = positionals[1];
  if (process.env.GITHUB_ACTIONS === "true") {
    const inUrl = core.getInput("url") || core.getInput("input") || "";
    const inReport = core.getInput("report") || "";
    if (inUrl) target = inUrl;
    if (inReport) reportPath = inReport;
  }

  if (positionals.length > 2) return fail("Too many arguments.");
  if (!target) return fail("Please provide a directory, file, or URL to scan.");

  let result;
  try {
    result = /^https?:\/\//i.test(target)
      ? await scanUrl(target, config)
      : scanPath(target, config);
  } catch (err) {
    return fail(`Error: ${err.message}`);
  }

  const { issues, filesScanned } = result;
  const report = buildReport(issues, {
    target,
    filesScanned,
    timestamp: new Date().toISOString(),
  });

  if (flags.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (issues.length > 0) {
    printErrors(issues);
    printSummary(issues);
  } else {
    process.stdout.write(chalk.green.bold("✅ No accessibility issues found!\n"));
  }

  if (reportPath) {
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
      process.stderr.write(chalk.blue(`📦 Results exported to ${reportPath}\n`));
    } catch (err) {
      return fail(`Failed to write report to ${reportPath}: ${err.message}`);
    }
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    await emitActionOutputs(report, reportPath);
  }

  // Set exitCode (not process.exit) so stdout — which may be a large piped JSON
  // report — is fully flushed before the process ends.
  process.exitCode = issues.length > 0 ? 1 : 0;
}

module.exports = {
  analyzeContent,
  scanPath,
  scanUrl,
  loadConfig,
  buildReport,
  buildRuleList,
  rules,
};

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(chalk.red(`Unexpected error: ${err.stack || err.message}\n`));
    process.exitCode = 2;
  });
}
