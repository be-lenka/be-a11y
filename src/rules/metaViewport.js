const { loadDocument, getLine } = require("../utils/dom");

/**
 * Flags a viewport meta tag that blocks or over-restricts zooming
 * (`user-scalable=no`/`0`, or `maximum-scale` below 2), which prevents
 * low-vision users from enlarging content.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} meta-viewport issues.
 */
module.exports = function metaViewport(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("meta").each((_, el) => {
    if (($(el).attr("name") || "").trim().toLowerCase() !== "viewport") return;
    const value = ($(el).attr("content") || "").toLowerCase();
    if (!value) return;

    const props = {};
    for (const part of value.split(",")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      props[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }

    const line = getLine($, el, content);
    const userScalable = props["user-scalable"];
    const maxScale = parseFloat(props["maximum-scale"]);

    if (userScalable === "no" || userScalable === "0") {
      errors.push({
        file,
        line,
        type: "meta-viewport",
        message: `viewport meta disables zoom (user-scalable=${userScalable}); users must be able to zoom`,
      });
    } else if (Number.isFinite(maxScale) && maxScale < 2) {
      errors.push({
        file,
        line,
        type: "meta-viewport",
        message: `viewport meta caps zoom (maximum-scale=${props["maximum-scale"]}); allow at least 2x`,
      });
    }
  });

  return errors;
};
