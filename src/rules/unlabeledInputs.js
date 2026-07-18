const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");

// Input types that do not need a <label>-style name here (handled elsewhere or
// named by their value / UA default).
const EXEMPT_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "reset",
  "button",
  "image",
]);

/**
 * Flags form controls (all name-needing <input> types plus <select> and
 * <textarea>) that have no accessible name. An accessible name may come from an
 * associated <label> (for= or wrapping), aria-label, aria-labelledby, or title.
 * A control named only by its `placeholder` is a softer warning
 * (input-placeholder-only), since placeholders vanish once typing begins.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Unlabeled-control issues.
 */
module.exports = function unlabeledInputs(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("input, select, textarea").each((_, el) => {
    const $el = $(el);
    const tag = el.name ? el.name.toLowerCase() : "";
    const type = ($el.attr("type") || "text").toLowerCase();
    if (tag === "input" && EXEMPT_INPUT_TYPES.has(type)) return;
    if (isHidden($, el)) return;
    if (getAccessibleName($, el) !== "") return;

    const line = getLine($, el, content);
    const placeholder = $el.attr("placeholder");
    if (typeof placeholder === "string" && placeholder.trim() !== "") {
      errors.push({
        file,
        line,
        type: "input-placeholder-only",
        message: `<${tag}> is labeled only by its placeholder; add a real <label> (placeholders disappear on input)`,
      });
    } else {
      const shown = tag === "input" ? `<input type="${type}">` : `<${tag}>`;
      errors.push({
        file,
        line,
        type: "input-unlabeled",
        message: `${shown} has no associated label or accessible name`,
      });
    }
  });

  return errors;
};
