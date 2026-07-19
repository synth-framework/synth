# EXP-HOME-004 — Artifact System

> **Architecture expedition.** Define Artifact Card variants and behavior for the homepage.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language)  
**Blocks:** EXP-HOME-003, EXP-HOME-007, EXP-HOME-014

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

Create a unified Artifact Card system that represents every object produced during the Genesis demo and across the homepage. Cards are not decorative; each maps to a SYNTH concept.

---

## Origin Evidence

The homepage needs to display Intent, Discovery, Domain, Mission, Expedition, Evidence, Replay, and Architecture artifacts. Without a consistent card system, the workspace will feel fragmented.

---

## Required Change

### 1.1 Card variants

- **Intent Card:** raw user request.
- **Discovery Card:** extracted findings and unknowns.
- **Domain Card:** entities, relationships, bounded contexts.
- **Mission Card:** purpose, objectives, success criteria.
- **Expedition Card:** subject, goal, status.
- **Evidence Card:** observation, confidence, source.
- **Replay Card:** event, state transition, timestamp.
- **Architecture Card:** layer, responsibility, dependency.

### 1.2 Card anatomy

- Semantic color border.
- Type icon or badge.
- Title and summary.
- Confidence or status indicator where applicable.
- Expandable detail panel.

### 1.3 Interactions

- Hover: subtle elevation.
- Click: expand details or focus in workspace.
- Timeline scrub (for Replay cards): update card state.

---

## Deliverables

1. **Artifact System Specification** under `docs/design/artifact-system.md`.
2. **Card component library** with all variants.
3. **Storybook or demo page** showing each variant.
4. **Mapping table** linking each card to a SYNTH concept.

---

## Acceptance Criteria

- Every card variant maps to a real SYNTH artifact type.
- Cards share a consistent anatomy and interaction model.
- Cards are accessible and responsive.

---

## Out of Scope

- Genesis experience logic (EXP-HOME-003).
- Workflow visualization (EXP-HOME-005).
- Replay timeline (EXP-HOME-007).

---

## Success Criteria

The expedition succeeds when any artifact produced by the Genesis demo can be rendered by an existing card variant.
