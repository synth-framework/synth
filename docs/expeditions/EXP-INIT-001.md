# EXP-INIT-001 — Adapter-based Project Bootstrap

**Status:** Accepted  
**Accepted:** 2026-07-18  
**Kind:** Adoption / Initialization  
**Priority:** Critical  
**Program:** EXP-PROGRAM-019 — Universal Initialization  
**Depends On:** EXP-GOV-008 — Initialization as a Governed State Transition  
**Blocks:** EXP-INIT-002 — Initialization Evidence & Replay  

---

## Objective

Deliver the **contract-only milestone** for universal initialization: define the `InitializationAdapter` and `ProjectModel` contracts and validate that they satisfy the semantic equivalence invariant.

This milestone produces exactly two things:

1. The `InitializationAdapter` contract — how external input sources become governed evidence.
2. The `ProjectModel` contract — the semantic attractor that reduces interpretive entropy.

No repository scanning, no AI implementation, no source-specific adapters, and no CLI wiring are in scope yet. The goal is to make the initialization boundary stable before any code generation begins.

> **Initialization is not repository ingestion. Initialization is the controlled transition from an unknown project context into a governed SYNTH project model.**

> **Initialization is not discovery.** Discovery answers "What exists?" Initialization answers "What is this?" A crawler can discover `package.json`, `src/`, and `README.md`; initialization must produce `Project Type: Application Specification`, `Lifecycle Phase: Pre-implementation`, and `Intent: Transform governed requirements into executable system`.

---

## Problem Statement

Today `synth init` requires the user to already know what SYNTH expects. There is no path for:

```
"This is a new SYNTH project. All knowledge is under ./knowledge."
```

or

```
"This is a new SYNTH project. Clone https://github.com/company/product."
```

or

```
"This is a new SYNTH project. The existing source is under ./workspace."
```

The operator must choose implementation details like `--repository`, `--docs`, `--filesystem`, or `--archive`. Those are adapter concerns, not user intent.

Because SYNTH does not establish the initial semantic context, agents entering the repository can select the wrong attractor, as demonstrated in the Windows first-contact experiments. The problem was not that the agent could not read files; it constructed the wrong initial attractor. Initialization exists to establish the lowest-friction interpretation of the project before any execution begins.

---

## Desired Behavior

### Operator input

```
Human:
"I am starting a SYNTH project.
Here is where the knowledge exists."

SYNTH:
"I understand the source.
I have created the initial model.
Here is the evidence.
Here is the replay."

Human:
"Begin discovery."
```

That is the whole deliverable.

### Supported source declarations

Examples:

```
synth init
> This is a new SYNTH project.
> All knowledge is under ./knowledge
```

```
synth init
> This is a new SYNTH project.
> Clone https://github.com/company/product
```

```
synth init
> This is a new SYNTH project.
> The existing source is under ./workspace
```

The user should never choose `--repository`, `--docs`, `--filesystem`, or `--archive`.

---

## Outcomes

### Outcome 1 — InitializationAdapter Contract

Define the universal adapter boundary. The adapter answers:

> "Given an input source, can I produce governed evidence?"

Not:

> "Can I understand the project?"

Proposed contract shape:

```ts
interface InitializationAdapter {
  id: string
  version: string
  canHandle(input: InitializationInput): boolean
  collectEvidence(input: InitializationInput): Promise<InitializationEvidence>
}
```

The adapter returns `InitializationEvidence`, not domain-specific types like `ReactNativeProject` or `BackendService`. Adapters are evidence translators.

### Outcome 2 — ProjectModel Contract

Define the semantic attractor. The `ProjectModel` is the governed intermediate representation that every adapter converges on.

Proposed contract shape:

```ts
interface ProjectModel {
  identity: ProjectIdentity
  intent: ProjectIntent
  lifecycleStage: LifecycleStage
  domains: DomainModel[]
  constraints: Constraint[]
  evidence: EvidenceReference[]
  confidence: ConfidenceScore
}
```

Notice what is absent: framework, language, database, repository structure, deployment platform. Those belong to later expeditions.

### Outcome 3 — Semantic Equivalence Validation

Make the interpretive-entropy rule testable. Given the same intent expressed through different adapters, the resulting `ProjectModel` must be equivalent.

Example:

- `FilesystemAdapter` over a `./knowledge` directory
- `ConversationAdapter` with natural-language intent

Both must converge to:

```json
{
  "projectType": "Specification-stage project",
  "intent": "Build hospitality automation platform",
  "implementation": null
}
```

Not diverge into source-specific interpretations.

### Outcome 4 — Governance Tests

Establish tests that prove initialization obeys its constraints:

- Initialization cannot create expeditions.
- Initialization cannot modify project artifacts.
- Initialization produces evidence only.
- Missing evidence remains unknown rather than hallucinated.

### Outcome 5 — Versioning Strategy

Define how the `InitializationAdapter` and `ProjectModel` contracts evolve without breaking replay. The version field in the adapter contract and a schema version in the project model are the starting points.

