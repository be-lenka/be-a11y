#!/usr/bin/env bash
# Warns when index.js or src/* has been edited and is newer than dist/index.js.
# Self-deduplicating: once `npm run build` runs, dist/index.js's mtime catches up
# and the warning stops firing.
#
# Reads the PostToolUse JSON payload from stdin, extracts tool_input.file_path,
# and only emits when that file is the GitHub Action source surface.

set -u

payload=$(cat)

# Extract the edited file path. Use jq if available, else grep fallback.
# Both branches are best-effort — failure to parse means we exit silently.
if command -v jq >/dev/null 2>&1; then
  file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
else
  file=$(printf '%s' "$payload" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || true)
fi
file="${file:-}"

[[ -z "${file:-}" ]] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
dist="$project_dir/dist/index.js"

# Only warn for index.js or files under src/
case "$file" in
  "$project_dir/index.js"|"$project_dir/src/"*) ;;
  */index.js|*/src/*)
    # Looser match for relative paths or symlinked layouts
    ;;
  *)
    exit 0
    ;;
esac

# If dist doesn't exist yet, nothing to compare — silent.
[[ -f "$dist" ]] || exit 0

# Warn only when the edited file is newer than dist/index.js.
if [[ "$file" -nt "$dist" ]]; then
  rel="${file#$project_dir/}"
  printf '\n\033[33m⚠️  be-a11y: %s is newer than dist/index.js — run `npm run build` before tagging a release. The GitHub Action runs the bundled file, not the source.\033[0m\n' "$rel" >&2
fi

exit 0
