const looksTemplated = require("./looksTemplated");

// Memoize per-document so the id index is built once even though many rules
// ask for it. Keyed on the document root node; entries are GC'd with the doc.
const cache = new WeakMap();

/**
 * Collects every element id in a document, once per document.
 *
 * ids are trimmed before indexing; empty and templated ids (e.g. `{{ id }}`)
 * are ignored. Consumers MUST trim their lookup values too so both sides match
 * consistently. Using a Map/Set for lookups — instead of `$("#" + id)` — avoids
 * crashing on ids that contain CSS-selector metacharacters (e.g. `a.b`, `x:y`),
 * which is the source of the selector-injection crash class in the legacy code.
 *
 * @param {import('cheerio').CheerioAPI} $ - Loaded cheerio instance.
 * @returns {{
 *   idSet: Set<string>,
 *   byId: Map<string, any>,
 *   duplicates: Map<string, any[]>
 * }} idSet: all valid ids; byId: id -> first element with that id;
 *    duplicates: id -> elements (length >= 2) sharing it, in document order.
 */
function collectIds($) {
  const root = $.root().get(0);
  if (root && cache.has(root)) return cache.get(root);

  const idSet = new Set();
  const byId = new Map();
  const occurrences = new Map();

  $("[id]").each((_, el) => {
    const raw = $(el).attr("id");
    if (typeof raw !== "string") return;
    const id = raw.trim();
    if (id === "" || looksTemplated(id)) return;
    idSet.add(id);
    if (!byId.has(id)) byId.set(id, el);
    if (!occurrences.has(id)) occurrences.set(id, []);
    occurrences.get(id).push(el);
  });

  const duplicates = new Map();
  for (const [id, els] of occurrences) {
    if (els.length > 1) duplicates.set(id, els);
  }

  const result = { idSet, byId, duplicates };
  if (root) cache.set(root, result);
  return result;
}

module.exports = { collectIds };
