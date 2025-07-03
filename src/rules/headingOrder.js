const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks if headings (h1-h6) are used in the correct order (no jumps).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of heading order errors.
 */
module.exports = function headingOrder(content, file) {
  const $ = cheerio.load(content);
  let lastLevel = 0;
  const errors = [];

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = parseInt(el.name.substring(1));
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if (lastLevel && level - lastLevel > 1) {
      errors.push({
        file,
        line: lineNumber,
        type: "heading-order",
        message: `<${el.name}> follows <h${lastLevel}>`,
      });
    }

    lastLevel = level;
  });

  return errors;
}
