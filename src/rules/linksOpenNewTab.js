const { loadDocument, getLine } = require("../utils/dom");
const { isHidden } = require("../utils/visibility");
const { collectIds } = require("../utils/ids");
const looksTemplated = require("../utils/looksTemplated");

const DEFAULT_PHRASES = [
  "new tab",
  "new window",
  "opens in new",
  "opens a new",
  "opens in a new",
];

const DEFAULT_SR_CLASSES = [
  "sr-only",
  "visually-hidden",
  "visuallyhidden",
  "screen-reader-text",
  "screen-reader-only",
];

/**
 * Warns when a link with target="_blank" (case-insensitive) does not tell users
 * it opens a new tab. A warning is suppressed when a "new tab/window" phrase
 * appears in the link's visible text, aria-label, title, screen-reader-only
 * note, or resolved aria-labelledby/aria-describedby text. Hidden links are
 * skipped. Phrases and extra SR-only class names are configurable via
 * `options["link-new-tab"]` for non-English projects.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @param {object} [config] - Normalized config.
 * @returns {object[]} New-tab warning issues.
 */
module.exports = function linksOpenNewTab(content, file, config = {}) {
  const $ = loadDocument(content);
  const errors = [];
  const options = (config.options && config.options["link-new-tab"]) || {};
  const phrases = (
    Array.isArray(options.phrases) && options.phrases.length
      ? options.phrases
      : DEFAULT_PHRASES
  ).map((p) => String(p).toLowerCase());
  const srClasses = DEFAULT_SR_CLASSES.concat(
    Array.isArray(options.extraClasses) ? options.extraClasses : []
  );

  const mentionsNewTab = (text) => {
    const t = (text || "").toLowerCase();
    return phrases.some((p) => t.includes(p));
  };

  $("a").each((_, el) => {
    const $el = $(el);
    if (($el.attr("target") || "").trim().toLowerCase() !== "_blank") return;
    if (isHidden($, el)) return;

    const candidates = [
      $el.text(),
      $el.attr("aria-label") || "",
      $el.attr("title") || "",
    ];

    for (const attr of ["aria-labelledby", "aria-describedby"]) {
      const ref = $el.attr(attr);
      if (ref && ref.trim() !== "" && !looksTemplated(ref)) {
        const { byId } = collectIds($);
        for (const id of ref.trim().split(/\s+/)) {
          const target = byId.get(id);
          if (target) candidates.push($(target).text());
        }
      }
    }

    const srSelector = srClasses.map((c) => `.${c}`).join(", ");
    if (srSelector) {
      $el.find(srSelector).each((_, n) => candidates.push($(n).text()));
    }

    if (candidates.some(mentionsNewTab)) return;

    errors.push({
      file,
      line: getLine($, el, content),
      type: "link-new-tab-warning",
      message: `Link opens in a new tab (target="_blank") without warning users; add visible or screen-reader text`,
    });
  });

  return errors;
};
