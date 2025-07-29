
/**
 * Determines if a rule should run based on configuration.
 * Defaults to enabled unless explicitly set to false.
 *
 * @param {string} rule - Rule name from config.rules keys.
 * @returns {boolean} Whether the rule is enabled.
 */
 module.exports = function shouldRun(config, rule) {
  return config.rules[rule] !== false;
};
