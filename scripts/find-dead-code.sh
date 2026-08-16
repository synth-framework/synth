#!/usr/bin/env bash
# Find dead/unreferenced source files in a repo by scanning import references

set -euo pipefail

REPO_ROOT=$(pwd)

dirs=(src tests scripts)

# Collect all relevant source files
all_files=()
for d in "${dirs[@]}"; do
  while IFS= read -r -d $'\0' file; do
    all_files+=("$file")
  done < <(find "$REPO_ROOT/$d" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print0)
done

printf "Checking %d files under %s %s %s for references...\n" ${#all_files[@]} "${dirs[@]}"

for f in "${all_files[@]}"; do
  # Get relative path
  rel=${f#${REPO_ROOT}/}
  # Escape slashes for grep
  pattern=$(printf '%s' "$rel" | sed 's/\//\\\//g')
  # Count references (import/require) to this file string
  count=$(grep -r --exclude-dir={node_modules,.git,.synth,dist} --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E "from ['\"']${pattern}['\"']|require\(['\"']${pattern}['\"']\)" . | wc -l || true)
  if [[ $count -eq 0 ]]; then
    printf "UNREFERENCED: %s\n" "$rel"
  fi
done

printf "Done.\n"
