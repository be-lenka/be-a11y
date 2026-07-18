/**
 * Parses an inline `style` attribute string into a `{ property: value }` map.
 * Property names are lowercased and trimmed; on duplicate declarations the last
 * one wins (matching CSS cascade for a single declaration block).
 *
 * @param {string} str - The value of a `style` attribute.
 * @returns {Object<string,string>} Map of declaration property -> raw value.
 */
function parseInlineStyle(str) {
  const out = {};
  if (typeof str !== "string") return out;
  for (const decl of str.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

/** First whitespace-delimited token of a CSS value, lowercased. */
function firstToken(value) {
  return value.trim().toLowerCase().split(/\s+/)[0];
}

/**
 * Determines whether an element is hidden from assistive technology, taking the
 * element itself and all of its ancestors into account.
 *
 * An element is treated as hidden if it (or an ancestor) has any of:
 *   - `aria-hidden="true"`
 *   - the boolean `hidden` attribute (any value)
 *   - an inline style of `display:none` or `visibility:hidden`
 *
 * Only inline styles and attributes are considered — external or embedded CSS
 * is not resolved (documented limitation). `!important` and vendor noise after
 * the keyword are tolerated.
 *
 * @param {import('cheerio').CheerioAPI} $ - Loaded cheerio instance.
 * @param {any} el - The element (DOM node) to test.
 * @returns {boolean} True if the element or an ancestor is hidden.
 */
function isHidden($, el) {
  const chain = [el, ...$(el).parents().toArray()];
  for (const node of chain) {
    const $node = $(node);
    if ($node.attr("aria-hidden") === "true") return true;
    if (typeof $node.attr("hidden") !== "undefined") return true;
    const style = $node.attr("style");
    if (style) {
      const decls = parseInlineStyle(style);
      if (decls.display && firstToken(decls.display) === "none") return true;
      if (decls.visibility && firstToken(decls.visibility) === "hidden") {
        return true;
      }
    }
  }
  return false;
}

module.exports = { isHidden, parseInlineStyle };
