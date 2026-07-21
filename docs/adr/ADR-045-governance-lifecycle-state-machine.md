# ADR-045 — Governance Lifecycle & State Machine Specification

**Status:** Accepted  
**Date:** 2026-07-21  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner  
**Stakeholders:** Operators, AI Agents, Mission Studio, Governance, Contributors

---

## Context

EXP-PROGRAM-035 introduced Review, Refinement, and Acceptance Gates to govern execution correctness. EXP-PROGRAM-036 introduced the Genesis Alignment Layer to govern intent correctness before Mission creation. Together, these programs expand SYNTH's lifecycle from a linear progression into a gated, multi-layer state machine.

Without a canonical specification of this lifecycle, each new capability risks introducing ad-hoc states, inconsistent terminology, and transitions that are not replayable. This is especially dangerous because SYNTH's core value proposition is deterministic, explainable governance.

This ADR establishes a single source of truth for the governance lifecycle: every phase, every artifact, every gate, who or what may satisfy each gate, valid transitions, invalid transitions, events emitted, and replay expectations.

---

## Decision

Adopt a canonical **Governance Lifecycle State Machine** that spans three layers: Genesis, Synthesis, and Governance. Every state transition is an event. Every gate is a decision point. Every decision produces an artifact. No transition may occur without the required artifact and an authorized satisfier.

The lifecycle is intentionally layered so that each layer can evolve independently as long as its public contract (states, artifacts, and events) is honored.

---

## Governance Architecture v1.0

This ADR, together with ADR-036 — Intent Refinement and Alignment Governance and ADR-037 — Genesis Lifecycle and Alignment Contracts, constitutes the canonical governance architecture of SYNTH.

```text
Governance Architecture v1.0

ADR-036  Intent Refinement and Alignment Governance
ADR-037  Genesis Lifecycle and Alignment Contracts
ADR-045  Governance Lifecycle & State Machine Specification
```

Any future governance mechanism shall integrate into this lifecycle rather than introducing parallel execution paths. Program 027 — Mission Studio Homepage becomes the first program executed under this architecture.

---

## Constitutional Rule — Alignment Contract as Genesis/Synthesis Boundary

> **The Alignment Contract is the sole constitutional artifact that authorizes transition from Genesis into Synthesis. No Mission may be created, activated, or approved without a valid Alignment Contract unless explicitly governed by an approved constitutional exception.**

The Alignment Contract marks the boundary between exploratory intent work (Genesis) and executable work (Synthesis). Above the contract, interpretation may still change through refinement, review, and approval cycles. Below the contract, change is governed by the same execution controls that govern Mission, Expedition, and Implementation lifecycle transitions.

This rule makes the Alignment Contract an authorization, not merely a report. It preserves the complete refinement history (Intent Model, Refinement Session, Refinement Report, Refinement Approval) while ensuring that only explicitly authorized intent enters synthesis.

---

## Lifecycle Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Genesis Layer                              │
│                                                                   │
│   Raw Intent                                                      │
│      │                                                            │
│      ▼                                                            │
│   Intent Model           ──artifact──▶  IntentModel               │
│      │                                                            │
│      ▼                                                            │
│   Refinement Session     ──artifact──▶  RefinedIntent             │
│      │                                                            │
│      ▼                                                            │
│   Alignment Contract     ──artifact──▶  AlignmentContract         │
│      │                                                            │
│      ▼                                                            │
│   Divergence Gate        ──gate─────▶   Aligned / Revision /      │
│                                         Rejected / Superseded     │
│      │                                                            │
│      ▼                                                            │
│   Mission Created                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Synthesis Layer                            │
│                                                                   │
│   Mission                                                         │
│      │                                                            │
│      ▼                                                            │
│   Expedition Created   ──artifact──▶  Expedition                  │
│      │                                                            │
│      ▼                                                            │
│   Implementation         ──artifact──▶  ImplementationEvidence    │
│      │                                                            │
│      ▼                                                            │
│   Implementation Complete                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Governance Layer                           │
│                                                                   │
│   Review Gate            ──gate─────▶   Approved / Revision /     │
│                                         Rejected / Superseded /   │
│                                         Split / Merge / Escalate  │
│      │                                                            │
│      ▼                                                            │
│   Acceptance Gate        ──gate─────▶   Accepted / Rejected       │
│      │                                                            │
│      ▼                                                            │
│   Convergence Check      ──artifact──▶  ConvergenceReport         │
│      │                                                            │
│      ▼                                                            │
│   Closed                                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phases, Artifacts, and Gates

