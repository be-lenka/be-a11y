const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");

/**
 * Flags headings with no accessible name. Considers native h1–h6 and
 * role="heading". Skips hidden headings and native headings whose role has been
 * overridden (e.g. <h2 role="presentation">). A heading named only by a child
 * image (`<h2><img alt="Section"></h2>`) now passes.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Empty-heading issues.
 */
module.exports = function headingEmpty(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("h1, h2, h3, h4, h5, h6, [role=heading]").each((_, el) => {
    const tag = el.name ? el.name.toLowerCase() : "";
    const role = ($(el).attr("role") || "").trim().toLowerCase();
    const isNativeHeading = /^h[1-6]$/.test(tag);

    // Acts as a heading only if role="heading" or a native heading with no
    // overriding role.
    const actsAsHeading = role === "heading" || (isNativeHeading && role === "");
    if (!actsAsHeading) return;
    if (isHidden($, el)) return;

    if (getAccessibleName($, el) === "") {
      const shown = isNativeHeading ? `<${tag}>` : `<${tag} role="heading">`;
      errors.push({
        file,
        line: getLine($, el, content),
        type: "heading-empty",
        message: `${shown} is empty or has no accessible name`,
      });
    }
  });

  return errors;
};
