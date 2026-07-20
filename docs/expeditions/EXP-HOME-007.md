# EXP-HOME-007 — Mission Phase (v2)

> **Product expedition.** Define the Mission phase inside Mission Studio: Mission artifact, approval boundary, and the commitment that governs all downstream work.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Mission Studio UI Specification), EXP-HOME-004 (Homepage / Mission Studio Integration)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/replay-experience.md`](../design/replay-experience.md).

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

Transform the former Replay Experience scope into the Mission phase of Mission Studio. This phase displays the proposed Mission, explains its purpose and success criteria, surfaces the approval boundary, and demonstrates that governance begins at the moment of commitment.

---

## Origin Evidence

A Mission is the contract between intent and execution. Visitors must understand that SYNTH does not proceed until the Mission is approved, and that the approval boundary is what makes subsequent work governable and replayable.

---

## Required Change

### 1.1 Phase purpose

- Present the proposed Mission derived from intent and Discovery.
- Show purpose, objectives, success criteria, and constraints.
- Surface the approval boundary.
- Transition to Expeditions only after Mission is approved.

### 1.2 Mission artifact

- **Mission Card:** subject, purpose, objectives, success criteria.
- **Evidence Summary:** findings and unknowns that informed the Mission.
- **Constraint List:** constraints carried forward from Discovery.
- **Approval Boundary:** visual indicator that Mission approval is required before Expeditions.

### 1.3 Approval boundary

- Mission starts in `Proposed` state.
- Approval action is available after the Mission has been reviewed.
- Approval emits a runtime event and advances governance status.
- The boundary is visible: unapproved Mission blocks Expedition creation.

### 1.4 Sidebar state

- Mission phase is highlighted.
- Discovery is marked completed.
- Approval status appears in the sidebar phase entry.
- Progress indicator advances only after approval.

### 1.5 Status badges

- Status: `Proposed`, `Under Review`, `Approved`, `Governed`.

### 1.6 Commands

- `Approve Mission` — advances governance state and unlocks Expeditions.
- `Review Discovery` — returns to Discovery phase.
- `View Evidence` — highlights evidence summary.

### 1.7 Scroll transition

- Entering Mission phase focuses the Mission artifact.
- Scrolling forward reveals objectives, success criteria, constraints, and approval boundary in sequence.
- Approval is the gating action for advancing to Expeditions.

### 1.8 Animation

- Mission artifact enters with emphasis appropriate to its central role.
- Approval boundary animates from pending to approved state.
- Unlocking Expeditions is signaled through sidebar and workspace together.

---

## Deliverables

1. **Mission Phase Specification** under `docs/design/replay-experience.md`.
2. **Mission artifact component** with subject, purpose, objectives, success criteria, and constraints.
3. **Approval boundary component** with pending and approved states.
4. **Governance status integration** reflecting Mission approval.
5. **Tests** verifying Mission rendering, approval flow, and phase gating.

---

## Acceptance Criteria

- Mission artifact displays purpose, objectives, success criteria, and constraints.
- Approval boundary is visible and actionable.
- Mission must be approved before Expeditions phase is reachable.
- Approval emits a runtime event and updates governance status.
- Sidebar, header, and status badges reflect Mission state.
- Scroll transitions guide the visitor through Mission content before approval.
- Animations respect reduced-motion preferences.

---

## Out of Scope

- Discovery phase (EXP-HOME-006).
- Expeditions phase (EXP-HOME-008).
- Full Mission lifecycle implementation (EXP-PROGRAM-022).
- Real repository mutation.

---

## Success Criteria

The expedition succeeds when a visitor can articulate the Mission, understand why approval matters, and see that Expeditions are unlocked only after governance approval.

---

## Related documents

- `docs/design/replay-experience.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-006.md`
- `docs/expeditions/EXP-HOME-008.md`
