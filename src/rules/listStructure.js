const { loadDocument, getLine } = require("../utils/dom");

const UL_OL_ALLOWED = new Set(["li", "script", "template"]);
const DL_ALLOWED = new Set(["dt", "dd", "div", "script", "template"]);
const LI_PARENTS = new Set(["ul", "ol", "menu"]);

/**
 * Validates list structure per HTML content models:
 *   - <ul>/<ol> may only have <li>/<script>/<template> element children (unless a
 *     role repurposes the list);
 *   - <li> must have a <ul>/<ol>/<menu> parent;
 *   - <dl> may only have <dt>/<dd>/<div>/<script>/<template> element children.
 * Only element children are inspected, so template control-flow (text nodes like
 * `{% for %}`) produces no false positives.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} list-structure issues.
 */
module.exports = function listStructure(content, file) {
  const $ = loadDocument(content);
  const errors = [];
  const tagOf = (el) => (el && el.name ? el.name.toLowerCase() : "");

  $("ul, ol").each((_, el) => {
    const role = ($(el).attr("role") || "").trim().toLowerCase();
    if (role && role !== "list" && role !== "none" && role !== "presentation") {
      return; // repurposed via role — not a plain list
    }
    $(el)
      .children()
      .each((_, child) => {
        const tag = tagOf(child);
        if (!UL_OL_ALLOWED.has(tag)) {
          errors.push({
            file,
            line: getLine($, child, content),
            type: "list-structure",
            message: `<${tag}> is not allowed as a direct child of <${tagOf(el)}> (expected <li>)`,
          });
        }
      });
  });

  $("li").each((_, el) => {
    const parentTag = tagOf(el.parent);
    if (!LI_PARENTS.has(parentTag)) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "list-structure",
        message: `<li> must be a child of <ul>, <ol>, or <menu> (found in <${parentTag || "?"}>)`,
      });
    }
  });

  $("dl").each((_, el) => {
    $(el)
      .children()
      .each((_, child) => {
        const tag = tagOf(child);
        if (!DL_ALLOWED.has(tag)) {
          errors.push({
            file,
            line: getLine($, child, content),
            type: "list-structure",
            message: `<${tag}> is not allowed as a direct child of <dl> (expected <dt>/<dd>)`,
          });
        }
      });
  });

  return errors;
};
