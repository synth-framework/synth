# EXP-HOME-012 — Performance

> **Engineering expedition.** Optimize the homepage for fast first paint, smooth animations, and efficient resource loading.

**Status:** Completed (pending acceptance)  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Engineering Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/performance.md`](../design/performance.md).

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

Ensure the homepage loads quickly and remains responsive during interactions, even on slower devices and networks.

---

## Origin Evidence

A heavy interactive workspace can easily become slow. Poor performance undermines the calm-computing principle and frustrates visitors.

---

## Required Change

### 1.1 Loading

- Critical CSS inlined.
- Fonts preloaded.
- JavaScript loaded asynchronously or deferred.
- Lazy-load below-the-fold sections.

### 1.2 Runtime performance

- Use `requestAnimationFrame` for animations.
- Minimize layout thrashing.
- Virtualize long timelines if needed.
- Keep main thread free for interactions.

### 1.3 Budgets

- First Contentful Paint under 1.5 s on 4G.
- Largest Contentful Paint under 2.5 s.
- Total blocking time under 200 ms.
- Cumulative layout shift under 0.1.

### 1.4 Asset optimization

- Optimize images and icons.
- Tree-shake unused code.
- Compress static assets.

---

## Deliverables

1. **Performance Specification** under `docs/design/performance.md`.
2. **Performance budgets** documented.
3. **Lighthouse or equivalent CI checks**.
4. **Optimization implementation** across assets and scripts.

---

## Acceptance Criteria

- Homepage meets documented performance budgets.
- Animations remain at 60 fps during workspace transitions.
- Lighthouse performance score is 90 or above.

---

## Out of Scope

- Responsive implementation (EXP-HOME-010).
- Accessibility (EXP-HOME-011).
- Motion system (EXP-HOME-013).

---

## Success Criteria

The expedition succeeds when the homepage passes performance budgets on desktop and mobile networks.
