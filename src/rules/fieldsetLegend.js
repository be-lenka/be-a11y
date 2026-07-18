const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

/** True if an element has an ARIA/title accessible name (not text content). */
function hasAriaName($, el) {
  const $el = $(el);
  const ariaLabel = $el.attr("aria-label");
  if (typeof ariaLabel === "string" && ariaLabel.trim() !== "") return true;
  const labelledby = $el.attr("aria-labelledby");
  if (typeof labelledby === "string" && labelledby.trim() !== "") return true;
  const title = $el.attr("title");
  if (typeof title === "string" && title.trim() !== "") return true;
  return false;
}

/** True if a <fieldset> is named by a non-empty <legend> or an ARIA name. */
function fieldsetIsNamed($, el) {
  const legend = $(el).children("legend").first();
  if (legend.length && legend.text().trim() !== "") return true;
  return hasAriaName($, el);
}

/**
 * Two grouping checks:
 *   (a) Two or more radios/checkboxes sharing a `name` that are not enclosed in a
 *       named group. A <fieldset> ancestor is left to check (b) to avoid
 *       double-reporting; a role=group/radiogroup ancestor must itself be named.
 *   (b) A <fieldset> with no <legend> (or accessible name).
 * Templated control names are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} fieldset-legend issues.
 */
module.exports = function fieldsetLegend(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  // (a) grouped radios/checkboxes without a named group.
  const byName = new Map();
  $("input[type=radio], input[type=checkbox]").each((_, el) => {
    const name = ($(el).attr("name") || "").trim();
    if (name === "" || looksTemplated(name)) return;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(el);
  });

  for (const [name, members] of byName) {
    if (members.length < 2) continue;
    const first = members[0];
    const group = $(first).closest("fieldset, [role=group], [role=radiogroup]");
    if (group.length && (group.get(0).name || "").toLowerCase() === "fieldset") {
      continue; // a fieldset ancestor exists — its naming is check (b)'s concern
    }
    if (!(group.length && hasAriaName($, group.get(0)))) {
      errors.push({
        file,
        line: getLine($, first, content),
        type: "fieldset-legend",
        message: `Related "${name}" inputs are not grouped in a named fieldset or group (add <fieldset><legend>)`,
      });
    }
  }

  // (b) fieldset without a legend / accessible name.
  $("fieldset").each((_, el) => {
    if (!fieldsetIsNamed($, el)) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "fieldset-legend",
        message: `<fieldset> has no <legend> (or accessible name) describing the group`,
      });
    }
  });

  return errors;
};
