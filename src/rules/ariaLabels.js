const { loadDocument, getLine } = require("../utils/dom");
const { collectIds } = require("../utils/ids");
const looksTemplated = require("../utils/looksTemplated");

/**
 * Validates aria-label / aria-labelledby. An empty aria-label is flagged. Each
 * aria-labelledby id reference is resolved through collectIds (a Map lookup — no
 * `$("#" + id)`, so ids containing selector metacharacters like `a.b` no longer
 * crash the run); templated values are skipped, and any missing references are
 * reported in a single message.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} ARIA label issues.
 */
module.exports = function ariaLabels(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("[aria-label], [aria-labelledby]").each((_, el) => {
    const $el = $(el);
    const line = getLine($, el, content);

    const ariaLabel = $el.attr("aria-label");
    if (typeof ariaLabel === "string" && ariaLabel.trim() === "") {
      errors.push({
        file,
        line,
        type: "aria-invalid",
        message: `aria-label is present but empty`,
      });
    }

    const labelledby = $el.attr("aria-labelledby");
    if (
      typeof labelledby === "string" &&
      labelledby.trim() !== "" &&
      !looksTemplated(labelledby)
    ) {
      const { idSet } = collectIds($);
      const missing = labelledby
        .trim()
        .split(/\s+/)
        .filter((id) => !idSet.has(id));
      if (missing.length > 0) {
        errors.push({
          file,
          line,
          type: "aria-invalid",
          message: `aria-labelledby references non-existent id${
            missing.length > 1 ? "s" : ""
          }: ${missing.join(", ")}`,
        });
      }
    }
  });

  return errors;
};
