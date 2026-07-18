const fs = require("fs");
const chalk = require("chalk");

const DEFAULT_CONFIG_PATH = "a11y.config.json";

// Formerly hardcoded at the top of index.js; the single source of defaults now.
const DEFAULT_ALLOWED_EXTENSIONS = [
  ".latte",
  ".html",
  ".php",
  ".twig",
  ".edge",
  ".tsx",
  ".jsx",
];

const DEFAULT_EXCLUDED_DIRS = [
  "node_modules",
  "vendor",
  "dist",
  "build",
  "temp",
  ".idea",
  ".git",
  "log",
  "bin",
];

/**
 * Resolves a config "set" field (allowedExtensions / excludedDirs) which may be:
 *   - an object map `{ key: boolean }` — MERGES over defaults (true adds, false
 *     removes). This is the legacy shape shipped in a11y.config.json.
 *   - an array of strings — REPLACES the defaults entirely.
 *   - anything else / absent — the defaults, unchanged.
 *
 * @param {*} value - Raw config value.
 * @param {string[]} defaults - Default members.
 * @returns {string[]} Resolved member list.
 */
function resolveSet(value, defaults) {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((v) => typeof v === "string"))];
  }
  if (value && typeof value === "object") {
    const set = new Set(defaults);
    for (const [key, enabled] of Object.entries(value)) {
      if (enabled === false) set.delete(key);
      else if (enabled === true) set.add(key);
    }
    return [...set];
  }
  return [...defaults];
}

/**
 * Loads and normalizes an a11y config, filling in defaults for anything absent.
 * A missing file yields silent defaults; malformed JSON (or other read errors)
 * prints a stderr warning and falls back to defaults. The path is cwd-relative.
 *
 * @param {string} [configPath="a11y.config.json"] - Path to the config file.
 * @returns {{
 *   rules: Object<string,boolean>,
 *   options: Object<string,object>,
 *   allowedExtensions: string[],
 *   excludedDirs: string[]
 * }} Normalized config.
 */
function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      process.stderr.write(
        chalk.yellow(
          `⚠️  Could not read config at ${configPath} (${err.message}). Using defaults.\n`
        )
      );
    }
    raw = {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) raw = {};

  return {
    rules:
      raw.rules && typeof raw.rules === "object" && !Array.isArray(raw.rules)
        ? raw.rules
        : {},
    options:
      raw.options && typeof raw.options === "object" && !Array.isArray(raw.options)
        ? raw.options
        : {},
    allowedExtensions: resolveSet(raw.allowedExtensions, DEFAULT_ALLOWED_EXTENSIONS),
    excludedDirs: resolveSet(raw.excludedDirs, DEFAULT_EXCLUDED_DIRS),
  };
}

module.exports = loadConfig;
module.exports.loadConfig = loadConfig;
module.exports.DEFAULT_ALLOWED_EXTENSIONS = DEFAULT_ALLOWED_EXTENSIONS;
module.exports.DEFAULT_EXCLUDED_DIRS = DEFAULT_EXCLUDED_DIRS;
