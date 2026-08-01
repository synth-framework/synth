# EXP-REVIEW-003 — Third Convergence Review of Program 043

> Re-evaluate `EXP-PROGRAM-043 — Agent Onboarding & Operator Experience` under ADR-039 after Workstreams A–E merged and `EXP-PROGRAM-034` reached implementation phase.

**Status:** Proposed  
**Kind:** Review Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-031 — Architectural Convergence  
**Authority:** ADR-039 — Architectural Convergence Review  
**Depends On:** EXP-REVIEW-001, EXP-REVIEW-002, EXP-PROGRAM-043 Workstreams A–E, EXP-PROGRAM-034 TASK-007  
**Blocks:** EXP-PROGRAM-043 Phase 3 (task-engine migration), EXP-PROGRAM-043 Workstream F

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`EXP-PROGRAM-043` received **CONVERGED** in `EXP-REVIEW-001` with Workstream F deferred. Since then:

1. Workstreams A–E have merged and have passing tests.
2. `EXP-PROGRAM-034` has left design phase and implemented the canonical task engine through `EXP-TASK-007` (CI Orchestration Adapter).
3. The original sequencing assumed 043 would migrate its onboarding flow to the 034 task engine only after 034 "lands."

This expedition executes the third Convergence Review and records whether 043 remains converged now that the task engine is operational, and what boundary conditions govern its Phase 3 migration and Workstream F implementation.

---

## Scope

Review the current state of `EXP-PROGRAM-043` only. Do not review `EXP-PROGRAM-034` implementation details beyond the task engine's public surface (`synth task run`, `synth task list`, `synth task explain`, `synth task doctor`).

---

## Review Questions (ADR-039)

1. Is the program charter still valid given the TaskPRO evidence?
2. Are the success criteria still correct and testable?
3. Has `EXP-PROGRAM-034` superseded or duplicated any 043 workstreams?
4. Do the remaining expeditions (`EXP-IDENTITY-001`, `EXP-SIGN-001`, `EXP-APPROVAL-001`, `EXP-GIT-001`) still represent the preferred implementation?
5. Should any completed expeditions be rewritten to consume the 034 task engine?
6. Should any expeditions move to another program?
7. Should the program be archived?

---

## Evidence

- `docs/expeditions/EXP-PROGRAM-043.md` — program charter and workstream status.
- `docs/expeditions/EXP-ONBOARD-001.md` — guided first-contact implementation.
- `docs/expeditions/EXP-CLI-002.md`, `EXP-CLI-003.md` — human-readable output and list commands.
- `docs/expeditions/EXP-EXPLAIN-001.md` — actionable status explanation.
- `docs/expeditions/EXP-DRYRUN-001.md` — pre-flight dry-run.
- `docs/expeditions/EXP-GUARD-001.md`, `EXP-SCOPE-001.md`, `EXP-GATE-014.md` — guardrails and gates.
- `docs/expeditions/EXP-CAPTRANS-001.md`, `EXP-CAPTRANS-002.md`, `EXP-ADP-001.md` — capability transparency.
- `docs/expeditions/EXP-EVIDENCE-001.md`, `EXP-EVENTLOG-001.md`, `EXP-AGENTS-001.md` — evidence tooling.
- `docs/expeditions/EXP-PROGRAM-034.md` — task engine program tracker.
- `docs/expeditions/EXP-TASK-006.md` — CI orchestration adapter charter.
- `src/task/task-schema.ts`, `src/task/task-registry.ts`, `src/task/task-graph.ts`, `src/cli/task.ts` — task engine implementation.
- `tests/task-ci-adapter.test.js` — proof that CI invokes the task engine directly.

---

## Expected Outcome

**CONVERGED**, contingent on:

- Workstreams A–E remain aligned with the current architecture.
- No duplicate task engine or graph engine is introduced by 043.
- Phase 3 migration to the 034 task engine is explicitly planned as a new charter rather than ad hoc code changes.
- Workstream F expeditions are approved individually before implementation if they touch Protected Assets or the event model.

If the review finds that 043 is rebuilding task-engine or graph-engine infrastructure, the outcome is **REWRITE REQUIRED**.

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-PROGRAM-031 — Architectural Convergence](EXP-PROGRAM-031.md)
- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-REVIEW-001 — First Convergence Review of Program 043 and Program 034](../governance/convergence-review-043-034.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
- [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)
