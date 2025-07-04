const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks for links that are empty or lack href/text.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of link errors.
 */
module.exports = function emptyLinks(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("a").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    const text = $el.text().trim();
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if ((!href || href === "#") && !text) {
      errors.push({
        file,
        line: lineNumber,
        type: "empty-link",
        message: `<a> tag is empty or has no href/text`,
      });
    }
  });

  return errors;
}
