# Workflow Visualization Specification

> **Specification for the SYNTH lifecycle workflow visualization on the homepage.** Defines the interactive flow diagram under EXP-HOME-005.

---

## Purpose

Show the SYNTH workflow as a connected, interactive diagram that updates the Mission Workspace as the visitor explores each phase.

---

## Workflow phases

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

Each phase exposes:

- **Purpose** — why this phase exists.
- **Inputs** — what enters the phase.
- **Outputs** — what leaves the phase.
- **Generated artifacts** — which Artifact Cards appear.

---

## Phase details

| Phase | Purpose | Inputs | Outputs | Artifacts |
|---|---|---|---|---|
| Intent | Capture human intent. | Operator briefing, raw idea, conversation. | Approved intent statement. | Intent Card |
| Discovery | Explore what is known and unknown. | Intent, repository, knowledge. | Findings, unknowns, constraints. | Discovery Card, Evidence Card |
| Mission | Define the strategic goal. | Discovery results, constraints. | Approved mission. | Mission Card |
| Execution | Run expeditions to build or validate. | Approved mission. | Completed expeditions, evidence. | Expedition Card, Evidence Card |
| Replay | Prove state from events. | Event log. | Verified state, proof artifact. | Replay Card |

---

## Layout

- **Desktop:** horizontal flow across the workspace top or side.
- **Tablet/Mobile:** vertical stack or compact stepper.
- Active phase is highlighted; completed phases show a check.

---

## Interactions

- **Hover:** highlights related Artifact Cards in the workspace.
- **Click:** advances the workspace to that state.
- **Scroll:** passing the workflow section advances phases automatically in sync with workspace scroll progress.

---

## Component taxonomy

- `WorkflowFlow` — outer container.
- `WorkflowPhase` — individual phase node.
- `WorkflowConnector` — line connecting phases.
- `WorkflowArtifactHint` — mini preview of artifacts produced by a phase.

---

## Acceptance criteria

- The workflow shows Intent → Discovery → Mission → Execution → Replay.
- Each phase displays purpose, inputs, outputs, and artifacts.
- Interacting with the workflow updates the Mission Workspace.
- Workflow advancement is deterministic and reversible by scrolling up.

---

## Blockers / dependencies

- Workspace state synchronization depends on the Mission Workspace controller defined in EXP-HOME-002.
- Artifact highlighting depends on the Artifact System defined in EXP-HOME-004.

---

## Related documents

- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [EXP-HOME-005 — Workflow Visualization](../expeditions/EXP-HOME-005.md)
