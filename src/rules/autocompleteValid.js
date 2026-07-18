const { loadDocument, getLine } = require("../utils/dom");
const looksTemplated = require("../utils/looksTemplated");

// WHATWG autofill field names that are NOT contact fields.
const FIELD_TOKENS = new Set([
  "name", "honorific-prefix", "given-name", "additional-name", "family-name",
  "honorific-suffix", "nickname", "username", "new-password", "current-password",
  "one-time-code", "organization-title", "organization", "street-address",
  "address-line1", "address-line2", "address-line3", "address-level1",
  "address-level2", "address-level3", "address-level4", "country", "country-name",
  "postal-code", "cc-name", "cc-given-name", "cc-additional-name",
  "cc-family-name", "cc-number", "cc-exp", "cc-exp-month", "cc-exp-year",
  "cc-csc", "cc-type", "transaction-currency", "transaction-amount", "language",
  "bday", "bday-day", "bday-month", "bday-year", "sex", "url", "photo",
]);

// Contact fields — these may be preceded by a home|work|mobile|fax|pager modifier.
const CONTACT_TOKENS = new Set([
  "tel", "tel-country-code", "tel-national", "tel-area-code", "tel-local",
  "tel-local-prefix", "tel-local-suffix", "tel-extension", "email", "impp",
]);

const CONTACT_MODIFIERS = new Set(["home", "work", "mobile", "fax", "pager"]);

/** Validates the ordered autofill detail tokens; returns true if well-formed. */
function isValidAutocomplete(value) {
  if (value === "on" || value === "off") return true;

  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  if (tokens[tokens.length - 1] === "webauthn") tokens.pop();
  if (tokens.length === 0) return false;

  const field = tokens.pop();
  const isField = FIELD_TOKENS.has(field);
  const isContact = CONTACT_TOKENS.has(field);
  if (!isField && !isContact) return false;

  // Remaining prefix tokens, in order: section-* , shipping|billing , modifier.
  let i = 0;
  if (tokens[i] && tokens[i].startsWith("section-")) i++;
  if (tokens[i] === "shipping" || tokens[i] === "billing") i++;
  if (tokens[i] && CONTACT_MODIFIERS.has(tokens[i])) {
    if (!isContact) return false; // modifier only valid on contact fields
    i++;
  }
  return i === tokens.length;
}

/**
 * Validates the `autocomplete` attribute on inputs/selects/textareas against the
 * WHATWG autofill grammar. Empty and templated values are skipped. An unknown or
 * misordered token sequence is an error (helps browsers/AT autofill correctly).
 *
 * @param {string} content - HTML content.
 * @param {string} file - File name.
 * @returns {object[]} autocomplete-valid issues.
 */
module.exports = function autocompleteValid(content, file) {
  const $ = loadDocument(content);
  const errors = [];

  $("input, select, textarea").each((_, el) => {
    const raw = $(el).attr("autocomplete");
    if (typeof raw !== "string" || raw.trim() === "" || looksTemplated(raw)) return;
    const value = raw.trim().toLowerCase();
    if (!isValidAutocomplete(value)) {
      errors.push({
        file,
        line: getLine($, el, content),
        type: "autocomplete-valid",
        message: `autocomplete="${raw.trim()}" is not a valid autofill value`,
      });
    }
  });

  return errors;
};
