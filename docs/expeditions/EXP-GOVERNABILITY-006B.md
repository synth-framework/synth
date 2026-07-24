# EXP-GOVERNABILITY-006B — Deterministic Governance Replay & Certification

**Status:** Completed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Authority:** Synth Architectural Constitution  
**Depends on:** EXP-GOVERNABILITY-001, EXP-GOVERNABILITY-003, EXP-PROGRAM-035, EXP-PROGRAM-036  
**Classification:** Application  
**Kernel:** Protected

---

## Mission

Independently verify that the complete governance lifecycle executes deterministically and produces reproducible evidence.

The governance engines already exist. This expedition does **not** redesign or extend them. It validates that they compose correctly end-to-end.

---

## Objective

Produce authoritative certification that the complete governance lifecycle is deterministic.

```text
Raw Intent
    ↓
Intent Model
    ↓
Alignment Contract
    ↓
Mission
    ↓
Expedition
    ↓
Implementation
    ↓
Review
    ↓
Acceptance
    ↓
Convergence
    ↓
Mission Completion
```

---

## Scope

### In scope
- Replay specifications
- Replay harness
- Replay evidence
- Regression certification
- Deterministic replay verification
- State hash verification
- Documentation

### Out of scope
- Runtime implementation
- Gate implementation
- Mission Studio
- SDK
- Kernel
- Governance redesign

---

## Architectural constraints

- Do **not** redesign governance.
- Do **not** introduce new governance concepts.
- Do **not** modify the kernel.
- Do **not** modify Mission Studio.
- Do **not** modify SDK architecture.
- Do **not** change runtime behavior unless a replay uncovers a concrete implementation defect.
- Treat runtime as the implementation under test.

If defects are discovered, document them as findings and recommend a corrective expedition.

---

## Permanent artifacts

| Artifact | Path | Purpose |
|---|---|---|
| Lifecycle Replay Specification | `docs/governance/program-027/lifecycle-replay-specification.json` | Machine-readable definition of the full-lifecycle replay graph |
| Replay Harness | `tests/governance-lifecycle-replay.test.js` | Executable certification test |
| Replay Evidence | `docs/governance/program-027/lifecycle-replay-evidence.json` | Record of three deterministic executions |
| Updated Regression Certification | `docs/governance/program-027/governability-regression-certification.json` | Integrated full-lifecycle certification result |

---

## Acceptance criteria

- [x] Happy-path replay succeeds end-to-end.
- [x] Every drift class is intercepted at the expected gate.
- [x] Recovery path (revision loop) succeeds.
- [x] Three consecutive executions produce semantically identical event logs.
- [x] Three consecutive executions produce identical derived state.
- [x] Three consecutive executions produce identical semantic state hashes.
- [x] Every failure has explainable evidence with a recommended corrective expedition.
- [x] No kernel modifications were required.

---

## Execution results

Executed `tests/governance-lifecycle-replay.test.js` on 2026-07-24.

```text
[PASS] Happy path replay is deterministic and completes Mission
[PASS] Recovery replay (revision loop) is deterministic and completes Mission
[PASS] Drift rejected at Divergence Gate is deterministic
[PASS] Convergence failure replay is deterministic and blocks Mission completion
```

Evidence: `docs/governance/program-027/lifecycle-replay-evidence.json`

---

## Findings

Two implementation defects were discovered during replay execution. Both were corrected with minimal, scope-contained runtime changes because they blocked the certification replay itself.

### Finding 1 — Review Gate could not be re-opened after RequestRevision

**Defect:** `engineOpenReviewGate` unconditionally called `beginExecution`, which requires status `proposed`. After a `revision_required` Review Gate is resolved and `RequestRevision` transitions the expedition back to `executing`, `EvaluateAndResolveReviewGate` could not open a new Review Gate for the revised implementation.

**Impact:** The recovery replay (revision loop) could not execute.

**Corrective action:** Updated `src/governance/review-gate-engine.ts` so `engineOpenReviewGate` skips `beginExecution` when the expedition is already `executing`, and rejects only unsupported statuses.

### Finding 2 — Automatic lifecycle continuation conflicted with stage-by-stage certification

**Defect:** `ExecutionGate.execute` automatically continues the lifecycle (Review → Acceptance → Convergence → Mission Complete). This caused `EvaluateAndResolveAcceptanceGate` and `CertifyConvergence` to be invoked implicitly, conflicting with the certification test's explicit, parameter-controlled stage execution.

**Impact:** Explicit certification calls failed with `ACCEPTANCE_EVALUATION_INVALID_STATE` because Acceptance Gate had already been resolved by continuation.

**Corrective action:** Updated `src/control/execution-gate.ts` to skip lifecycle continuation when `invocation.context.disableLifecycleContinuation === true`. The replay harness sets this context flag on every API call so each governance stage can be asserted independently.

---

## Coordination contract

Agent A owns runtime integration, event sequencing, enforcement, and derived state.

This expedition does **not** modify those implementations unless replay proves a concrete defect.

The replay specification is the authoritative behavioral contract. If runtime diverges from the specification:

1. Record the finding.
2. Explain the divergence.
3. Recommend the corrective action.
4. Allow Agent A to resolve the implementation.

Maintain independence between implementation and certification at all times.
