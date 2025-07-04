const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks that there is only one <h1> on the page.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of multiple H1 tag warnings.
 */
module.exports = function multipleH1(content, file) {
  const $ = cheerio.load(content);
  const h1s = $("h1");

  if (h1s.length > 1) {
    return h1s
      .map((_, el) => {
        const html = $.html(el);
        const tagIndex = content.indexOf(html);
        const lineNumber = getLineNumber(content, tagIndex);
        return {
          file,
          line: lineNumber,
          type: "multiple-h1",
          message: `Multiple <h1> tags found (${h1s.length} total)`,
        };
      })
      .get();
  }

  return [];
}
