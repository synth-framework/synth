# EXP-BROWNFIELD-002 — Brownfield Discovery Completion

> **Product expedition.** Harden mutation-free discovery, baseline snapshots, repository classification, and bootstrap contracts so that existing systems can be onboarded deterministically.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-BROWNFIELD-001 (Brownfield Bootstrap Hardening), EXP-GOVERN-006 (Governance Completion)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Brownfield discovery should produce a deterministic understanding of an existing system before governance state is introduced.

This expedition incorporates lessons from the Carta Natal experiment, especially the need for mutation-free discovery, baseline evidence, and explicit repository intent.

---

## Required Change

### 2.1 Brownfield Intake model

Define the canonical intake workflow:

```text
Discover
  ↓
Classify
  ↓
Propose
  ↓
Approve
  ↓
Initialize
  ↓
Verify
```

### 2.2 Repository classifier

Classify the repository deterministically:

```text
Repository Type:
  Brownfield Product

Current Phase:
  Knowledge Capture

Expected Transformation:
  Existing Product → SYNTH Governed Product

Implementation Status:
  Partial

Agent Mode:
  Discovery
```

### 2.3 Baseline Snapshot artifact

Introduce a durable artifact capturing:

- Architecture inventory
- Dependency inventory
- Documentation inventory
- Capability inventory
- Baseline snapshot
- Uncertainty report

### 2.4 Discovery Safety Model

Classify every command by mutation risk:

```text
READ_ONLY     → safe during discovery
PROPOSAL_ONLY → produces proposals, no state mutation
MUTATING      → modifies repository or governance state
```

Discovery mode must reject `MUTATING` operations.

### 2.5 Source history classification

Classify source history as:

```text
AVAILABLE
MISSING
EXTERNAL
UNKNOWN
```

### 2.6 Bootstrap approval contract

Separate Discovery from Bootstrap:

- Discovery answers: "What is this repository?"
- Bootstrap answers: "How should SYNTH govern it?"

---

## Deliverables

1. Brownfield Intake model.
2. Repository classifier.
3. Baseline Snapshot artifact schema.
4. Architecture inventory.
5. Domain inventory.
6. Dependency inventory.
7. Risk assessment.
8. Unknown tracker.
9. Discovery confidence scoring.
10. Bootstrap approval contract.

---

## Acceptance Criteria

- A repository can be onboarded without modifying application code.
- Two independent agents arrive at substantially the same baseline from the same evidence.
- Discovery rejects mutating commands by default.
- Source history is classified.
- Bootstrap contract is deterministic and testable.
- `npm run govern` passes.

---

## Out of Scope

- Discovery compiler redesign.
- Protected Asset modifications.
- Genesis greenfield workflows.
- IDE/MCP/Web integrations.

---

## Success Criteria

Brownfield onboarding is a hardened, self-guiding workflow that agents can execute without inventing missing lifecycle steps.
