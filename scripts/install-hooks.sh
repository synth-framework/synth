#!/bin/sh
# ============================================================
# Install Synth local governance hooks
# ============================================================
# This script configures git to use the hooks in .githooks/.
# It is platform-agnostic and does not depend on any CI provider.
# ============================================================

set -e

echo "Installing Synth governance hooks..."
git config core.hooksPath .githooks
echo "✅ Hooks installed from .githooks/"
echo "   Pre-commit will run: npm run govern"
