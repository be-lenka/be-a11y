const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks if links opening in a new tab/window notify screen readers.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of new tab warning issues.
 */
module.exports = function linksOpenNewTab(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("a[target='_blank']").each((_, el) => {
    const $el = $(el);
    const ariaLabel = $el.attr("aria-label") || "";
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const hasScreenReaderNote = $el
      .find(".sr-only, .visually-hidden")
      .filter((i, n) => {
        const text = $(n).text().toLowerCase();
        return text.includes("opens in a new tab") || text.includes("opens in new window");
      }).length > 0;

    const describesNewTab = ariaLabel.toLowerCase().includes("opens in a new tab") ||
      ariaLabel.toLowerCase().includes("opens in new window");

    if (!describesNewTab && !hasScreenReaderNote) {
      errors.push({
        file,
        line: lineNumber,
        type: "link-new-tab-warning",
        message: `<a> with target="_blank" should inform users it opens in a new tab (e.g., via aria-label or screen reader note)`,
      });
    }
  });

  return errors;
}
