# EXP-REFINE-004 — Refinement Questions Engine

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 1 — Refinement Model  
**Authority:** Synth Architectural Constitution

---

## Goal

Build an engine that generates clarification questions based on ambiguity in raw intent.

---

## Purpose

Ambiguous intent is the root cause of divergence. The Refinement Questions Engine surfaces missing information before it becomes a Mission, reducing the likelihood of misalignment.

---

## Deliverables

1. **Question generation rules** in `src/governance/refinement-questions.ts`.
2. **Heuristic question templates** for common gaps:
   - "What does success look like?"
   - "Which reference is authoritative?"
   - "What must not change?"
   - "Who is the audience?"
   - "What problem does this solve?"
   - "What is explicitly out of scope?"
3. **Ambiguity scoring** that ranks how complete a Refined Intent is.
4. **Question-answer event model**.
5. **Unit tests** covering question generation and ambiguity scoring.

---

## Acceptance Criteria

- Given a raw intent, the engine produces a prioritized list of clarification questions.
- The engine detects missing visual references, success criteria, constraints, and audience.
- Answering questions updates the Refined Intent and reduces ambiguity score.
- A Refined Intent with too many open questions cannot advance to the Divergence Gate.
- The engine is deterministic: same input produces same questions.

---

## Out of Scope

- LLM-based question generation (keep deterministic for now).
- Natural-language answer parsing.
- Mission Studio UI for the Q&A loop.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-001 — Refinement Layer Model
