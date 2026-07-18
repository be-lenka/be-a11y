/**
 * Rule registry — the single source of truth for be-a11y.
 *
 * Every rule is described once here: its config id, human description, the
 * check function, and metadata for each issue `type` it can emit (severity,
 * WCAG references, a one-line fix hint, and a display label + emoji). This
 * replaces the two hand-duplicated rule lists that used to live in index.js and
 * the inline `typeLabels` map in logger.js.
 *
 * Contract for `check`: `(content, file, config) => [{ file, line, type, message }]`.
 * Enrichment (ruleId/severity/wcag/hint/snippet) happens at aggregation time in
 * index.js, never inside a rule.
 *
 * Conventions:
 *  - `id` is the config key (`config.rules[id] !== false` enables the rule) and,
 *    for the 14 legacy rules, MUST equal the historical shouldRun key.
 *  - `wcag` is an array of Success Criterion numbers; `[]` renders as
 *    "Best practice".
 *  - For rules added in v3 the id, the config key, and the single emitted type
 *    are identical (1:1).
 */

const rules = [
  {
    id: "alt-attributes",
    description: "Images must have appropriate alt attributes",
    check: require("./rules/altAttributes"),
    types: {
      "missing-alt": {
        severity: "error",
        wcag: ["1.1.1"],
        hint: 'Add a descriptive alt attribute, or alt="" if the image is purely decorative.',
        label: "Missing ALT",
        emoji: "🖼️",
      },
      "alt-empty": {
        severity: "warning",
        wcag: ["1.1.1"],
        hint: 'Give the image meaningful alt text, or use role="presentation" if it is decorative.',
        label: "Empty ALT",
        emoji: "⬜",
      },
      "alt-too-long": {
        severity: "warning",
        wcag: [],
        hint: "Shorten the alt text (aim for under ~125 chars); put long descriptions in surrounding content.",
        label: "ALT Too Long",
        emoji: "↔️",
      },
      "alt-decorative-incorrect": {
        severity: "warning",
        wcag: ["1.1.1"],
        hint: 'A decorative image should have alt="" — not role="presentation" together with non-empty alt.',
        label: "ALT Decorative",
        emoji: "🌈",
      },
      "alt-functional-empty": {
        severity: "error",
        wcag: ["1.1.1", "2.4.4"],
        hint: "The image is the sole content of a link/button — give it alt text naming the destination or action.",
        label: "ALT Functional",
        emoji: "🔗",
      },
      "redundant-title": {
        severity: "warning",
        wcag: [],
        hint: "Remove the title attribute or make it differ from alt; identical text is announced twice.",
        label: "Redundant Title",
        emoji: "📛",
      },
    },
  },
  {
    id: "aria-invalid",
    description: "aria-label / aria-labelledby must be valid and resolvable",
    check: require("./rules/ariaLabels"),
    types: {
      "aria-invalid": {
        severity: "error",
        wcag: ["4.1.2"],
        hint: "Provide a non-empty aria-label, or point aria-labelledby at existing element id(s).",
        label: "ARIA Label",
        emoji: "♿",
      },
    },
  },
  {
    id: "aria-role-invalid",
    description: "The role attribute must be a valid, non-abstract WAI-ARIA role",
    check: require("./rules/ariaRoles"),
    types: {
      "aria-role-invalid": {
        severity: "error",
        wcag: ["4.1.2"],
        hint: "Use a valid, non-abstract WAI-ARIA role, or remove the role attribute.",
        label: "ARIA Role",
        emoji: "🧩",
      },
    },
  },
  {
    id: "contrast",
    description: "Inline-styled text must meet the WCAG AA contrast ratio",
    check: require("./rules/contrast"),
    types: {
      contrast: {
        severity: "error",
        wcag: ["1.4.3"],
        hint: "Increase the text/background contrast to meet the WCAG AA ratio (4.5:1, or 3:1 for large text).",
        label: "Contrast",
        emoji: "🎨",
      },
    },
  },
  {
    id: "empty-link",
    description: "Links must have an accessible name",
    check: require("./rules/emptyLinks"),
    types: {
      "empty-link": {
        severity: "error",
        wcag: ["2.4.4", "4.1.2"],
        hint: "Give the link visible text or an aria-label describing its destination.",
        label: "Empty Link",
        emoji: "📭",
      },
    },
  },
  {
    id: "heading-empty",
    description: "Headings must not be empty",
    check: require("./rules/headingEmpty"),
    types: {
      "heading-empty": {
        severity: "error",
        wcag: ["1.3.1", "2.4.6"],
        hint: "Add text content to the heading, or remove the empty heading element.",
        label: "Empty Heading",
        emoji: "❗",
      },
    },
  },
  {
    id: "heading-order",
    description: "Heading levels must not skip when descending",
    check: require("./rules/headingOrder"),
    types: {
      "heading-order": {
        severity: "warning",
        wcag: ["1.3.1"],
        hint: "Do not skip heading levels — a heading may go down by at most one level at a time.",
        label: "Heading Order",
        emoji: "📐",
      },
    },
  },
  {
    id: "iframe-title-missing",
    description: "iframes must have a descriptive title",
    check: require("./rules/iframeTitles"),
    types: {
      "iframe-title-missing": {
        severity: "error",
        wcag: ["4.1.2"],
        hint: "Add a title attribute (or aria-label) describing the iframe's content.",
        label: "iframe Title",
        emoji: "🪟",
      },
    },
  },
  {
    id: "label-missing-for",
    description: "Labels must be associated with a labelable form control",
    check: require("./rules/labelsWithoutFor"),
    types: {
      "label-for-missing": {
        severity: "error",
        wcag: ["1.3.1", "4.1.2"],
        hint: "Point the label's for attribute at the id of an existing, labelable form control.",
        label: "Broken Label",
        emoji: "🔗",
      },
      "label-missing-for": {
        severity: "warning",
        wcag: ["1.3.1"],
        hint: "Associate the label with a control via for=, or wrap the control inside the label.",
        label: "Unassociated Label",
        emoji: "🏷️",
      },
    },
  },
  {
    id: "missing-landmark",
    description: "A full document should expose at least one landmark region",
    check: require("./rules/landmarkRoles"),
    types: {
      "missing-landmark": {
        severity: "warning",
        wcag: ["1.3.1", "2.4.1"],
        hint: "Wrap page regions in landmarks (main, nav, header, footer, aside) or equivalent ARIA roles.",
        label: "Landmark",
        emoji: "🏛️",
      },
    },
  },
  {
    id: "link-new-tab-warning",
    description: "Links opening a new tab should warn users",
    check: require("./rules/linksOpenNewTab"),
    types: {
      "link-new-tab-warning": {
        severity: "warning",
        wcag: ["3.2.2"],
        hint: "Tell users the link opens a new tab via visible text, aria-label, title, or an SR-only note.",
        label: "New Tab Warning",
        emoji: "🧭",
      },
    },
  },
  {
    id: "missing-aria",
    description: "Icons and repeated landmarks need distinguishing accessible names",
    check: require("./rules/missingAria"),
    types: {
      "missing-aria": {
        severity: "warning",
        wcag: ["4.1.2", "1.1.1"],
        hint: "Give the icon/landmark an accessible name (aria-label, title, or accompanying visible text).",
        label: "Missing ARIA",
        emoji: "👀",
      },
    },
  },
  {
    id: "multiple-h1",
    description: "A page should have a single top-level h1",
    check: require("./rules/multipleH1"),
    types: {
      "multiple-h1": {
        severity: "warning",
        wcag: [],
        hint: "Use one h1 per page/view as the main title and demote the others to h2+.",
        label: "Multiple H1",
        emoji: "🧱",
      },
    },
  },
  {
    id: "input-unlabeled",
    description: "Form controls must have an accessible name",
    check: require("./rules/unlabeledInputs"),
    types: {
      "input-unlabeled": {
        severity: "error",
        wcag: ["1.3.1", "4.1.2"],
        hint: "Associate the control with a <label>, or add aria-label / aria-labelledby.",
        label: "Unlabeled Input",
        emoji: "🔘",
      },
      "input-placeholder-only": {
        severity: "warning",
        wcag: ["3.3.2"],
        hint: "A placeholder is not a label — add a visible <label> (the placeholder vanishes once typing starts).",
        label: "Placeholder Only",
        emoji: "✍️",
      },
    },
  },
  {
    id: "html-lang",
    description: "The document's <html> must declare a valid lang",
    check: require("./rules/htmlLang"),
    types: {
      "html-lang": {
        severity: "error",
        wcag: ["3.1.1"],
        hint: 'Add a valid BCP-47 lang to <html> (e.g. lang="en").',
        label: "HTML Lang",
        emoji: "🌐",
      },
    },
  },
  {
    id: "document-title",
    description: "A document must have a non-empty <title>",
    check: require("./rules/documentTitle"),
    types: {
      "document-title": {
        severity: "error",
        wcag: ["2.4.2"],
        hint: "Add a concise, descriptive <title> inside <head>.",
        label: "Document Title",
        emoji: "📄",
      },
    },
  },
  {
    id: "duplicate-id",
    description: "id attributes must be unique within a document",
    check: require("./rules/duplicateId"),
    types: {
      "duplicate-id": {
        severity: "error",
        wcag: ["4.1.1"],
        hint: "Make the id unique; duplicate ids break label/aria references and scripting.",
        label: "Duplicate ID",
        emoji: "🆔",
      },
    },
  },
  {
    id: "empty-button",
    description: "Buttons must have an accessible name",
    check: require("./rules/emptyButton"),
    types: {
      "empty-button": {
        severity: "error",
        wcag: ["4.1.2"],
        hint: "Give the button text content, an aria-label, or (for input) a value.",
        label: "Empty Button",
        emoji: "🔳",
      },
    },
  },
  {
    id: "tabindex-positive",
    description: "Avoid positive tabindex values",
    check: require("./rules/tabindexPositive"),
    types: {
      "tabindex-positive": {
        severity: "warning",
        wcag: ["2.4.3"],
        hint: "Use tabindex=\"0\" or \"-1\"; positive values override and break the natural focus order.",
        label: "Positive Tabindex",
        emoji: "🔢",
      },
    },
  },
  {
    id: "meta-viewport",
    description: "The viewport meta must not disable zoom",
    check: require("./rules/metaViewport"),
    types: {
      "meta-viewport": {
        severity: "error",
        wcag: ["1.4.4"],
        hint: "Remove user-scalable=no and any maximum-scale below 2 so users can zoom.",
        label: "Viewport Zoom",
        emoji: "🔍",
      },
    },
  },
  {
    id: "table-headers",
    description: "Data tables should have header cells",
    check: require("./rules/tableHeaders"),
    types: {
      "table-headers": {
        severity: "warning",
        wcag: ["1.3.1"],
        hint: 'Add <th> header cells (with scope), or role="presentation" for a layout table.',
        label: "Table Headers",
        emoji: "🧮",
      },
    },
  },
  {
    id: "meta-refresh",
    description: "Avoid timed meta refresh/redirect",
    check: require("./rules/metaRefresh"),
    types: {
      "meta-refresh": {
        severity: "error",
        wcag: ["2.2.1"],
        hint: "Remove the timed meta refresh; if a redirect is needed, do it server-side.",
        label: "Meta Refresh",
        emoji: "⏱️",
      },
    },
  },
  {
    id: "skip-link",
    description: "A page should offer a way to skip to main content",
    check: require("./rules/skipLink"),
    types: {
      "skip-link": {
        severity: "warning",
        wcag: ["2.4.1"],
        hint: "Add a skip link, a <main> landmark, or an <h1> so users can reach the main content.",
        label: "Skip Link",
        emoji: "⏭️",
      },
    },
  },
  {
    id: "fieldset-legend",
    description: "Grouped controls need a fieldset/legend or named group",
    check: require("./rules/fieldsetLegend"),
    types: {
      "fieldset-legend": {
        severity: "warning",
        wcag: ["1.3.1", "3.3.2"],
        hint: "Wrap related radios/checkboxes in a <fieldset> with a <legend> describing the group.",
        label: "Fieldset Legend",
        emoji: "📋",
      },
    },
  },
  {
    id: "autocomplete-valid",
    description: "autocomplete must use valid autofill tokens",
    check: require("./rules/autocompleteValid"),
    types: {
      "autocomplete-valid": {
        severity: "error",
        wcag: ["1.3.5"],
        hint: "Use a valid WHATWG autofill token (e.g. email, given-name, cc-number).",
        label: "Autocomplete",
        emoji: "🧾",
      },
    },
  },
  {
    id: "list-structure",
    description: "Lists must follow their HTML content model",
    check: require("./rules/listStructure"),
    types: {
      "list-structure": {
        severity: "error",
        wcag: ["1.3.1"],
        hint: "Only <li> may be a direct child of <ul>/<ol>; only <dt>/<dd>/<div> inside <dl>.",
        label: "List Structure",
        emoji: "📃",
      },
    },
  },
  {
    id: "media-captions",
    description: "Video/audio need captions or a transcript",
    check: require("./rules/mediaCaptions"),
    types: {
      "media-captions": {
        severity: "warning",
        wcag: ["1.2.2"],
        hint: 'Add a <track kind="captions"> to video and a transcript for audio.',
        label: "Media Captions",
        emoji: "🎬",
      },
    },
  },
  {
    id: "accesskey-duplicate",
    description: "accesskey values must be unique",
    check: require("./rules/accesskeyDuplicate"),
    types: {
      "accesskey-duplicate": {
        severity: "warning",
        wcag: [],
        hint: "Give each accesskey a unique value, or remove the duplicates.",
        label: "Duplicate Accesskey",
        emoji: "⌨️",
      },
    },
  },
  {
    id: "deprecated-elements",
    description: "Deprecated, inaccessible elements must not be used",
    check: require("./rules/deprecatedElements"),
    types: {
      "deprecated-elements": {
        severity: "error",
        wcag: ["2.2.2"],
        hint: "Remove <marquee>/<blink>; use CSS animation with a reduced-motion opt-out if motion is essential.",
        label: "Deprecated Element",
        emoji: "🗑️",
      },
    },
  },
];

/**
 * Flat index: emitted `type` -> { ruleId, severity, wcag, hint, label, emoji }.
 * Built from the rule table so it can never drift from it.
 */
const typeMeta = {};
for (const rule of rules) {
  for (const [type, meta] of Object.entries(rule.types)) {
    typeMeta[type] = { ruleId: rule.id, ...meta };
  }
}

module.exports = { rules, typeMeta };
