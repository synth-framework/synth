# EXP-AIFC-007 — Mission Materialization Pipeline

> **Architecture expedition.** Initialize repository, manifest, Mission, and Expedition proposals only after Discovery approval.

**Status:** Completed and accepted  
**Started:** 2026-07-19  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact  
**Depends On:** EXP-AIFC-006  
**Blocks:** EXP-AIFC-008, EXP-AIFC-009

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Build the pipeline that turns an approved Discovery artifact and selected architecture into a governed SYNTH project. The pipeline must:

- Require explicit Discovery approval.
- Initialize the repository only if one does not exist.
- Create the project manifest.
- Generate the first Mission from the Discovery artifact.
- Propose initial Expeditions.
- Emit the required runtime events.

---

## Required Change

### 7.1 Approval gate

Materialization must check that the Discovery artifact has been approved. Without approval, the command fails with an explanation.

### 7.2 Map Discovery artifact to Mission

Translate artifact fields into Mission fields:

```text
intent          → Mission purpose and subject
audience        → stakeholder constraints
constraints     → acceptance criteria
selected architecture → implementation approach
```

### 7.3 Propose Expeditions

Generate initial Expedition proposals that establish the baseline, verify assumptions, and begin implementation.

### 7.4 Emit events

Materialization must emit events so the resulting state is replayable.

---

## Deliverables

1. **Materialization pipeline** under `src/first-contact/materialize/`.
2. **CLI command** for materialization (e.g., `synth first-contact materialize`).
3. **Discovery-to-Mission mapping** rules.
4. **Initial Expedition proposal generator**.
5. **ADR** on materialization semantics and event model.

---

## Acceptance Criteria

- Materialization requires Discovery approval.
- No repository state is created before the approval gate passes.
- The generated Mission accurately reflects the approved Discovery artifact.
- Initial Expedition proposals are deterministic for equivalent artifacts.
- Runtime events are emitted and replayable.

---

## Out of Scope

- Intent extraction (EXP-AIFC-003).
- Architecture projection (EXP-AIFC-005).
- Capability verification (EXP-AIFC-006).
- CLI operator experience design (EXP-AIFC-008).

---

## Success Criteria

The expedition succeeds when an approved Discovery artifact can be transformed into a governed project with a Mission and Expedition proposals in a single, deterministic command.
