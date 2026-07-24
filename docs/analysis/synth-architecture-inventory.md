# SYNTH Architecture Inventory

> Comprehensive analysis of the current canonical lifecycle, artifacts, state machines, module dependencies, and first-time user journey.
>
> No implementation. No proposed changes. Current truth only.

---

## 1. Current canonical lifecycle: user input to completed execution

### Full current flow

```text
USER INPUT
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. GENESIS                                                          │
│    Mandatory: yes                                                   │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
Intent Capture
    │ event: INTENT_CAPTURED (not yet implemented as a concrete type)
    │
    ▼
Intent Model
    │ event: INTENT_MODEL_CREATED
    │ state: IntentModelState
    │ mandatory: yes
    │
    ▼
Refinement Session
    │ event: REFINEMENT_SESSION_STARTED
    │ state: RefinementSessionState
    │ mandatory: no — intent model can be approved without refinement
    │
    ▼
Refinement Report
    │ event: REFINEMENT_REPORT_CREATED
    │ state: RefinementReportState
    │ mandatory: yes — required by Mission Projection
    │
    ▼
Refinement Report Approval
    │ event: REFINEMENT_REPORT_APPROVED
    │ mandatory: yes — required to create Alignment Contract
    │
    ▼
Alignment Contract
    │ event: ALIGNMENT_CONTRACT_CREATED
    │ state: AlignmentContractState
    │ mandatory: yes — Genesis/Synthesis boundary
    │
    ▼
Alignment Contract Submission
    │ event: ALIGNMENT_CONTRACT_SUBMITTED
    │ mandatory: yes — required before approval
    │
    ▼
Alignment Contract Approval
    │ event: ALIGNMENT_CONTRACT_APPROVED
    │ mandatory: yes — required before Divergence Gate
    │
    ▼
Divergence Gate
    │ event: DIVERGENCE_GATE_OPENED, DIVERGENCE_GATE_RESOLVED
    │ state: DivergenceGateState
    │ mandatory: yes — required before Mission Projection
    │
    ▼
Mission Projection
    │ event: MISSION_PROJECTED
    │ artifact: MissionProjectionPackage
    │ mandatory: yes — required before Mission creation
    │
    ▼
Projection Certification
    │ event: PROJECTION_CERTIFIED or PROJECTION_CERTIFICATION_FAILED
    │ mandatory: yes — Mission created only on passed certification
    │
    ▼
Mission Created
    │ event: MISSION_CREATED
    │ state: Mission
    │ mandatory: yes
    │
    ▼
Mission Approval
    │ event: MISSION_APPROVED
    │ mandatory: no — Mission can exist in draft
    │
┌─────────────────────────────────────────────────────────────────────┐
│ 2. SYNTHESIS                                                        │
│    Mandatory: yes                                                   │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
Expedition Created
    │ event: EXPEDITION_CREATED
    │ state: Expedition
    │ mandatory: yes
    │
    ▼
Expedition Approved
    │ event: EXPEDITION_APPROVED
    │ mandatory: no — can proceed through other statuses
    │
    ▼
Expedition Committed
    │ event: EXPEDITION_COMMITTED
    │ mandatory: no
    │
    ▼
Expedition Started
    │ event: EXPEDITION_STARTED
    │ mandatory: yes — before implementation
    │
    ▼
Implementation
    │ artifact: ImplementationEvidence (referenced, not a concrete type)
    │ mandatory: yes
    │
    ▼
Implementation Complete
    │ event: IMPLEMENTATION_COMPLETED (referenced in ADR, not in event.ts)
    │ mandatory: yes — before Review Gate
    │
┌─────────────────────────────────────────────────────────────────────┐
│ 3. EXECUTION / GOVERNANCE                                           │
│    Mandatory: yes                                                   │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
Review Gate Opened
    │ event: REVIEW_GATE_OPENED
    │ artifact: ReviewGatePackage
    │ mandatory: yes — required before acceptance
    │
    ▼
Review Gate Resolved
    │ event: REVIEW_GATE_RESOLVED
    │ artifact: ReviewDecision
    │ mandatory: yes
    │
    ▼
Revision Requested (optional branch)
    │ event: REVISION_REQUESTED
    │ artifact: RevisionRequest
    │ mandatory: no
    │
    ▼
Acceptance Gate Opened
    │ event: ACCEPTANCE_GATE_OPENED
    │ artifact: AcceptanceGatePackage
    │ mandatory: yes — required before closing
    │
    ▼
Acceptance Gate Resolved
    │ event: ACCEPTANCE_GATE_RESOLVED
    │ artifact: AcceptanceRecord
    │ mandatory: yes
    │
    ▼
Convergence Check (proposed)
    │ artifact: ConvergenceReport (not implemented)
    │ mandatory: no
    │
    ▼
Expedition Closed
    │ event: EXPEDITION_CLOSED
    │ mandatory: yes — terminal state
```

