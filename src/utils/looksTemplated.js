/**
 * Heuristic: does a string contain template / interpolation syntax?
 *
 * Used to skip validation on attribute values that are computed at render time,
 * so the tool does not emit false positives for e.g. `id="{{ user.id }}"` or
 * `lang="{$locale}"`. Applied only to reference-like attribute values (id, for,
 * aria-labelledby/describedby, lang, autocomplete, role, alt, …) — never to
 * `style`, whose braces are meaningful CSS.
 *
 * Recognizes:
 *   - Handlebars / Twig / Latte / Blade  `{{ … }}`
 *   - Twig / Jinja / Latte control tags  `{% … %}`
 *   - JS template literals               `${ … }`
 *   - PHP short/long open tags           `<?php`, `<?=`, `<? `
 *   - ASP / EJS / underscore             `<% … %>`
 *   - single-brace (Latte / JSX / Angular / Vue) `{ … }`
 *
 * @param {string} value - Attribute value (or any string) to test.
 * @returns {boolean} True if the value looks templated.
 */
module.exports = function looksTemplated(value) {
  if (typeof value !== "string" || value === "") return false;
  return (
    /\{\{[\s\S]*?\}\}/.test(value) || // {{ ... }}
    /\{%[\s\S]*?%\}/.test(value) || // {% ... %}
    /\$\{[\s\S]*?\}/.test(value) || // ${ ... }
    /<\?(?:php|=|\s|$)/i.test(value) || // <?php  <?=  <?
    /<%[\s\S]*?%>/.test(value) || // <% ... %>
    /\{[^{}]*\}/.test(value) // { ... } single-brace
  );
};
