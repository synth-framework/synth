# EXP-SEMANTIC-001 — Intent Modeling Engine

> This document is governed by **EXP-PROGRAM-024 — Semantic Modeling**.

> **Architecture expedition.** Define the intent ontology, intent graph, confidence model, ambiguity detection, and replay semantics for operator intent.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-024 — Semantic Modeling  
**Depends On:** EXP-GENESIS-003 (Genesis Validation & Mission Materialization)

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

Transform an approved Genesis artifact into a canonical, implementation-independent Intent Model. The model must be deterministic, inspectable, replayable, and able to surface ambiguity and conflict before implementation planning begins.

---

## Required Change

### 1.1 Intent Ontology

Define the canonical node types of operator intent:

| Node Type | Description |
|-----------|-------------|
| `Goal` | What the system should achieve. |
| `Problem` | The situation the goal resolves. |
| `Stakeholder` | Who cares about the goal. |
| `Outcome` | A measurable result of achieving the goal. |
| `SuccessCriterion` | A concrete acceptance test for an outcome. |
| `Assumption` | Something taken as true for the intent to hold. |
| `Unknown` | A recognized gap that may affect the intent. |
| `Constraint` | A hard limit on the solution space. |

### 1.2 Intent Graph

Represent relationships between intent nodes:

```text
Problem
  ↓ derives
Goal
  ↓ requires
Capability
  ↓ produces
Requirement
  ↓ validated_by
SuccessCriterion
```

Edges must be typed and deterministic.

### 1.3 Confidence Model

Every intent node carries:

- `confidence` — estimated certainty (0.0–1.0).
- `evidence` — references to Genesis artifact fields or transcript entries.
- `source` — which adapter or operator input produced the node.
- `provenance` — versioned adapter identifier.

Aggregate confidence is computed from per-node confidence using a deterministic rule.

### 1.4 Ambiguity Detection

Automatically detect:

- `MISSING_REQUIRED` — a required node is absent.
- `LOW_CONFIDENCE` — a node falls below the confidence threshold.
- `CONFLICTING` — two nodes contradict each other.
- `NEEDS_DISAMBIGUATION` — a term has multiple plausible meanings.

Ambiguities are surfaced with suggested clarifications, not silently resolved.

### 1.5 Intent Replay

The Intent Model must be reproducible from:

- the approved Genesis artifact,
- the adapter version,
- any operator clarification decisions.

No state outside the artifact and decisions may influence the model.

---

## Deliverables

1. Intent Modeling Engine module (`src/semantic-modeling/intent/`).
2. `IntentModel` schema and TypeScript types.
3. Rule-based intent extraction adapter.
4. Ambiguity and conflict detection.
5. Deterministic confidence scoring.
6. Reference contract: `docs/reference/semantic-intent-contract.md`.
7. ADR on Intent Modeling semantics.
8. Regression tests.

---

## Acceptance Criteria

- An approved Genesis artifact produces an `IntentModel`.
- The model contains at least goals, problems, stakeholders, outcomes, success criteria, assumptions, and unknowns.
- The intent graph links problems to goals to success criteria.
- Ambiguities are reported with classification and location.
- The same artifact and adapter version produce the same model.
- Confidence is deterministic.
- `npm run govern` passes.

---

## Out of Scope

- Domain entities and bounded contexts (EXP-SEMANTIC-002).
- Canonical Knowledge Model persistence (EXP-PROGRAM-025).
- Prototype validation (EXP-PROGRAM-025).
- CLI surface beyond what is needed for tests.

---

## Success Criteria

Two independent agents using the same adapter version and the same approved Genesis artifact converge on substantially equivalent intent models:

- same goals (semantic equivalence),
- same problems,
- same stakeholders,
- same success criteria,
- same ambiguities (within confidence tolerance).
