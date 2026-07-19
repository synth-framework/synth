# EXP-GOV-022 — Performance Benchmarking

**Status:** Completed and accepted  
**Kind:** Engineering Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **Without measured timing, claims about incremental governance are anecdotes.**

This expedition adds performance benchmarking to the orchestrator. It captures per-check and total timing, compares against target budgets, and produces a baseline artifact so future programs can measure improvement.

---

## Acceptance Criteria

- Total validation time is captured.
- Per-check timing is captured.
- Execution time is separated from skipped-check overhead.
- Results are compared against target budgets.
- A baseline artifact is written to `proof/govern-baseline.json`.
- Benchmarks do not block validation when targets are missed.

---

## Artifacts

- `scripts/governance/benchmark.js` — timing capture and target comparison.
- `scripts/govern-profiler.js` — benchmark integration.
- `proof/govern-baseline.json` — generated baseline artifact.
- `tests/governance-orchestration.test.js` — benchmark tests.

---

## Relationship

- Builds on `scripts/govern-profiler.js` from EXP-PROGRAM-021.
- Feeds future optimization programs.
