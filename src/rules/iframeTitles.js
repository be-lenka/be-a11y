const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");

/**
 * Flags iframes lacking an accessible name (title, aria-label, or
 * aria-labelledby). Hidden iframes (e.g. analytics/tracking frames marked
 * aria-hidden or display:none) are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Missing iframe-title issues.
 */
module.exports = function iframeTitles(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("iframe").each((_, el) => {
    if (isHidden($, el)) return;
    if (getAccessibleName($, el) === "") {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "iframe-title-missing",
        message: `<iframe> needs an accessible name (title or aria-label) describing its content`,
      });
    }
  });

  return errors;
};
