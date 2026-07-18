const { loadDocument, getLine } = require("../utils/dom");

/**
 * Flags deprecated presentational elements that cause accessibility problems:
 * <marquee> (moving content that can't be paused) and <blink>.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} deprecated-elements issues.
 */
module.exports = function deprecatedElements(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("marquee, blink").each((_, el) => {
    const tag = el.name ? el.name.toLowerCase() : "element";
    errors.push({
      file,
      line: getLine($, el, content),
      type: "deprecated-elements",
      message: `<${tag}> is deprecated and inaccessible (unstoppable motion); remove it`,
    });
  });

  return errors;
};
