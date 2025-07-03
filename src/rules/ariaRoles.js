const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Rule to validate correct usage of ARIA roles (e.g., role="button" on non-interactive tags like <div> without a tabindex and click handler is misleading).
 * @param {*} content
 * @param {*} file
 * @returns
 */
module.exports = function ariaRoles(content, file) {
  const $ = cheerio.load(content);
  const errors = [];

  $("[role]").each((_, el) => {
    const role = $(el).attr("role");
    const html = $.html(el);
    const tagIndex = content.indexOf(html);
    const lineNumber = getLineNumber(content, tagIndex);

    // ... extend this list as needed
    const allowedRoles = [
      "button",
      "checkbox",
      "dialog",
      "link",
      "listbox",
      "menu",
      "navigation",
      "progressbar",
      "radio",
      "slider",
      "tab",
      "img",
    ];

    if (!allowedRoles.includes(role)) {
      errors.push({
        file,
        line: lineNumber,
        type: "aria-role-invalid",
        message: `Unrecognized or inappropriate ARIA role: "${role}"`,
      });
    }
  });

  return errors;
}
