# EXP-HOME-011 — Accessibility

> **Engineering expedition.** Ensure the homepage meets WCAG standards and is usable by everyone.

**Status:** Proposed  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace), EXP-HOME-004 (Artifact System)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/accessibility.md`](../design/accessibility.md).

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

Make the Mission Studio Homepage accessible: keyboard navigable, screen-reader friendly, with sufficient contrast and focus management.

---

## Origin Evidence

Interactive workspaces often fail accessibility. The homepage must be usable by visitors who rely on keyboards or assistive technologies.

---

## Required Change

### 1.1 Keyboard navigation

- Tab order follows visual layout.
- Enter/Space activates cards and buttons.
- Arrow keys navigate timeline and workflow.
- Escape closes expanded panels.

### 1.2 Screen readers

- All interactive elements have accessible names.
- Live regions announce workspace state changes.
- Artifact cards expose role, state, and value.

### 1.3 Contrast and visual

- Text meets WCAG AA contrast ratios.
- Focus indicators are visible.
- Motion respects `prefers-reduced-motion`.

### 1.4 Semantic HTML

- Use landmark regions.
- Use headings hierarchically.
- Use lists and buttons correctly.

---

## Deliverables

1. **Accessibility Specification** under `docs/design/accessibility.md`.
2. **Keyboard navigation map**.
3. **Automated accessibility tests** using a tool such as axe-core.
4. **Manual audit checklist**.

---

## Acceptance Criteria

- Homepage passes automated WCAG 2.1 AA checks.
- All interactions are reachable by keyboard.
- Screen readers announce state changes correctly.
- Reduced-motion mode disables non-essential animation.

---

## Out of Scope

- Responsive implementation (EXP-HOME-010).
- Performance (EXP-HOME-012).
- Motion system (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when the homepage passes both automated and manual accessibility audits.
