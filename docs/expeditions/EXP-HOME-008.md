# EXP-HOME-008 — Architecture Explorer

> **Product expedition.** Build an interactive layered architecture diagram for the homepage.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace)  
**Blocks:** EXP-HOME-015

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

Visualize SYNTH's layered architecture so visitors can explore how Intent flows through Knowledge, Mission, Expedition, Events, Kernel, and Runtime.

---

## Origin Evidence

SYNTH's architecture is layered and abstract. A static diagram is insufficient; visitors should be able to hover and reveal the role of each layer.

---

## Required Change

### 1.1 Architecture stack

```text
Intent
  ↓
Knowledge
  ↓
Mission
  ↓
Expedition
  ↓
Events
  ↓
Kernel
  ↓
Runtime
```

### 1.2 Interactions

- Hovering a layer reveals documentation and responsibility.
- Clicking a layer focuses the workspace on artifacts produced by that layer.
- Smooth transitions between focused layers.

### 1.3 Visual treatment

- Vertical stack.
- Semantic colors per layer.
- Subtle connections showing data flow.

---

## Deliverables

1. **Architecture Explorer Specification** under `docs/design/architecture-explorer.md`.
2. **Interactive layered diagram component**.
3. **Layer documentation content** linked from the explorer.

---

## Acceptance Criteria

- All SYNTH layers are represented.
- Hovering reveals layer responsibility.
- Clicking focuses the workspace on relevant artifacts.

---

## Out of Scope

- Capabilities explorer (EXP-HOME-009).
- Workflow visualization (EXP-HOME-005).
- Replay timeline (EXP-HOME-007).

---

## Success Criteria

The expedition succeeds when a visitor can explain SYNTH's layered architecture after exploring the diagram.
