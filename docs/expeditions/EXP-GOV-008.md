# EXP-GOV-008 — Initialization as a Governed State Transition

**Status:** Proposed  
**Started:** 2026-07-18  
**Kind:** Governance / Runtime  
**Priority:** Critical  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-GOV-007, EXP-PROGRAM-016  
**Blocks:** Future operator commands that depend on authoritative initialization state

---

## Objective

Convert initialization from a filesystem mutation into a replayable governance transition.

Today `synth init` creates files but writes no event. The repository is therefore interpreted differently by the filesystem and by replay: the filesystem says "initialized" while the event log says "empty." This expedition closes that gap by making `PROJECT_INITIALIZED` a durable, replayable event.

---

## Problem Statement

SYNTH currently operates with two models of reality:

### 1. Filesystem-generation model

```text
empty repository
       |
       v
  synth init
       |
       v
.synth exists
```

State begins when files exist. Initialization is an operation.

### 2. Event-sourced interpretation model

```text
Event Log
    |
    v
 Replay
    |
    v
  State
```

Events are the durable authority. State is reconstructed through replay.

These two models cross at initialization. A freshly initialized repository has `.synth/` but no events, so replay sees an ungoverned repository even though the filesystem sees a governed one. The system has no memory that initialization happened.

This creates ambiguity for every downstream agent:

```text
Is this:
- an application?
- a specification?
- an archive?
- an experiment?
- a source tree?
```

The `.synth` orientation artifacts help, but they are not part of the durable history.

---

## Architectural Principle

> Initialization is the first deformation: a repository moves from "unknown artifact" to "governed synthesis environment." That transition must be recorded in the same event log that records every other governance transition.

The manifest is orientation, not authority. The event log is authority.

```text
Event Log
    |
    v
Replay State
    |
    v
Canonical Projection
    |
    v
Manifest / Context
```

---

## Desired Behavior

### Today

```text
empty repository
       |
       v
  synth init
       |
       v
.synth exists
       |
       v
replay()
       |
       v
No events → uninitialized
```

### Target

```text
empty repository
       |
       v
 PROJECT_INITIALIZED event
       |
       v
replay()
       |
       v
Initialized state
```

After the event is written, replay can answer:

```text
This is a SYNTH governed repository.
Current state: initialized.
History: replayable.
Next valid transitions: mission creation, governance actions, expeditions.
```

---

## Proposed Minimal Event

```json
{
  "type": "PROJECT_INITIALIZED",
  "timestamp": 178...
,
  "transactionId": "init-tx",
  "capability": "InitializeProject",
  "actor": "synth-cli",
  "payload": {
    "repository": {
      "name": "...",
      "path": "..."
    },
    "governanceVersion": "2.1",
    "initializer": "synth-cli",
    "layout": {
      "manifest": ".synth/manifest.json",
      "data": ".synth/data"
    }
  }
}
```

Replay rule:

```text
PROJECT_INITIALIZED
        |
        v
repository.lifecycle = initialized
```

Nothing more. No fake mission. No fake expedition. No overloaded initialization.

---

## Governance Version

Add a governance version to the manifest so the resolver can interpret lifecycle semantics correctly:

```json
{
  "schema": "synth-bootstrap-manifest-v1",
  "governanceVersion": "2.1"
}
```

- `schema` answers: "Can I parse this?"
- `governanceVersion` answers: "Do I understand the lifecycle semantics?"

---

## Resolver Boundary

The audit identified a larger inconsistency: the resolver is becoming the interpretation layer, but most mutation commands bypass it.

The invariant should become:

```text
CLI command
      |
      v
Governance Resolver
      |
      v
Resolved Context
      |
      v
Allowed Operation
```

Not:

```text
CLI command
      |
      v
custom bootstrap logic
```

Every command that needs governance context should resolve it through the same path. This expedition should route mutation commands through the resolver where possible and remove duplicated context construction.

---

## Outcomes

### Outcome 1 — Initialization Event

Introduce `PROJECT_INITIALIZED` as a canonical event type.

