const cheerio = require("cheerio");

// Single-entry parse cache. Every rule for a given file receives the same
// `content` string reference, so keying on identity turns ~N parses per file
// into 1. (String === compares by value in JS, so two files with byte-identical
// content also share a parse — harmless, since locations are identical.)
let lastContent = null;
let lastDoc = null;

/**
 * Loads HTML/template source with parse5 source-location tracking enabled,
 * memoizing the most recent parse.
 *
 * @param {string} content - Raw HTML/template source.
 * @returns {import('cheerio').CheerioAPI} Loaded cheerio instance.
 */
function loadDocument(content) {
  if (lastContent === content && lastDoc) return lastDoc;
  const $ = cheerio.load(content, { sourceCodeLocationInfo: true });
  lastContent = content;
  lastDoc = $;
  return $;
}

/** Counts newlines up to `offset` to yield a 1-based line number. */
function offsetToLine(content, offset) {
  let line = 1;
  const end = Math.min(offset, content.length);
  for (let i = 0; i < end; i++) {
    if (content.charCodeAt(i) === 10 /* \n */) line++;
  }
  return line;
}

/**
 * Resolves the source location of an element. Fallback chain:
 *   1. parse5 `sourceCodeLocation` (accurate against RAW source — template noise
 *      does not shift it; implied html/head/body have `null` location)
 *   2. cheerio `startIndex`
 *   3. legacy `indexOf` of the re-serialized element, only when it matches
 *   4. `{ line: 1 }`
 *
 * @param {import('cheerio').CheerioAPI} $ - Loaded cheerio instance.
 * @param {any} el - Element to locate.
 * @param {string} content - Raw source (for the offset/legacy fallbacks).
 * @returns {{ line: number, column: number|null, offset: number|null }}
 */
function getLocation($, el, content) {
  const loc = el && el.sourceCodeLocation;
  if (loc && typeof loc.startLine === "number") {
    return {
      line: loc.startLine,
      column: typeof loc.startCol === "number" ? loc.startCol : null,
      offset: typeof loc.startOffset === "number" ? loc.startOffset : null,
    };
  }
  if (el && typeof el.startIndex === "number" && el.startIndex >= 0) {
    return {
      line: offsetToLine(content, el.startIndex),
      column: null,
      offset: el.startIndex,
    };
  }
  try {
    const html = $.html(el);
    const idx = content.indexOf(html);
    if (idx !== -1) {
      return { line: offsetToLine(content, idx), column: null, offset: idx };
    }
  } catch (_) {
    /* fall through */
  }
  return { line: 1, column: null, offset: null };
}

/**
 * Convenience wrapper: the 1-based start line of an element.
 *
 * @param {import('cheerio').CheerioAPI} $ - Loaded cheerio instance.
 * @param {any} el - Element to locate.
 * @param {string} content - Raw source.
 * @returns {number} 1-based line number.
 */
function getLine($, el, content) {
  return getLocation($, el, content).line;
}

/**
 * Heuristically decides whether the raw source is a full HTML document (rather
 * than a partial template/fragment). Tests the RAW source — never the DOM,
 * because cheerio synthesizes html/head/body for fragments.
 *
 * @param {string} content - Raw source.
 * @returns {boolean} True if the source looks like a complete document.
 */
function isFullDocument(content) {
  return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(content);
}

module.exports = { loadDocument, getLocation, getLine, isFullDocument };
