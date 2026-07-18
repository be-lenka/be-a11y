const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

/**
 * Warns when the same `accesskey` (case-insensitive) is assigned more than once;
 * duplicates make the shortcut ambiguous. Each repeat after the first is
 * reported, pointing back at the first use. Templated values are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} accesskey-duplicate issues.
 */
module.exports = function accesskeyDuplicate(content, file) {
  const $ = loadDocument(content);
  const errors = [];
  const firstLineByKey = new Map();

  $("[accesskey]").each((_, el) => {
    const raw = $(el).attr("accesskey");
    if (typeof raw !== "string" || raw.trim() === "" || looksTemplated(raw)) return;
    const key = raw.trim().toLowerCase();
    const line = getLine($, el, content);
    if (firstLineByKey.has(key)) {
      errors.push({
        file,
        line,
        type: "accesskey-duplicate",
        message: `Duplicate accesskey "${key}" (first used at line ${firstLineByKey.get(key)})`,
      });
    } else {
      firstLineByKey.set(key, line);
    }
  });

  return errors;
};
