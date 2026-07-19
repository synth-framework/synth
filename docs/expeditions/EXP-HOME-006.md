# EXP-HOME-006 — Governance Visualization

> **Product expedition.** Explain governance through an interactive before/after comparison on the homepage.

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

Make governance tangible by comparing two scenarios: one without SYNTH (drift, lost decisions, inconsistent state) and one with SYNTH (governed, replayable, deterministic).

---

## Origin Evidence

Governance is abstract. Visitors often do not understand why it matters until they see the consequences of its absence and the benefits of its presence.

---

## Required Change

### 1.1 Comparison structure

```text
Without SYNTH
  ↓
Drift
  ↓
Lost decisions
  ↓
Inconsistent state

With SYNTH
  ↓
Governed
  ↓
Replayable events
  ↓
Deterministic state
```

### 1.2 Visual treatment

- Side-by-side or toggle comparison.
- Use Artifact Cards in both scenarios to show the same project with and without governance.
- Highlight event log, approval boundaries, and replay.

### 1.3 Interactions

- Toggle or slider switches between scenarios.
- Hovering a difference reveals explanation.
- Link to governance documentation.

---

## Deliverables

1. **Governance Visualization Specification** under `docs/design/governance-visualization.md`.
2. **Interactive comparison component**.
3. **Tests** verifying both scenarios render correctly.

---

## Acceptance Criteria

- The comparison clearly contrasts drift vs. governed state.
- Artifacts in both scenarios map to the same SYNTH concepts.
- The visualization explains approval and replay.

---

## Out of Scope

- Workflow visualization (EXP-HOME-005).
- Replay timeline (EXP-HOME-007).
- Capabilities explorer (EXP-HOME-009).

---

## Success Criteria

The expedition succeeds when a visitor can articulate why governance matters after viewing the comparison.
