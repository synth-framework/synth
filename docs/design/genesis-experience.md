# Genesis Experience Specification

> **Specification for the SYNTH Mission Studio homepage experience under EXP-HOME-003.**
> Mission Studio is a persistent application embedded in the homepage. It guides visitors through the full SYNTH lifecycle — Intent → Discovery → Mission → Expeditions → Governance → Replay → Architecture → Repository Summary — using deterministic, browser-native execution.

---

## Purpose

Turn visitor intent into a governed Mission and replayable repository projection directly on the homepage. The experience makes Genesis, Replay, and Governance concrete in seconds without generating code, mutating repository state, or calling remote models.

---

## Blockers / dependencies

- Depends on the Mission Studio Design System defined in `docs/design/lds-002.md` (EXP-HOME-001).
- Depends on the Mission Studio Component Catalog defined in `website/js/components.js` (EXP-HOME-002).
- Depends on the Mission Studio Runtime defined in `packages/homepage-runtime` (EXP-HOME-016 through EXP-HOME-024).

> **Resolved:** The EXP-AI-001 dependency is satisfied by the deterministic `HomepageRuntime` and `DemoOperator`. The homepage demo does not diverge from SYNTH concepts; it projects a rule-based subset of the Genesis protocol approved for browser execution.

---

## Entry modes

Four entry modes change how intent is interpreted:

| Mode | Starting point | Example input |
|---|---|---|
| **Greenfield** | Raw intent | "Build a CRM" |
| **Brownfield** | Existing repository | "Modernize a legacy CRM" |
| **Knowledge** | Knowledge graph | "Extend the canonical task model" |
| **Conversation** | Operator briefing | "From our Slack thread about the CRM" |

The current homepage implementation focuses on Greenfield mode; the runtime interface accepts all four modes.

---

## Lifecycle flow

Mission Studio drives the full SYNTH lifecycle:

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
  ↓
Architecture
  ↓
Repository Summary
  ↓
Complete → Mission Studio releases → Supporting sections
```

Each step projects one or more Artifact Cards into the workspace.

---

## Persistent application shell

Mission Studio is composed of a single persistent shell:

```text
Header
  ↓
Sidebar    Workspace
  ↓          ↓
Footer
```

- **Header:** global identity, Mission title, current phase badge, governance status, theme toggle.
- **Sidebar:** phase navigation with active/highlight/progress states.
- **Workspace:** artifact display area for the active phase; scroll transitions tied to page scroll.
- **Footer:** runtime status, evidence count, replay position/state hash, repository summary.

---

## Scroll-driven state machine

Page scroll advances and reverses Mission Studio phases while the shell remains sticky:

| Scroll segment | Phase | Artifacts |
|---|---|---|
| 0% | Intent | Intro surface, intent input, examples |
| 10% | Discovery | Intent card, Discovery card, Evidence |
| 20% | Constraints | Discovery + Unknowns |
| 30% | Domain | Domain card |
| 40% | Mission | Mission card |
| 50% | Expeditions | Expedition cards |
| 60% | Governance | Expeditions + Evidence |
| 70% | Replay | Replay timeline + event artifacts |
| 80% | Architecture | Architecture layer cards |
| 90% | Repository Summary | Repository summary card |
| 100% | Complete | Shell releases; supporting sections scroll normally |

---

## Deterministic demo

- The demo uses the `HomepageRuntime` with rule-based adapters.
- Output is predictable and reviewable for known example inputs.
- No remote model calls are made during the homepage demo.
- The same input and mode always produce the same artifacts.

### Example inputs

| Input | Mode | Expected artifacts |
|---|---|---|
| "Build a CRM" | Greenfield | Intent → Discovery → Unknowns → Domain → Mission → Expeditions → Architecture → Repository |
| "SaaS with auth and billing" | Greenfield | Intent → Discovery → Unknowns → Domain → Mission → Expeditions (+ auth) → Architecture → Repository |

---

## No mutation

- The homepage Genesis experience is read-only and proposal-only.
- It does not create repository state.
- It does not write to the local file system.
- It emits no external events; replay uses an in-memory sample event log.

---

## Runtime events

Mission Studio reacts to runtime events projected through the `MissionRuntime` interface:

```text
intent:captured
discovery:started
discovery:completed
constraint:identified
domain:mapped
mission:proposed
expedition:proposed
governance:visualized
replay:advanced
replay:completed
architecture:resolved
repository:synced
```

---

## Accessibility

- Keyboard-only navigation through phases and artifacts.
- Screen reader announcements for phase changes via status bar updates.
- Focus management during sticky transitions.
- Reduced-motion support collapses animations.

---

## Component taxonomy

- `MissionStudioShell` — persistent application container.
- `WorkspaceHeader` — title, phase, status, theme toggle.
- `WorkspaceFooter` — runtime status, evidence, replay, repository summary.
- `Sidebar` — phase navigation and progress.
- `Workspace` — artifact display and scroll transitions.
- `ArtifactCard` variants — Intent, Discovery, Unknowns, Domain, Mission, Expedition, Evidence, Architecture, Repository.
- `ReplayControls` — scrubbable replay timeline.
- `IntentSurface` — input and curated examples.

---

## Acceptance criteria

- Mission Studio behaves as a single persistent application, not a series of separate pages.
- Header, sidebar, workspace, and footer are always present during the lifecycle.
- Every phase has documented purpose, artifacts, sidebar state, header state, status badges, commands, timeline, animation, and scroll transition.
- Sidebar progress synchronizes with workspace phase.
- Sticky behavior pins Mission Studio for the lifecycle and releases cleanly.
- Responsive behavior preserves usability across all breakpoints.
- Keyboard navigation and screen reader announcements work for all phase transitions.
- Runtime events project correctly into UI state.
- The demo does not mutate repository state or emit external events.

---

## Definition of Done

- [x] Specification complete.
- [x] Rule-based demo adapters defined in `packages/homepage-runtime`.
- [x] Example inputs and expected outputs documented.
- [x] EXP-AI-001 dependency resolved via deterministic `HomepageRuntime`.
- [x] Implementation advances the workspace through all lifecycle states deterministically.
- [x] Tests verify deterministic output for example inputs.

---

## Out of scope

- Full Genesis implementation (EXP-PROGRAM-022).
- Mission approval workflow with real operator.
- Repository materialization from the homepage.
- Real AI model integration.

---

## Related documents

- [LDS-002 — Mission Studio Design System](lds-002.md)
- [Mission Workspace Specification](mission-workspace.md)
- [Artifact System Specification](artifact-system.md)
- [Motion System Specification](motion-system.md)
- [EXP-HOME-003 — Mission Studio UI Specification](../expeditions/EXP-HOME-003.md)
- [EXP-PROGRAM-027 — Mission Studio Homepage](../expeditions/EXP-PROGRAM-027.md)
