# EXP-AIFC-005 — Architecture Projection Engine

> **Architecture expedition.** Generate one or more implementation strategies from an approved Discovery artifact, presented as projections rather than canonical state.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-004  
**Blocks:** EXP-AIFC-006

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Transform a structured Discovery artifact into architecture candidates. Each candidate must include:

- A rationale tied to the artifact.
- Explicit tradeoffs.
- A recommended choice when one clearly fits.
- Assumptions that will be verified before materialization.

The candidates are **projections**, not committed decisions. They become canonical only through operator approval.

---

## Required Change

### 5.1 Candidate generation

From the artifact, produce one or more architecture candidates. When multiple reasonable approaches exist, surface them all. When only one is viable, explain why.

### 5.2 Candidate schema

Each candidate contains:

```text
id
name
description
rationale
tradeoffs
  — advantages
  — disadvantages
assumptions
recommended: boolean
confidence
```

### 5.3 Deterministic projection

Given the same Discovery artifact and the same projection adapter version, the engine produces the same candidates.

---

## Deliverables

1. **Architecture projection module** under `src/first-contact/project/`.
2. **Adapter contract** for projection strategies.
3. **Candidate schema** and validation.
4. **Examples** showing multiple candidates and a single recommended choice.

---

## Acceptance Criteria

- A Discovery artifact produces at least one architecture candidate.
- Candidates include rationale, tradeoffs, and assumptions.
- A recommended choice is justified when appropriate.
- No candidate is treated as canonical until approved.
- Projection is deterministic for equivalent inputs.

---

## Out of Scope

- Capability verification (EXP-AIFC-006).
- Mission materialization (EXP-AIFC-007).
- Code generation of any kind.

---

## Success Criteria

The expedition succeeds when an operator can compare architecture candidates and select one before any repository state is created.
