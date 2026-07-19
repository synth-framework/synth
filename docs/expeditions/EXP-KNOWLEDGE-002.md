# EXP-KNOWLEDGE-002 — Prototype-First Validation

> **Product expedition.** Validate intent, domain, and architecture through wireframes, prototypes, acceptance scenarios, and runtime verification.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-025 — Canonical Knowledge & Validation  
**Depends On:** EXP-KNOWLEDGE-001 (Canonical Knowledge Model)

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

Validate understanding before validating implementation.

This expedition defines the Prototype-First Validation pipeline: a deterministic way to confirm that the Knowledge Model is correct before implementation begins.

---

## Required Change

### 2.1 Validation Artifacts

Support validation through:

- Wireframes
- Interactive prototypes
- Acceptance scenarios
- Mock APIs
- Event simulations
- State simulations
- User journey walkthroughs

### 2.2 Validation Pipeline

```text
Intent
  ↓
Domain
  ↓
Prototype
  ↓
User Validation
  ↓
Mission Approval
  ↓
Implementation
```

### 2.3 Runtime Verification

Automatically verify:

- chosen runtime exists
- framework compatibility
- deployment feasibility
- dependency availability

before implementation begins.

### 2.4 Acceptance Validation

Ensure every capability has measurable acceptance criteria before code generation.

### 2.5 Human Approval

Implementation cannot begin until:

- intent validated
- domain validated
- prototype approved
- acceptance approved

---

## Deliverables

1. Prototype artifact schema.
2. Acceptance scenario format.
3. Mock API and simulation contracts.
4. Runtime capability verification rules.
5. Validation pipeline integration with Mission approval.
6. Approval gating for implementation.
7. ADR on prototype-first validation semantics.

---

## Acceptance Criteria

- A project can reach Mission approval without production code.
- Prototypes, acceptance scenarios, and runtime checks are deterministic artifacts.
- Every capability has measurable acceptance criteria.
- Implementation is gated on validation approval.
- Validation evidence links back to the Knowledge Model.
- `npm run govern` passes.

---

## Out of Scope

- Intent modeling (EXP-SEMANTIC-001).
- Domain modeling (EXP-SEMANTIC-002).
- Knowledge graph storage (EXP-KNOWLEDGE-001).
- Code generation.

---

## Success Criteria

Every major project decision is validated through knowledge, prototypes, or acceptance evidence before implementation.
