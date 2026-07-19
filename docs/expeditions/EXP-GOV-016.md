# EXP-GOV-016 — Validation Planner

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **The existing Validation Planner maps capabilities to tests, but it does not yet use governance classes, certification profiles, or produce explainable skip decisions.**

This expedition enhances the planner so it generates a minimum sound validation plan from impact, classes, dependencies, and profile rules. Every skipped validator receives a deterministic reason.

---

## Acceptance Criteria

- The planner accepts governance classes and certification profiles.
- Protected Asset changes still trigger full validation.
- Documentation-only changes run only documentation validators.
- Knowledge-only changes run only knowledge validators.
- Runtime changes run runtime and dependent validators.
- Compiler/kernel changes trigger full certification.
- The plan includes a deterministic reason for every skip.

---

## Artifacts

- `src/validation/planner.ts` — enhanced with class-aware planning and explanations.
- `scripts/governance/orchestrator.js` — planner integration for `npm run govern`.
- `tests/validation-planner.test.js` — updated with class/profile test cases.
- `tests/governance-orchestration.test.js` — end-to-end planning tests.

---

## Relationship

- Builds on `src/validation/planner.ts`.
- Feeds `EXP-GOV-017 Incremental Validator Engine`.
