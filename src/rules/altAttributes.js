const { loadDocument, getLocation } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { getAccessibleName } = require("../utils/accessibleName");
const looksTemplated = require("../utils/looksTemplated");

const DEFAULT_MAX_ALT_LENGTH = 125;

/**
 * Validates `alt` on <img> and <input type="image">. Hardened behavior:
 *  - Skips hidden images; de-dupes by source offset (distinct same-line images
 *    are no longer dropped).
 *  - Missing alt passes when role="presentation"/"none" or an aria-label /
 *    aria-labelledby resolves; otherwise → missing-alt.
 *  - alt="" is valid decorative (no finding) — unless the image is the only
 *    content of an otherwise-nameless link/button → alt-functional-empty.
 *  - Whitespace-only alt → alt-empty.
 *  - role="presentation"/"none" with non-empty alt → alt-decorative-incorrect.
 *  - Non-empty alt over maxLength (default 125, configurable, templated skipped)
 *    → alt-too-long; alt duplicated by title → redundant-title.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @param {object} [config] - Normalized config (options["alt-attributes"].maxLength).
 * @returns {object[]} Alt-attribute issues.
 */
module.exports = function altAttributes(content, file, config = {}) {
  const $ = loadDocument(content);
  const errors = [];
  const seen = new Set();
  const options = (config.options && config.options["alt-attributes"]) || {};
  const maxLength = Number.isFinite(options.maxLength)
    ? options.maxLength
    : DEFAULT_MAX_ALT_LENGTH;

  $("img, input").each((_, el) => {
    const $el = $(el);
    const tag = el.name ? el.name.toLowerCase() : "";
    if (tag === "input" && ($el.attr("type") || "").toLowerCase() !== "image") {
      return;
    }
    if (isHidden($, el)) return;

    const loc = getLocation($, el, content);
    if (loc.offset != null) {
      const key = String(loc.offset);
      if (seen.has(key)) return;
      seen.add(key);
    }
    const line = loc.line;
    const push = (type, message) => errors.push({ file, line, type, message });

    // <input type="image"> is a functional control — it always needs a name.
    if (tag === "input") {
      if (getAccessibleName($, el) === "") {
        push("missing-alt", `<input type="image"> is missing an alt attribute (accessible name)`);
      }
      return;
    }

    const alt = $el.attr("alt");
    const role = ($el.attr("role") || "").trim().toLowerCase();
    const isDecorativeRole = role === "presentation" || role === "none";

    if (typeof alt === "undefined") {
      if (isDecorativeRole) return; // explicitly decorative
      if (getAccessibleName($, el) !== "") return; // named via aria-*
      push("missing-alt", `<img> is missing an alt attribute`);
      return;
    }

    if (isDecorativeRole && alt.trim() !== "") {
      push(
        "alt-decorative-incorrect",
        `Image with role="${role}" should have an empty alt="" (found alt="${alt}")`
      );
      return;
    }

    if (alt === "") {
      // Valid decorative unless it is the sole content of a nameless link/button.
      const owner = $el.closest("a[href], button, [role=button]");
      if (owner.length && getAccessibleName($, owner.get(0)) === "") {
        push(
          "alt-functional-empty",
          `Functional image (sole content of a link/button) needs descriptive alt text`
        );
      }
      return;
    }

    if (alt.trim() === "") {
      push(
        "alt-empty",
        `alt contains only whitespace; use alt="" for decorative images or add real text`
      );
      return;
    }

    if (!looksTemplated(alt) && alt.length > maxLength) {
      push("alt-too-long", `alt text is ${alt.length} characters (over ${maxLength}); keep it concise`);
    }
    const title = $el.attr("title");
    if (title && title.trim().toLowerCase() === alt.trim().toLowerCase()) {
      push("redundant-title", `title attribute duplicates the alt text ("${alt}")`);
    }
  });

  return errors;
};