| Phase | Layer | Artifact Produced | Gate (if any) | Satisfier |
|---|---|---|---|---|
| Intent Captured | Genesis | `IntentCapture` | — | Automatic |
| Intent Modeled | Genesis | `IntentModel` | — | Automatic / AI-assisted |
| Intent Refined | Genesis | `RefinedIntent` | — | Automatic / AI-assisted |
| Contract Aligned | Genesis | `AlignmentContract` | Divergence Gate | Human / AI / Automatic |
| Mission Drafted | Synthesis | `MissionDraft` | — | Automatic |
| Mission Approved | Synthesis | `Mission` | Mission Approval Gate | Human / AI / Automatic |
| Expedition Proposed | Synthesis | `Expedition` | — | Automatic |
| Executing | Synthesis | `ExecutionTrace` | — | Automatic |
| Implementation Complete | Synthesis | `ImplementationEvidence` | — | Automatic |
| Reviewed | Governance | `ReviewPackage`, `ReviewDecision` | Review Gate | Human / AI / Automatic |
| Accepted | Governance | `AcceptanceRecord` | Acceptance Gate | Human / AI / Automatic |
| Certified | Governance | `ConvergenceReport` | Convergence Gate | Human / AI / Automatic |
| Closed | Governance | `ClosedRecord` | — | Automatic |

---

## Gate Satisfiers

A gate satisfier is the authority that may resolve a gate to a terminal decision.

| Satisfier | When Used | Example |
|---|---|---|
| **Automatic** | Required artifacts are present and validation rules pass. | Documentation cleanup, generated projections, mechanical refactoring. |
| **AI** | A non-implementing agent evaluates the artifact against the contract. | Test quality, naming consistency, generated assets, documentation clarity. |
| **Human** | A human operator evaluates subjective, experiential, or high-stakes outcomes. | Design review, architecture review, product approval, acceptance. |
| **Quorum** | Multiple satisfiers must agree. | Security review requiring both AI scan and human sign-off. |

Important invariants:

- The implementing agent may not satisfy its own gate.
- A gate may declare a fallback satisfier if the primary is unavailable.
- A gate's satisfier is part of the gate's policy and is immutable after the gate is created.

---

## State Machine — Valid Transitions

### Genesis Layer

```text
draft
  │
  ▼
awaiting_alignment
  │
  ▼
aligned ────────────────▶ Mission Created
  │
  ├── revision_required ──▶ draft
  │
  ├── rejected ───────────▶ closed
  │
  └── superseded ─────────▶ draft (new intent)
```

### Synthesis Layer

```text
proposed
  │
  ▼
approved
  │
  ▼
executing
  │
  ▼
implementation_complete
  │
  ▼
Review Gate
```

### Governance Layer

```text
implementation_complete
  │
  ▼
awaiting_review
  │
  ▼
reviewed
  │
  ├─ approved ────────────▶ awaiting_acceptance
  │
  ├─ revision_required ───▶ executing
  │
  ├─ rejected ────────────▶ closed
  │
  ├─ superseded ──────────▶ draft (new expedition)
  │
  ├─ split ───────────────▶ proposed (multiple expeditions)
  │
  ├─ merge ───────────────▶ proposed (merged expedition)
  │
  └─ escalate_to_mission ─▶ Mission review

awaiting_acceptance
  │
  ▼
accepted
  │
  ▼
awaiting_certification
  │
  ▼
certified
  │
  ▼
closed
```

---

## Invalid Transitions

The following transitions are always invalid and must be rejected by the execution engine:

| Invalid Transition | Why Invalid |
|---|---|
| `draft` → `executing` | No approved Mission exists. |
| `implementation_complete` → `executing` without a `ReviewDecision` of `revision_required` | Revision must be explicit. |
| `awaiting_review` → `accepted` | Acceptance requires an explicit Review Gate decision. |
| `aligned` → `closed` | A rejected alignment must pass through `rejected`. |
| Any gate satisfied by the implementing agent | Self-approval violates governance. |
| `accepted` → `revision_required` | Once accepted, further change requires a new Mission or Expedition. |
| `closed` → any state | Closed is terminal. Reopening requires a new intent or Mission. |

---

## Events

Every state transition emits exactly one event. Events are immutable and replayable.

