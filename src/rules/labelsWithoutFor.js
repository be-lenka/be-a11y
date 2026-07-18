const { loadDocument, getLine } = require("../utils/dom");
const { collectIds } = require("../utils/ids");
const looksTemplated = require("../utils/looksTemplated");

// Elements that a <label> can legitimately be associated with.
const LABELABLE_SELECTOR =
  "button, meter, output, progress, select, textarea, input:not([type=hidden])";

/** True if a resolved element is a labelable form control. */
function isLabelable($, el) {
  const tag = el && el.name ? el.name.toLowerCase() : "";
  if (["button", "meter", "output", "progress", "select", "textarea"].includes(tag)) {
    return true;
  }
  if (tag === "input") return ($(el).attr("type") || "").toLowerCase() !== "hidden";
  return false;
}

/**
 * Checks that each <label> is associated with a labelable form control — either
 * a `for` attribute resolving (via collectIds, no selector interpolation) to a
 * labelable element, or a nested labelable control. Pointing `for` at a
 * non-labelable element (e.g. a <div>) is flagged with a distinct message.
 * Templated `for` values are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Label association issues.
 */
module.exports = function labelsWithoutFor(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("label").each((_, el) => {
    const $label = $(el);
    const line = getLine($, el, content);
    const forAttr = $label.attr("for");

    if (typeof forAttr === "string" && forAttr.trim() !== "") {
      if (looksTemplated(forAttr)) return;
      const id = forAttr.trim();
      const target = collectIds($).byId.get(id);
      if (!target) {
        errors.push({
          file,
          line,
          type: "label-for-missing",
          message: `<label for="${id}"> does not match any element id`,
        });
      } else if (!isLabelable($, target)) {
        errors.push({
          file,
          line,
          type: "label-for-missing",
          message: `<label for="${id}"> points at <${target.name}>, which is not a labelable form control`,
        });
      }
      return;
    }

    if ($label.find(LABELABLE_SELECTOR).length === 0) {
      errors.push({
        file,
        line,
        type: "label-missing-for",
        message: `<label> is not associated with a form control (needs a for= or a nested control)`,
      });
    }
  });

  return errors;
};