---

## Explicit Non-Goals

This Expedition does **not** create:

❌ project-specific adapters  
❌ automatic application generation  
❌ architecture inference engine  
❌ autonomous coding  
❌ new governance concepts  
❌ new vocabulary  
❌ replacement for expeditions  
❌ SYNTH redesign  

The expedition only establishes the initial semantic handshake.

---

## Invariants

1. Initialization must produce a `PROJECT_INITIALIZED` event and a governed `ProjectModel`.
2. Initialization must not create fake missions, expeditions, or work items.
3. **Initialization must reduce interpretive entropy without introducing implementation assumptions.**
   - Before initialization, many interpretations are possible (repository, application, specification, archive, prototype, documentation).
   - After initialization, exactly one governed interpretation is established (e.g., "Specification-stage project").
   - Initialization must not invent implementation details (e.g., "React Native application") before expeditions have produced evidence for them.
4. The physical storage boundary remains `.synth/data/`.

---

## Required Artifacts

```
src/
 ├── adapters/
 │    └── initialization-adapter.ts      # InitializationAdapter contract
 │
 ├── initialization/
 │    └── project-model.ts               # ProjectModel contract + semantic validator
 │
 tests/
 └── initialization-adapter-contract.test.js
```

---

## Acceptance Criteria

- [ ] `InitializationAdapter` interface exists with `id`, `version`, `canHandle(input)`, and `collectEvidence(input)`.
- [ ] `InitializationInput` and `InitializationEvidence` types exist.
- [ ] `ProjectModel` interface/schema exists with `identity`, `intent`, `lifecycleStage`, `domains`, `constraints`, `evidence`, and `confidence`.
- [ ] `LifecycleStage` is a closed union of allowed stages.
- [ ] Semantic equivalence: stub adapters with equivalent intent produce equivalent `ProjectModel` instances.
- [ ] No implementation assumptions: the `ProjectModel` builder rejects or strips framework, language, database, deployment, and platform fields.
- [ ] Missing evidence remains unknown: partial or empty evidence yields `lifecycleStage: "unknown"` and empty arrays rather than hallucinated values.
- [ ] Initialization cannot create expeditions, missions, or work items: `ProjectModel` has no such fields and the validator refuses evidence containing them.
- [ ] Versioning strategy: `InitializationAdapter.version` and `ProjectModel.schemaVersion` fields exist.
- [ ] Contracts compile, contract tests pass, and `npm run build` succeeds.
- [ ] No Protected Asset is modified.
- [ ] The physical storage boundary remains `.synth/data/`.

---

## Success Criteria

This expedition is complete when:

- The `InitializationAdapter` and `ProjectModel` contracts are stable and type-checked.
- Tests prove that equivalent intent across different adapter shapes converges to the same governed project model.
- Tests prove that initialization cannot introduce implementation assumptions or create expeditions/missions.
- The resulting governed project model is source-agnostic and schema-versioned.
- All tests pass and `npm run govern` succeeds.

---

## Conflict Analysis

Before acceptance, verify the following pending or recent work does not invalidate this expedition:

1. **EXP-PROGRAM-009 — Canonical First Contact Experience** (Active): Universal Initialization extends the first-contact interaction model. Coordinate scope so that first-contact narrative work and initialization mechanics do not duplicate each other.

2. **EXP-GOV-008 — Initialization as a Governed State Transition** (just completed): Established `PROJECT_INITIALIZED` event, `lifecycle: initialized`, and `governanceVersion: 2.1`. This expedition must reuse those primitives and must not introduce a second initialization event or a different layout under `.synth/`.

3. **EXP-ENV-013 / EXP-PROGRAM-017**: Established `.synth/data/` as the canonical runtime data directory. This expedition preserves `.synth/data/` as the physical boundary and places conceptual subdirectories (`state`, `evidence`, `knowledge`, `replay`) underneath it. No migration ADR is required.

4. **EXP-GOV-007 — Canonical State Resolution & Status Authority**: The resolver is the single interpreter of state. Initialization must produce state that the resolver understands without custom logic.

5. **EXP-GOV-006 — Agent Lifecycle Enforcement**: Initialization is the first valid transition. The agent intake gate must allow `InitializeProject` and block other actions in `uninitialized` directories.

6. **EXP-PROGRAM-016 — Governed Expedition Execution**: Initialization produces the initial state that expedition execution later mutates. The `ProjectModel` and canonical state format must be compatible with expedition execution.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-019.md` | Program container. |
| `docs/expeditions/EXP-GOV-008.md` | Provides `PROJECT_INITIALIZED` and initialized phase. |
| `docs/expeditions/EXP-GOV-007.md` | Resolver is the consumer of initialized state. |
| `docs/expeditions/EXP-GOV-006.md` | Lifecycle enforcement boundaries. |
| `docs/expeditions/EXP-PROGRAM-009.md` | First Contact narrative and interaction model. |
| `docs/expeditions/EXP-PROGRAM-016.md` | Consumes the initial state produced by this expedition. |