### Answer to the core question

The actual flow is **not**:

```text
Intent → Refinement → Alignment → Mission → Expedition → Execution
```

The actual flow is:

```text
Intent → Intent Model → Refinement Session → Refinement Report → Approval
  → Alignment Contract → Mission Projection → Projection Certification
  → Mission → Mission Approval → Expeditions → Review Gates → Acceptance
  → Convergence Check → Closed
```

That is the second, more complex product.

---

## 2. Artifact inventory

| Artifact | Purpose | Producer | Consumer | User-facing | Needed? |
|---|---|---|---|---|---|
| **Intent Capture** | Record raw user input | Operator | Intent Model | Implicit | Yes — starting point |
| **IntentModel** | Structured interpretation of intent | `CreateIntentModel` | Refinement, Alignment Contract, Mission Projection | **Yes** | Yes — first structured artifact |
| **RefinementQuestion** | Clarification question | Refinement Layer | Operator, Refinement Session | **Yes** | Yes — drives questioning |
| **RefinementSession** | Track question/answer loop | `StartRefinementSession` | Refinement Report | No | Maybe — could be projection |
| **RefinementReport** | Record of refinement outcome | `CreateRefinementReport` | Alignment Contract, Mission Projection | **Yes** | Maybe — audit/provenance artifact |
| **ReferenceEvidence** | URI/hash binding to external artifact | `CreateReferenceEvidence` | Intent Model, Alignment Contract, Review Package | **Yes** | Yes — traceability |
| **AlignmentContract** | Formal agreement of allowed/forbidden interpretations | `CreateAlignmentContract` | Divergence Gate, Mission Projection | **Yes** | Yes — authorization boundary |
| **DivergenceGate** | Pre-Mission alignment checkpoint | `OpenDivergenceGate` | Mission Projection | Partial | Maybe — could be internal certification |
| **DivergenceReport** | Divergence analysis and decision | `ResolveDivergenceGate` | Replay, audit | Partial | Maybe — audit artifact |
| **MissionProjectionPackage** | Complete projection record | `ProjectMission` | Mission creation, homepage | Partial | Maybe — derivation proof |
| **ProjectionCertification** | Verification of projection completeness | `ProjectMission` | Mission creation | No | Yes — correctness check |
| **Mission** | Long-term strategic direction and expedition container | `ProjectMission` / `CreateMission` | Expeditions, Mission Studio | **Yes** | Yes |
| **MissionDraft** | Proposed Mission (referenced in ADR) | — | Mission Approval | No | Not implemented |
| **RefinedIntent** | Per-expedition contract | `ApproveRefinedIntent` | Review Gate Expedition | **Yes** | Maybe — could derive from Mission |
| **ReviewGatePackage** | Bundle under review | `OpenReviewGate` | Review Gate satisfier | No | Maybe — internal bundle |
| **ReviewDecision** | Record of review outcome | `ResolveReviewGate` | Acceptance Gate, replay | **Yes** | Maybe — could be internal to Review |
| **RevisionRequest** | Structured feedback for changes | `RequestRevision` | Implementer | **Yes** | Maybe — could be internal |
| **AcceptanceGatePackage** | Final sign-off bundle | `OpenAcceptanceGate` | Acceptance Gate satisfier | No | Maybe — internal bundle |
| **AcceptanceRecord** | Proof of final acceptance | `ResolveAcceptanceGate` | Replay, closing | **Yes** | Maybe — could be internal to Acceptance |
| **ConvergenceReport** | End-to-end intent verification | — | — | Proposed | Not implemented |

### Duplicates and near-duplicates

| Group | Artifacts | Overlap |
|---|---|---|
| Intent understanding | IntentModel, RefinementReport, AlignmentContract | All express what was understood |
| Authorization boundary | RefinementReport approval, AlignmentContract approval, DivergenceGate | All approve intent before synthesis |
| Mission derivation | AlignmentContract, MissionProjectionPackage, Mission | Package is derived; Mission is derived |
| Per-expedition contract | RefinedIntent, Mission | RefinedIntent could derive from Mission |
| Final approval | ReviewDecision, AcceptanceRecord | Both are gate resolutions |

---

## 3. State machine diagrams

### A. Intent lifecycle

Current state type: `IntentModelState.status` is a plain `string`.
Observed transitions from events:

