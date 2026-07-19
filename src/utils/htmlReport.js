const { metaFor, orderTypes } = require("./logger");

/**
 * Self-contained HTML report renderer.
 *
 * Pure string-in/string-out: no I/O, no process access, no chalk. The whole
 * page (markup, CSS, JS) is built from inline template literals — the ncc
 * bundle has no asset files to read at runtime.
 *
 * Dogfood invariant: the rendered document must itself pass be-a11y
 * (`analyzeContent(renderHtmlReport(report), "report.html") === []`).
 * Structural consequences, enforced by test/htmlReport.test.js:
 *   - zero inline `style` attributes (palette AA is proven by a tinycolor2
 *     test over PALETTE instead — the contrast rule only sees [style]);
 *   - all report data lands in text nodes / quoted attributes via escapeHtml,
 *     and never inside the <script> block;
 *   - generated ids are sanitized to [a-z0-9-] (anchorId), never raw types;
 *   - the inline JS contains no "</script" and no template literals.
 */

/**
 * WCAG-AA-verified color pairs for both schemes. Every `text` color is kept
 * >= 4.5:1 against both `surfaces` (checked by test/htmlReport.test.js with
 * tinycolor2, since be-a11y's own contrast rule cannot see <style> blocks).
 * `line` is decorative (borders only) and exempt from the ratio requirement.
 */
const PALETTE = {
  light: {
    surfaces: { bg: "#ffffff", panel: "#f4f4f2" },
    text: {
      fg: "#1f2328", // 15.80:1 on bg, 14.35:1 on panel
      muted: "#59626b", // 6.21:1 on bg, 5.63:1 on panel
      err: "#b02032", // 6.78:1 on bg, 6.15:1 on panel
      warn: "#7d5300", // 6.75:1 on bg, 6.13:1 on panel
      ok: "#19703a", // 6.14:1 on bg, 5.58:1 on panel
    },
    line: "#d0d4d9",
  },
  dark: {
    surfaces: { bg: "#14171b", panel: "#1d2126" },
    text: {
      fg: "#e6e8ea", // 14.63:1 on bg, 13.17:1 on panel
      muted: "#9ba3ab", // 7.04:1 on bg, 6.33:1 on panel
      err: "#ff9d94", // 8.99:1 on bg, 8.09:1 on panel
      warn: "#d9a944", // 8.31:1 on bg, 7.48:1 on panel
      ok: "#6dbd74", // 7.86:1 on bg, 7.07:1 on panel
    },
    line: "#363c43",
  },
};

/** Escapes a value for use in HTML text nodes and quoted attribute values. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Derives a safe, unique fragment id for an issue type. Sanitized to
 * `type-[a-z0-9-]*` so a hostile/templated type name can never produce a
 * braced id (which collectIds would silently skip) or break a selector.
 */
