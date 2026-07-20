# EXP-HOME-002 — Mission Workspace

> **Architecture expedition.** Define the workspace layout, panels, and state machine for the homepage.

**Status:** Completed (pending acceptance)  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 (Mission Studio Design Language)  
**Blocks:** EXP-HOME-003, EXP-HOME-007, EXP-HOME-010

> **Specification:** See [`docs/design/mission-workspace.md`](../design/mission-workspace.md).

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

Define the centerpiece of the homepage: a single, persistent Mission Workspace that visitors interact with as they scroll and explore SYNTH.

---

## Origin Evidence

Traditional homepages navigate between disconnected sections. SYNTH's homepage should feel like one continuous workspace where scrolling changes state rather than loading new pages.

---

## Required Change

### 1.1 State machine

```text
Idle
  ↓
Intent
  ↓
Discovery
  ↓
Constraints
  ↓
Domain
  ↓
Mission
  ↓
Expeditions
  ↓
Governance
  ↓
Replay
```

### 1.2 Panels

- **Left:** Genesis Navigator showing lifecycle phases.
- **Center:** Artifact display area.
- **Bottom:** Status bar (Replay, Governance, Evidence, Kernel readiness).

### 1.3 Persistence

The workspace remains pinned during scroll. Sections of the homepage control workspace state rather than replacing it.

---

## Deliverables

1. **Mission Workspace Specification** under `docs/design/mission-workspace.md`.
2. **State machine definition** with transitions and triggers.
3. **Panel layout wireframes** for desktop and tablet.
4. **Component architecture** for workspace shell.

---

## Acceptance Criteria

- The workspace state advances deterministically as the visitor interacts.
- Panels are clearly delineated and consistent across phases.
- The workspace is the dominant visual element on the homepage.

---

## Out of Scope

- Genesis experience content (EXP-HOME-003).
- Artifact card system (EXP-HOME-004).
- Responsive breakpoints (EXP-HOME-010).

---

## Success Criteria

The expedition succeeds when the workspace can host every homepage interaction without feeling like a collection of separate pages.
