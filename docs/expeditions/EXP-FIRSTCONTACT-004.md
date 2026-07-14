# EXP-FIRSTCONTACT-004 — AI Workflow Story

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-001  
**Blocks:** none

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

Create a clear, accessible explanation of the human-AI execution workflow that SYNTH enables.

---

## Motivation

The audit found that the AI message on the homepage is not reinforced elsewhere. The Quick Start is CLI-centric, leaving visitors uncertain about how AI fits into the workflow. A dedicated AI Workflow page or section is needed to make the AI-native positioning concrete.

---

## Deliverables

1. **AI workflow diagram**
   - Human describes intent.
   - AI gathers evidence and proposes expeditions.
   - Human approves the plan.
   - AI executes through SYNTH CLI.
   - Replay verifies the outcome.

2. **Plain-language explanation**
   - Each step explained without assuming prior SYNTH knowledge.

3. **Concrete example scenario**
   - A realistic first mission walked through the AI workflow.

4. **Comparison with manual workflow**
   - What changes when an AI agent uses SYNTH versus a human running commands.

5. **Integration with homepage and Quick Start**
   - Links from homepage hero and Quick Start to the AI workflow page.

---

## Acceptance

A visitor can read the AI Workflow page and explain, in their own words, how a human and an AI agent collaborate through SYNTH to produce replayable software.

---

## Phases

### Phase 1 — Workflow definition

Define the canonical human-AI steps based on the public narrative.

### Phase 2 — Example scenario

Choose a realistic scenario (e.g., add a feature, refactor, migrate) and walk it through the workflow.

### Phase 3 — Page creation

Create `website/ai-workflow.html` or equivalent.

### Phase 4 — Cross-linking

Link from homepage, Quick Start, and Architecture pages.

---

## Risks

| Risk | Mitigation |
|---|---|
| Workflow feels hypothetical | Use a concrete repository scenario |
| Overlaps with Mission Studio page | Distinguish planning from execution |
| Conflicts with constitutional vocabulary | Map every step to the seven public concepts |

---

## Definition of Done

- [ ] AI workflow diagram created.
- [ ] Plain-language explanation written.
- [ ] Concrete example scenario documented.
- [ ] Comparison with manual workflow included.
- [ ] Cross-links from homepage and Quick Start added.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Define canonical AI workflow.
2. Write example scenario.
3. Create website page.
4. Add cross-links.
5. Verify comprehension with external reader.

---

## Completion Notes

Pending.
