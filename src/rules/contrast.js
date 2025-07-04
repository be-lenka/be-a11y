const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");
const tinycolor = require("tinycolor2");

/**
 * Evaluates inline styles for text/background color contrast ratio.
 * Flags contrast ratios below WCAG AA threshold (4.5).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List of contrast issues.
 */
module.exports = function contrast(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("*").each((_, el) => {
    const style = $(el).attr("style");
    if (
      style &&
      style.includes("color") &&
      style.includes("background-color")
    ) {
      const inlineStyles = style.split(";").reduce((acc, rule) => {
        const [key, value] = rule.split(":");
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {});

      const fg = tinycolor(inlineStyles["color"]);
      const bg = tinycolor(inlineStyles["background-color"]);

      if (fg.isValid() && bg.isValid()) {
        const contrast = tinycolor.readability(bg, fg);
        if (contrast < 4.5) {
          const html = $.html(el);
          const tagIndex = content.indexOf(html);
          const lineNumber = getLineNumber(content, tagIndex);
          errors.push({
            file,
            line: lineNumber,
            type: "contrast",
            message: `Low contrast ratio (${contrast.toFixed(2)}): ${inlineStyles["color"]} on ${inlineStyles["background-color"]}`,
          });
        }
      }
    }
  });

  return errors;
}
