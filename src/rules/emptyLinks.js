const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");

/**
 * Flags links (`a[href]`, any href value) with no accessible name. Hidden links
 * are skipped. Href-less `<a>` is intentionally ignored (no link role, not
 * focusable). Ownership partition: a link that is empty only because it wraps an
 * unnamed <img> is left to altAttributes (missing-alt / alt-functional-empty),
 * so each mistake is reported once.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Empty-link issues.
 */
module.exports = function emptyLinks(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("a[href]").each((_, el) => {
    const $el = $(el);
    if (isHidden($, el)) return;
    if (getAccessibleName($, el) !== "") return;

    // If an unnamed <img> descendant is the reason the link has no name,
    // altAttributes owns that finding — don't double-report.
    const unnamedImg = $el
      .find("img")
      .toArray()
      .some((img) => getAccessibleName($, img) === "");
    if (unnamedImg) return;

    errors.push({
      file,
      line: getLine($, el, content),
      type: "empty-link",
      message: `<a href> has no accessible name; add link text or an aria-label`,
    });
  });

  return errors;
};
