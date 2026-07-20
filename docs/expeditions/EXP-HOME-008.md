# EXP-HOME-008 — Expeditions Phase (v2)

> **Product expedition.** Define the Expeditions phase inside Mission Studio: Expedition proposals, dependencies, and the work plan derived from an approved Mission.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Mission Studio UI Specification), EXP-HOME-004 (Homepage / Mission Studio Integration)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/architecture-explorer.md`](../design/architecture-explorer.md).

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

Transform the former Architecture Explorer scope into the Expeditions phase of Mission Studio. This phase displays Expedition proposals generated from the approved Mission, shows dependencies, and demonstrates how SYNTH breaks a Mission into governable units of work.

---

## Origin Evidence

Visitors need to see how a high-level intent becomes a concrete plan. Expeditions are the bridge between Mission and execution. This phase must make dependencies, ordering, and governance visible.

---

## Required Change

### 1.1 Phase purpose

- Display Expedition proposals derived from the approved Mission.
- Show dependencies and ordering between Expeditions.
- Allow selection or prioritization of Expeditions.
- Prepare the visitor for Governance & Replay.

### 1.2 Expedition cards

- **Expedition Card:** subject, goal, status, estimated effort, priority.
- **Dependency Graph:** visual connection between dependent Expeditions.
- **Proposal Set:** group of Expeditions proposed together.
- **Selected Expedition:** highlighted card when selected by the visitor or runtime.

### 1.3 Proposals

- Proposals are generated deterministically from the Mission and Discovery artifacts.
- Each proposal includes rationale linking it back to Discovery findings or constraints.
- Proposals remain read-only on the homepage; they do not create repository state.

### 1.4 Dependencies

- Dependencies are rendered as connections between Expedition cards.
- Circular dependencies are detected and surfaced as errors.
- Critical path is highlighted.

### 1.5 Sidebar state

- Expeditions phase is highlighted.
- Mission is marked completed and approved.
- Progress indicator advances.
- Expedition count and dependency status appear as badges.

### 1.6 Status badges

- Status: `Proposed`, `Selected`, `Blocked`, `Ready`, `In Progress`, `Completed`.

### 1.7 Scroll transition

- Entering Expeditions reveals the proposal set.
- Scrolling forward highlights dependencies and critical path.
- Selection or advancement triggers the transition to Governance & Replay.

### 1.8 Animation

- Expedition cards enter with staggered motion.
- Dependency lines draw progressively.
- Selection state crossfades between cards.

---

## Deliverables

1. **Expeditions Phase Specification** under `docs/design/architecture-explorer.md`.
2. **Expedition card component** with subject, goal, status, effort, and priority.
3. **Dependency graph component** for Expedition relationships.
4. **Proposal set renderer** linking Expeditions to Mission and Discovery.
5. **Tests** verifying Expedition rendering, dependency logic, and phase transition.

---

## Acceptance Criteria

- Expedition cards are rendered from the component catalog.
- Each Expedition links back to Mission objectives or Discovery findings.
- Dependencies are visible and the critical path is highlighted.
- Sidebar, header, and status badges reflect Expeditions state.
- Phase advances to Governance & Replay after Expedition selection or review.
- Proposals are read-only and do not mutate repository state.
- Animations respect reduced-motion preferences.

---

## Out of Scope

- Mission phase (EXP-HOME-007).
- Governance & Replay phase (EXP-HOME-009).
- Full Expedition lifecycle implementation (EXP-PROGRAM-022).

---

## Success Criteria

The expedition succeeds when a visitor can explain how a Mission becomes a set of ordered Expeditions and why dependencies matter.

---

## Related documents

- `docs/design/architecture-explorer.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-007.md`
- `docs/expeditions/EXP-HOME-009.md`
