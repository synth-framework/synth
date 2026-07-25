#!/usr/bin/env bash
# ============================================================
# SYNTH Platform v1.0 — Clean-Clone Validation
# ============================================================
# Validates that SYNTH builds, tests, governs, and certifies
# correctly from a fresh clone with no local state.
#
# Usage:
#   bash scripts/validate-clean-clone.sh [REF]
#
# REF defaults to the current HEAD of origin/main. Pass a tag such
# as v1.0.0 to validate a specific release.
#
# Note: the full governance pipeline (step 8) can take 30+ minutes.
# Run this in a shell/CI session that will not time out.
# ============================================================

set -euo pipefail

REF="${1:-origin/main}"
REPO_URL=$(git remote get-url origin)
WORK_DIR=$(mktemp -d)
CLONE_DIR="${WORK_DIR}/synth"

echo "═══════════════════════════════════════════════════"
echo "  SYNTH Platform v1.0 — Clean-Clone Validation"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Repository: ${REPO_URL}"
echo "  Ref:        ${REF}"
echo "  Work dir:   ${WORK_DIR}"
echo ""

# --- Clone --------------------------------------------------------------------
echo "[1/9] Cloning repository into a clean directory..."
git clone "${REPO_URL}" "${CLONE_DIR}"
cd "${CLONE_DIR}"

if ! git rev-parse --verify --quiet "${REF}" >/dev/null; then
  echo ""
  echo "  ❌ Ref '${REF}' was not found in the cloned repository."
  echo "     If you are validating before the v1.0.0 tag exists, run again with a"
  echo "     branch or commit, for example: bash scripts/validate-clean-clone.sh origin/main"
  echo ""
  exit 1
fi

git checkout "${REF}"

# --- Environment checks -------------------------------------------------------
echo "[2/9] Verifying environment..."
node --version

# --- Manifest integrity -------------------------------------------------------
echo "[3/9] Verifying platform manifest..."
MANIFEST="docs/certifications/synth-platform-v1-0-manifest.json"
if [[ ! -f "${MANIFEST}" ]]; then
  echo "  ❌ Manifest not found: ${MANIFEST}"
  exit 1
fi

MANIFEST_COMMIT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('${MANIFEST}', 'utf8')).gitCommitSha)")
if git merge-base --is-ancestor "${MANIFEST_COMMIT}" HEAD; then
  echo "  ✅ Manifest source commit (${MANIFEST_COMMIT}) is an ancestor of the release commit."
else
  echo "  ❌ Manifest source commit (${MANIFEST_COMMIT}) is not an ancestor of the release commit."
  exit 1
fi

# Save committed manifest for comparison
cp "${MANIFEST}" "${WORK_DIR}/manifest-committed.json"

# --- Dependencies & build -----------------------------------------------------
echo "[4/9] Installing dependencies..."
npm ci

echo "[5/9] Building..."
npm run build

# --- Regenerate manifest and compare deterministic fields ---------------------
echo "[6/9] Regenerating manifest and comparing deterministic fields..."
node scripts/generate-platform-manifest.js >/dev/null

node -e "
const fs = require('fs');
const strip = (p) => {
  const o = JSON.parse(fs.readFileSync(p, 'utf8'));
  delete o.gitCommitSha;
  delete o.gitDescribe;
  delete o.generatedAt;
  delete o.releaseDate;
  delete o.repositoryClean;
  delete o.repositoryModifications;
  return JSON.stringify(o, Object.keys(o).sort(), 2);
};
const a = strip('${WORK_DIR}/manifest-committed.json');
const b = strip('${MANIFEST}');
if (a !== b) {
  console.error('❌ Regenerated manifest does not match committed manifest (excluding volatile fields).');
  process.exit(1);
}
console.log('✅ Deterministic manifest fields match.');
"

# --- Core tests ---------------------------------------------------------------
echo "[7/9] Running core test suite..."
npm test

# --- Full governance pipeline -------------------------------------------------
echo "[8/9] Running full governance pipeline..."
npm run govern

# --- Certification tracks -----------------------------------------------------
echo "[9/9] Running certification tracks..."
node scripts/certify-reproducibility.js
node scripts/certify-operator-experience.js
node scripts/certify-governance.js
node scripts/certify-architecture-baseline.js
node scripts/certify-release-readiness.js

node -e "
const fs = require('fs');
const certs = [
  'proof/certifications/reproducibility-certificate.json',
  'proof/certifications/operator-experience-certificate.json',
  'proof/certifications/governance-certificate.json',
  'proof/certifications/architecture-baseline-certificate.json',
  'proof/certifications/release-readiness-certificate.json',
];
let ok = true;
for (const c of certs) {
  const data = JSON.parse(fs.readFileSync(c, 'utf8'));
  if (data.certified !== true) {
    console.error('❌ Certificate not certified:', c);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('✅ All five certification tracks report certified: true.');
"

# --- Summary ------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Clean-clone validation PASSED"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Clone:  ${CLONE_DIR}"
echo "  Commit: $(git rev-parse HEAD)"
echo ""
echo "  The release candidate is reproducible from a clean clone."
echo ""
