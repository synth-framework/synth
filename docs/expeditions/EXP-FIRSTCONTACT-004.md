# EXP-FIRSTCONTACT-004 — Experience Projection System

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-002, EXP-FIRSTCONTACT-003  
**Blocks:** EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-006

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

Generate every public first-contact experience from the canonical journey and recorded evidence.

---

## Motivation

Without a projection system, each medium reinvents the story. A deterministic projection system ensures that the website, documentation, tutorials, videos, installer walkthrough, and AI onboarding all derive from the same authoritative First Contact Specification and canonical recorded journey.

---

## Deliverables

1. **Projection manifest**
   - Declared targets derived from the canonical journey.

2. **Website projection**
   - Static pages for each journey episode.

3. **Documentation projection**
   - Tutorial and explanation pages aligned with the journey.

4. **Interactive tutorial projection**
   - Step-by-step guided experience.

5. **Slides projection**
   - Presentation deck for talks and demos.

6. **Video storyboard projection**
   - Scene-by-scene storyboard derived from the recorded journey.

7. **Conference demo projection**
   - Scripted demo using the canonical recorded journey.

8. **AI onboarding projection**
   - Prompts and examples for AI agents introducing SYNTH.

9. **Installer walkthrough projection**
   - First-contact copy shown during and after installation.

---

## Acceptance

Every public first-contact artifact can be traced back to a specific episode of the canonical journey or a specific event in the recorded journey.

---

## Phases

### Phase 1 — Define projection targets

List every surface that needs a first-contact projection.

### Phase 2 — Design projection templates

Create reusable templates for website pages, docs, slides, scripts, and prompts.

### Phase 3 — Implement the projection engine

Build or extend the documentation projection system to consume the First Contact Specification.

### Phase 4 — Generate initial projections

Produce the first set of public artifacts.

### Phase 5 — Validate traceability

Verify that every generated artifact maps to the canonical source.

---

## Risks

| Risk | Mitigation |
|---|---|
| Projection system over-engineered | Start with static generation; avoid runtime complexity |
| Targets diverge from canonical journey | Enforce traceability checks in `npm run govern` |
| Maintenance burden | Generate artifacts in CI, not by hand |

---

## Definition of Done

- [ ] Projection manifest documented.
- [ ] Website projection generated.
- [ ] Documentation projection generated.
- [ ] Interactive tutorial projection generated.
- [ ] Slides projection generated.
- [ ] Video storyboard projection generated.
- [ ] Conference demo projection generated.
- [ ] AI onboarding projection generated.
- [ ] Installer walkthrough projection generated.
- [ ] Traceability validation passes.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Consume the First Contact Specification from EXP-FIRSTCONTACT-002.
2. Consume the canonical recorded journey from EXP-FIRSTCONTACT-003.
3. Define projection targets and templates.
4. Implement generation scripts.
5. Generate and validate initial projections.

---

## Completion Notes

Pending.
