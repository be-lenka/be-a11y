const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

// BCP-47-ish: a primary language subtag plus optional subtags.
const LANG_RE = /^[a-z]{2,3}(-[a-zA-Z0-9]{2,8})*$/i;

/**
 * Requires a valid `lang` on the document's <html> element. Only runs when
 * <html> is literally present in the source (a synthesized <html> has a null
 * sourceCodeLocation), so partial templates are exempt. A missing/empty lang, or
 * a non-templated value that isn't a plausible BCP-47 tag, is an error.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} html-lang issues.
 */
module.exports = function htmlLang(content, file) {
  const $ = loadDocument(content);
  const html = $("html").get(0);
  if (!html || !html.sourceCodeLocation) return [];

  const line = getLine($, html, content);
  const lang = $(html).attr("lang");

  if (typeof lang !== "string" || lang.trim() === "") {
    return [
      {
        file,
        line,
        type: "html-lang",
        message: `<html> is missing a lang attribute`,
      },
    ];
  }
  if (!looksTemplated(lang) && !LANG_RE.test(lang.trim())) {
    return [
      {
        file,
        line,
        type: "html-lang",
        message: `<html lang="${lang}"> is not a valid BCP-47 language tag`,
      },
    ];
  }
  return [];
};
