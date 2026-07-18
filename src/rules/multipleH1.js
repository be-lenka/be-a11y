const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");

/**
 * Flags a page that exposes more than one top-level (level-1) heading. Counts
 * non-hidden native <h1> (unless aria-level overrides it away from 1) and
 * role="heading" with aria-level="1". Each offending heading is reported at its
 * own line.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Multiple-h1 issues.
 */
module.exports = function multipleH1(content, file) {
  const $ = loadDocument(content);
  const level1 = [];

  $("h1, [role=heading]").each((_, el) => {
    const tag = el.name ? el.name.toLowerCase() : "";
    const role = ($(el).attr("role") || "").trim().toLowerCase();
    const ariaLevel = ($(el).attr("aria-level") || "").trim();

    let isLevel1 = false;
    if (tag === "h1" && role !== "presentation" && role !== "none") {
      isLevel1 = ariaLevel === "" || ariaLevel === "1";
    } else if (role === "heading" && ariaLevel === "1") {
      isLevel1 = true;
    }
    if (!isLevel1) return;
    if (isHidden($, el)) return;

    level1.push(el);
  });

  if (level1.length <= 1) return [];

  return level1.map((el) => ({
    file,
    line: getLine($, el, content),
    type: "multiple-h1",
    message: `Multiple top-level headings found (${level1.length} total); use a single h1 per page`,
  }));
};