```text
draft / created
    │
    ├── INTENT_MODEL_REVISED ──────► revised
    │
    ├── INTENT_MODEL_SUBMITTED ────► submitted
    │
    ├── REFINEMENT_REPORT_APPROVED ─► approved_for_alignment
    │
    ├── REFINEMENT_REPORT_REJECTED ─► revision_required
    │
    └── INTENT_MODEL_SUPERSEDED ───► superseded
```

**Note:** There is no formal `IntentModelStatus` state machine enforced beyond event-driven status updates.

### B. Mission lifecycle

```text
projected
    │
    ▼
draft
    │
    ├── MISSION_APPROVED ──────────► active
    │
    ├── MISSION_COMPLETED ─────────► completed
    │
    └── MISSION_ARCHIVED ──────────► archived
```

**Projection sub-state:**

```text
projected
    │
    ├── PROJECTION_CERTIFIED ──────► certified
    │
    └── PROJECTION_CERTIFICATION_FAILED ──► failed
```

### C. Expedition lifecycle

```text
draft
    │
    ├── EXPEDITION_APPROVED ───────► approved
    │
    ├── EXPEDITION_COMMITTED ──────► committed
    │
    ├── EXPEDITION_STARTED ────────► executing
    │
    ├── EXPEDITION_COMPLETED ──────► completed
    │
    └── (implicit cancel) ─────────► cancelled
```

### D. Review-gate expedition lifecycle

```text
proposed
    │
    ▼
executing
    │
    ▼
implementation_complete
    │
    ▼
awaiting_review
    │
    ├── REVIEW_GATE_RESOLVED approve ────► approved
    │
    ├── REVIEW_GATE_RESOLVED revision ───► revision_requested
    │
    ├── REVIEW_GATE_RESOLVED reject ─────► rejected
    │
    ├── REVIEW_GATE_RESOLVED supersede ──► proposed (new expedition)
    │
    ├── REVIEW_GATE_RESOLVED split ──────► proposed (multiple)
    │
    └── REVIEW_GATE_RESOLVED merge ──────► proposed (merged)

approved
    │
    ▼
awaiting_acceptance
    │
    ├── ACCEPTANCE_GATE_RESOLVED accepted ──► accepted
    │
    └── ACCEPTANCE_GATE_RESOLVED rejected ──► rejected

accepted
    │
    ▼
closed
```

### E. Divergence Gate lifecycle

```text
draft
    │
    ▼
awaiting_alignment
    │
    ├── DIVERGENCE_GATE_RESOLVED aligned ─────────► aligned
    │
    ├── DIVERGENCE_GATE_RESOLVED revision_required ─► revision_required
    │
    ├── DIVERGENCE_GATE_RESOLVED rejected ────────► rejected
    │
    └── DIVERGENCE_GATE_RESOLVED superseded ──────► superseded
```

### F. Refinement Session lifecycle

```text
active
    │
    ├── REFINEMENT_QUESTION_ANSWERED, confidence < 0.8, questions remain ──► clarifying
    │
    ├── REFINEMENT_QUESTION_ANSWERED, confidence >= 0.8 ────────────────────► sufficient
    │
    ├── REFINEMENT_QUESTION_ANSWERED, no questions, confidence < 0.8 ───────► insufficient
    │
    └── superseded ─────────────────────────────────────────────────────────► superseded
```

### G. Alignment Contract lifecycle

```text
draft
    │
    ▼
awaiting_review
    │
    ├── ALIGNMENT_CONTRACT_APPROVED ───► approved
    │
    ├── ALIGNMENT_CONTRACT_REJECTED ───► rejected
    │
    └── ALIGNMENT_CONTRACT_SUPERSEDED ─► superseded
```

### Overlap concern

There are **at least 7 separate state machines**:

1. IntentModel
2. RefinementSession
3. AlignmentContract
4. DivergenceGate
5. Mission
6. Expedition
7. ReviewGateExpedition

They share concepts (`approved`, `rejected`, `revision_required`) but are not unified. A universal pattern like:

```text
Draft → Reviewed → Approved → Active → Complete
```

could potentially replace several of them.

---

## 4. Dependency graph between governance modules

### Direct imports

