const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");

/**
 * Flags buttons with no accessible name: <button>, [role=button], and
 * <input type="button">. Hidden buttons are skipped. <input type="submit|reset">
 * are exempt (they carry a UA-default label). When the button is empty only
 * because of an unnamed img/svg child, altAttributes/missingAria own that
 * finding (partition), so it is not reported here.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} empty-button issues.
 */
module.exports = function emptyButton(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("button, [role=button], input[type=button]").each((_, el) => {
    if (isHidden($, el)) return;
    if (getAccessibleName($, el) !== "") return;

    const unnamedGraphic = $(el)
      .find("img, svg")
      .toArray()
      .some((n) => getAccessibleName($, n) === "");
    if (unnamedGraphic) return;

    const tag = el.name ? el.name.toLowerCase() : "element";
    errors.push({
      file,
      line: getLine($, el, content),
      type: "empty-button",
      message: `<${tag}> has no accessible name; add text content, an aria-label, or a value`,
    });
  });

  return errors;
};
