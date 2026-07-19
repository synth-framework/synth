# EXP-GENESIS-001 — Genesis Lifecycle & Artifact Schema

> **Architecture expedition.** Define the canonical Genesis workflow, artifact schema, and replay/governance integration.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-GOVERN-006 (Governance Completion)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

A project should begin with intent, not initialization.

This expedition defines the Genesis lifecycle and the artifact that carries intent from raw input to Mission materialization. It does not implement extraction, classification, or validation; those are handled by EXP-GENESIS-002 and EXP-GENESIS-003.

---

## Required Change

### 1.1 Genesis Lifecycle

Define the canonical workflow:

```text
Intent Capture
  ↓
Context Classification
  ↓
Constraint Extraction
  ↓
Scope Negotiation
  ↓
Capability Verification
  ↓
Mission Materialization
```

### 1.2 Genesis Artifact Schema

Design the immutable, replayable artifact that records:

- captured intent
- context classification
- extracted constraints
- negotiated scope
- unknowns and risks
- evidence references
- approval state
- provenance

### 1.3 Approval Gates

Define the gates that control progression:

- Intent approved
- Scope approved
- Feasibility verified
- Mission approved

### 1.4 Replay Integration

Ensure Genesis artifacts integrate with replay verification:

- every artifact is reproducible from inputs
- every approval emits required events
- replay reconstructs the Mission that was materialized

### 1.5 Governance Integration

Ensure Genesis produces inputs that governance can validate:

- event types for Genesis lifecycle transitions
- required evidence attachments
- proof artifacts for capability verification

---

## Deliverables

1. Genesis lifecycle specification — `docs/reference/genesis-artifact-contract.md` §1.
2. Genesis artifact schema — `docs/reference/genesis-artifact-contract.md` §2.
3. Approval gate semantics — `docs/reference/genesis-artifact-contract.md` §3.
4. Event taxonomy for Genesis transitions — `docs/reference/genesis-artifact-contract.md` §4 and `docs/architecture/09-event-model.md` §First Contact Events.
5. Replay integration contract — `docs/reference/genesis-artifact-contract.md` §5.
6. Governance integration contract — `docs/reference/genesis-artifact-contract.md` §6.
7. ADR on Genesis artifact semantics — `docs/adr/ADR-027-genesis-artifact-semantics.md`.

---

## Acceptance Criteria

- The Genesis lifecycle is documented with explicit transitions and approval gates.
- The Genesis artifact schema is versioned and replayable.
- Governance events can reconstruct a Genesis session from inputs.
- The artifact can be consumed by EXP-GENESIS-002 and EXP-GENESIS-003.
- `npm run govern` passes.

---

## Out of Scope

- Intent extraction engine (EXP-GENESIS-002).
- Context classification engine (EXP-GENESIS-002).
- Capability verification framework (EXP-GENESIS-003).
- Mission materialization pipeline (EXP-GENESIS-003).
- Canonical intent/domain modeling (EXP-PROGRAM-024).
- Canonical Knowledge Model (EXP-PROGRAM-025).

---

## Success Criteria

Genesis has a stable lifecycle and artifact schema that downstream expeditions can implement against.
