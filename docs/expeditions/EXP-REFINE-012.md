# EXP-REFINE-012 — Governance Lifecycle State Machine

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 0 — Governance Lifecycle Specification  
**Authority:** Synth Architectural Constitution

---

## Goal

Produce the canonical specification for SYNTH's full governance lifecycle — every phase, artifact, gate, satisfier, valid transition, invalid transition, emitted event, and replay expectation — as a single source of truth.

---

## Purpose

EXP-PROGRAM-035 and EXP-PROGRAM-036 have introduced multiple gate types, decision policies, and pre-Mission artifacts. Without a unified state-machine specification, each new capability risks introducing ad-hoc states, inconsistent terminology, and transitions that are not replayable.

This expedition captures the lifecycle in ADR-038 and produces a machine-checkable reference that future capabilities can extend without breaking existing governance semantics.

---

## Deliverables

1. **ADR-038 — Governance Lifecycle & State Machine Specification** in `docs/adr/ADR-038-governance-lifecycle-state-machine.md`.
2. **Layered lifecycle diagram** covering Genesis, Synthesis, and Governance layers.
3. **Phase/artifact/gate/satisfier matrix** showing what each phase produces and who may resolve each gate.
4. **Valid transition diagrams** for Genesis, Synthesis, and Governance layers.
5. **Invalid transition catalog** with rationale for each rejected transition.
6. **Event catalog** listing every event emitted by the lifecycle.
7. **Replay expectations** that Replay must satisfy to be conformant.

---

## Lifecycle Layers

```text
Genesis Layer
    │
    │  Intent → Understanding → Alignment Contract
    │
Synthesis Layer
    │
    │  Mission → Expedition → Implementation
    │
Governance Layer
    │
    │  Review Gate → Acceptance Gate → Convergence Certification
```

---

## Gate Satisfiers

| Satisfier | Description | Example |
|---|---|---|
| **Automatic** | Validation rules pass without external review. | Mechanical refactoring, generated projections. |
| **AI** | A non-implementing agent evaluates the artifact. | Test quality, naming consistency, documentation. |
| **Human** | A human operator evaluates subjective or high-stakes outcomes. | Design review, architecture review, acceptance. |
| **Quorum** | Multiple satisfiers must agree. | Security review requiring AI scan + human sign-off. |

---

## Key Invalid Transitions

| Invalid Transition | Rationale |
|---|---|
| `draft` → `executing` | No approved Mission exists. |
| `implementation_complete` → `executing` without explicit revision | Revision must be gated. |
| `awaiting_review` → `accepted` | Acceptance requires a Review Gate decision. |
| Implementing agent satisfies its own gate | Self-approval violates governance. |
| `closed` → any state | Closed is terminal; reopening requires a new Mission or intent. |

---

## Acceptance Criteria

- ADR-038 is approved and references all existing governance ADRs and programs.
- The lifecycle diagram is included in both the ADR and this expedition record.
- Every gate has a defined satisfier policy.
- Every transition has a corresponding event.
- Replay expectations are stated as falsifiable invariants.
- The specification is reviewed against the current implementation and any gaps are documented as follow-up expeditions.

---

## Out of Scope

- Implementation of new gate types beyond those already chartered in Programs 035 and 036.
- Changes to existing event schemas unless gaps are discovered during review.
- Mission Studio UI for visualizing the lifecycle.

---

## Success Criteria

A contributor can read ADR-038 and understand:

1. Which layer a given expedition belongs to.
2. Which artifact must exist before each gate.
3. Who or what may resolve each gate.
4. Which transitions are valid and which are forbidden.
5. Which events Replay must preserve to reconstruct the state.

---

## Dependencies

- ADR-037 — Genesis Lifecycle and Alignment Contracts
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance

---

## Related

- EXP-REFINE-002 — Alignment Contract
- EXP-REFINE-003 — Divergence Gate
- EXP-REFINE-010 — Interactive Decision Acquisition
