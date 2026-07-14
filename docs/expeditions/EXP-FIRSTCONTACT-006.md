# EXP-FIRSTCONTACT-006 — Interactive First Mission

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-004, EXP-FIRSTCONTACT-005  
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

Provide a guided, low-friction first mission experience on the website so visitors can understand SYNTH's value before installing anything.

---

## Motivation

The Quick Start page lists CLI commands but does not show what a first mission feels like. An interactive or heavily guided first mission page can bridge the gap between reading about SYNTH and installing it.

---

## Deliverables

1. **First mission scenario**
   - A realistic, minimal scenario (e.g., "Add a README section" or "Create a mission to refactor a function").

2. **Guided walkthrough**
   - Step-by-step explanation of intent, evidence, expedition, plan, approval, execution, event, state, and replay.

3. **Expected outputs**
   - Show what the event log, proof artifact, and replay output look like.

4. **Try-it-yourself path**
   - Clear instructions to run the same mission locally after reading the guide.

5. **Integration with Quick Start**
   - Link from Quick Start and homepage.

---

## Acceptance

A visitor can complete the guided first mission page and understand what each public concept means in practice, even if they have not installed SYNTH.

---

## Phases

### Phase 1 — Scenario selection

Choose a scenario that requires no external dependencies and demonstrates all seven concepts.

### Phase 2 — Walkthrough writing

Write the guided steps with plain-language definitions.

### Phase 3 — Output samples

Create example event log and proof artifact snippets.

### Phase 4 — Page implementation

Create `website/first-mission.html`.

### Phase 5 — Cross-linking

Link from homepage, Quick Start, and AI Workflow pages.

---

## Risks

| Risk | Mitigation |
|---|---|
| Scenario is too trivial | Choose one that genuinely demonstrates replay and governance |
| Scenario is too complex | Keep it to a single file change |
| Becomes a tutorial instead of an experience | Focus on concepts, not tool mechanics |

---

## Definition of Done

- [ ] First mission scenario chosen.
- [ ] Guided walkthrough written.
- [ ] Expected outputs shown.
- [ ] Try-it-yourself path provided.
- [ ] Cross-links added.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Select scenario.
2. Write walkthrough.
3. Create output samples.
4. Build page.
5. Link and verify.

---

## Completion Notes

Pending.
