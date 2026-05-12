---
description: Run a single rule module against an HTML fixture (or inline snippet) and print its returned errors
argument-hint: <rule-file> [fixture-path]
---

Spot-test a single rule in isolation. Arguments: **$ARGUMENTS**.

Parse the argument:
- First token: the rule file name (with or without `.js` extension), e.g. `altAttributes` or `emptyLinks.js`. Resolve it to `src/rules/<name>.js`. Fail if it doesn't exist.
- Second token (optional): a path to an HTML fixture file. If omitted, use a minimal inline snippet appropriate to the rule (e.g. for `altAttributes`, an `<img>` tag with no alt).

Execute the rule via a one-off Node invocation. Do not write a fixture file unless the user asks for one — use `node -e` with the HTML inline:

```bash
node -e "
const rule = require('./src/rules/<ruleName>');
const config = { rules: {} }; // pass empty config — only altAttributes uses it
const html = \`<paste fixture or inline HTML>\`;
const errors = rule(html, 'fixture.html', config);
console.log(JSON.stringify(errors, null, 2));
"
```

If a fixture path was given, `cat` it into the snippet via `fs.readFileSync` instead.

Report:
- The errors array (pretty-printed JSON).
- Whether the result looks correct given the input (one sentence).
- If zero errors when errors were expected, suggest a check: is the selector right? Is the rule wired in the config? Is the input HTML well-formed enough for cheerio?

This is for spot-checking only — does not replace running the full scanner via `node index.js <dir>`.
