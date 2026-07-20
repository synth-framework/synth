# EXP-HOME-003 — Genesis Experience

> **Product expedition.** Build the interactive Genesis session that turns visitor intent into a projected Mission and Expeditions on the homepage.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace), EXP-AI-001 (Genesis Protocol)  
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

The homepage should execute a simplified Genesis session. A visitor types an intent such as "Build a CRM" and the workspace produces real artifacts: Intent → Discovery → Unknowns → Architecture → Mission → Expeditions. No code generation.

---

## Origin Evidence

Visitors currently read about Genesis. There is no way to experience it directly. An interactive session makes the concept concrete in seconds.

---

## Required Change

### 1.1 Entry modes

Four entry modes change Genesis behavior:

- **Greenfield:** start from raw intent.
- **Brownfield:** start from an existing repository.
- **Knowledge:** start from a knowledge graph.
- **Conversation:** start from an operator briefing or chat transcript.

### 1.2 Simplified flow

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
Mission proposal
  ↓
Expedition proposals
```

### 1.3 Deterministic demo

The demo uses a curated set of rule-based adapters so the output is predictable and reviewable. It does not call remote models.

### 1.4 No mutation

The homepage Genesis experience is read-only and proposal-only. It does not create repository state or emit runtime events.

---

## Deliverables

1. **Genesis Experience Specification** under `docs/design/genesis-experience.md`.
2. **Demo adapter bundle** for the homepage.
3. **Artifact progression logic** tied to workspace state.
4. **Tests** verifying deterministic demo output.

---

## Acceptance Criteria

- A visitor can type an intent and see artifacts appear progressively.
- The flow covers Intent, Discovery, Unknowns, Architecture, Mission, and Expeditions.
- Entry modes include Greenfield, Brownfield, Knowledge, and Conversation.
- No code is generated.
- Output is deterministic for the same input and mode.
- All homepage copy uses SYNTH public vocabulary.

---

## Out of Scope

- Full Genesis implementation (EXP-PROGRAM-022).
- Mission approval workflow.
- Repository materialization.

---

## Success Criteria

The expedition succeeds when a visitor can experience Genesis end-to-end in under two minutes.
