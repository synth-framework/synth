# EXP-REVIEW-001 — First Convergence Review of Program 043 and Program 034

> Execute the first Architectural Convergence Review under ADR-039, record the outcomes, and define the shared dependency-graph primitive that 031 and 034 will use.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-031 — Architectural Convergence  
**Authority:** ADR-039 — Architectural Convergence Review  
**Depends On:** ADR-039, EXP-PROGRAM-043, EXP-PROGRAM-034  
**Blocks:** EXP-PROGRAM-034 implementation, EXP-PROGRAM-043 Workstream F

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

ADR-039 mandates that active Programs undergo a Convergence Review before implementation continues. Program 043 has completed most of its operator-experience work and Program 034 is still in design phase. This expedition performs the first review, records the outcomes, and produces a concrete design contract for the shared dependency-graph primitive that prevents 031 and 034 from building duplicate graph engines.

## Scope

1. Review `EXP-PROGRAM-043` against the current architectural baseline.
2. Review the design of `EXP-PROGRAM-034` against the current architectural baseline.
3. Define the shared dependency-graph primitive boundary.
4. Update Program 031, 043, and 034 trackers with review outcomes.

## Out of Scope

- Modifying Protected Assets.
- Implementing the generic graph primitive module.
- Changing CI, package.json scripts, or the task engine.

## Deliverables

### 1. Convergence review record

`docs/governance/convergence-review-043-034.md` containing:

- Authority and date.
- Program summaries.
- ADR-039 questionnaire answers.
- Recorded outcomes:
  - `EXP-PROGRAM-043` → **CONVERGED** (Workstream F deferred).
  - `EXP-PROGRAM-034` → **REWRITE REQUIRED** at design level; must adopt shared graph primitive before leaving design phase.
- Required actions for each program.

### 2. Shared dependency-graph design contract

`docs/design/shared-dependency-graph.md` defining the generic DAG primitive and how 031 and 034 consume it.

### 3. Tracker updates

- `EXP-PROGRAM-031.md` — mark Active, include EXP-REVIEW-001 in composition, update milestone checklist.
- `EXP-PROGRAM-043.md` — add Convergence Review section with CONVERGED outcome and caveats.
- `EXP-PROGRAM-034.md` — add Convergence Review section with required alignment actions.

### 4. Validation test

`tests/convergence-review-043-034.test.js` verifying:

- The `REVIEW` prefix is registered.
- The review record exists and contains required sections.
- The design contract exists and defines the primitive interface.
- Program trackers reference the review record.

## Acceptance Criteria

1. `docs/expeditions/prefix-registry.json` includes a `REVIEW` prefix.
2. `docs/expeditions/EXP-REVIEW-001.md` charter exists and is registered.
3. `docs/governance/convergence-review-043-034.md` exists and answers every ADR-039 question.
4. `docs/design/shared-dependency-graph.md` exists and defines a generic DAG interface.
5. Program trackers 031, 043, and 034 reflect the review outcomes.
6. `npm run test:expedition-governance` passes.
7. `node tests/convergence-review-043-034.test.js` passes.

## Governance

### Protected

- Public vocabulary.
- Event model.
- ExecutionGate.
- Constitutional baseline.

### Not included

- New event types.
- Replay semantics changes.

## Evidence

- Review record: `docs/governance/convergence-review-043-034.md`
- Shared dependency-graph design contract: `docs/design/shared-dependency-graph.md`
- Program tracker updates:
  - `docs/expeditions/EXP-PROGRAM-031.md` — marks Program 031 Active and records EXP-REVIEW-001.
  - `docs/expeditions/EXP-PROGRAM-043.md` — records CONVERGED outcome for EXP-REVIEW-001.
  - `docs/expeditions/EXP-PROGRAM-034.md` — records REWRITE REQUIRED outcome and alignment actions for EXP-REVIEW-001.
- Validation test: `tests/convergence-review-043-034.test.js`

## Related Documents

- `docs/adr/ADR-039-architectural-convergence-review.md`
- `docs/expeditions/EXP-PROGRAM-031.md`
- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-PROGRAM-034.md`
- `docs/design/shared-dependency-graph.md`
