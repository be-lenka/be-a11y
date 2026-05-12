---
description: Rebuild dist/index.js from current source via npm run build and show what changed
---

Run the bundle-sync workflow:

1. `git status --porcelain` — show pre-build dirty state.
2. `npm run build` — runs `ncc build index.js -o dist`.
3. `git diff --stat -- dist/` — show how many bytes / which files in `dist/` changed.
4. If `dist/index.js` is now modified but unstaged, tell the user the file is ready to stage. Do **not** run `git add` or `git commit` on your own.
5. If the build errored, print the error and stop — do not try to mask it.

This command does not commit, tag, or push. Use `/release-check` for pre-release verification.
