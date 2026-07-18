const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

/**
 * Requires a non-empty <title> in a document's <head>. Gated on the raw source
 * containing a <head> tag, so partial templates are exempt. A missing title, or
 * an empty non-templated one, is an error.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} document-title issues.
 */
module.exports = function documentTitle(content, file) {
  if (!/<head[\s>]/i.test(content)) return [];
  const $ = loadDocument(content);
  const title = $("head > title").first();
  const head = $("head").get(0);

  if (title.length === 0) {
    return [
      {
        file,
        line: head ? getLine($, head, content) : 1,
        type: "document-title",
        message: `Document <head> has no <title> element`,
      },
    ];
  }

  const text = title.text();
  if (text.trim() === "" && !looksTemplated(text)) {
    return [
      {
        file,
        line: getLine($, title.get(0), content),
        type: "document-title",
        message: `<title> is empty`,
      },
    ];
  }
  return [];
};
