const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Checks if checkboxes and radios are properly labeled.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of form label errors.
 */
module.exports = function unlabeledInputs(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("input[type='checkbox'], input[type='radio']").each((_, el) => {
    const $el = $(el);
    const id = $el.attr("id");
    const label = id && $(`label[for='${id}']`).length > 0;
    const wrapped = $el.parents("label").length > 0;

    if (!label && !wrapped) {
      const html = $.html(el);
      const tagIndex = content.indexOf(html);
      const lineNumber = getLineNumber(content, tagIndex);

      errors.push({
        file,
        line: lineNumber,
        type: "input-unlabeled",
        message: `<input type="${$el.attr("type")}"> is not associated with a label`,
      });
    }
  });

  return errors;
}
