# Deep Dive: Mission Studio Adapters

## Purpose

Mission Studio adapters are **reasoning plugins**. They do not touch external systems directly. They consume `Observation[]` produced by initial adapters and emit either higher-level observations or planning artifacts (missions, expeditions, objectives).

They exist so SYNTH does not hardcode vendor-specific logic inside the core planning engine. Instead, the planning engine delegates to adapters with well-defined APIs.

## Where they first enter the system

```
synth bootstrap / synth init
       │
       ▼
createAdapterRegistry() in src/core/bootstrap.ts:153
       │
       ├─► catalog.query({ family: ["planning", "intelligence", "evidence", "methodology"] })
       │   └─► descriptors for evidence/intelligence/planning/methodology adapters
       │
       └─► PLANNING_ADAPTER_FACTORIES map provides factory per descriptor id
           └─► registry.create(name) instantiates adapter on demand
```

They are **not** automatically executed during bootstrap. Something must call `collectPlanningObservations(registry, options)`.

## How they are invoked today

```
Mission Studio / planning code
       │
       ▼
collectPlanningObservations(registry, { adapterNames?, enrich? })
       │
       ├─► Phase 1: for each adapter name
       │       adapter = registry.create(name)
       │       if adapter.observe:
       │           batch = await adapter.observe()
       │           rawObservations.push(...batch.observations)
       │
       └─► Phase 2 (if enrich !== false): for each adapter name
               adapter = registry.create(name)
               enrich = adapter.buildFrom || adapter.extractFrom || adapter.evaluateFrom || adapter.inferFrom
               if enrich and rawObservations.length > 0:
                   batch = await enrich(rawObservations)
                   rawObservations.push(...batch.observations)
       │
       ▼
mapObservationsToPlanningObservations(rawObservations)
       │
       ▼
PlanningObservation[]
```

## Adapter categories

### Evidence adapters

Read sources and emit raw `Observation[]`.

| Adapter | `observe()` input | `observe()` output | When triggered |
|---|---|---|---|
| `evidence:conversation` | Configured conversation turns | intent, goal, clarification observations | When operator provides conversation history |
| `evidence:document` | Local docs/ADRs/specs | document-detected, knowledge-item observations | When documents are configured/present |
| `evidence:filesystem` | Arbitrary files/directories | file-inventory, text-snippet observations | When filesystem paths are configured |
| `evidence:specification` | OpenAPI/AsyncAPI/GraphQL/Protobuf/JSON Schema specs | spec-detected observations | When specification files are configured |

### Intelligence adapters

Transform observations into higher-level observations.

| Adapter | Enrichment method | Input | Output |
|---|---|---|---|
| `intelligence:knowledge-extraction` | `extractFrom(observations)` | raw observations | synthesized knowledge, entities, relationships |
| `intelligence:confidence` | `evaluateFrom(observations)` | raw + synthesized observations | confidence scores, uncertainty highlights |
| `intelligence:dependency` | `inferFrom(observations)` | observations | dependency graph, component map, capability map |
| `intelligence:architecture` | `inferFrom(observations)` | observations | architecture-style inferences |

### Planning adapters

Turn observations into planning artifacts.

| Adapter | Method | Input | Output |
|---|---|---|---|
| `planning:mission-builder` | `buildFrom(observations)` | intent + capability observations | mission proposal observations |
| `planning:expedition-builder` | `buildFrom(observations)` | mission + domain observations | expedition proposal observations |
| `planning:objective-builder` | `buildFrom(observations)` | expedition + constraint observations | objective observations |
| `planning:wizard` | `buildFrom(observations)` | objectives | wizard-step observations with actions (approve/reject/merge/split/refine) |

### Methodology adapters

Enforce workflows. Currently **not wired** into any automated pipeline.

| Adapter | Role | Current status |
|---|---|---|
| `methodology:tdd` | Detect missing tests, generate failing skeletons, run tests, track Red-Green-Refactor | Registered, not invoked automatically |
| `methodology:bdd` | Create features/scenarios, generate acceptance tests, produce traceability matrix | Registered, not invoked automatically |

## Detailed lifecycle diagram

