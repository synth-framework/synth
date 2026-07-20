# Genesis Experience Specification

> **Specification for the interactive Genesis demo on the SYNTH Mission Studio Homepage under EXP-HOME-003.**

---

## Purpose

Turn visitor intent into a projected Mission and Expeditions directly on the homepage. The demo makes Genesis concrete in seconds without generating code or mutating repository state.

---

## Blockers / dependencies

- **Blocked by EXP-AI-001 (Genesis Protocol).** The homepage Genesis experience must align with the canonical SYNTH Genesis protocol or a documented, rule-based subset approved for the homepage. Until EXP-AI-001 defines the protocol interface, this expedition cannot be fully implemented.
- Depends on the Mission Workspace defined in EXP-HOME-002.
- Depends on the Artifact Card system defined in EXP-HOME-004.
- Depends on the Motion System defined in EXP-HOME-013.

> **Operator note:** Resolve the EXP-AI-001 dependency before beginning implementation of this expedition. The homepage demo must not invent a divergent Genesis protocol.

---

## Entry modes

Four entry modes change Genesis behavior:

| Mode | Starting point | Example input |
|---|---|---|
| **Greenfield** | Raw intent | "Build a CRM" |
| **Brownfield** | Existing repository | Repository URL or path |
| **Knowledge** | Knowledge graph | Selected knowledge source |
| **Conversation** | Operator briefing | Pasted chat transcript |

Mode selection uses the `SourceSelector` component from LDS-002.

---

## Simplified flow

```text
User input
  ↓
Intent artifact
  ↓
Discovery artifact
  ↓
Unknowns / questions
  ↓
Architecture alternatives
  ↓
Domain model
  ↓
Mission proposal
  ↓
Expedition proposals
```

Each step projects one or more Artifact Cards into the workspace.

---

## Deterministic demo

- The demo uses a curated set of rule-based adapters.
- Output is predictable and reviewable for known example inputs.
- No remote model calls are made during the homepage demo.
- The same input and mode always produce the same artifacts.

### Example inputs

| Input | Mode | Expected artifacts |
|---|---|---|
| "Build a CRM" | Greenfield | Intent → Discovery → Unknowns → Domain → Mission → Expeditions |
| "SaaS with auth and billing" | Greenfield | Intent → Discovery → Unknowns → Domain → Mission → Expeditions |

---

## No mutation

- The homepage Genesis experience is read-only and proposal-only.
- It does not create repository state.
- It does not emit runtime events.
- It does not write to the local file system.

---

## Workspace integration

- The Genesis demo drives the Mission Workspace state machine.
- Each flow step maps to a workspace state:
  - Intent → `Intent`
  - Discovery → `Discovery`
  - Unknowns → `Constraints`
  - Architecture alternatives / Domain → `Domain`
  - Mission proposal → `Mission`
  - Expedition proposals → `Expeditions`

---

## Artifacts produced

| Step | Artifact type | Content |
|---|---|---|
| Intent | Intent Card | Raw user request, source mode |
| Discovery | Discovery Card | Extracted findings, observations |
| Unknowns | Artifact list | Questions or missing evidence |
| Domain | Domain Card | Entities, relationships, bounded contexts |
| Mission | Mission Card | Purpose, objectives, success criteria |
| Expeditions | Expedition Cards | Subject, goal, dependencies |

---

## Interactions

- Visitor types an intent or selects a mode.
- Demo advances through steps automatically with a brief pause between each.
- Visitor can pause, resume, or restart the demo.
- Visitor can click any artifact to inspect details.
- Progress is shown in the Genesis Navigator.

---

## Component taxonomy

- `GenesisDemo` — container orchestrating the demo.
- `IntentInput` — text input for visitor intent.
- `SourceSelector` — mode selection cards.
- `DemoController` — play, pause, restart controls.
- `ArtifactProgression` — manages ordered appearance of artifacts.

---

## Acceptance criteria

- A visitor can type an intent and see artifacts appear progressively.
- The flow covers Intent, Discovery, Unknowns, Architecture/Domain, Mission, and Expeditions.
- Entry modes include Greenfield, Brownfield, Knowledge, and Conversation.
- No code is generated.
- Output is deterministic for the same input and mode.
- All homepage copy uses SYNTH public vocabulary.
- The demo does not mutate repository state or emit runtime events.

---

## Definition of Done

- [ ] Specification complete.
- [ ] Rule-based demo adapters defined.
- [ ] Example inputs and expected outputs documented.
- [ ] **EXP-AI-001 (Genesis Protocol) dependency resolved (external blocker).**
- [ ] Implementation advances the workspace through Genesis states deterministically.
- [ ] Tests verify deterministic output for example inputs.

---

## Out of scope

- Full Genesis implementation (EXP-PROGRAM-022).
- Mission approval workflow.
- Repository materialization.
- Real AI model integration.

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [Motion System Specification](motion-system.md)
- [EXP-HOME-003 — Genesis Experience](../expeditions/EXP-HOME-003.md)
- [EXP-AI-001 — Genesis Protocol](../expeditions/EXP-AI-001.md)
