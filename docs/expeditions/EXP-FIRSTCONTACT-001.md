# EXP-FIRSTCONTACT-001 — Public Narrative

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** none  
**Blocks:** EXP-FIRSTCONTACT-002, EXP-FIRSTCONTACT-003, EXP-FIRSTCONTACT-004, EXP-FIRSTCONTACT-007

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

## Purpose

Define the canonical SYNTH public narrative: the problem SYNTH solves, why it exists, why it is different, and the story every public surface should tell.

---

## Motivation

The WEBSITE-AUDIT-001 executive summary found that the current site describes mechanism ("From an idea to replayable software") but not motivation. Visitors cannot answer "Why should I care?" without inferring it from abstract concepts. A single agreed-upon narrative is required before any website, documentation, or example can be aligned.

---

## Deliverables

1. **Problem statement**
   - One paragraph describing the failure modes of current AI-assisted or manual engineering workflows.

2. **SYNTH promise**
   - One sentence stating what SYNTH guarantees.

3. **Narrative ladder**
   - Five-level progression: Problem → Why SYNTH → How it works → How to use it → How it is implemented.

4. **Narrative style guide**
   - Tone, perspective, and forbidden phrases.
   - Rule: lead with the problem, not the mechanism.

5. **AI-native framing**
   - Explicit statement of the human-AI division of labor.

---

## Acceptance

Any SYNTH contributor can read the public narrative document and produce website copy, documentation, or examples that are consistent with it.

---

## Phases

### Phase 1 — Problem definition

Interview existing expeditions, ADRs, and operator docs to extract the core problem SYNTH addresses.

### Phase 2 — Promise formulation

Draft the one-sentence SYNTH promise and test it with technically sophisticated developers who have not used SYNTH.

### Phase 3 — Narrative ladder

Map existing website and documentation content to the five levels. Identify gaps.

### Phase 4 — Style guide

Document tone, perspective, and examples of good/bad copy.

### Phase 5 — Comprehension validation

Run a structured comprehension test with at least three experienced developers who have never used SYNTH.

Procedure:

1. Give each reviewer the public narrative document or a projection of it (e.g., the website).
2. Allow 10–15 minutes to read.
3. Remove the document.
4. Ask the questions from memory.

Questions:

1. What is SYNTH?
2. What problem does it solve?
3. How is it different from Git, CI/CD, or AI coding assistants?
4. Describe the AI-human workflow in your own words.
5. What does "Replay" mean, and why is it important?

Pass if all participants demonstrate consistent conceptual understanding without relying on verbatim repetition.

---

## Risks

| Risk | Mitigation |
|---|---|
| Narrative becomes too abstract | Anchor every claim to a concrete engineering scenario |
| Narrative conflicts with constitutional vocabulary | Review against `docs/reference/public-vocabulary.md` |
| Narrative is too long | Enforce one-sentence promise and one-paragraph problem |

---

## Definition of Done

- [x] Problem statement documented.
- [x] SYNTH promise documented.
- [x] Narrative ladder defined with examples at each level.
- [x] Style guide drafted.
- [x] AI-native human-AI division of labor stated.
- [ ] Structured comprehension validation passed with at least three external developers.
- [x] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Gather source material from ADRs, operator docs, and audit findings.
2. Draft problem statement and promise.
3. Build narrative ladder.
4. Write style guide.
5. Review and iterate.
6. Store canonical narrative in `docs/reference/public-narrative.md`.

---

## Completion Notes

- Created `docs/reference/public-narrative.md` as the canonical public narrative source artifact.
- Reframed problem statement around trust and accountability at AI scale.
- Identity statement: "SYNTH is the AI-native execution platform for governed software engineering."
- SYNTH promise: "Every decision is recorded, every action is governed, and every state is provable."
- Added "What SYNTH Is Not" section to prevent the wrong mental model.
- Narrative ladder defined with five levels and example copy at each level.
- AI-native workflow explains the human-AI division of labor with the CLI as an execution surface for agents.
- Plain-language definitions provided for all public terms, each with Definition → In SYNTH → Why it matters.
- Added "Frequently Confused Concepts" section distinguishing SYNTH terms from familiar software engineering ideas.
- Style guide includes tone, perspective, forbidden phrases, and canonical statements.
- Document is ready to merge as the canonical public-narrative source.
- Expedition implementation is complete; the document may now be merged and subsequent expeditions may project from it.
- Structured comprehension validation is pending and must pass before the expedition is formally accepted.
- Until validation evidence exists, the narrative should be treated as implemented but not yet validated.