```text
domain/execution.ts
    ├── governance/review-gate-engine.ts
    ├── governance/review-gates.ts
    ├── governance/intent-model.ts
    ├── governance/refinement-layer.ts
    ├── governance/refinement-report.ts
    ├── governance/alignment-contract.ts
    ├── governance/reference-evidence.ts
    ├── governance/divergence-gate.ts
    └── governance/project-mission.ts

governance/alignment-contract.ts
    ├── governance/review-gates.ts
    └── governance/intent-model.ts

governance/project-mission.ts
    ├── governance/alignment-contract.ts
    ├── governance/intent-model.ts
    └── governance/refinement-report.ts

governance/refinement-report.ts
    ├── governance/intent-model.ts
    └── governance/refinement-layer.ts

governance/refinement-layer.ts
    └── governance/intent-model.ts

governance/divergence-gate.ts
    └── governance/review-gates.ts

governance/review-gate-engine.ts
    └── governance/review-gates.ts

governance/reference-evidence.ts
    └── (none)
```

### Conceptual dependency graph

```text
intent-model
    │
    ├──► refinement-layer
    │       │
    │       └──► refinement-report
    │               │
    │               └──► alignment-contract
    │                       │
    │                       ├──► divergence-gate
    │                       │       │
    │                       │       └── (audit only)
    │                       │
    │                       └──► project-mission
    │                               │
    │                               ├──► mission
    │                               │
    │                               └── (projection package, certification)
    │
    └──► review-gates
            │
            ├──► review-gate-engine
            │       │
            │       └──► (gates, packages, decisions)
            │
            └──► divergence-gate
```

### Circular dependencies

No direct circular imports were found in the module graph.

However, there is a **conceptual cycle**:

```text
Mission depends on AlignmentContract (via projection)
    │
    └── Expedition depends on RefinedIntent
            │
            └── RefinedIntent is conceptually a slice of Mission intent
```

And a **duplication cycle** in intent representation:

```text
IntentModel ──► RefinementReport ──► AlignmentContract ──► Mission
                                              │              │
                                              └──────────────┘
                        (Mission is a projection of AlignmentContract,
                         but AlignmentContract is itself a projection
                         of IntentModel + RefinementReport)
```

### Duplicated responsibilities

| Responsibility | Current holders | Suggested single owner |
|---|---|---|
| Intent understanding | IntentModel, RefinementReport, AlignmentContract | IntentContract |
| Intent approval | RefinementReport approval, AlignmentContract approval, DivergenceGate | Intent Approval boundary |
| Mission derivation | AlignmentContract, MissionProjectionPackage | Mission projection (internal) |
| Per-expedition contract | RefinedIntent, Mission | Mission |
| Final authorization | ReviewDecision, AcceptanceRecord | Acceptance |

---

## 5. First-time user journey

### Current experience

A new user must understand these concepts before creating something:

```text
1. Intent Model
2. Refinement Session
3. Refinement Report
4. Alignment Contract
5. Divergence Gate
6. Mission Projection
7. Projection Certification
8. Mission
9. Mission Approval
10. Expedition
11. Refined Intent
12. Review Gate
13. Acceptance Gate
14. Evidence / Convergence
```

That is approximately **14 concepts**.

### What the user actually needs to understand

```text
1. "What do you want?"
        ↓
2. "Answer a few questions."
        ↓
3. "Here is what I understood. Is this right?"
        ↓
4. "Here is the plan. Approve it?"
        ↓
5. "I built it. Review and accept?"
```

That is **5 concepts**.

### Translation

| User-facing concept | Current internal mapping |
|---|---|
| "What do you want?" | Intent Capture → IntentModel |
| "Answer questions" | RefinementSession, RefinementQuestion |
| "Here is what I understood" | RefinementReport, AlignmentContract |
| "Approve the plan" | DivergenceGate, MissionProjection, ProjectionCertification, MissionApproval |
| "Review and accept" | ReviewGate, AcceptanceGate |

### Simplicity verdict

Current state: **Failed simplicity test.**

The user is exposed to at least 14 named concepts. Many of those concepts are intermediate artifacts or gates that could be internalized behind the five user-facing steps.

Ideal state:

```text
Tell SYNTH what you want.
    ↓
Answer questions.
    ↓
Confirm what SYNTH understood.
    ↓
Approve the plan.
    ↓
Execute.
```

Everything else should disappear behind the curtain.

---

## Summary

1. **Lifecycle:** The actual flow is the complex one (Intent → Intent Model → Refinement Session → Refinement Report → Alignment Contract → Mission Projection → Projection Certification → Mission → ...).
2. **Artifacts:** 14+ named artifacts, with significant overlap in intent understanding and approval.
3. **State machines:** 7 separate state machines with overlapping statuses; a universal pattern may replace several.
4. **Dependencies:** No circular imports, but conceptual cycles in intent representation and mission derivation.
5. **User journey:** Currently requires ~14 concepts. The ideal journey requires ~5.

The runtime can likely support the simplified model. The work is primarily vocabulary deletion and CLI/documentation refactoring.
