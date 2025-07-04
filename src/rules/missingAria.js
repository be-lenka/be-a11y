const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks if important elements lack visible text or an ARIA label.
 * Applies to elements like buttons, links, SVGs, etc.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of missing ARIA label issues.
 */
module.exports = function missingAria(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  const selectors = [
    "button",
    "a[href]",
    'input[type="text"]',
    "svg",
    "form",
    "section",
    "nav",
    "aside",
    "main",
    "dialog",
  ];

  $(selectors.join(",")).each((_, el) => {
    const $el = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const hasAria = $el.attr("aria-label") || $el.attr("aria-labelledby");
    const hasText = $el.text().trim().length > 0;

    if (!hasAria && !hasText) {
      errors.push({
        file,
        line: lineNumber,
        type: "missing-aria",
        message: `<${el.name}> element should have an aria-label or visible text`,
      });
    }
  });

  return errors;
}