```
Mission Studio planning request
│
├─► registry.create("evidence:document")
│   │
│   ├─► discover()        → "discovered"
│   ├─► configure(config) → "configured"  (documentsDirectory, files, maxSnippetLength)
│   ├─► validate()        → "validated"
│   ├─► enable()          → "enabled"
│   ├─► observe()         → ObservationBatch { observations, errors }
│   └─► healthCheck()     → "healthy" | "error"
│
├─► registry.create("intelligence:knowledge-extraction")
│   │
│   ├─► discover()        → "discovered"
│   ├─► configure(config) → "configured"
│   ├─► validate()        → "validated"
│   ├─► enable()          → "enabled"
│   ├─► extractFrom(rawObservations) → ObservationBatch { observations, errors }
│   └─► healthCheck()     → "healthy" | "error"
│
├─► registry.create("planning:mission-builder")
│   │
│   ├─► discover()        → "discovered"
│   ├─► configure(config) → "configured"
│   ├─► validate()        → "validated"
│   ├─► enable()          → "enabled"
│   ├─► buildFrom(enrichedObservations) → ObservationBatch { observations, errors }
│   │       observations contain mission proposals
│   └─► healthCheck()     → "healthy" | "error"
│
└─► mapObservationsToPlanningObservations(allObservations)
    └─► PlanningObservation[]
        └─► Mission Studio proposes missions/expeditions/objectives
```

## What they produce

All Mission Studio adapters return `ObservationBatch`:

```ts
{
  observations: Observation[]
  errors: string[]
}
```

Each `Observation` has:

```ts
{
  id: string
  source: { adapter: string }
  category: "intent" | "domain" | "capability" | "risk" | "constraint" | ...
  subject: string
  evidence: EvidenceClaim[]
  confidence: "certain" | "high" | "medium" | "low" | "unknown"
  timestamp: number
}
```

These are then mapped to `PlanningObservation`, which Mission Studio uses to propose missions/expeditions.

## Current gaps

1. **No automatic trigger.** Mission Studio adapters are not automatically invoked during `synth mission create`. Something must call `collectPlanningObservations()`.
2. **No configuration persistence.** Adapter config is passed at call time; it is not persisted in `.synth/manifest.json` or state.
3. **No health monitoring.** Adapters are created, used, and discarded. There is no long-running health state.
4. **Methodology adapters unused.** `tdd` and `bdd` have no consumer.
5. **No adapter selection UI.** The operator cannot say "use only document and confidence adapters for this mission."

## Proposed integration with SYNTH lifecycle

```
Operator: "Create a mission to add JWT auth"
│
├─► Mission Studio:
│   ├─► collect evidence observations (document, filesystem, conversation)
│   ├─► run intelligence adapters (knowledge-extraction, confidence, dependency, architecture)
│   ├─► run planning adapters (mission-builder, expedition-builder, objective-builder)
│   └─► present proposals to operator
│
├─► Operator approves mission
│
├─► ExecutionGate creates Mission + Expeditions
│
├─► During expedition execution:
│   ├─► repository adapter: create branch, commit, install hooks
│   ├─► github adapter: create PR, link to issue
│   ├─► tdd methodology adapter (future): ensure tests exist before implementation
│   └─► filesystem adapter (future): observe changed files for evidence
│
└─► Expedition completes:
    ├─► repository adapter: merge branch, tag snapshot
    ├─► github adapter: merge PR, create release
    └─► proof artifact generated
```

## Proposed naming cleanup

| Current | Proposed |
|---|---|
| `conversation` | `evidence:conversation` |
| `document` | `evidence:document` |
| `filesystem` (MS) | `evidence:filesystem` |
| `specification` | `evidence:specification` |
| `knowledge-extraction` | `intelligence:knowledge-extraction` |
| `confidence` | `intelligence:confidence` |
| `dependency` | `intelligence:dependency` |
| `architecture` | `intelligence:architecture` |
| `mission-builder` | `planning:mission-builder` |
| `expedition-builder` | `planning:expedition-builder` |
| `objective-builder` | `planning:objective-builder` |
| `wizard` | `planning:wizard` |
| `tdd` | `methodology:tdd` |
| `bdd` | `methodology:bdd` |

## Open questions for follow-up

1. Should Mission Studio adapters be auto-invoked during `synth mission create`, or only on explicit request?
2. Where should adapter configuration be persisted? `.synth/manifest.json`? `.synth/adapter-config.json`? Event log?
3. Should methodology adapters (`tdd`, `bdd`) be wired into task execution as pre-/post-conditions?
4. How should adapter health be monitored across a long-running session?
5. Should the operator be able to enable/disable adapters per mission?
