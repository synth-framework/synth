# EXP-REFINE-011 — Intent Interpretation Model

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 1 — Refinement Model  
**Authority:** Synth Architectural Constitution

---

## Goal

Create a canonical **Intent Model** artifact that captures explicit objectives, implicit expectations, forbidden interpretations, and unresolved ambiguity before an intent is refined into a contract.

---

## Purpose

Raw human intent is not yet a contract. Before SYNTH can produce a `Refined Intent`, it must model what the human actually means — including what was said, what was implied, and what must never be inferred. The Intent Model is the first structured artifact in the refinement pipeline.

---

## Deliverables

1. **Intent Model artifact schema** in `src/governance/intent-model.ts`.
2. **Intent interpretation service** that derives an Intent Model from raw input.
3. **Confidence scoring** that quantifies how well the intent is understood.
4. **Ambiguity extraction** that surfaces unknowns requiring clarification.
5. **Lifecycle states**:
   - `draft`
   - `awaiting_clarification`
   - `sufficient`
   - `insufficient`
   - `superseded`
6. **Unit tests** covering valid/invalid models and confidence transitions.

---

## Intent Model Fields

```text
id
rawIntentReference
explicitObjectives
implicitObjectives
audience
problemStatement
desiredOutcome
nonGoals
forbiddenInterpretations
allowedInterpretations
referenceEvidenceIds
confidenceLevel          // 0.0 - 1.0
unresolvedAmbiguity
knownUnknowns
version
```

---

## Example

For the homepage request:

```text
Raw intent: "Let's build the homepage using this design."

Explicit objectives:
- Create a homepage
- Use the provided design

Implicit objectives:
- Product demonstration
- Interactive experience
- Not marketing-first

Forbidden interpretations:
- SaaS landing page
- Generic dashboard
- AI chat interface
- Component showcase

Allowed interpretations:
- Mission Studio as the dominant experience
- Marketing sections secondary

Confidence: 72%
Unresolved ambiguity:
- Live AI agent or static simulation?
```

---

## Acceptance Criteria

- An Intent Model can be created from raw intent input.
- The model distinguishes explicit from implicit objectives.
- Forbidden and allowed interpretations are explicitly listed.
- Confidence is computed from completeness of required fields.
- Models below a configurable confidence threshold require human escalation.
- The schema validates correctly with the existing validation framework.

---

## Out of Scope

- Natural-language parsing or LLM-based interpretation.
- UI for Intent Model editing in Mission Studio.
- Divergence Gate enforcement.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-001 — Refinement Layer Model
- EXP-REFINE-002 — Alignment Contract
