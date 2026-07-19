# EXP-AIFC-003 — Intent Extraction Engine

> **Architecture expedition.** Extract intent, audience, constraints, and success criteria from unstructured operator input and project them into the Discovery artifact.

**Status:** Executing  
**Started:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-002  
**Blocks:** EXP-AIFC-004

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

Build the engine that turns a plain-language idea into structured Discovery artifact fields. The engine must:

- Identify goals, audience, environment, capabilities, and constraints.
- Produce a confidence score for each extracted field.
- Surface unknowns rather than hallucinating answers.
- Record every input in the Discovery transcript.

---

## Required Change

### 3.1 Multi-turn extraction

The engine may ask the operator for clarification, but its first pass should extract everything it can from the initial input. Each turn appends to the transcript and updates artifact fields.

### 3.2 Field-level confidence

Every extracted field carries a confidence score. Fields below a threshold become unknowns and feed the clarification strategy.

### 3.3 Deterministic extraction

Given the same inputs and the same extraction adapter version, the engine produces the same artifact fields.

---

## Deliverables

1. **Intent extraction module** under `src/first-contact/extract/`.
2. **Adapter contract** for extraction strategies.
3. **Confidence scoring** per field and overall.
4. **Test fixtures** covering simple and ambiguous ideas.

---

## Acceptance Criteria

- Sample inputs produce structured fields matching reviewer expectations.
- Confidence scores are deterministic and monotonic with additional information.
- Unknowns are explicitly identified, not silently guessed.
- All operator inputs are recorded in the transcript.

---

## Out of Scope

- Clarification question generation (EXP-AIFC-004).
- Architecture projection (EXP-AIFC-005).
- Capability verification (EXP-AIFC-006).

---

## Success Criteria

The expedition succeeds when a plain-language idea such as "Let's build a space mission tracker" yields a structured Discovery artifact with measurable confidence and identified unknowns.
