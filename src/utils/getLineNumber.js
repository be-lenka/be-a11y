/**
 * Returns the line number where a specific tag index appears in the content.
 *
 * @param {string} content - File content as a string.
 * @param {number} tagIndex - Index of the tag within the content.
 * @returns {number} Line number (1-based).
 */
module.exports = function getLineNumber(content, tagIndex) {
  return content.slice(0, tagIndex).split("\n").length;
}
