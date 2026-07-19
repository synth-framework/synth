# EXP-GOV-021 — Validation Explanation

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **A skipped validator without a reason erodes trust in incremental governance.**

This expedition makes every skip decision explainable. Operators and CI systems can request a deterministic reason for each skipped validator through `synth govern --explain` and `synth validate --explain`.

---

## Acceptance Criteria

- Every skipped validator has a deterministic reason.
- Reasons include: cache hit, no affected class, no affected capability, upstream dependency unchanged, profile exclusion, non-cacheable, version mismatch, corrupt proof.
- Explanations are available in structured JSON output.
- Explanations are stable across repeated runs for the same inputs.

---

## Artifacts

- `scripts/governance/explain.js` — reason formatting.
- `scripts/governance/orchestrator.js` — explanation generation.
- `src/cli/synth.ts` — `--explain` support for `synth govern` and `synth validate`.
- `tests/synth-cli-govern-explain.test.js` — CLI explanation tests.

---

## Relationship

- Builds on `EXP-GOV-016 Validation Planner` and `EXP-GOV-017 Incremental Validator Engine`.
- Feeds `EXP-GOV-019 CI Orchestration`.
