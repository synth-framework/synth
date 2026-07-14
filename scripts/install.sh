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

# Internal override for testing and non-global installs.
# When set, npm install uses --prefix instead of -g.
INSTALLER_NPM_PREFIX="${SYNTH_INSTALLER_NPM_PREFIX:-}"

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

detect_os() {
  local os
  os="$(uname -s)"
  case "$os" in
    Darwin)
      printf "macos"
      ;;
    Linux)
      if [ -f /proc/sys/kernel/osrelease ] && grep -q -i microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
        printf "wsl"
      else
        printf "linux"
      fi
      ;;
    *)
      printf "unsupported"
      ;;
  esac
}

detect_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64)
      printf "x86_64"
      ;;
    arm64|aarch64)
      printf "arm64"
      ;;
    *)
      printf "unsupported"
      ;;
  esac
}

detect_shell() {
  local shell_path
  shell_path="${SHELL:-}"
  if [ -z "$shell_path" ]; then
    printf "unknown"
    return
  fi
  basename "$shell_path"
}

check_command_version() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    "$cmd" --version 2>/dev/null | head -n 1 | tr -d '[:space:]'
  else
    printf "not found"
  fi
}

check_path() {
  if command -v synth >/dev/null 2>&1; then
    command -v synth
  else
    printf "not in PATH"
  fi
}

check_network() {
  local url="${INSTALLER_BASE_URL}/install.sh"
  if command -v curl >/dev/null 2>&1; then
    if curl --max-time 3 -fsSL -I "$url" >/dev/null 2>&1; then
      printf "ok"
      return
    fi
  fi
  printf "unavailable"
}

check_permissions() {
  local npm_prefix
  npm_prefix="$(npm config get prefix 2>/dev/null || true)"
  if [ -z "$npm_prefix" ]; then
    printf "unknown"
    return
  fi
  if [ -w "$npm_prefix" ]; then
    printf "writable"
  else
    printf "may require elevation"
  fi
}

check_command_exists() {
  if command -v "$1" >/dev/null 2>&1; then
    printf "present"
  else
    printf "not found"
  fi
}

build_environment_profile() {
  printf "Environment profile:\n"
  printf "  OS:           %s\n" "$(detect_os)"
  printf "  Architecture: %s\n" "$(detect_arch)"
  printf "  Shell:        %s\n" "$(detect_shell)"

  if [ "$DRY_RUN" = true ]; then
    # In dry-run mode avoid expensive npm startup; presence is sufficient.
    printf "  Node:         %s\n" "$(check_command_exists node)"
    printf "  npm:          %s\n" "$(check_command_exists npm)"
    printf "  PATH synth:   %s\n" "$(check_path)"
    printf "  Network:      %s\n" "$(check_network)"
    printf "  Permissions:  %s\n" "dry-run"
  else
    printf "  Node:         %s\n" "$(check_command_version node)"
    printf "  npm:          %s\n" "$(check_command_version npm)"
    printf "  PATH synth:   %s\n" "$(check_path)"
    printf "  Network:      %s\n" "$(check_network)"
    printf "  Permissions:  %s\n" "$(check_permissions)"
  fi
}

validate_environment() {
  local os arch node_version
  os="$(detect_os)"
  arch="$(detect_arch)"

  if [ "$os" = "unsupported" ]; then
    fail "Unsupported operating system: $(uname -s)"
  fi

  if [ "$arch" = "unsupported" ]; then
    fail "Unsupported architecture: $(uname -m)"
  fi

  node_version="$(check_command_version node)"
  if [ "$node_version" = "not found" ]; then
    fail "Node.js is required but was not found. Please install Node.js >= 20."
  fi
}

get_npm_latest_version() {
  npm view @synth-framework/synth version 2>/dev/null || true
}

get_npm_dist_tag_version() {
  local tag="$1"
  npm view @synth-framework/synth "dist-tags.${tag}" 2>/dev/null || true
}

