const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

/**
 * Warns about positive `tabindex` values, which override the natural DOM focus
 * order and are hard to maintain. Templated values are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} tabindex-positive issues.
 */
module.exports = function tabindexPositive(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("[tabindex]").each((_, el) => {
    const raw = $(el).attr("tabindex");
    if (typeof raw !== "string" || looksTemplated(raw)) return;
    const value = parseInt(raw.trim(), 10);
    if (Number.isFinite(value) && value > 0) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "tabindex-positive",
        message: `tabindex="${raw.trim()}" is positive; use 0 or -1 so it doesn't disrupt the focus order`,
      });
    }
  });

  return errors;
};
