const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");

/**
 * Flags heading levels that skip when descending (e.g. h1 → h3). Considers
 * native h1–h6 and role="heading" (level from aria-level, default 2). Hidden
 * headings and role-overridden native headings are ignored. Per-file, and only
 * downward skips are reported (going back up any amount is allowed).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Heading-order issues.
 */
module.exports = function headingOrder(content, file) {
  const $ = loadDocument(content);
  const errors = [];
  let lastLevel = 0;

  $("h1, h2, h3, h4, h5, h6, [role=heading]").each((_, el) => {
    const tag = el.name ? el.name.toLowerCase() : "";
    const role = ($(el).attr("role") || "").trim().toLowerCase();
    const isNativeHeading = /^h[1-6]$/.test(tag);

    const actsAsHeading = role === "heading" || (isNativeHeading && role === "");
    if (!actsAsHeading) return;
    if (isHidden($, el)) return;

    let level;
    if (role === "heading") {
      const parsed = parseInt(($(el).attr("aria-level") || "").trim(), 10);
      level = Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
    } else {
      level = parseInt(tag.substring(1), 10);
    }

    if (lastLevel && level - lastLevel > 1) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "heading-order",
        message: `Heading level jumps from h${lastLevel} to h${level} (skips a level)`,
      });
    }
    lastLevel = level;
  });

  return errors;
};
