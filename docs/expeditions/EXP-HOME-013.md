# EXP-HOME-013 — Motion System

> **Design expedition.** Define calm, purposeful animation rules for the homepage.

**Status:** Proposed  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Design Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language)  
**Blocks:** EXP-HOME-003, EXP-HOME-015

> **Specification:** See [`docs/design/motion-system.md`](../design/motion-system.md).

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

## Objective

Create a motion system that supports the workspace metaphor without becoming distracting or heavy. Motion should guide attention, explain state changes, and reinforce the calm-computing principle.

---

## Origin Evidence

Interactive homepages often overuse animation. SYNTH's motion must feel intentional and unobtrusive, supporting understanding rather than decoration.

---

## Required Change

### 1.1 Timing

- Default duration: 150–250 ms.
- Longer transitions for workspace state changes: 300–400 ms.
- Stagger delays for artifact appearance: 50–100 ms.

### 1.2 Easing

- Use ease-out for incoming elements.
- Use ease-in-out for state toggles.
- Avoid spring, bounce, or elastic easings.

### 1.3 Properties

- Prefer opacity and transform.
- Avoid animating layout-triggering properties.
- Use `will-change` sparingly.

### 1.4 Purpose

- Entrance: introduce artifacts in order of importance.
- State change: show workspace advancing through Genesis.
- Focus: highlight selected artifact or workflow phase.
- Feedback: confirm user interaction.

### 1.5 Reduced motion

- Respect `prefers-reduced-motion`.
- Provide instant state changes as fallback.

---

## Deliverables

1. **Motion System Specification** under `docs/design/motion-system.md`.
2. **Animation token library** (duration, easing, stagger).
3. **Reference implementations** for entrance, state change, focus, and feedback.
4. **Reduced-motion fallback rules**.

---

## Acceptance Criteria

- All animations use documented tokens.
- No spring or bounce easings.
- Motion respects reduced-motion preference.
- Animations run at 60 fps.

---

## Out of Scope

- Design tokens (EXP-HOME-001).
- Performance budgets (EXP-HOME-012).
- Accessibility audit (EXP-HOME-011).

---

## Success Criteria

The expedition succeeds when every animation on the homepage follows the motion system and feels purposeful rather than decorative.
