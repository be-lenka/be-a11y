const tinycolor = require("tinycolor2");
const { loadDocument, getLine } = require("../utils/dom");
const { isHidden, parseInlineStyle } = require("../utils/visibility");

/** True if the element has a direct, non-whitespace text child node. */
function hasDirectText($, el) {
  return $(el)
    .contents()
    .toArray()
    .some((n) => n.type === "text" && n.data && n.data.trim() !== "");
}

/** Background color from `background-color` or the first color token of `background`. */
function parseBackground(decls) {
  if (decls["background-color"]) {
    const c = tinycolor(decls["background-color"]);
    if (c.isValid()) return c;
  }
  if (decls.background) {
    for (const token of decls.background.split(/\s+/)) {
      const c = tinycolor(token);
      if (c.isValid()) return c;
    }
  }
  return null;
}

/** WCAG "large text": >= 24px, or >= 18.66px when bold (font-weight >= 700). */
function isLargeText(decls) {
  const match = /^([\d.]+)px/.exec((decls["font-size"] || "").trim());
  if (!match) return false; // only px is handled (documented limitation)
  const px = parseFloat(match[1]);
  const weight = (decls["font-weight"] || "").trim().toLowerCase();
  const bold = weight === "bold" || parseInt(weight, 10) >= 700;
  return px >= 24 || (px >= 18.66 && bold);
}

/**
 * Evaluates inline-style text/background contrast against the WCAG AA threshold
 * (4.5:1 normal text, 3:1 large text). Only elements with direct text are
 * considered (styled containers no longer produce false positives). Translucent
 * colors (alpha < 1, incl. `transparent`) are skipped, since the effective
 * color depends on layered content. Inline styles only — external/embedded CSS
 * is not resolved (documented limitation).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} Contrast issues.
 */
module.exports = function contrast(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("[style]").each((_, el) => {
    if (isHidden($, el)) return;
    if (!hasDirectText($, el)) return;

    const decls = parseInlineStyle($(el).attr("style"));
    if (!decls.color) return;

    const fg = tinycolor(decls.color);
    if (!fg.isValid()) return;
    const bg = parseBackground(decls);
    if (!bg) return;
    if (fg.getAlpha() < 1 || bg.getAlpha() < 1) return;

    const threshold = isLargeText(decls) ? 3.0 : 4.5;
    const ratio = tinycolor.readability(bg, fg);
    if (ratio < threshold) {
      const bgShown = decls["background-color"] || decls.background;
      errors.push({
        file,
        line: getLine($, el, content),
        type: "contrast",
        message: `Contrast ${ratio.toFixed(2)}:1 is below the ${threshold}:1 minimum (${decls.color} on ${bgShown})`,
      });
    }
  });

  return errors;
};
