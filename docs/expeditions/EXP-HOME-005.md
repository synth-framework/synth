> This expedition is part of **EXP-PROGRAM-027 — Mission Studio Homepage**.

# EXP-HOME-005 — Workflow Visualization

> **Product expedition.** Visualize the SYNTH lifecycle as an interactive flow on the homepage.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** High  
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

Show the SYNTH workflow as a connected, interactive diagram that updates the workspace as the visitor explores each phase.

---

## Origin Evidence

Visitors need to understand how Intent becomes governed software. A static list of steps is less effective than an interactive flow that drives the workspace state.

---

## Required Change

### 1.1 Workflow phases

```text
Intent
  ↓
Discovery
  ↓
Mission
  ↓
Execution
  ↓
Replay
```

### 1.2 Phase details

Each phase exposes:

- Purpose
- Inputs
- Outputs
- Generated artifacts

### 1.3 Interactions

- Hovering a phase highlights related artifacts in the workspace.
- Clicking a phase advances the workspace to that state.
- Scrolling past the workflow section advances phases automatically.

---

## Deliverables

1. **Workflow Visualization Specification** under `docs/design/workflow-visualization.md`.
2. **Interactive workflow component**.
3. **Integration tests** ensuring workspace state syncs with workflow selection.

---

## Acceptance Criteria

- The workflow shows Intent → Discovery → Mission → Execution → Replay.
- Each phase displays purpose, inputs, outputs, and artifacts.
- Interacting with the workflow updates the Mission Workspace.

---

## Out of Scope

- Governance visualization (EXP-HOME-006).
- Replay timeline (EXP-HOME-007).
- Architecture explorer (EXP-HOME-008).

---

## Success Criteria

The expedition succeeds when a visitor can explain the SYNTH workflow after interacting with the visualization.
