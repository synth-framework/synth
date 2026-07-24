# Constitutional Simplification Review

> **Temporary analysis task.** No implementation. No new artifacts. No new runtime.
>
> Goal: identify which existing governance concepts are essential, which are projections, and which can be collapsed.

---

## 1. Current lifecycle diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                          GENESIS                                  │
│                                                                   │
│   Raw Intent                                                      │
│      │                                                            │
│      ▼                                                            │
│   Intent Model                                                      │
│      │                                                            │
│      ▼                                                            │
│   Refinement Session                                                │
│      │                                                            │
│      ▼                                                            │
│   Refinement Report                                                 │
│      │                                                            │
│      ▼                                                            │
│   Alignment Contract                                                │
│      │                                                            │
│      ▼                                                            │
│   Divergence Gate                                                   │
│      │                                                            │
│      ▼                                                            │
│   Mission Projection                                                │
│      │                                                            │
│      ▼                                                            │
│   Projection Certification                                          │
│      │                                                            │
│      ▼                                                            │
│   Mission Created                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SYNTHESIS                                 │
│                                                                   │
│   Mission                                                         │
│      │                                                            │
│      ▼                                                            │
│   Refined Intent (per expedition)                                 │
│      │                                                            │
│      ▼                                                            │
│   Expedition Created                                              │
│      │                                                            │
│      ▼                                                            │
│   Implementation                                                  │
│      │                                                            │
│      ▼                                                            │
│   Implementation Complete                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         EXECUTION                                 │
│                                                                   │
│   Review Gate                                                     │
│      │                                                            │
│      ▼                                                            │
│   Acceptance Gate                                                 │
│      │                                                            │
│      ▼                                                            │
│   Convergence Check                                               │
│      │                                                            │
│      ▼                                                            │
│   Closed                                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Observations

- Genesis contains **five** sequential artifacts before Mission creation.
- Synthesis contains a second, expedition-scoped `RefinedIntent` that overlaps with the Genesis intent work.
- Execution contains **three** gates after implementation.
- The same concern—"did we understand correctly?"—appears in Refinement Report, Alignment Contract, Divergence Gate, and Projection Certification.
- The same concern—"did we build correctly?"—appears in Review Gate and Acceptance Gate.

---

## 2. Artifact dependency graph

```text
Raw Intent
  │
  ▼
IntentModel ──────┬──► RefinementSession
  │               │
  │               ▼
  │         RefinementReport
  │               │
  │               ▼
  │         AlignmentContract ◄──── ReferenceEvidence
  │               │
  │               ▼
  │         DivergenceGate ────► DivergenceReport
  │               │
  │               ▼
  │         MissionProjectionPackage
  │               │
  │               ▼
  │         ProjectionCertification
  │               │
  ▼               ▼
Mission ◄─────────────────────────────┘
  │
  ▼
Expedition ◄──── RefinedIntent
  │
  ▼
ImplementationEvidence
  │
  ▼
ReviewGatePackage ◄──── ReviewDecision ◄──── RevisionRequest
  │
  ▼
AcceptanceGatePackage ◄──── AcceptanceRecord
  │
  ▼
ConvergenceReport (proposed)
  │
  ▼
Closed
```

### Coupling analysis

| Artifact | Incoming dependencies | Outgoing dependencies | Projection? |
|---|---|---|---|
| IntentModel | Raw Intent | RefinementSession, AlignmentContract | No — primary capture |
| RefinementSession | IntentModel | RefinementReport | Yes — from questions/answers |
| RefinementReport | RefinementSession, IntentModel | AlignmentContract | Yes — from session + model |
| AlignmentContract | RefinementReport, IntentModel, ReferenceEvidence | DivergenceGate, MissionProjection | No — human-approved authorization |
| DivergenceReport | AlignmentContract, IntentModel | MissionProjection | Yes — from gate resolution |
| MissionProjectionPackage | AlignmentContract, IntentModel, RefinementReport | Mission | Yes — pure projection |
| ProjectionCertification | MissionProjectionPackage | Mission | Yes — from completeness checks |
| Mission | ProjectionCertification | Expedition | Partial — derived but authorized |
| RefinedIntent | Mission | ReviewGatePackage | Yes — could derive from Mission |
| ReviewGatePackage | RefinedIntent, ImplementationEvidence | ReviewDecision | Yes — bundle for review |
| ReviewDecision | ReviewGatePackage | AcceptanceGate | Yes — from gate resolution |
| RevisionRequest | ReviewDecision | Implementation | Yes — from review feedback |
| AcceptanceGatePackage | ReviewDecision | AcceptanceRecord | Yes — bundle for acceptance |
| AcceptanceRecord | AcceptanceGatePackage | Closed | Yes — from gate resolution |
| ConvergenceReport | All upstream artifacts | Closed | Yes — end-to-end audit |

**Projection-heavy path:** more than half the artifacts are derivable from earlier artifacts and events.

---

## 3. Gate inventory

| Gate | Purpose | Failure mode prevented | Satisfier | Unique? |
|---|---|---|---|---|
| Refinement Gate | Approve Refined Intent | Executing against unrefined intent | Human / AI / Automatic | Partially overlaps Divergence Gate |
| Divergence Gate | Confirm Alignment Contract matches intent | Mission creation from misaligned contract | Human / AI / Automatic | **Yes** — unique Genesis/Synthesis checkpoint |
| Projection Certification Gate | Verify projected Mission is complete and faithful | Mission with missing objectives or weakened constraints | Automatic / AI | **Yes** — automatic verification |
| Mission Approval Gate | Authorize projected Mission | Active Mission not reviewed | Human / AI / Automatic | Partially overlaps Intent Contract approval |
| Review Gate | Review implementation against Refined Intent | Unreviewed work accepted | Human / AI / Automatic | Partially overlaps Acceptance Gate |
| Acceptance Gate | Final go/no-go after review | Work accepted without stakeholder sign-off | Human / AI / Automatic | Partially overlaps Review Gate |
| Convergence Gate (proposed) | Verify final outcome converges with original intent | Long-term drift from intent | Human / AI / Automatic | **Yes** — end-to-end |

