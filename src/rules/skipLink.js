const { loadDocument, getLine, isFullDocument } = require("../utils/dom");

/**
 * Warns when a full document offers no obvious way to reach the main content.
 * Passes if any of these exist: an in-page fragment link among the first three
 * links (a skip link), a <main>/[role=main], or an <h1>. Only runs on full
 * documents; the finding is anchored at <body>.
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} skip-link issues.
 */
module.exports = function skipLink(content, file) {
  if (!isFullDocument(content)) return [];
  const $ = loadDocument(content);
  const body = $("body").get(0);
  if (!body) return [];

  if ($("main, [role=main]").length > 0) return [];
  if ($("h1").length > 0) return [];

  const firstThreeLinks = $("a[href]").toArray().slice(0, 3);
  const hasSkipLink = firstThreeLinks.some((a) => {
    const href = ($(a).attr("href") || "").trim();
    return href.startsWith("#") && href.length > 1;
  });
  if (hasSkipLink) return [];

  return [
    {
      file,
      line: getLine($, body, content),
      type: "skip-link",
      message: `No skip link, <main>, or <h1> found; provide a way to skip to the main content`,
    },
  ];
};
