# EXP-GOV-015 — Governance Classes

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **Governance validators today are organized by capability, not by the kind of repository knowledge they validate.**

This expedition introduces governance classes: `documentation`, `knowledge`, `runtime`, `kernel`, `compiler`, `release`, and `design`. Each artifact and each validator belongs to one or more classes. This lets the orchestrator skip entire classes when no artifact in that class changed.

---

## Acceptance Criteria

- The following classes are defined and documented:
  - `documentation`
  - `knowledge`
  - `runtime`
  - `kernel`
  - `compiler`
  - `release`
  - `design`
- Every capability in the validation map is assigned to a class.
- Classes are stable and versioned.
- Class membership is deterministic.

---

## Artifacts

- `scripts/governance/governance-classes.js` — class definitions and capability mappings.
- `docs/reference/capability-validation-map.json` — updated with `governanceClass` field.
- `tests/governance-orchestration.test.js` — verifies class assignments.

---

## Relationship

- Builds on `docs/reference/capability-validation-map.json`.
- Feeds `EXP-GOV-016 Validation Planner` and `EXP-GOV-019 CI Orchestration`.
