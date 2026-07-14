#!/usr/bin/env bash
# ============================================================
# Synth Bootstrap Installer
# ============================================================
# Public installation contract for SYNTH.
#
# Usage:
#   curl -fsSL "${SYNTH_INSTALLER_BASE_URL}/install.sh" | sh
#   curl -fsSL "${SYNTH_INSTALLER_BASE_URL}/install.sh" | sh -s -- --dry-run
#
# Options:
#   --upgrade        Upgrade an existing installation.
#   --channel <name> Install from a specific release channel (default: latest).
#   --version <ver>  Install an exact semantic version.
#   --dry-run        Print the installation plan without executing it.
#   --verbose        Enable verbose output.
#   --help           Show this help message.
#
# Exit codes:
#   0 - Success or successful no-op.
#   1 - Operational failure or invalid arguments.
#
# The SYNTH_INSTALLER_BASE_URL environment variable overrides the default
# installer base URL. This allows the same installer script to be served from
# GitHub Pages, a custom domain, or a future CDN without modification.
# ============================================================

set -euo pipefail

DEFAULT_BASE_URL="https://synth-framework.github.io/synth"
INSTALLER_BASE_URL="${SYNTH_INSTALLER_BASE_URL:-${DEFAULT_BASE_URL}}"
DEFAULT_CHANNEL="latest"

DRY_RUN=false
VERBOSE=false
UPGRADE=false
CHANNEL=""
VERSION=""

log() {
  if [ "$VERBOSE" = true ]; then
    printf "%s\n" "$1" >&2
  fi
}

error() {
  printf "Error: %s\n" "$1" >&2
}

fail() {
  error "$1"
  exit 1
}

usage() {
  cat <<EOF
Synth Bootstrap Installer

Installs or upgrades the Synth CLI.

Usage:
  install.sh [options]

Options:
  --upgrade              Upgrade an existing installation.
  --channel <channel>    Release channel (default: ${DEFAULT_CHANNEL}).
  --version <version>    Exact semantic version to install.
  --dry-run              Print the installation plan without executing it.
  --verbose              Enable verbose output.
  --help                 Show this help message.

Environment:
  SYNTH_INSTALLER_BASE_URL   Base URL for installer assets.
                             Default: ${DEFAULT_BASE_URL}

Examples:
  install.sh
  install.sh --upgrade
  install.sh --channel beta
  install.sh --version 2.1.0 --dry-run
EOF
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --upgrade)
        UPGRADE=true
        shift
        ;;
      --channel)
        if [ -z "${2:-}" ]; then
          fail "--channel requires a value"
        fi
        CHANNEL="$2"
        shift 2
        ;;
      --version)
        if [ -z "${2:-}" ]; then
          fail "--version requires a value"
        fi
        VERSION="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown option: $1"
        ;;
    esac
  done

  if [ -z "$CHANNEL" ]; then
    CHANNEL="$DEFAULT_CHANNEL"
  fi
}

print_plan() {
  cat <<EOF
Installation plan:
  Base URL:   ${INSTALLER_BASE_URL}
  Upgrade:    ${UPGRADE}
  Channel:    ${CHANNEL}
  Version:    ${VERSION:-<latest in channel>}
  Dry run:    ${DRY_RUN}
EOF
}

main() {
  parse_args "$@"

  log "Synth Bootstrap Installer"
  log "Base URL: ${INSTALLER_BASE_URL}"
  log "Upgrade: ${UPGRADE}"
  log "Channel: ${CHANNEL}"
  log "Version: ${VERSION:-<latest in channel>}"
  log "Dry run: ${DRY_RUN}"

  print_plan

  if [ "$DRY_RUN" = true ]; then
    log "Dry run requested; no changes will be made."
    exit 0
  fi

  # Installation logic is intentionally deferred to EXP-INSTALL-004.
  # This expedition defines only the public contract.
  log "Installation logic is not implemented in this expedition."
  printf "Synth bootstrap contract validated. Installation will begin in EXP-INSTALL-004.\n"
}

main "$@"
