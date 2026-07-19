# EXP-GOV-017 — Incremental Validator Engine

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **SYNTH already schedules checks based on changed modules and cached proofs, but it does not yet integrate the validation planner's class-aware plans with the scheduler's dependency-driven execution.**

This expedition creates the incremental validator engine that ties impact analysis → validation planning → scheduling → execution → proof recording.

---

## Acceptance Criteria

- The engine consumes a validation plan and executes only planned validators.
- Execution respects validator dependencies.
- Downstream validators run when an upstream validator runs.
- Proofs are recorded for cacheable validators.
- Failures stop the pipeline deterministically.
- The engine produces a structured execution report.

---

## Artifacts

- `scripts/governance/scheduler.js` — existing scheduler, reused.
- `scripts/governance/orchestrator.js` — engine integration.
- `scripts/govern-profiler.js` — orchestrator entry point.
- `tests/governance-orchestration.test.js` — execution tests.

---

## Relationship

- Builds on `scripts/governance/scheduler.js` and `scripts/governance/incremental-engine.js` from EXP-PROGRAM-021.
- Feeds `EXP-GOV-018 Governance Cache` and `EXP-GOV-021 Validation Explanation`.
