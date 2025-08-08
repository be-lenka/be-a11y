const fs = require("fs");
const chalk = require("chalk");

/**
 * Loads config with defaults if missing values.
 *
 * @param {string} configFile
 * @returns {object} Normalized config object
 */
module.exports = function configuration(configFile) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  } catch (err) {
    console.warn(chalk.yellow("⚠️  No config file found or invalid JSON. Using default rules."));
    config.rules = {};
    config.allowedExtensions = {};
    config.excludedDirs = {};
  }

  config.rules ??= {};
  // config.allowedExtensions ??= {};
  // config.excludedDirs ??= {};

  return config;
}