| Event | Emitted When | Required Payload |
|---|---|---|
| `INTENT_CAPTURED` | Raw intent is recorded. | `intentId`, `source`, `rawText`, `timestamp` |
| `INTENT_MODEL_CREATED` | Intent Model is produced. | `intentModelId`, `intentId`, `confidence`, `timestamp` |
| `INTENT_REFINED` | Refined Intent is produced. | `refinedIntentId`, `intentModelId`, `timestamp` |
| `ALIGNMENT_CONTRACT_CREATED` | Alignment Contract is produced. | `contractId`, `refinedIntentId`, `timestamp` |
| `ALIGNMENT_CONTRACT_APPROVED` | Divergence Gate resolves to `aligned`. | `contractId`, `gateId`, `reviewer`, `timestamp` |
| `ALIGNMENT_CONTRACT_REVISION_REQUESTED` | Divergence Gate resolves to `revision_required`. | `contractId`, `gateId`, `reason`, `timestamp` |
| `ALIGNMENT_CONTRACT_REJECTED` | Divergence Gate resolves to `rejected`. | `contractId`, `gateId`, `reason`, `timestamp` |
| `MISSION_DRAFT_CREATED` | Mission Draft is created. | `draftId`, `contractId`, `timestamp` |
| `MISSION_APPROVED` | Mission Approval Gate resolves. | `missionId`, `draftId`, `gateId`, `timestamp` |
| `EXPEDITION_CREATED` | Expedition is chartered. | `expeditionId`, `missionId`, `timestamp` |
| `EXPEDITION_STARTED` | Execution begins. | `expeditionId`, `timestamp` |
| `IMPLEMENTATION_COMPLETED` | Implementation evidence is submitted. | `expeditionId`, `evidenceId`, `timestamp` |
| `REVIEW_GATE_CREATED` | Review Gate is opened. | `gateId`, `expeditionId`, `policy`, `timestamp` |
| `REVIEW_DECISION_RECORDED` | Review Gate resolves. | `gateId`, `decision`, `reviewer`, `timestamp` |
| `ACCEPTANCE_GATE_CREATED` | Acceptance Gate is opened. | `gateId`, `expeditionId`, `policy`, `timestamp` |
| `ACCEPTANCE_RECORDED` | Acceptance Gate resolves. | `gateId`, `decision`, `reviewer`, `timestamp` |
| `CONVERGENCE_CERTIFIED` | Convergence Gate resolves to certified. | `reportId`, `contractId`, `evidenceId`, `timestamp` |
| `EXPEDITION_CLOSED` | Expedition reaches terminal state. | `expeditionId`, `resolution`, `timestamp` |

---

## Replay Expectations

Replay must be able to reconstruct the full governance state from events alone. The following invariants must hold:

1. **Deterministic state:** Given the same event log, Replay produces the same governance state.
2. **Gate identity:** Every gate has a stable `gateId` derived from its creation event.
3. **Decision immutability:** A gate decision event may not be altered or removed.
4. **Invalid transitions are rejected:** Replay rejects any event sequence containing an invalid transition.
5. **Obsolete vs invalid:** A decision may be marked `obsolete` if its assumptions change, but it may not be marked `invalid` without a subsequent correction event.
6. **Causal ordering:** A gate cannot resolve before it is created. A Mission cannot be approved before its Alignment Contract is aligned.

---

## Relationship to Existing Work

### EXP-PROGRAM-035 — Intent Refinement & Review Governance

035 introduced gates as execution-control mechanisms. This ADR generalizes those gates into a reusable state machine with explicit satisfiers, decision types, and invalid transitions.

### EXP-PROGRAM-036 — Intent Refinement & Alignment Governance

036 introduced the Genesis Layer artifacts (Intent Model, Alignment Contract, Divergence Gate). This ADR specifies how those artifacts participate in the broader governance state machine.

### EXP-PROGRAM-027 — Mission Studio Homepage

Program 027 becomes the first program executed entirely within the specified lifecycle. Its retrofit must demonstrate every Genesis, Synthesis, and Governance phase.

### EXP-PROGRAM-022 — Genesis

The existing Genesis program provides system materialization. This ADR's Genesis Layer provides understanding materialization. They are complementary.

---

## Consequences

### Positive

- Contributors have a single, authoritative reference for SYNTH governance.
- New gate types can be added by extending the state machine rather than special-casing logic.
- Replay correctness becomes verifiable against the specification.
- The homepage retrofit has a clear, checkable lifecycle to follow.

### Negative

- Adds specification overhead before introducing new gate types.
- Requires existing tests and capabilities to be audited for conformance.

### Neutral

- Does not change the public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Does not invalidate prior ADRs; it formalizes their interaction.

---

## Alternatives Considered

### 1. Document the lifecycle only in code

Rejected. Code is the implementation, not the contract. A canonical ADR is necessary for contributors, auditors, and AI agents to reason about the lifecycle independently of the current implementation.

### 2. Model each gate type as a separate state machine

Rejected. Separate machines would duplicate transition logic and make cross-gate dependencies (e.g., Mission approval depending on Divergence Gate) harder to verify.

### 3. Allow the implementing agent to satisfy automatic gates only

Rejected. The distinction must be between "who implemented" and "who reviews," not between gate types. An automatic gate is simply one whose satisfier is a validation rule rather than a person or AI.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- ADR-037 — Genesis Lifecycle and Alignment Contracts
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-PROGRAM-027 — Mission Studio Homepage
- EXP-PROGRAM-022 — Genesis
- docs/governance.md
- docs/reference/public-vocabulary.md