### Consolidation candidates

| Gate | Could merge into | Reason |
|---|---|---|
| Refinement Gate | Intent Approval | Both approve understanding before synthesis |
| Divergence Gate | Intent Approval | Same boundary, different granularity |
| Mission Approval Gate | Intent Approval | Authorizes the same intent to enter synthesis |
| Review Gate | Implementation Review | Distinct from final acceptance but similar concern |
| Acceptance Gate | Completion Acceptance | Final authorization |
| Convergence Gate | Completion Acceptance | Post-acceptance verification |

Potential minimal set: **Intent Approval**, **Implementation Review**, **Completion Acceptance**.

---

## 4. Proposed simplified lifecycle

### Public vocabulary

```text
GENESIS
  "Do we understand what should be built?"

  Intent
    ↓
  Refined Intent
    ↓
  Intent Contract

SYNTHESIS
  "Do we know how to build it?"

  Mission
    ↓
  Expeditions

EXECUTION
  "Did we build what we agreed?"

  Evidence
    ↓
  Review
    ↓
  Acceptance
```

### What becomes internal

| Current public concept | Simplified role |
|---|---|
| RefinementSession | Internal derivation of RefinedIntent |
| RefinementReport | Internal approval record of RefinedIntent |
| AlignmentContract | Becomes **IntentContract** — the public boundary artifact |
| DivergenceGate | Internal certification step inside IntentContract approval |
| DivergenceReport | Internal audit record |
| MissionProjectionPackage | Internal derivation record of Mission |
| ProjectionCertification | Internal verification step |
| RefinedIntent (expedition) | Internal to Expedition or derived from Mission |
| ReviewGatePackage | Internal bundle inside Review |
| ReviewDecision | Internal record inside Review |
| RevisionRequest | Internal feedback inside Review |
| AcceptanceGatePackage | Internal bundle inside Acceptance |
| AcceptanceRecord | Internal record inside Acceptance |
| ConvergenceReport | Internal to Acceptance or post-Acceptance check |

### Single question per layer

| Layer | Question |
|---|---|
| Genesis | Do we understand what should be built? |
| Synthesis | Do we know how to build it? |
| Execution | Did we build what we agreed? |

---

## 5. Migration impact on existing programs

### EXP-PROGRAM-035 — Intent Refinement & Review Governance

**Impact:** High conceptual, low implementation.

- Review Gate and Acceptance Gate would remain internally but be exposed publicly as `Review` and `Acceptance`.
- Expedition files would stop referencing `ReviewGatePackage`, `ReviewDecision`, `AcceptanceGatePackage`, `AcceptanceRecord` as public artifacts.
- Events do not need to change.
- Tests do not need to change.

### EXP-PROGRAM-036 — Intent Refinement & Alignment Governance

**Impact:** High conceptual, medium implementation.

- `AlignmentContract` should be renamed/rebranded to `IntentContract` in public vocabulary.
- `RefinementSession` and `RefinementReport` remain internal but are no longer public concepts.
- `DivergenceGate` and `DivergenceReport` become internal certification of the `IntentContract`.
- CLI commands `synth intent`, `synth alignment` should be unified under a single Genesis vocabulary.
- Expedition files EXP-REFINE-001 through EXP-REFINE-012 would be reframed as internal capabilities, not user-facing programs.

### EXP-PROGRAM-027 — Mission Studio Homepage

**Impact:** Medium.

- EXP-HOME-026 and EXP-HOME-027 already produce the approved `IntentContract` (currently called AlignmentContract).
- EXP-HOME-028 should consume the canonical Mission projection internally; `MissionProjectionPackage` becomes an internal artifact.
- The homepage UI should use the simplified public vocabulary: Intent → Refined Intent → Intent Contract → Mission → Expedition → Evidence → Review → Acceptance.
- The proposed `Governance Inspector` (EXP-HOME-035) would visualize the simplified chain rather than the current 10+ artifacts.

### EXP-REFINE-013 / EXP-REFINE-014

**Impact:** Low.

- Mission Projection specification and capability remain correct.
- They simply become internal implementation details of Mission creation, not public concepts.
- No code changes required beyond documentation and CLI vocabulary.

---

## 6. Open questions

1. **Refined Intent vs. Intent Contract:** Do we need both? If both approve understanding, can `Refined Intent` approval serve as the `Intent Contract`?
2. **Mission Approval:** If `IntentContract` is approved, is a separate `Mission Approval` gate redundant?
3. **Review vs. Acceptance:** Can these collapse into one `Completion Acceptance` step, or does the two-step separation prevent a real failure mode?
4. **Convergence Gate:** Is end-to-end verification a separate public step, or part of Acceptance?
5. **Reference Evidence:** Should evidence remain a public concept, or be entirely internal to the artifacts that reference it?

---

## 7. Recommendation

The current architecture can support the simplified model. The change is primarily a **vocabulary and visibility refactor**, not a runtime rewrite.

Next step: decide whether to adopt the simplification via an ADR, then update public documentation, CLI commands, and expedition files before touching internal types or events.
