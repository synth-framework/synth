# EXP-PLATFORM-003 — Canonical Construction Matrix

Captured after EXP-PLATFORM-002 established the Internal Platform SDK.

## Methodology

A construction site is any function, method, or statement that materializes a non-primitive object. We classify each site by:

- **Authority**: who is allowed to create this object.
- **Inputs**: explicit canonical inputs vs. hidden discovered inputs.
- **Reconstructibility**: can another runtime produce the same object from the same event history.
- **Duplication**: how many distinct creation protocols exist for the same semantic object.

## Construction inventory

### 1. Hidden time inputs (`Date.now()`, `new Date()`)

| Location | Count | Authority | Hidden input | Reconstructible | Action |
|---|---|---|---|---|---|
| `src/mission-studio/engine.ts` | 11 | MissionStudio | `Date.now()` | No | Canonicalize |
| `src/governance/review-gates.ts` | 10 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/cli/synth.ts` | 10 | CLI / operator | `Date.now()` / `new Date()` | Partial | Canonicalize |
| `src/governance/alignment-contract.ts` | 7 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/infra/checkpoint-store.ts` | 6 | Kernel store | `Date.now()` | No | Canonicalize |
| `src/governance/refinement-layer.ts` | 6 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/discovery/engine.ts` | 6 | Discovery engine | `Date.now()` | No | Canonicalize |
| `src/genesis/intake.ts` | 5 | Genesis | `Date.now()` | Partial | Canonicalize |
| `src/observability/tracer.ts` | 4 | Tracer | `Date.now()` | No | Canonicalize |
| `src/governance/intent-model.ts` | 4 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/governance/divergence-gate.ts` | 4 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/workspace/language-auditor.ts` | 3 | Workspace cognition | `Date.now()` | No | Canonicalize |
| `src/planning/subsystems.ts` | 3 | Planning engine | `Date.now()` | No | Canonicalize |
| `src/governance/project-mission.ts` | 3 | Governance projection | `Date.now()` | No | Canonicalize |
| `src/governance/governance-engine.ts` | 3 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/environment/orchestrator.ts` | 3 | Discovery orchestrator | `Date.now()` | No | Canonicalize |
| `src/discovery/replay.ts` | 3 | Discovery replay | `Date.now()` | No | Canonicalize |
| `src/cli/certification-runner.ts` | 3 | CLI tooling | `Date.now()` | No | Canonicalize |
| `src/governance/refinement-report.ts` | 2 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/governance/reference-evidence.ts` | 2 | Governance engine | `Date.now()` | No | Canonicalize |
| `src/repository/adapters/github-adapter.ts` | 2 | External adapter | `Date.now()` | No | Canonicalize |
| `src/adapters/tdd/adapter.ts` | 2 | Capability adapter | `Date.now()` | No | Canonicalize |
| `src/discovery/consumer-registry.ts` | 2 | Discovery consumer | `Date.now()` | No | Canonicalize |
| Other files (1 each) | 8 | Various | `Date.now()` / `new Date()` | No | Canonicalize |
| **Total** | **132 + 23** | | | | |

### 2. Domain factory functions (already canonical)

These functions already consume an explicit `DomainContext` with `timestamp`. They are the model for canonical construction.

| Factory | Signature | Consumers | Action |
|---|---|---|---|
| `createMission` | `(id, name, purpose, ctx, overrides?)` | Planning API, tests | KEEP |
| `createExpedition` | `(id, missionId, name, goal, ctx, overrides?)` | Planning API, tests | KEEP |
| `createObjective` | `(id, expeditionId, title, purpose, ctx, overrides?)` | Planning API, tests | KEEP |
| `createDiscovery` | `(id, expeditionId, description, context, impact, ctx, overrides?)` | Planning API, tests | KEEP |
| `createDecision` | `(id, expeditionId, title, chosenAlternative, alternatives, ctx, overrides?)` | Planning API, tests | KEEP |
| `createGeneratedWorkItem` | `(id, expeditionId, objectiveId, title, ctx, overrides?)` | Planning API, tests | KEEP |
| `createWorkItem` | `(id, ctx, overrides?)` | API boundary, tests | KEEP |
| `createPlan` | `(id, name, _ctx, overrides?)` | Planning API, tests | KEEP |
| `createProject` | `(id, name, goal, _ctx, overrides?)` | Planning API, tests | KEEP |
| `createMilestone` | `(id, name, ctx, overrides?)` | Planning API, tests | KEEP |

### 3. Governance records with hidden construction

These objects are created from governance logic and embed `Date.now()`. They should derive their timestamp from the governing event or an explicit `timestamp` parameter.

| Type | Factory / constructor | Hidden input | Proposed canonical input |
|---|---|---|---|
| `IntentModel` | `createIntentModel` | `Date.now()` | `id?` / `timestamp?` | ✅ Canonicalized |
| `AlignmentContract` | `createAlignmentContract` | `Date.now()` | `id?` / `timestamp?` | ✅ Canonicalized |
| `ReviewGateExpedition` | `createReviewGateExpedition` | None | N/A | KEEP |
| `Gate` | `createGate` | `Date.now()` | `id?` / `timestamp?` | ✅ Canonicalized |
| `ReferenceEvidence` | `createReferenceEvidence` | `Date.now()` | `id?` / `timestamp?` | ✅ Canonicalized |
| `RefinementReport` | `createRefinementReport` | `Date.now()` | `id?` / `timestamp?` | ✅ Canonicalized |

### 4. Runtime / infrastructure objects

| Type | Construction sites | Hidden inputs | Action |
|---|---|---|---|
| `RuntimeEngine` | `src/runtime/engine.ts` | None observed | KEEP |
| `ExecutionGate` | `src/control/execution-gate.ts` | None observed | KEEP |
| `EventStore` | `src/infra/index.ts` via `createInfra` | None (path from config) | KEEP |
| `StateStore` | `src/infra/index.ts` via `createInfra` | None (path from config) | KEEP |
| `CheckpointStore` | Default constructor uses `Date.now()` in commit/reset | `Date.now()` | ✅ Canonicalized: commit preserves caller-provided `updatedAt`; reset/initCheckpoints accept optional timestamp |
| `ReplayVerifier` | `createReplayVerifier` | None observed | KEEP |
| `PlanningEngine` | `createAPI` / bootstrap | None observed | KEEP |

### 5. Adapter registries and orchestrators

| Type | Construction sites | Hidden inputs | Action |
|---|---|---|---|
| `AdapterRegistry` (mission-studio) | `createAdapterRegistry` | None observed | KEEP |
| `AdapterRegistry` (discovery) | `createConsumerRegistry` | None observed | KEEP |
| `DiscoveryOrchestrator` | `createDiscoveryOrchestrator` | `Date.now()` in `discover()` | ✅ Canonicalized: `discover(ctx, timestamp?)` |
| `MissionStudio` | `createMissionStudio` | `Date.now()` in session, snapshot, and decision construction | ✅ Canonicalized: `startSession`, `approve`, and `plan` accept optional timestamp; API passes `params.timestamp` |
| `MissionIntake` | `createMissionIntake` | None observed | KEEP |

### 6. Hidden workspace / random inputs

| Input | Count | Location examples | Action |
|---|---|---|---|
| `process.cwd()` | 93 | CLI entry points, adapters, runtime | Already canonicalized to `sdk.workspace.root()` where possible; remaining are CLI argument resolution and custom overrides. Not a construction authority issue. |
| `crypto.randomUUID()` | 7 | Genesis, API, planning, bootstrap | Already canonicalized to `sdk.identity.uuid()` in most paths; remaining occurrences are in kernel/genesis where direct control is intentional. |

## Preliminary findings

1. **Domain factories are already canonical.** They consume explicit `DomainContext.timestamp`. This is the reference pattern.
2. **Governance records are the biggest construction ambiguity.** `createIntentModel`, `createAlignmentContract`, `createGate`, `createReferenceEvidence`, and `createRefinementReport` all discovered time via `Date.now()`. These factories now accept optional `id` and `timestamp` parameters; callers that need determinism can pass explicit values.
3. **`CheckpointStore` embeds `Date.now()` in `commit` and `reset`.** This makes checkpoint metadata non-reconstructible.
4. **`MissionStudio` and `DiscoveryOrchestrator` use `Date.now()` internally.** These are runtime objects that should receive time from their caller or from the event stream.
5. **CLI `synth.ts` calls `Date.now()`/`new Date()` directly** for command timing and metadata. These should be passed down from a single CLI-level clock.

## Completed actions

| Priority | Action | Files | Status |
|---|---|---|---|
| P0 | Add explicit `timestamp` parameter to governance record factories | `src/governance/*.ts` | ✅ Canonicalized |
| P1 | Add explicit `timestamp` parameter to `CheckpointStore.commit` / `reset` | `src/infra/checkpoint-store.ts` | ✅ Canonicalized |
| P1 | Add explicit `timestamp` parameter to `MissionStudio` and `DiscoveryOrchestrator` | `src/mission-studio/engine.ts`, `src/environment/orchestrator.ts` | ✅ Canonicalized |
| P2 | Pass a single CLI-level timestamp through command handlers | `src/cli/synth.ts`, `src/cli/bootstrap-apply.ts` | ✅ Canonicalized |
| P2 | Audit remaining `Date.now()` in planning/subsystems and discovery | `src/planning/subsystems.ts`, `src/discovery/engine.ts`, `src/discovery/consumers/cli-consumer.ts` | ✅ Canonicalized |

## Final metrics

Captured in `data/expeditions/EXP-PLATFORM-003/final-metrics.json`.

| Metric | Value | Note |
|---|---|---|
| Build | pass | `npm run build` |
| Tests | 121 passed, 0 failed, 0 skipped | `npm test` |
| `Date.now()` in `src/` | 120 occurrences across 50 files | Intentional runtime fallbacks and telemetry; canonical construction paths now accept explicit timestamps |
| `new Date()` in `src/` | 23 occurrences across 19 files | Log/metadata and first-contact materialization; not canonical state construction inputs |
| `crypto.randomUUID()` in `src/` | 7 occurrences across 4 files | Remaining in tracer, CLI repo command, first-contact materialization |
| `process.cwd()` in `src/` | 93 occurrences across 28 files | CLI argument resolution, adapter overrides, SDK workspace internals |

## Constraints maintained

- No kernel modifications (EventStore, StateStore, Replay, ExecutionGate remain untouched).
- No new lifecycle states or events.
- No new public vocabulary.
- No builder classes introduced.
- Changes are limited to making hidden inputs explicit.
