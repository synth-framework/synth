# EXP-FIRSTCONTACT-003 — Homepage Experience

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-001, EXP-FIRSTCONTACT-002  
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

Redesign the homepage so a first-time visitor understands what SYNTH is, what problem it solves, and why it is AI-native without scrolling.

---

## Motivation

WEBSITE-AUDIT-001 found that the homepage hero is abstract. A visitor cannot determine whether SYNTH is a CLI, framework, methodology, or platform until scrolling. The above-the-fold message must identify SYNTH and its primary value immediately.

---

## Deliverables

1. **New hero copy**
   - One-line problem statement.
   - One-line what-SYNTH-is statement.
   - One-line AI-native value proposition.

2. **Canonical install command**
   - Single primary install command.
   - Alternative commands clearly marked as alternatives.

3. **Hero call to action**
   - Primary CTA aligned with the next step in the Narrative Ladder.

4. **Visual hierarchy**
   - Order of sections supporting comprehension from problem to proof.

5. **Mobile-first layout**
   - Above-the-fold message remains clear on small screens.

---

## Acceptance

A technically literate developer who has never heard of SYNTH can, within 10 seconds of landing on the homepage, correctly identify that SYNTH is an AI-native execution platform for turning human intent into replayable, governed software.

---

## Phases

### Phase 1 — Copy drafts

Write at least three hero copy variants based on EXP-FIRSTCONTACT-001 narrative.

### Phase 2 — Comprehension test

Show variants to external reviewers and measure understanding.

### Phase 3 — Layout design

Define section order and visual hierarchy.

### Phase 4 — Implementation

Update `website/index.html` and `website/styles.css`.

### Phase 5 — Verification

Re-run WEBSITE-AUDIT-001 first-contact check.

---

## Risks

| Risk | Mitigation |
|---|---|
| Copy becomes marketing-heavy | Anchor every claim to a concrete engineering outcome |
| Losing existing strengths | Preserve seven concepts and install command prominence |
| Mobile degradation | Test on narrow viewports |

---

## Definition of Done

- [ ] New hero copy implemented.
- [ ] Canonical install command chosen and displayed.
- [ ] CTA aligned with Narrative Ladder.
- [ ] Section order supports comprehension.
- [ ] Comprehension test passed.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Draft hero copy variants.
2. Test comprehension.
3. Update `website/index.html`.
4. Adjust styles if needed.
5. Verify links and projection sync.

---

## Completion Notes

Pending.
