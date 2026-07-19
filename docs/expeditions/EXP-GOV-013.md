# EXP-GOV-013 — Governed Dependency Graph

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **SYNTH already builds a dependency graph of governance checks, but the graph does not yet model artifact classes, validator subscriptions, or deterministic propagation of impact.**

This expedition introduces an artifact-to-validator dependency graph. Governance classes subscribe to validators; when an artifact class changes, the subscribed validators are invalidated.

---

## Acceptance Criteria

- The graph models artifacts, classes, validators, and edges.
- Cycle detection reports fatal dependency cycles.
- Overlapping inputs are reported as warnings.
- Global checks (no inputs) are reported as warnings.
- The graph is deterministic for the same registry state.

---

## Artifacts

- `scripts/governance/dependency-graph.js` — existing dependency graph, reused and extended.
- `scripts/governance/orchestrator.js` — consumes the graph for orchestration decisions.
- `tests/governance-orchestration.test.js` — verifies graph-driven scheduling.

---

## Relationship

- Builds on `scripts/governance/dependency-graph.js` from EXP-PROGRAM-021.
- Feeds `EXP-GOV-017 Incremental Validator Engine`.
