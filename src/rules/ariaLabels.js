const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks for invalid or missing values in `aria-label` and `aria-labelledby`.
 * Ensures `aria-labelledby` points to existing IDs.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of ARIA label errors.
 */
module.exports = function ariaLabels(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("[aria-label], [aria-labelledby]").each((_, el) => {
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if ($(el).attr("aria-label") && $(el).attr("aria-label").trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "aria-invalid",
        message: `aria-label is empty`,
      });
    }

    if ($(el).attr("aria-labelledby")) {
      const id = $(el).attr("aria-labelledby");
      if (!$(`#${id}`).length) {
        errors.push({
          file,
          line: lineNumber,
          type: "aria-invalid",
          message: `aria-labelledby references a non-existent ID: ${id}`,
        });
      }
    }
  });

  return errors;
}
