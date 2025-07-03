const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks that <iframe> elements have a non-empty, descriptive title attribute.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of iframe title issues.
 */
module.exports = function iframeTitles(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("iframe").each((_, el) => {
    const $el = $(el);
    const title = $el.attr("title");
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    if (!title || title.trim() === "") {
      errors.push({
        file,
        line: lineNumber,
        type: "iframe-title-missing",
        message: `<iframe> is missing a non-empty 'title' attribute to describe its content`,
      });
    }
  });

  return errors;
}
