const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Validates that all <img> tags have appropriate `alt` attributes.
 * Checks for missing, empty, decorative, functional, or overly long alt texts.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of alt attribute errors.
 */
module.exports = function altAttributes(content, file, config = { rules: {} }) {
  const $ = cheerio.load(content);
  const errors = [];
  const seen = new Set();

  $("img").each((_, el) => {
    const $el = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);
    const locationKey = `${file}:${lineNumber}`;
    if (seen.has(locationKey)) return;
    seen.add(locationKey);

    const alt = $el.attr("alt");
    const role = $el.attr("role");
    const isDecorative =
      role === "presentation" || role === "none" || alt === "";
    const isInLinkOrButton = $el.parents("a, button").length > 0;

    // Case 1: Missing alt attribute entirely
    if (typeof alt === "undefined") {
      errors.push({
        file,
        line: lineNumber,
        type: "missing-alt",
        message: `<img> tag is missing an alt attribute`,
      });
      return;
    }

    // Case 2: Decorative image with non-empty alt
    if (isDecorative && alt !== "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-decorative-incorrect",
        message: `Decorative image should have empty alt="" or role="presentation"`,
      });
      return;
    }

    // Case 3: Functional image with empty alt
    if (isInLinkOrButton && alt.trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-functional-empty",
        message: `Functional image inside <a> or <button> needs descriptive alt text`,
      });
      return;
    }

    // Case 4: alt exists but only contains whitespace
    if (alt.trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-empty",
        message: `alt attribute exists but is empty; ensure this is intentional (e.g., decorative image)`,
      });
    }

    // Case 5: alt is too long
    if (alt.length > 30) {
      errors.push({
        file,
        line: lineNumber,
        type: "alt-too-long",
        message: `alt attribute exceeds 30 characters (${alt.length} characters)`,
      });
    }

    // Case 6: redundant title equals alt
    const title = $el.attr("title");
    if (
      alt &&
      title &&
      alt.trim().toLowerCase() === title.trim().toLowerCase()
    ) {
      if (config.rules["redundant-title"] !== false) {
        errors.push({
          file,
          line: lineNumber,
          type: "redundant-title",
          message: `<img> has a 'title' attribute that duplicates its 'alt' text: "${alt}"`,
        });
      }
    }
  });

  return errors;
}
