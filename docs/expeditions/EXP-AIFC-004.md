# EXP-AIFC-004 — Clarification Strategy

> **Architecture expedition.** Detect ambiguity, score confidence, and generate targeted clarification questions to bring a Discovery artifact to approval readiness.

**Status:** Completed and accepted  
**Started:** 2026-07-19  
**Completed:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-003  
**Blocks:** EXP-AIFC-005

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

Close the gap between an operator's initial idea and an approval-ready Discovery artifact. The clarification strategy must:

- Identify ambiguous or missing fields.
- Generate focused questions that reduce uncertainty.
- Update the artifact and confidence scores deterministically after each answer.
- Stop when the artifact reaches the minimum confidence threshold or when no further clarification is productive.

---

## Required Change

### 4.1 Ambiguity detection

Classify missing or low-confidence fields into categories:

```text
MISSING_REQUIRED     — field is empty and required
LOW_CONFIDENCE       — field exists but confidence is below threshold
CONFLICTING          — extracted values contradict each other
NEEDS_DISAMBIGUATION — value could refer to multiple concepts
```

### 4.2 Question generation

Generate one or more questions per ambiguity class. Questions should be:

- Specific to the missing information.
- Answerable by the operator without implementation knowledge.
- Recorded in the transcript.

### 4.3 Termination conditions

Clarification ends when:

- All required fields meet the confidence threshold.
- The operator explicitly accepts residual unknowns.
- No productive questions remain.

---

## Deliverables

1. **Clarification module** under `src/first-contact/clarify/`.
2. **Question templates** per ambiguity class.
3. **Confidence update rules** after each clarification turn.
4. **Tests** covering ambiguous, incomplete, and contradictory inputs.

---

## Acceptance Criteria

- Ambiguous inputs produce targeted clarification questions.
- Each answer deterministically updates the artifact and confidence scores.
- The strategy terminates with an approval-ready artifact or explicit residual unknowns.
- Public vocabulary constraints are respected in generated text.

---

## Out of Scope

- Intent extraction (EXP-AIFC-003).
- Architecture projection (EXP-AIFC-005).
- Mission materialization (EXP-AIFC-007).

---

## Success Criteria

The expedition succeeds when an operator with an ambiguous idea can reach an approval-ready Discovery artifact through a short, deterministic clarification dialogue.
