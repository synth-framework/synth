# EXP-GOV-019 — CI Orchestration

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **CI currently runs the full governance pipeline on every pull request. Documentation-only changes should not trigger runtime integration suites.**

This expedition introduces a GitHub Actions workflow that uses the orchestrator to run only the validators required by the changed artifact classes. It preserves the same certification guarantees as a full run.

---

## Acceptance Criteria

- A documentation-only PR executes only documentation validators.
- A knowledge-only PR executes only knowledge validators.
- A runtime change executes runtime and dependent validators.
- A compiler/kernel change triggers full certification.
- The workflow produces a structured validation report artifact.
- The workflow fails when validators fail or when the plan cannot be computed.

---

## Artifacts

- `.github/workflows/synth-incremental-govern.yml` — CI workflow.
- `scripts/governance/orchestrator.js` — CI-compatible entry point.
- `tests/governance-orchestration.test.js` — CI plan tests.

---

## Relationship

- Builds on `EXP-GOV-016 Validation Planner` and `EXP-GOV-017 Incremental Validator Engine`.
- Feeds `EXP-GOV-020 Certification Profiles`.
