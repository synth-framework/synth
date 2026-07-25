# SYNTH Platform v1.0 Certification Evidence

This directory contains the evidence and artifacts produced by **EXP-PROGRAM-042 — Release Certification**.

## Historical record

| Artifact | Path | Purpose |
|---|---|---|
| Certification Report | `synth-platform-v1-0-certification-report.md` | Narrative record of what v1.0 is, what was certified, and what was deferred |
| Release Review Checklist | `release-review-checklist.md` | Structured checklist for the final release review |
| Reproducibility Certificate | `../../proof/certifications/reproducibility-certificate.json` | Evidence that SYNTH builds and replays deterministically from a clean clone |
| Operator Experience Certificate | `../../proof/certifications/operator-experience-certificate.json` | Evidence that a first-time operator can adopt SYNTH |
| Governance Certificate | `../../proof/certifications/governance-certificate.json` | Evidence that governance rules are enforced deterministically |
| Architecture Baseline Certificate | `../../proof/certifications/architecture-baseline-certificate.json` | Evidence that the architecture is frozen and documented |
| Release Readiness Certificate | `../../proof/certifications/release-readiness-certificate.json` | Evidence that the release package is complete |

## How to regenerate certificates

```bash
# Track A — Reproducibility
node scripts/certify-reproducibility.js

# Track B — Operator Experience
node scripts/certify-operator-experience.js

# Track C — Governance
node scripts/certify-governance.js

# Track D — Architecture Baseline
node scripts/certify-architecture-baseline.js

# Track E — Release Readiness
node scripts/certify-release-readiness.js
```

## How to run the full governance pipeline

```bash
npm run govern
```

This is the canonical validation command that must pass from a clean clone before v1.0 can ship.
