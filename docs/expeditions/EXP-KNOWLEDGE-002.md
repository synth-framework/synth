# EXP-KNOWLEDGE-002 — Prototype-First Validation

> This document is governed by **EXP-PROGRAM-025 — Canonical Knowledge & Validation**.

> **Product expedition.** Define prototype, acceptance scenario, mock API, simulation, and runtime verification capabilities before implementation.

**Status:** Executing  
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

Validate understanding before implementation. A project should be able to reach Mission approval without a single line of production code.

---

## Required Change

### 2.1 Validation Pipeline

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

### 2.2 Prototype Types

Support validation through:

- Wireframes
- Interactive prototypes
- Acceptance scenarios
- Mock APIs
- Event simulations
- State simulations
- User journey walkthroughs

### 2.3 Acceptance Scenarios

Every capability must have measurable acceptance criteria:

| Field | Description |
|-------|-------------|
| `id` | Stable scenario identifier. |
| `given` | Initial state or context. |
| `when` | Action or event. |
| `then` | Expected outcome. |
| `validationMethod` | How the scenario is validated (manual, simulation, runtime check). |

### 2.4 Runtime Verification

Automatically verify:

- chosen runtime exists
- framework compatibility
- deployment feasibility
- dependency availability

before implementation begins.

### 2.5 Human Approval Gate

Implementation cannot begin until:

- intent is validated
- domain is validated
- prototype is approved
- acceptance is approved

---

## Deliverables

1. Prototype-First Validation module (`src/knowledge/validation/`).
2. Acceptance scenario schema and engine.
3. Mock API generator from domain events.
4. Event and state simulators.
5. Runtime verification integration with existing capability framework.
6. Validation report contract.
7. Reference contract: [`docs/reference/prototype-validation-contract.md`](../reference/prototype-validation-contract.md).
8. ADR on Prototype-First Validation semantics: [`docs/adr/ADR-033-prototype-first-validation-semantics.md`](../adr/ADR-033-prototype-first-validation-semantics.md).
9. Regression tests (`tests/canonical-knowledge-validation.test.js`).

---

## Acceptance Criteria

- A project can reach Mission approval without production code.
- Acceptance scenarios are generated from the Knowledge Graph.
- Mock APIs are generated from domain events.
- Simulations produce deterministic traces.
- Runtime verification reports feasibility before implementation.
- Validation reports are deterministic and hashed.
- `npm run govern` passes.

---

## Out of Scope

- Canonical Knowledge Model persistence (EXP-KNOWLEDGE-001).
- Code generation from validated knowledge.
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

Every major decision is validated through knowledge, prototypes, or acceptance evidence before implementation.
