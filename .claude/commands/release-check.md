---
description: Pre-release audit — bundle sync, version, action.yml, recent commits since last tag. Reports readiness only; does not tag or push.
---

Perform a pre-release audit. This is a **read-and-report** command — it does not tag, push, publish, or commit.

1. **Bundle sync.** Delegate to the `bundle-guardian` subagent to confirm `dist/index.js` is current. Report its verdict.

2. **Version coherence.**
   - Print `package.json` `version`.
   - Print the latest git tag: `git describe --tags --abbrev=0 2>/dev/null || echo '(no tags yet)'`.
   - If the package version and the latest tag disagree, flag it — the user likely needs to bump or tag.

3. **Action wiring sanity.**
   - Read `action.yml` and confirm `runs.main` is still `dist/index.js` and `runs.using` is a current Node runtime (`node20` at time of writing). Flag if either has changed unexpectedly.

4. **Changes since last tag.**
   - `git log --oneline <last-tag>..HEAD -- index.js src/ a11y.config.json action.yml package.json` to list user-visible changes.
   - Note any changes to `action.yml` or `package.json` (often release-relevant).

5. **Working tree.**
   - `git status --porcelain` — confirm clean (or list dirty files).
   - Untracked files in `src/rules/` are a red flag — a new rule may have been left out of `index.js`.

6. **Output a release-readiness report:**
   ```
   ## Release readiness

   - Bundle: ✅ in-sync (or ❌ stale — run /sync-dist)
   - Version: package.json 2.2.0 / last tag v2.1.0 → bump required
   - Action: ✅ action.yml -> dist/index.js, node20
   - Working tree: ✅ clean (or list dirty files)
   - Changes since v2.1.0: <N> commits, summarized:
     - feat: ...
     - fix: ...

   ## Recommendation
   <one or two sentences: ready / not ready, and what to do next>
   ```

Do **not** run `git tag`, `git push`, or `npm publish`. Those are explicit user actions.
