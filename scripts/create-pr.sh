#!/usr/bin/env bash
# ============================================================
# Safe PR creation helper
# ============================================================
# Wraps `gh pr create` and always uses --body-file to avoid shell
# interpolation issues with backticks, angle brackets, and other
# special characters in Markdown PR bodies.
#
# Usage:
#   scripts/create-pr.sh --title "PR title" --body-file pr-body.md \
#     [--base main] [--head feature-branch]
# ============================================================

set -euo pipefail

TITLE=""
BODY_FILE=""
BASE="main"
HEAD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="$2"
      shift 2
      ;;
    --body-file)
      BODY_FILE="$2"
      shift 2
      ;;
    --base)
      BASE="$2"
      shift 2
      ;;
    --head)
      HEAD="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 --title <title> --body-file <path> [--base <branch>] [--head <branch>]" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "Missing --title" >&2
  exit 1
fi

if [[ -z "$BODY_FILE" ]]; then
  echo "Missing --body-file" >&2
  exit 1
fi

if [[ ! -f "$BODY_FILE" ]]; then
  echo "Body file not found: $BODY_FILE" >&2
  exit 1
fi

HEAD_ARG=""
if [[ -n "$HEAD" ]]; then
  HEAD_ARG="--head $HEAD"
fi

# shellcheck disable=SC2086
gh pr create --title "$TITLE" --body-file "$BODY_FILE" --base "$BASE" $HEAD_ARG