resolve_distribution() {
  local channel="$1"
  local version="$2"
  local resolved_version=""

  case "$channel" in
    latest|stable)
      if [ -n "$version" ]; then
        resolved_version="$version"
      elif [ "$DRY_RUN" = true ]; then
        resolved_version="<latest in channel>"
      else
        resolved_version="$(get_npm_latest_version)"
      fi
      ;;
    beta|nightly)
      if [ -n "$version" ]; then
        resolved_version="$version"
      elif [ "$DRY_RUN" = true ]; then
        resolved_version="<latest in channel>"
      else
        resolved_version="$(get_npm_dist_tag_version "$channel")"
      fi
      ;;
    *)
      fail "Unknown release channel: $channel"
      ;;
  esac

  if [ -z "$resolved_version" ]; then
    fail "Could not resolve version for channel '$channel'"
  fi

  printf "Backend:    npm\n"
  printf "Package:    @synth-framework/synth\n"
  printf "Version:    %s\n" "$resolved_version"
  printf "Channel:    %s\n" "$channel"
}

resolve_target() {
  local channel="$1"
  local version="$2"
  local resolved_version=""

  case "$channel" in
    latest|stable)
      if [ -n "$version" ]; then
        resolved_version="$version"
      else
        resolved_version="$(get_npm_latest_version)"
      fi
      ;;
    beta|nightly)
      if [ -n "$version" ]; then
        resolved_version="$version"
      else
        resolved_version="$(get_npm_dist_tag_version "$channel")"
      fi
      ;;
    *)
      fail "Unknown release channel: $channel"
      ;;
  esac

  if [ -z "$resolved_version" ]; then
    fail "Could not resolve version for channel '$channel'"
  fi

  printf "%s@%s" "@synth-framework/synth" "$resolved_version"
}

npm_install_cmd() {
  if [ -n "$INSTALLER_NPM_PREFIX" ]; then
    printf "install --prefix %s" "${INSTALLER_NPM_PREFIX}"
  else
    printf "install -g"
  fi
}

get_installed_version() {
  if command -v synth >/dev/null 2>&1; then
    synth --version 2>/dev/null | head -n 1 | tr -d '[:space:]' || true
  else
    printf ""
  fi
}

install_package() {
  local target="$1"
  local package_name="@synth-framework/synth"
  local previous_version=""
  local max_attempts=3
  local attempt=1
  local exit_code=0

  if [ "$UPGRADE" = true ]; then
    previous_version="$(get_installed_version)"
    log "Previous version: ${previous_version:-<none>}"
  fi

  local npm_cmd
  npm_cmd="$(npm_install_cmd)"

  while [ "$attempt" -le "$max_attempts" ]; do
    log "Installation attempt ${attempt}/${max_attempts}: npm ${npm_cmd} ${target}"
    # shellcheck disable=SC2086
    if npm ${npm_cmd} "$target"; then
      exit_code=0
      break
    else
      exit_code=$?
      log "Installation attempt ${attempt} failed with exit code ${exit_code}"
      if [ "$attempt" -lt "$max_attempts" ]; then
        local backoff=$((2 ** attempt))
        log "Retrying in ${backoff} seconds..."
        sleep "$backoff"
      fi
    fi
    attempt=$((attempt + 1))
  done

  if [ "$exit_code" -ne 0 ]; then
    log "Installation failed; cleaning up partial install..."
    npm uninstall -g "$package_name" >/dev/null 2>&1 || true
    if [ -n "$INSTALLER_NPM_PREFIX" ]; then
      npm uninstall --prefix "$INSTALLER_NPM_PREFIX" "$package_name" >/dev/null 2>&1 || true
    fi

    if [ "$UPGRADE" = true ] && [ -n "$previous_version" ]; then
      log "Attempting rollback to ${previous_version}..."
      # shellcheck disable=SC2086
      npm ${npm_cmd} "${package_name}@${previous_version}" >/dev/null 2>&1 || true
    fi

    fail "Installation failed after ${max_attempts} attempts"
  fi
}

verify_installation() {
  log "Verifying installation..."
  if ! command -v synth >/dev/null 2>&1; then
    fail "Installation verification failed: synth is not available on PATH"
  fi
  if ! synth --version >/dev/null 2>&1; then
    fail "Installation verification failed: synth --version did not execute"
  fi
  printf "Verification: synth is installed and executable\n"
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

  validate_environment
  print_plan
  build_environment_profile

  printf "Distribution profile:\n"
  resolve_distribution "$CHANNEL" "$VERSION"

  if [ "$DRY_RUN" = true ]; then
    log "Dry run requested; no changes will be made."
    exit 0
  fi

  local target
  target="$(resolve_target "$CHANNEL" "$VERSION")"
  install_package "$target"
  verify_installation

  printf "\n"
  printf "Synth %s installed successfully.\n" "$target"
  printf "Run 'synth --help' to get started.\n"
}

main "$@"
