const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");
const { collectIds } = require("../utils/ids");
const looksTemplated = require("../utils/looksTemplated");

/** True if a landmark has a distinguishing name (NOT counting text content). */
function hasDistinguishingName($, el) {
  const $el = $(el);
  const ariaLabel = $el.attr("aria-label");
  if (typeof ariaLabel === "string" && ariaLabel.trim() !== "") return true;

  const labelledby = $el.attr("aria-labelledby");
  if (typeof labelledby === "string" && labelledby.trim() !== "") {
    if (looksTemplated(labelledby)) return true;
    const { idSet } = collectIds($);
    if (labelledby.trim().split(/\s+/).some((id) => idSet.has(id))) return true;
  }

  const title = $el.attr("title");
  if (typeof title === "string" && title.trim() !== "") return true;
  return false;
}

/**
 * Two focused accessible-name checks (the previous broad version was a
 * false-positive factory; buttons/links/inputs are now owned by dedicated
 * rules):
 *   (a) <svg> icons with no accessible name — always for svg[role=img], and for
 *       a bare <svg> unless it is an icon inside a *named* link/button.
 *   (b) Repeated same-type landmarks (>=2 nav/[role=navigation] or
 *       aside/[role=complementary]) that lack a distinguishing name.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Missing-accessible-name issues.
 */
module.exports = function missingAria(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  // (a) SVG icons without an accessible name.
  $("svg").each((_, el) => {
    if (isHidden($, el)) return;
    if (getAccessibleName($, el) !== "") return;

    const role = ($(el).attr("role") || "").trim().toLowerCase();
    if (role !== "img") {
      const owner = $(el).closest("a[href], button, [role=button]");
      if (owner.length && getAccessibleName($, owner.get(0)) !== "") return; // decorative icon
    }

    errors.push({
      file,
      line: getLine($, el, content),
      type: "missing-aria",
      message: `<svg> has no accessible name; add a <title>, aria-label, or aria-hidden="true" if decorative`,
    });
  });

  // (b) Repeated landmarks of the same type need distinguishing names.
  const groups = [
    { selector: "nav, [role=navigation]", label: "navigation" },
    { selector: "aside, [role=complementary]", label: "complementary" },
  ];
  for (const { selector, label } of groups) {
    const nodes = $(selector)
      .toArray()
      .filter((el) => !isHidden($, el));
    if (nodes.length < 2) continue;
    for (const el of nodes) {
      if (!hasDistinguishingName($, el)) {
        errors.push({
          file,
          line: getLine($, el, content),
          type: "missing-aria",
          message: `Multiple ${label} landmarks — this one needs a distinguishing aria-label or aria-labelledby`,
        });
      }
    }
  }

  return errors;
};