- `synth init` writes the event to `.synth/data/event-log.jsonl`.
- `synth bootstrap --approve` writes the event after applying configuration.
- The event is hash-chained like any other event.

### Outcome 2 — Replay Rule

Update `src/runtime/replay.js` to recognize `PROJECT_INITIALIZED`.

- Derive `repository.lifecycle = initialized`.
- Do not create missions, expeditions, or work items.

### Outcome 3 — Governance Version

Add `governanceVersion` to the manifest schema.

- `synth init` writes `governanceVersion: "2.1"`.
- The resolver uses it to select interpretation rules.

### Outcome 4 — Resolver Initialization Awareness

Update `resolveGovernanceContext` to distinguish:

```text
uninitialized   -> no manifest, no PROJECT_INITIALIZED event
initialized     -> manifest + PROJECT_INITIALIZED event, no active mission
planning          -> initialized + mission draft
approved          -> initialized + active mission
executing         -> initialized + active expedition
```

### Outcome 5 — Command Entry-Point Convergence

Route these commands through the resolver before operation:

- `synth status`
- `synth explain resume`
- `synth mission create`
- `synth mission approve`
- `synth expedition create`
- `synth expedition start`
- `synth expedition complete`

`doctor`, `init`, `bootstrap`, `version`, and `help` remain independent.

### Outcome 6 — Remove Duplicated Context Construction

Refactor `synth verify` and `synth explain replay` to consume the resolver or a resolver-derived context instead of reimplementing artifact reading.

### Outcome 7 — Initialization Replay Tests

Add tests that verify:

- `synth init` produces a `PROJECT_INITIALIZED` event.
- Replay of the event yields phase `initialized`.
- `synth status` on a freshly initialized project reports `initialized`.
- Commands that require initialization are blocked in `uninitialized` directories.

---

## Explicitly Avoid

This expedition shall not:

- redesign the event model
- add a new persistence layer
- create initialization workflows
- introduce more artifacts
- create external registries
- fake missions or expeditions during init

The architecture is already correct. The problem is a missing transition in the state machine.

---

## Protected Assets

The following artifacts SHALL NOT be modified by this expedition:

- Mission Studio
- Genesis
- Replay hash algorithm
- ExecutionGate
- Event Model semantics (only one new event type is added)
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. The event log remains the sole durable authority.
4. The manifest is orientation, not state authority.
5. Initialization is recorded as a single, minimal event.
6. Every command that needs governance context resolves it through the shared resolver.

---

## Success Criteria

- `synth init` writes a `PROJECT_INITIALIZED` event.
- Replay of the event yields phase `initialized`.
- `synth status` reports `initialized` for a newly initialized project.
- The manifest includes `governanceVersion`.
- All mutation commands resolve governance context through the resolver.
- No duplicated artifact-reading logic remains in CLI commands.
- Initialization replay tests pass in CI.

---

## Definition of Done

- [x] `PROJECT_INITIALIZED` event type defined and documented.
- [x] `synth init` and `synth bootstrap --approve` write the event.
- [x] Replay rule implemented and tested.
- [x] `governanceVersion` added to manifest.
- [x] Resolver recognizes `initialized` phase.
- [x] Mutation commands resolve actual project state before acting (`synth mission create/approve/evidence add`, `synth expedition create/start/complete` now use file-backed persistence instead of empty memory state).
- [ ] `synth verify` and `synth explain replay` refactored to consume resolver-derived context instead of reimplementing artifact reading (deferred to follow-up; current verification engine has specialized verifier/checkpoint needs).
- [x] Regression tests added.
- [ ] Expedition accepted.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/audits/initialization-governance-audit-2026-07-18.md` | Baseline audit that motivated this expedition. |
| `docs/expeditions/EXP-GOV-007.md` | Established the Governance Resolver; this expedition makes initialization resolver-aware. |
| `docs/expeditions/EXP-PROGRAM-016.md` | Program container for governed execution and interpretation. |
| `docs/architecture/constitutional-baseline.md` | Defines Protected Assets and the freeze. |
