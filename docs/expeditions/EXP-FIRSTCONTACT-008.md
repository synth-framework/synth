# EXP-FIRSTCONTACT-008 — Experience Projections

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-FIRSTCONTACT-007, EXP-PROGRAM-010  
**Blocks:** EXP-FIRSTCONTACT-006

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

Generate the remaining public experience projections from the canonical journey, after the hardening boundary established by EXP-PROGRAM-010.

---

## Motivation

The superseded EXP-FIRSTCONTACT-004 grouped nine projection targets that are different products with different audiences — website, docs, interactive tutorial, slides, video storyboard, conference demo, AI onboarding, and installer walkthrough. EXP-FIRSTCONTACT-007 delivers the website and documentation projections. The remaining targets depend on stable semantics that EXP-PROGRAM-010 will guarantee (aggregate relationships, snapshot lineage, semantic validation); building rich interactive experiences over incomplete semantics risks polishing an interface on top of unproven foundations.

These targets may be further split into separate expeditions if needed.

---

## Deliverables

1. **Interactive tutorial projection** — step-by-step guided experience derived from the canonical journey.

2. **Slides projection** — presentation deck for talks and demos.

3. **Video storyboard projection** — scene-by-scene storyboard derived from the recorded journey.

4. **Conference demo projection** — scripted demo using the canonical recorded journey.

5. **AI onboarding projection** — prompts and examples for AI agents introducing SYNTH.

6. **Installer walkthrough projection** — first-contact copy shown during and after installation.

---

## Acceptance

Every projection traces to a specific episode of the canonical journey or a specific event in the recorded journey, and builds on the semantics certified by EXP-PROGRAM-010.

---

## Definition of Done

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

## Completion Notes

Pending.
