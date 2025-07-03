const cheerio = require("cheerio");
const getLineNumber = require("../utils/getLineNumber");

/**
 * Verifies the presence of at least one semantic landmark element.
 * Expected tags include <main>, <nav>, <header>, <footer>, <aside>.
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} List containing missing landmark error, if any.
 */
module.exports = function landmarkRoles(content, file) {
  const $ = cheerio.load(content);
  const landmarks = ["main", "nav", "header", "footer", "aside"];
  const errors = [];

  const present = landmarks.filter((tag) => $(tag).length > 0);
  if (present.length === 0) {
    errors.push({
      file,
      line: 1,
      type: "missing-landmark",
      message: "No landmark elements (main, nav, header, footer, aside) found",
    });
  }

  return errors;
}
