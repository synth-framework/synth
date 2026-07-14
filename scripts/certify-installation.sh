#!/usr/bin/env bash
# ============================================================
# Synth Installation Certification
# ============================================================
# Runs the canonical install → verify flow used in CI. This script
# is intentionally minimal and non-mutating except for the temporary
# project directory it creates.
# ============================================================

set -euo pipefail

INSTALLER_BASE_URL="${SYNTH_INSTALLER_BASE_URL:-https://synth-framework.github.io/synth}"
CERT_DIR="${SYNTH_CERT_DIR:-$(mktemp -d)}"

echo "============================================================"
echo "Synth Installation Certification"
echo "============================================================"
echo "Installer: ${INSTALLER_BASE_URL}/install.sh"
echo "Cert dir:  ${CERT_DIR}"
echo ""

echo "[1/5] Installing Synth..."
curl -fsSL "${INSTALLER_BASE_URL}/install.sh" | sh

echo ""
echo "[2/5] Verifying executable..."
command -v synth

echo ""
echo "[3/5] Checking version..."
synth --version

echo ""
echo "[4/5] Checking health..."
synth doctor

echo ""
echo "[5/5] Initializing a project..."
mkdir -p "${CERT_DIR}"
cd "${CERT_DIR}"
synth init --name "Synth Certification"

echo ""
echo "============================================================"
echo "Installation certified successfully."
echo "============================================================"
