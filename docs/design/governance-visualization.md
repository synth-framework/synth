# Governance Visualization Specification

> **Specification for the SYNTH governance before/after comparison on the homepage.** Defines the interactive comparison under EXP-HOME-006.

---

## Purpose

Make governance tangible by comparing two scenarios: one without SYNTH and one with SYNTH.

---

## Comparison structure

### Without SYNTH

```text
Drift
  ↓
Lost decisions
  ↓
Inconsistent state
```

### With SYNTH

```text
Governed
  ↓
Replayable events
  ↓
Deterministic state
```

---

## Visual treatment

- Side-by-side panels on desktop.
- Toggle or tab switch on tablet/mobile.
- Both scenarios use the same Artifact Card variants to show the same project with and without governance.
- Event log, approval boundaries, and replay are highlighted in the "With SYNTH" scenario.

---

## Example content

| Aspect | Without SYNTH | With SYNTH |
|---|---|---|
| Decisions | Lost in chat threads | Recorded as decisions in the event log |
| State | Reconstructed from memory | Rebuilt deterministically from events |
| Changes | Ad-hoc edits | Validated against approved Mission/Expedition |
| History | Unclear | Replayable |

---

## Interactions

- Toggle or slider switches between scenarios.
- Hovering a difference reveals an explanation tooltip.
- Link to governance documentation.

---

## Component taxonomy

- `GovernanceComparison` — outer container.
- `GovernanceScenario` — one side of the comparison.
- `GovernanceDifference` — highlighted difference row.
- `GovernanceToggle` — scenario switcher.

---

## Acceptance criteria

- The comparison clearly contrasts drift vs. governed state.
- Artifacts in both scenarios map to the same SYNTH concepts.
- The visualization explains approval and replay.
- Reduced-motion mode disables scenario transition animations.

---

## Blockers / dependencies

- Depends on Artifact Cards defined in EXP-HOME-004.
- Approval and replay explanations must align with canonical governance documentation.

---

## Related documents

- [Artifact System Specification](artifact-system.md)
- [EXP-HOME-006 — Governance Visualization](../expeditions/EXP-HOME-006.md)
