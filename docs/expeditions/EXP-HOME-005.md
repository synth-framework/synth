# EXP-HOME-005 — Intent Phase (v2)

> **Product expedition.** Define the Intent phase as the first interactive state inside Mission Studio, not an isolated demo.

**Status:** Completed (pending acceptance)  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-003 (Mission Studio UI Specification), EXP-HOME-004 (Homepage / Mission Studio Integration)  
**Blocks:** EXP-HOME-015

> **Specification:** See [`docs/design/workflow-visualization.md`](../design/workflow-visualization.md).

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

Define how Mission Studio captures visitor intent and transforms it into the first artifact of the SYNTH lifecycle. The Intent phase is the entry point into Mission Studio: it must invite input, validate it, project it as an artifact, and transition naturally into Discovery.

---

## Origin Evidence

Visitors arrive with a goal: "Build a CRM," "Migrate a legacy service," "Add a feature." The Intent phase must make that goal concrete as an artifact and demonstrate that SYNTH begins with understanding before execution.

---

## Required Change

### 1.1 Phase purpose

- Capture raw visitor intent.
- Project intent as an `Intent` artifact.
- Signal that Discovery follows once intent is captured.
- Set expectations: SYNTH does not generate code immediately.

### 1.2 Displayed artifacts

- **Intent Input:** editable field or prompt surface.
- **Intent Artifact:** captured intent rendered as a card.
- **Entry Mode Selector:** Greenfield, Brownfield, Knowledge, Conversation.
- **Helper Text:** concise explanation of what happens next.

### 1.3 Sidebar state

- Intent phase is highlighted.
- Progress indicator shows the beginning of the lifecycle.
- Subsequent phases are pending.

### 1.4 Header state

- Title: "Mission Studio" or active demo mission name.
- Phase badge: "Intent".
- Governance status: "Draft" or not yet governed.

### 1.5 Status badges

- Status: `Idle`, `Listening`, `Captured`, `Ready for Discovery`.

### 1.6 Input behavior

- Accept typed or pasted intent.
- Provide curated example intents for visitors who do not know what to type.
- Validate minimum length and disallow empty input.
- Show a subtle preview of how the intent will be artifacted.

### 1.7 Commands

- `Continue to Discovery` — advances when intent is captured.
- `Choose an example` — populates input with a curated intent.
- `Reset` — clears input and artifact.

### 1.8 Timeline

- Timeline shows Intent as the first step.
- No prior events.
- Replay position is at the beginning of the log.

### 1.9 Animation

- Input field focuses and subtly highlights on entry.
- Intent artifact appears with a calm fade and translate.
- Continue action becomes active only after valid input.

### 1.10 Scroll transition

- Scrolling into the Intent section brings Mission Studio into focus.
- The input field is the focal point.
- Scrolling past Intent triggers the transition to Discovery when input is valid; otherwise, a subtle prompt encourages input.

### 1.11 Acceptance

- Visitor can enter or select intent.
- Intent is projected as an artifact.
- Phase advances to Discovery deterministically.

---

## Deliverables

1. **Intent Phase Specification** under `docs/design/workflow-visualization.md`.
2. **Intent artifact component** with input, preview, and captured states.
3. **Entry mode selector** for Greenfield, Brownfield, Knowledge, Conversation.
4. **Example intent library** for first-time visitors.
5. **Tests** verifying input validation, artifact creation, and phase transition.

---

## Acceptance Criteria

- Visitor can type, paste, or select an intent.
- Empty or invalid input cannot advance the phase.
- Intent is rendered as an `Intent` artifact using catalog components.
- Entry mode changes the context shown but does not break the phase flow.
- Sidebar, header, status badges, and timeline reflect the Intent phase.
- Phase advances to Discovery only after intent is captured.
- Animations respect reduced-motion preferences.

---

## Out of Scope

- Discovery phase behavior (EXP-HOME-006).
- Full Genesis Protocol implementation (EXP-PROGRAM-022).
- Mission approval workflow (EXP-HOME-007).

---

## Success Criteria

The expedition succeeds when a visitor can enter intent and see it become the first governed artifact in under 30 seconds.

---

## Related documents

- `docs/design/workflow-visualization.md`
- `docs/design/genesis-experience.md`
- `docs/design/mission-workspace.md`
- `docs/expeditions/EXP-HOME-003.md`
- `docs/expeditions/EXP-HOME-004.md`
- `docs/expeditions/EXP-HOME-006.md`
