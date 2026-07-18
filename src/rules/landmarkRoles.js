const { loadDocument, getLine, isFullDocument } = require("../utils/dom");

// Native landmark elements plus their ARIA role equivalents. Native <header>/
// <footer> are treated as landmarks at the top level (the common case); a
// present-but-scoped header/footer only makes this check more lenient, which is
// acceptable for a warning.
const LANDMARK_SELECTOR = [
  "main",
  "nav",
  "header",
  "footer",
  "aside",
  "[role=banner]",
  "[role=complementary]",
  "[role=contentinfo]",
  "[role=form]",
  "[role=main]",
  "[role=navigation]",
  "[role=region]",
  "[role=search]",
].join(", ");

/**
 * Warns when a full HTML document exposes no landmark regions. Only runs on full
 * documents (isFullDocument on the raw source) — partial templates/fragments are
 * exempt. Recognizes native landmark elements and ARIA landmark roles; the
 * finding is anchored at the <body> line.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} A single missing-landmark issue, or none.
 */
module.exports = function landmarkRoles(content, file) {
  if (!isFullDocument(content)) return [];
  const $ = loadDocument(content);
  if ($(LANDMARK_SELECTOR).length > 0) return [];

  const body = $("body").get(0);
  return [
    {
      file,
      line: body ? getLine($, body, content) : 1,
      type: "missing-landmark",
      message: `No landmark regions found (main, nav, header, footer, aside, or ARIA landmark roles)`,
    },
  ];
};
