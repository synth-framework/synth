#!/usr/bin/env bash
# ============================================================
# SYNTH v2 — Installer
# ============================================================
# Installs the Synth CLI from the current repository.
# Requires Node.js >= 20 and npm.
# ============================================================

set -euo pipefail

REQUIRED_NODE_MAJOR=20

echo ""
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║                                                           ║"
echo "  ║  SYNTH v2 — Deterministic Execution System Installer      ║"
echo "  ║                                                           ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed."
  echo "Install Node.js >= ${REQUIRED_NODE_MAJOR} from https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "Error: Node.js ${REQUIRED_NODE_MAJOR}+ is required. Found ${NODE_VERSION}."
  exit 1
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required but not installed."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Node.js version: ${NODE_VERSION}"
echo "npm version: $(npm --version)"
echo ""
echo "Installing Synth CLI..."
echo ""

npm install
npm run build
npm install -g .

echo ""
echo "Verifying installation..."
if synth --version >/dev/null 2>&1; then
  echo ""
  synth --version
  echo ""
  echo "Synth is installed. Run 'synth --help' to get started."
else
  echo "Error: Installation verification failed."
  exit 1
fi
