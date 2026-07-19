# EXP-SEMANTIC-001 — Intent Modeling Engine

> **Architecture expedition.** Extract, structure, and validate operator intent as a canonical intent graph with confidence, evidence, and provenance.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-024 — Semantic Modeling  
**Depends On:** EXP-PROGRAM-023 (Genesis)

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

Intent is the canonical source of truth. Requirements, architecture, tasks, and code are projections.

This expedition defines the Intent Modeling Engine that turns raw operator input into a deterministic, replayable intent graph.

---

## Required Change

### 1.1 Intent Ontology

Model the following node types:

- Goals
- Problems
- Stakeholders
- Desired outcomes
- Success criteria
- Assumptions
- Unknowns

### 1.2 Intent Graph

Represent relationships between nodes:

```text
Problem
  ↓
Goal
  ↓
Capability
  ↓
Requirement
  ↓
Acceptance
```

### 1.3 Intent Confidence

Every intent node carries:

- confidence score
- evidence references
- source attribution
- provenance chain

### 1.4 Ambiguity Detection

Automatically detect:

- conflicting goals
- missing actors
- implicit assumptions
- undefined terminology

### 1.5 Intent Replay

Replay the evolution of intent throughout the project. Every change to the intent model is event-backed and reconstructible.

---

## Deliverables

1. Intent ontology schema.
2. Intent graph data model.
3. Intent extraction engine contract.
4. Confidence scoring algorithm.
5. Evidence and provenance linkage.
6. Ambiguity detection rules.
7. Intent replay integration.
8. ADR on intent model semantics.

---

## Acceptance Criteria

- A plain-language idea produces a structured intent graph.
- Every node has confidence, evidence, source, and provenance.
- Ambiguities and conflicts are surfaced deterministically.
- Intent evolution is replayable.
- Two independent agents converge on materially equivalent intent models from the same inputs.
- `npm run govern` passes.

---

## Out of Scope

- Domain model generation (EXP-SEMANTIC-002).
- Knowledge Model projections (EXP-KNOWLEDGE-001).
- Prototype validation (EXP-KNOWLEDGE-002).
- Code generation.

---

## Success Criteria

Intent becomes a canonical, replayable artifact that downstream programs can project into requirements, architecture, and Missions.
