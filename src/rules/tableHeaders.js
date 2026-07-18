const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");

/**
 * Warns about likely data tables that have no header cells. A table is treated
 * as a data table (heuristic) when it has >= 2 rows, at least two rows with >= 2
 * cells, is not role="presentation"/"none", and is not hidden. Headers are
 * recognized via <th>, [scope], or td[headers]. This is a warning because layout
 * and data tables are not always distinguishable from markup alone.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} table-headers issues.
 */
module.exports = function tableHeaders(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("table").each((_, el) => {
    const $t = $(el);
    const role = ($t.attr("role") || "").trim().toLowerCase();
    if (role === "presentation" || role === "none") return;
    if (isHidden($, el)) return;

    const rows = $t.find("tr").toArray();
    if (rows.length < 2) return;
    const multiCellRows = rows.filter((tr) => $(tr).children("td, th").length >= 2);
    if (multiCellRows.length < 2) return;

    const hasHeaders =
      $t.find("th").length > 0 ||
      $t.find("[scope]").length > 0 ||
      $t.find("td[headers]").length > 0;
    if (!hasHeaders) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "table-headers",
        message: `Data table has no header cells; add <th> (with scope) or role="presentation" if it is a layout table`,
      });
    }
  });

  return errors;
};
