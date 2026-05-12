---
description: Scaffold a new accessibility rule end-to-end (rule module + both index.js lists + logger.js typeLabels + a11y.config.json)
argument-hint: <rule-name> [spec...]
---

Add a new accessibility rule to `be-a11y` called **$ARGUMENTS**.

Delegate to the `rule-author` subagent. Pass along:

1. The rule name from the argument (parse the first token as the rule identifier — convert to `camelCase` for the file name and `kebab-case` for the `type` key).
2. The rest of the argument as the spec (what the rule should check).
3. A reminder that all four wiring locations must be updated:
   - New file `src/rules/<camelCaseName>.js`
   - `index.js` top-of-file require
   - `index.js` URL-branch invocation in `analyzeContent` (~lines 120–138)
   - `index.js` directory-branch invocation (~lines 167–190)
   - `src/utils/logger.js` `typeLabels` entry
   - `a11y.config.json` `rules` entry

If $ARGUMENTS is empty, stop and ask the user for the rule name and a one-sentence spec of what it should detect.

After the subagent finishes, do **not** auto-rebuild `dist/`. Remind the user that `/sync-dist` will rebuild the bundle when they're ready to release.