function anchorId(type, used) {
  let slug = String(type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") slug = "issue";
  let id = `type-${slug}`;
  for (let n = 2; used.has(id); n++) id = `type-${slug}-${n}`;
  used.add(id);
  return id;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats an ISO timestamp as fixed English UTC ("19 Jul 2026, 14:03 UTC") —
 * locale- and timezone-stable so tests never depend on the host machine. An
 * unparsable value is returned as-is (the caller escapes it).
 */
function formatTimestamp(iso) {
  if (typeof iso !== "string" || iso.trim() === "") return iso == null ? "" : String(iso);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

/** Effective severity of an issue, normalized to "error" | "warning". */
function severityOf(issue) {
  const severity = issue.severity || metaFor(issue.type).severity;
  return severity === "warning" ? "warning" : "error";
}

/** "s" for anything but 1, mirroring the console summary's pluralization. */
function plural(n) {
  return n === 1 ? "" : "s";
}

// The stylesheet. No `${` may appear here (it sits inside a template literal)
// and no data is ever interpolated into it. Contrast ratios are documented on
// PALETTE above and enforced by the palette AA test.
const STYLE = `
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --panel: #f4f4f2;
  --fg: #1f2328;
  --muted: #59626b;
  --err: #b02032;
  --warn: #7d5300;
  --ok: #19703a;
  --line: #d0d4d9;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14171b;
    --panel: #1d2126;
    --fg: #e6e8ea;
    --muted: #9ba3ab;
    --err: #ff9d94;
    --warn: #d9a944;
    --ok: #6dbd74;
    --line: #363c43;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
body {
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  max-width: 64rem;
  background: var(--bg);
  color: var(--fg);
  font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
[hidden] { display: none !important; }
code, pre, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
a:hover { text-decoration-thickness: 2px; }

.skip-link { position: absolute; left: -999rem; }
.skip-link:focus {
  position: fixed;
  left: 1rem;
  top: 1rem;
  z-index: 10;
  padding: 0.5rem 1rem;
  background: var(--bg);
  border: 2px solid var(--fg);
  border-radius: 6px;
}

.page-head { margin-bottom: 2.25rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--line); }
h1 { margin: 0 0 1.5rem; font-size: 0.875rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.verdict { margin: 0; font-size: 1.25rem; line-height: 1.35; }
.verdict strong { display: block; font-size: 2.75rem; font-weight: 750; letter-spacing: -0.02em; line-height: 1.1; }
.verdict-bad strong { color: var(--err); }
.verdict-ok { color: var(--ok); font-size: 1.75rem; font-weight: 650; }
.meta { display: flex; flex-wrap: wrap; gap: 0.5rem 3rem; margin: 1.75rem 0 0; }
.meta dt { margin: 0 0 0.1rem; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.meta dd { margin: 0; font-variant-numeric: tabular-nums; }

h2 { margin: 2.5rem 0 0.75rem; font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

.toolbar-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.toolbar-row label { margin-right: 0.25rem; }
input[type="search"] {
  flex: 1 1 14rem;
  min-width: 10rem;
  padding: 0.4rem 0.65rem;
  font: inherit;
  color: var(--fg);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
}
button {
  padding: 0.4rem 0.8rem;
  font: inherit;
  font-variant-numeric: tabular-nums;
  color: var(--fg);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
}
button[data-severity][aria-pressed="false"] { color: var(--muted); background: transparent; border-style: dashed; text-decoration: line-through; }
.filter-status { margin: 0.75rem 0 0; font-size: 0.875rem; color: var(--muted); font-variant-numeric: tabular-nums; }

.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
caption { margin-bottom: 0.5rem; text-align: left; font-size: 0.875rem; color: var(--muted); }
th, td { padding: 0.45rem 1rem 0.45rem 0; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
thead th { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.num { text-align: right; }
td.num { font-size: 0.9375rem; }

.rule { margin-bottom: 0.75rem; border: 1px solid var(--line); border-radius: 8px; }
summary { padding: 0.65rem 0.9rem; cursor: pointer; }
summary h3 { display: inline; margin: 0; font-size: 1rem; font-weight: 600; }
.badge {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  vertical-align: 0.1rem;
}
.badge-error { color: var(--err); border-color: var(--err); }
.badge-warning { color: var(--warn); border-color: var(--warn); }
.count { margin-left: 0.4rem; font-size: 0.8125rem; font-weight: 400; color: var(--muted); font-variant-numeric: tabular-nums; }
.hint { margin: 0 0.9rem 0.6rem; font-size: 0.875rem; color: var(--muted); }
.issue-list { margin: 0; padding: 0 0.9rem 0.8rem; list-style: none; }
.issue-list li { margin-bottom: 0.6rem; padding: 0.35rem 0 0.35rem 0.75rem; border-left: 3px solid var(--line); }
.issue-list li:last-child { margin-bottom: 0; }
.issue-list li[data-severity="error"] { border-left-color: var(--err); }
.issue-list li[data-severity="warning"] { border-left-color: var(--warn); }
.where { margin: 0; }
.loc { font-size: 0.875rem; }
pre {
  margin: 0.4rem 0 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow-x: auto;
}
pre code { font-size: inherit; }

.page-foot { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--line); font-size: 0.875rem; color: var(--muted); }
.page-foot p { margin: 0; }
`;

// The interactivity layer. Constraints (dogfood + embedding safety): plain
// text search + severity toggles + expand/collapse, fully progressive (the
// page reads fine when this never runs); no template literals and no "${"
// (this string sits inside the module's outer template literal); no report
// data; must not contain a literal "</script".
const SCRIPT = `
(function () {
  "use strict";
  var search = document.getElementById("issue-search");
  var status = document.getElementById("filter-status");
  var toggleAll = document.getElementById("toggle-all");
  var toggles = Array.prototype.slice.call(document.querySelectorAll("button[data-severity]"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("section[data-type]"));
  var items = Array.prototype.slice.call(document.querySelectorAll("li[data-severity]"));
  if (!search || !status || items.length === 0) return;

  var active = { error: true, warning: true };
  var timer = null;

  function applyFilters() {
    var query = search.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (item) {
      var severityOk = active[item.getAttribute("data-severity")] !== false;
      var queryOk = query === "" || item.textContent.toLowerCase().indexOf(query) !== -1;
      var visible = severityOk && queryOk;
      item.hidden = !visible;
      if (visible) shown += 1;
    });
    sections.forEach(function (section) {
      section.hidden = !section.querySelector("li[data-severity]:not([hidden])");
    });
    status.textContent = "Showing " + shown + " of " + items.length + " issues.";
  }

  toggles.forEach(function (button) {
    button.addEventListener("click", function () {
      var severity = button.getAttribute("data-severity");
      active[severity] = active[severity] === false;
      button.setAttribute("aria-pressed", active[severity] ? "true" : "false");
      applyFilters();
    });
  });

  search.addEventListener("input", function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(applyFilters, 100);
  });

  if (toggleAll) {
    toggleAll.addEventListener("click", function () {
      var details = Array.prototype.slice.call(document.querySelectorAll("section[data-type] > details"));
      var anyOpen = details.some(function (d) { return d.open; });
      details.forEach(function (d) { d.open = !anyOpen; });
      toggleAll.textContent = anyOpen ? "Expand all sections" : "Collapse all sections";
    });
  }
}());
`;

/** Groups issues by type into a Map preserving insertion (sorted) order. */
function groupIssuesByType(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    if (!grouped.has(issue.type)) grouped.set(issue.type, []);
    grouped.get(issue.type).push(issue);
  }
  return grouped;
}

/** Per-file totals: Map file -> { errors, warnings, types: Set } in file order. */
function aggregateByFile(issues) {
  const byFile = new Map();
  for (const issue of issues) {
    const file = issue.file == null ? "" : String(issue.file);
    if (!byFile.has(file)) byFile.set(file, { errors: 0, warnings: 0, types: new Set() });
    const entry = byFile.get(file);
    if (severityOf(issue) === "warning") entry.warnings++;
    else entry.errors++;
    entry.types.add(issue.type);
  }
  return byFile;
}

/** The <header>: h1, verdict line, and the Target/Generated/Tool/Files <dl>. */
function renderHeader(report, counts) {
  const { total, errors, warnings, filesScanned } = counts;
  const tool = report.tool || {};
  const toolText = `${tool.name || "be-a11y"}${tool.version ? ` v${tool.version}` : ""}`;

  let verdict;
  if (total === 0) {
    verdict =
      `<p class="verdict verdict-ok"><span aria-hidden="true">✓ </span>` +
      `No accessibility issues found.</p>`;
  } else {
    const files =
      filesScanned == null ? "" : ` across ${filesScanned} file${plural(filesScanned)}`;
    verdict =
      `<p class="verdict verdict-bad"><strong>${total} problem${plural(total)}</strong> ` +
      `— ${errors} error${plural(errors)}, ${warnings} warning${plural(warnings)}${files}.</p>`;
  }

  const timestamp = report.timestamp;
  const formatted = formatTimestamp(timestamp);
  const parseable =
    typeof timestamp === "string" && !Number.isNaN(new Date(timestamp).getTime());
  const generated = parseable
    ? `<time datetime="${escapeHtml(timestamp)}">${escapeHtml(formatted)}</time>`
    : escapeHtml(formatted) || "—";

  return [
    `<header class="page-head">`,
    `<h1>Accessibility report</h1>`,
    verdict,
    `<dl class="meta">`,
    `<div><dt>Target</dt><dd class="mono">${report.target == null ? "—" : escapeHtml(report.target)}</dd></div>`,
    `<div><dt>Generated</dt><dd>${generated}</dd></div>`,
    `<div><dt>Tool</dt><dd>${escapeHtml(toolText)}</dd></div>`,
    `<div><dt>Files scanned</dt><dd>${filesScanned == null ? "—" : filesScanned}</dd></div>`,
    `</dl>`,
    `</header>`,
  ].join("\n");
}

/** The filter toolbar: search, severity toggles, expand/collapse, status. */
function renderToolbar(counts) {
  const { total, errors, warnings } = counts;
  return [
    `<section class="toolbar">`,
    `<h2>Filter issues</h2>`,
    `<div class="toolbar-row">`,
    `<label for="issue-search">Search issues</label>`,
    `<input type="search" id="issue-search">`,
    `<button type="button" data-severity="error" aria-pressed="true">Errors (${errors})</button>`,
    `<button type="button" data-severity="warning" aria-pressed="true">Warnings (${warnings})</button>`,
    `<button type="button" id="toggle-all">Collapse all sections</button>`,
    `</div>`,
    `<p class="filter-status" role="status" id="filter-status">Showing ${total} of ${total} issues.</p>`,
    `</section>`,
  ].join("\n");
}

/** The per-file totals table, with rule links anchoring into the sections. */
function renderFilesTable(byFile, idByType) {
  const rows = [];
  for (const [file, entry] of byFile) {
    const links = orderTypes(entry.types)
      .map((type) => `<a href="#${idByType.get(type)}">${escapeHtml(metaFor(type).label)}</a>`)
      .join(", ");
    rows.push(
      `<tr><th scope="row" class="mono">${escapeHtml(file)}</th>` +
        `<td class="num">${entry.errors}</td>` +
        `<td class="num">${entry.warnings}</td>` +
        `<td>${links}</td></tr>`
    );
  }
  return [
    `<section class="files">`,
    `<h2>Issues per file</h2>`,
    `<div class="table-scroll">`,
    `<table>`,
    `<caption>Errors, warnings, and triggered rules per file</caption>`,
    `<thead><tr><th scope="col">File</th><th scope="col" class="num">Errors</th>` +
      `<th scope="col" class="num">Warnings</th><th scope="col">Rules</th></tr></thead>`,
    `<tbody>`,
    ...rows,
    `</tbody>`,
    `</table>`,
    `</div>`,
    `</section>`,
  ].join("\n");
}

/** One collapsible section per issue type: badges, hint, and the issue list. */
function renderTypeSections(grouped, idByType) {
  const out = [`<section class="issues">`, `<h2>Issues by rule</h2>`];
  for (const type of orderTypes(grouped.keys())) {
    const issues = grouped.get(type);
    const meta = metaFor(type);
    const severity = meta.severity === "warning" ? "warning" : "error";
    const wcag =
      meta.wcag && meta.wcag.length ? `WCAG ${meta.wcag.join(", ")}` : "Best practice";

    out.push(
      `<section class="rule" id="${idByType.get(type)}" data-type="${escapeHtml(type)}">`,
      `<details open>`,
      `<summary><h3><span aria-hidden="true">${escapeHtml(meta.emoji)}</span> ${escapeHtml(meta.label)} ` +
        `<span class="badge badge-${severity}">${severity}</span> ` +
        `<span class="badge">${escapeHtml(wcag)}</span> ` +
        `<span class="count">${issues.length} issue${plural(issues.length)}</span></h3></summary>`
    );
    if (meta.hint) {
      out.push(
        `<p class="hint"><span aria-hidden="true">↳ </span>${escapeHtml(meta.hint)}</p>`
      );
    }
    out.push(`<ol class="issue-list">`);
    for (const issue of issues) {
      const loc =
        typeof issue.line === "number"
          ? `${escapeHtml(issue.file)}:${issue.line}`
          : escapeHtml(issue.file);
      out.push(
        `<li data-severity="${severityOf(issue)}">`,
        `<p class="where"><span class="loc mono">${loc}</span> — ${escapeHtml(issue.message)}</p>`
      );
      if (typeof issue.snippet === "string" && issue.snippet !== "") {
        out.push(`<pre><code>${escapeHtml(issue.snippet)}</code></pre>`);
      }
      out.push(`</li>`);
    }
    out.push(`</ol>`, `</details>`, `</section>`);
  }
  out.push(`</section>`);
  return out.join("\n");
}

/**
 * Renders a schema-v2 report document as a self-contained HTML page.
 *
 * The page needs no network access (system fonts, inline CSS/JS), stays
 * readable with JavaScript disabled, honors prefers-color-scheme, and — by
 * contract — passes be-a11y itself.
 *
 * @param {object} report - A report built by buildReport() (schema v2).
 * @returns {string} Complete HTML document.
 */
function renderHtmlReport(report) {
  if (report == null || typeof report !== "object") report = {};
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const summary = report.summary || {};

  const computedErrors = issues.filter((i) => severityOf(i) === "error").length;
  const counts = {
    total: typeof summary.total === "number" ? summary.total : issues.length,
    errors: typeof summary.errors === "number" ? summary.errors : computedErrors,
    warnings:
      typeof summary.warnings === "number"
        ? summary.warnings
        : issues.length - computedErrors,
    filesScanned:
      typeof summary.filesScanned === "number" ? summary.filesScanned : null,
  };

  const grouped = groupIssuesByType(issues);
  const byFile = aggregateByFile(issues);
  const usedIds = new Set(["main", "issue-search", "filter-status", "toggle-all"]);
  const idByType = new Map();
  for (const type of orderTypes(grouped.keys())) {
    idByType.set(type, anchorId(type, usedIds));
  }

  const title =
    report.target == null
      ? "Accessibility report"
      : `Accessibility report — ${report.target}`;

  const main = [`<main id="main">`];
  if (issues.length > 0) {
    main.push(renderToolbar(counts));
    main.push(renderFilesTable(byFile, idByType));
    main.push(renderTypeSections(grouped, idByType));
  }
  main.push(`</main>`);

  const tool = report.tool || {};
  const footerText = `Generated by ${tool.name || "be-a11y"}${
    tool.version ? ` v${tool.version}` : ""
  }.`;

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${escapeHtml(title)}</title>`,
    `<style>${STYLE}</style>`,
    `</head>`,
    `<body>`,
    `<a class="skip-link" href="#main">Skip to main content</a>`,
    renderHeader(report, counts),
    main.join("\n"),
    `<footer class="page-foot"><p>${escapeHtml(footerText)}</p></footer>`,
    `<script>${SCRIPT}</script>`,
    `</body>`,
    `</html>`,
    ``,
  ].join("\n");
}

module.exports = { renderHtmlReport, PALETTE };
