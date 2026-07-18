# EXP-INIT-002 — Initialization Evidence & Replay

**Status:** Accepted  
**Started:** 2026-07-18  
**Kind:** Adoption / Initialization  
**Priority:** Critical  
**Program:** EXP-PROGRAM-019 — Universal Initialization  
**Depends On:** EXP-INIT-001, EXP-GOV-007  
**Blocks:** Future initialization sources and replay-dependent features

---

## Objective

Make project initialization evidence-backed and replayable.

When `synth init` runs, SYNTH must discover the external source context, produce governed evidence, derive a `ProjectModel`, emit a `PROJECT_INITIALIZED` event carrying that evidence, and persist the evidence so replay reconstructs the same initial state.

> **Initialization is the first governed transition.** The event log must contain enough information to reconstruct why the project was interpreted the way it was.

---

## Problem Statement

Today `synth init` emits a minimal `PROJECT_INITIALIZED` event:

```json
{
  "type": "PROJECT_INITIALIZED",
  "payload": { "projectId": "...", "name": "...", "governanceVersion": "..." }
}
```

It records *that* initialization happened, but not *what the source was* or *how SYNTH interpreted it*. If the canonical state is ever reconstructed from replay, the interpretation context is lost.

This violates the SYNTH principle:

> State must be derived from evidence, and evidence must be durable and replayable.

Without initialization evidence, the first event in the log is under-specified. Downstream expeditions cannot verify that the initial project model was correct.

---

## Desired Behavior

### Operator input

```
synth init --name "Hospitality Platform" --source filesystem --source-location ./knowledge
```

or, when no source is declared:

```
synth init --name "Hospitality Platform"
> Source location (optional): ./knowledge
```

### Result

```
Synth project initialized

Source:       filesystem ./knowledge
Adapter:      filesystem-initialization
Evidence:     .synth/data/evidence/initialization/initial-evidence.json
ProjectModel: .synth/data/evidence/initialization/project-model.json
Event:        PROJECT_INITIALIZED
```

### Event payload

```json
{
  "type": "PROJECT_INITIALIZED",
  "payload": {
    "projectId": "...",
    "name": "Hospitality Platform",
    "governanceVersion": "2.1",
    "sourceType": "filesystem",
    "sourceLocation": "./knowledge",
    "adapterId": "filesystem",
    "adapterVersion": "1.0.0",
    "evidenceReference": ".synth/data/evidence/initialization/initial-evidence.json",
    "projectModel": {
      "schemaVersion": "1.0.0",
      "identity": { "id": "...", "name": "Hospitality Platform" },
      "intent": { "statement": "unknown", "targetOutcomes": [] },
      "lifecycleStage": "specification",
      "domains": [],
      "constraints": [],
      "evidence": [...],
      "confidence": { "value": 0.0, "label": "none" }
    }
  }
}
```

---

## Outcomes

### Outcome 1 — Initialization Engine

Create `src/initialization/engine.ts` that orchestrates:

```
input
  ↓
adapter resolution
  ↓
evidence collection
  ↓
ProjectModel construction
  ↓
evidence persistence
  ↓
PROJECT_INITIALIZED event emission
```

The engine uses the `InitializationAdapter` contract from EXP-INIT-001 and the canonical state resolver from EXP-GOV-007.

### Outcome 2 — Filesystem Initialization Adapter

Implement the first concrete `InitializationAdapter`:

- `id`: `filesystem`
- Handles `sourceType: "filesystem"`.
- Discovers files and directories under `sourceLocation`.
- Produces `InitializationEvidence` with:
  - file count
  - top-level directory names
  - detected document types (markdown, json, yaml, etc.)
  - inferred lifecycle stage:
    - `specification` if mostly `docs/` / `knowledge/` / `.md`
    - `implementation` if `package.json`, `src/`, `tests/`
    - `unknown` otherwise
- Does not use AI.
- Does not invent implementation details.

### Outcome 3 — Evidence Persistence

Every initialization writes:

```
.synth/data/evidence/initialization/
  ├── initial-evidence.json
  └── project-model.json
```

These files are durable evidence. They are referenced from the `PROJECT_INITIALIZED` event, not duplicated inside it.

### Outcome 4 — Replayable Initialization Event

The `PROJECT_INITIALIZED` event must contain enough information to reconstruct the initial `ProjectModel` and the evidence reference.

Replay rule:

```
PROJECT_INITIALIZED
  ↓
lifecycle = initialized
initialProjectModel = payload.projectModel
initialEvidence = load(payload.evidenceReference)
```

### Outcome 5 — Status Projection

After initialization, `synth status` reports:

```
phase: initialized
summary: Project initialized; source filesystem ./knowledge; lifecycle stage specification.
projectModel: <semantic attractor>
```

---

## Explicit Non-Goals

❌ Natural-language dialog system  
❌ AI-based project understanding  
❌ External system connectors (GitHub, Notion, etc.)  
❌ Automatic code generation  
❌ New governance concepts or vocabulary  

---

## Required Artifacts

```
src/
 ├── adapters/
 │    └── filesystem-initialization-adapter.ts
 │
 ├── initialization/
 │    └── engine.ts
 │    └── project-model.ts          # from EXP-INIT-001
 │    └── evidence-store.ts
 │
 ├── cli/
 │    └── synth.ts                  # extend init command
 │
 tests/
 └── initialization-evidence.test.js
 └── initialization-replay.test.js
```

---

## Acceptance Criteria

### AC-001

`synth init --source filesystem --source-location ./knowledge` emits `PROJECT_INITIALIZED` with `sourceType`, `sourceLocation`, `adapterId`, `adapterVersion`, `evidenceReference`, and `projectModel`.

### AC-002

Initialization evidence is persisted under `.synth/data/evidence/initialization/`.

### AC-003

The filesystem adapter infers `specification` for knowledge/documentation directories and `implementation` for source-code directories.

### AC-004

Replay reconstructs the same `ProjectModel` from the `PROJECT_INITIALIZED` event.

### AC-005

`synth status` on an initialized project reports phase `initialized` and includes the source type and lifecycle stage in the summary.

### AC-006

Backward compatibility: `synth init --name <name>` without a source still works and emits a minimal `PROJECT_INITIALIZED` event.

### AC-007

No Protected Asset is modified.

### AC-008

`npm run govern` passes.

---

## Success Criteria

This expedition is complete when:

- `synth init` can accept an explicit source declaration and produce governed evidence.
- Initialization events are replayable and reference durable evidence.
- The filesystem adapter conforms to the `InitializationAdapter` contract.
- `synth status` reports the initialized project's semantic context.
- All tests pass and `npm run govern` succeeds.

---

## Relationship to Other Expeditions

```
EXP-INIT-001
    ↓
EXP-GOV-007
    ↓
EXP-INIT-002  ← this expedition
    ↓
future source adapters
```

EXP-INIT-001 established the contract. EXP-GOV-007 made state resolution authoritative. EXP-INIT-002 now makes initialization itself evidence-backed and replayable.
