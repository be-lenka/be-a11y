const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

// The 82 concrete roles of WAI-ARIA 1.2.
const CONCRETE_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "blockquote",
  "button", "caption", "cell", "checkbox", "code", "columnheader", "combobox",
  "complementary", "contentinfo", "definition", "deletion", "dialog",
  "directory", "document", "emphasis", "feed", "figure", "form", "generic",
  "grid", "gridcell", "group", "heading", "img", "insertion", "link", "list",
  "listbox", "listitem", "log", "main", "marquee", "math", "menu", "menubar",
  "menuitem", "menuitemcheckbox", "menuitemradio", "meter", "navigation",
  "none", "note", "option", "paragraph", "presentation", "progressbar", "radio",
  "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar", "search",
  "searchbox", "separator", "slider", "spinbutton", "status", "strong",
  "subscript", "superscript", "switch", "tab", "table", "tablist", "tabpanel",
  "term", "textbox", "time", "timer", "toolbar", "tooltip", "tree", "treegrid",
  "treeitem",
]);

// The 12 abstract roles — valid in the taxonomy but must not be used by authors.
const ABSTRACT_ROLES = new Set([
  "command", "composite", "input", "landmark", "range", "roletype", "section",
  "sectionhead", "select", "structure", "widget", "window",
]);

// Explicitly-accepted Graphics-ARIA roles (doc-* is matched by prefix).
const GRAPHICS_ROLES = new Set([
  "graphics-document", "graphics-object", "graphics-symbol",
]);

/** True if a single role token is a valid, non-abstract role. */
function isKnownRole(token) {
  return (
    CONCRETE_ROLES.has(token) ||
    GRAPHICS_ROLES.has(token) ||
    token.startsWith("doc-") // DPUB-ARIA
  );
}

/**
 * Validates the `role` attribute against the full WAI-ARIA 1.2 role set (plus
 * DPUB `doc-*` and Graphics-ARIA roles). A space-separated role list is valid if
 * ANY token is known (role fallback). Abstract roles get a specific message.
 * Templated role values are skipped.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Invalid-role issues.
 */
module.exports = function ariaRoles(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("[role]").each((_, el) => {
    const raw = $(el).attr("role");
    if (typeof raw !== "string" || raw.trim() === "") return;
    if (looksTemplated(raw)) return;

    const tokens = raw.trim().toLowerCase().split(/\s+/);
    if (tokens.some(isKnownRole)) return;

    const line = getLine($, el, content);
    const abstract = tokens.find((t) => ABSTRACT_ROLES.has(t));
    if (abstract) {
      errors.push({
        file,
        line,
        type: "aria-role-invalid",
        message: `"${abstract}" is an abstract ARIA role and must not be used directly`,
      });
      return;
    }

    errors.push({
      file,
      line,
      type: "aria-role-invalid",
      message: `Unrecognized ARIA role: "${raw.trim()}"`,
    });
  });

  return errors;
};
