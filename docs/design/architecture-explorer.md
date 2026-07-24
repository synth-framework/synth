# Architecture Explorer Specification

> **Specification for the interactive layered architecture diagram on the SYNTH homepage.** Defines the layer stack and interactions under EXP-HOME-008.

---

## Purpose

Visualize SYNTH's layered architecture so visitors can explore how Intent flows through Knowledge, Mission, Expedition, Events, Kernel, and Runtime.

---

## Architecture stack

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

---

## Layer details

| Layer | Responsibility | Produces |
|---|---|---|
| Intent | Capture and validate human intent. | Intent artifact |
| Knowledge | Extract and model what is known. | Discovery, Domain artifacts |
| Mission | Define and approve strategic goals. | Mission artifact |
| Expedition | Plan and execute bounded work. | Expedition artifacts |
| Events | Record immutable state changes. | Event log |
| Kernel | Coordinate governance and execution. | Approved transitions |
| Runtime | Execute capabilities and produce state. | State, Replay proof |

---

## Interactions

- **Hover:** reveals documentation and responsibility for the layer.
- **Click:** focuses the workspace on artifacts produced by that layer.
- **Smooth transitions** between focused layers.

---

## Visual treatment

- Vertical stack.
- Semantic color per layer (from LDS-002).
- Subtle connection lines showing data flow.
- Active layer is elevated and expanded.

---

## Component taxonomy

- `ArchitectureStack` — outer container.
- `ArchitectureLayer` — individual layer.
- `ArchitectureFlow` — connection lines.
- `ArchitectureLayerDetail` — hover/click detail panel.

---

## Acceptance criteria

- All SYNTH layers are represented.
- Hovering reveals layer responsibility.
- Clicking focuses the workspace on relevant artifacts.
- Layers use semantic colors from LDS-002.

---

## Blockers / dependencies

- Depends on the Mission Workspace state controller defined in EXP-HOME-002.
- Artifact focus depends on the Artifact System defined in EXP-HOME-004.

---

## Related documents

- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [EXP-HOME-008 — Architecture Explorer](../expeditions/EXP-HOME-008.md)
