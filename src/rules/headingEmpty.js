const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks for empty heading tags (e.g., <h2></h2> or <h2>   </h2>).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of empty heading errors.
 */
module.exports = function headingEmpty(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const text = $(el).text().trim();
    if (text === "") {
      const html = $.html(el);
      const tagIndex = content.indexOf(html);
      const lineNumber = getLineNumber(content, tagIndex);

      errors.push({
        file,
        line: lineNumber,
        type: "heading-empty",
        message: `<${el.name}> element is empty or contains only whitespace`,
      });
    }
  });

  return errors;
}
