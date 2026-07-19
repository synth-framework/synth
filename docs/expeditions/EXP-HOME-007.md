# EXP-HOME-007 — Replay Experience

> **Product expedition.** Embed a replay timeline that updates homepage artifacts as the visitor scrubs through events.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace), EXP-HOME-004 (Artifact System)  
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

Demonstrate Replay as a core SYNTH capability by letting visitors scrub through a sample event log and watch the workspace reconstruct state.

---

## Origin Evidence

Replay is a foundational SYNTH concept, but it is hard to explain statically. An interactive timeline makes determinism and state reconstruction visceral.

---

## Required Change

### 1.1 Replay timeline

- Horizontal timeline of events.
- Event markers for Intent, Discovery, Mission, Expedition, Approval, Completion.
- Scrubber to move backward and forward through history.

### 1.2 Scrubbing behavior

- As the scrubber moves, the workspace artifacts update to reflect state at that point.
- Status bar shows replay position and state hash.
- Highlights the event currently under the scrubber.

### 1.3 Sample event log

A deterministic, curated event log representing a complete Genesis → Mission → Expedition lifecycle. It does not depend on visitor input.

---

## Deliverables

1. **Replay Experience Specification** under `docs/design/replay-experience.md`.
2. **Replay timeline component**.
3. **Sample event log** and replay state builder.
4. **Tests** verifying artifact updates match event log position.

---

## Acceptance Criteria

- Scrubbing the timeline updates workspace artifacts deterministically.
- The timeline shows all major lifecycle events.
- Replay position and state hash are visible.

---

## Out of Scope

- Workflow visualization (EXP-HOME-005).
- Governance visualization (EXP-HOME-006).
- Real event log from a repository.

---

## Success Criteria

The expedition succeeds when a visitor can scrub through history and see how SYNTH reconstructs state from events.
