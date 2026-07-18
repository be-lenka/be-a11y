const { loadDocument, getLine } = require("../utils/dom");

// 20 hours, in seconds — delays at or above this are exempt (WCAG 2.2.1).
const EXEMPT_DELAY = 72000;

/**
 * Flags `<meta http-equiv="refresh">` with a timed delay that reloads or
 * redirects the page (0 < delay < 20h). A delay of 0 (an immediate redirect) and
 * delays >= 20h are exempt.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} meta-refresh issues.
 */
module.exports = function metaRefresh(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("meta").each((_, el) => {
    if (($(el).attr("http-equiv") || "").trim().toLowerCase() !== "refresh") return;
    const value = ($(el).attr("content") || "").trim();
    const delay = parseInt(value.split(/[;,\s]/)[0], 10);
    if (Number.isFinite(delay) && delay > 0 && delay < EXEMPT_DELAY) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "meta-refresh",
        message: `meta refresh reloads/redirects after ${delay}s; timed refreshes can disorient users`,
      });
    }
  });

  return errors;
};
