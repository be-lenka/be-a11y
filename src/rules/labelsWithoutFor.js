const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks that each <label> element is properly associated with a form control.
 * It should either have a 'for' attribute pointing to an existing control ID
 * OR contain an input/select/textarea element inside.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of label association errors.
 */
module.exports = function labelsWithoutFor(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("label").each((_, el) => {
    const $label = $(el);
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    const forAttr = $label.attr("for");

    if (forAttr) {
      const inputMatch = $(`[id='${forAttr}']`);
      if (!inputMatch.length) {
        errors.push({
          file,
          line: lineNumber,
          type: "label-for-missing",
          message: `<label for="${forAttr}"> does not match any element with that ID`,
        });
      }
    } else {
      const hasNestedControl =
        $label.find("input, select, textarea").length > 0;
      if (!hasNestedControl) {
        errors.push({
          file,
          line: lineNumber,
          type: "label-missing-for",
          message: `<label> is not associated with any form control (missing 'for' or nested input)`,
        });
      }
    }
  });

  return errors;
}
