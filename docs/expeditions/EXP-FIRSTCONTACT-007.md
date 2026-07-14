# EXP-FIRSTCONTACT-007 — Product Positioning

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
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

Define SYNTH's category and contrast it with the tools visitors are most likely to compare it to.

---

## Motivation

The audit found that visitors will compare SYNTH to CI/CD, AI coding assistants, Git, Terraform, and project management tools. The website currently does not address these comparisons, so visitors must infer differentiation themselves.

---

## Deliverables

1. **Comparison matrix**
   - SYNTH vs. CI/CD, AI coding assistants, Git, Terraform/Pulumi, project management tools.
   - Dimensions: intent capture, execution, replay, governance, AI-native.

2. **Category statement**
   - One sentence defining SYNTH's category (e.g., "AI-native execution platform").

3. **Positioning page**
   - `website/positioning.html` or equivalent explaining why SYNTH is different.

4. **Integration with homepage**
   - Homepage links to positioning page or includes a summary section.

5. **Plain-language differentiation**
   - Each comparison uses plain language, not SYNTH-specific jargon.

---

## Acceptance

A visitor can explain why SYNTH is not simply CI/CD, an AI assistant, or a project management tool after reading the positioning page.

---

## Phases

### Phase 1 — Competitor identification

List the tools visitors are likely to compare SYNTH to.

### Phase 2 — Dimension definition

Define comparison dimensions relevant to SYNTH's value.

### Phase 3 — Matrix creation

Fill the matrix with honest, defensible comparisons.

### Phase 4 — Page creation

Create positioning page.

### Phase 5 — Cross-linking

Link from homepage and architecture page.

---

## Risks

| Risk | Mitigation |
|---|---|
| Comparisons become marketing fluff | Anchor each claim to a concrete capability |
| Offending other projects | Keep tone factual and respectful |
| Overlaps with "Why SYNTH" | Positioning focuses on category; "Why SYNTH" focuses on problem |

---

## Definition of Done

- [ ] Comparison matrix documented.
- [ ] Category statement defined.
- [ ] Positioning page created.
- [ ] Homepage links to positioning.
- [ ] Plain-language differentiation verified.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Identify comparison tools.
2. Define dimensions.
3. Create matrix.
4. Write positioning page.
5. Link and verify.

---

## Completion Notes

Pending.
