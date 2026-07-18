const { loadDocument, getLine } = require("../utils/dom");
const { collectIds } = require("../utils/ids");

/**
 * Flags duplicate `id` values. Each occurrence after the first is reported,
 * pointing back at the line of the first definition. Empty and templated ids are
 * ignored (handled in collectIds).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} duplicate-id issues.
 */
module.exports = function duplicateId(content, file) {
  const $ = loadDocument(content);
  const { duplicates } = collectIds($);
  const errors = [];

  for (const [id, els] of duplicates) {
    const firstLine = getLine($, els[0], content);
    for (let i = 1; i < els.length; i++) {
      errors.push({
        file,
        line: getLine($, els[i], content),
        type: "duplicate-id",
        message: `Duplicate id "${id}" (first defined at line ${firstLine})`,
      });
    }
  }

  return errors;
};
