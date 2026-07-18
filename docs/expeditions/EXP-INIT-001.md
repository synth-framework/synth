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

Implement and validate the first-contact initialization path: a user declares a source, SYNTH resolves a generic `InitializationAdapter`, and the adapter transforms the external project context into a governed SYNTH project model.

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

### Outcome 1 — Natural Language Initialization Flow

Extend `synth init` to accept a free-form source declaration.

- Accept input interactively or via a single `--source-description` flag.
- Parse intent: "new project", "knowledge under ./knowledge", "clone URL", "source under ./workspace".
- Do not expose adapter names to the user.

### Outcome 2 — Initialization Adapter Contract

Create the universal adapter boundary that transforms external project context into a SYNTH project model.

```ts
interface InitializationAdapter {
  name: string
  canHandle(context: InitializationContext): boolean | number
  identify(context: InitializationContext): Promise<ProjectSignal>
  extract(context: InitializationContext): Promise<KnowledgeArtifact[]>
  normalize(artifacts: KnowledgeArtifact[]): Promise<ProjectModel>
}
```

The `InitializationAdapter` does **not** answer "where did this information come from?" It answers:

> "How do we transform an external project context into a SYNTH initialization model?"

It does not own governance, lifecycle, state transitions, or expedition creation. It only converts reality into a model.

Lower-level adapters (`filesystem`, `repository`, `knowledge-extraction`) may be reused by an `InitializationAdapter`, but the initialization contract sits above them and remains source-agnostic.

### Outcome 3 — Adapter Resolution

Given a source declaration, the Initialization Engine resolves the best adapter:

```
Source declaration
        ↓
Initialization Engine
        ↓
AdapterRegistry.canHandle()
        ↓
Highest-confidence InitializationAdapter
        ↓
identify() → extract() → normalize()
        ↓
ProjectModel
        ↓
PROJECT_INITIALIZED event
        ↓
Canonical SYNTH State
```

If no adapter can handle the source, block and explain.

The engine owns the transition:

```
Unknown Repository
        |
        v
PROJECT_INITIALIZED
        |
        v
Canonical SYNTH State
```

### Outcome 4 — Initial Project Model Creation

Every initialization produces a first SYNTH state. The initial state includes:

- `PROJECT_INITIALIZED` event with source metadata.
- Manifest with `governanceVersion`.
- Governed project model (`ProjectModel`) carrying project identity, source type, repository intent, lifecycle state, and detected capabilities.
- Evidence artifact describing the source, adapter, inventory, and classification.

The physical storage boundary remains `.synth/data/`. Conceptual separations live underneath it:

```
.synth/
    data/
        state/          # current equilibrium (canonical-state.json)
        evidence/       # proof supporting transitions
        knowledge/      # extracted project model
        replay/         # transformation history (event-log.jsonl)
```

The output is a first SYNTH state. Not a project conversion. Not implementation. Not generation.

### Outcome 5 — Semantic Attractor

Initialization creates the semantic context that agents need. The result is a governed project model, not a list of discovered files.

Example outputs:

**Knowledge repository**

```
Project Type: Knowledge Repository
Intent: Specification → Implementation
Current State: Design Phase
Next Transition: Architecture Formation
```

**Existing repository**

```
Project Type: Application Repository
Intent: Continue Development
Current State: Implementation Phase
```

**Git repository clone**

```
Project Type: Existing Software System
Intent: Maintenance / Evolution
Current State: Operational
```

This directly addresses the Windows experiment failure mode.

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
 │    └── initialization-adapter.ts      # universal contract
 │    └── initialization-registry.ts     # adapter resolution
 │    └── filesystem-initialization-adapter.ts
 │    └── git-initialization-adapter.ts
 │    └── archive-initialization-adapter.ts
 │
 ├── cli/
 │    └── init-dialogue.ts               # natural language intake
 │
 ├── initialization/
 │    └── engine.ts                      # orchestrates identify → extract → normalize → emit event
 │    └── project-model.ts               # governed project model shape
 │    └── evidence-builder.ts
 │
 tests/
 └── initialization-cli.test.js
 └── initialization-adapter.test.js
```

---

## Acceptance Criteria

- [ ] `synth init` accepts a natural-language source declaration.
- [ ] SYNTH resolves the declaration to a generic `InitializationAdapter`.
- [ ] The adapter transforms external project context into a governed `ProjectModel`.
- [ ] Initialization emits a `PROJECT_INITIALIZED` event.
- [ ] `synth status` reports the correct initial phase and semantic context after initialization.
- [ ] Initialization evidence is written under `.synth/data/evidence/` and is inspectable.
- [ ] Existing `synth init --name` behavior is preserved or cleanly migrated.
- [ ] No Protected Asset is modified.
- [ ] The physical storage boundary remains `.synth/data/`.

---

## Success Criteria

This expedition is complete when:

- A user can initialize a SYNTH project by declaring a source.
- The system resolves a generic `InitializationAdapter`, transforms the external context into a governed project model, produces evidence, and emits a replayable initialization event.
- `synth status` on the initialized project reports the correct semantic context and phase.
- The resulting governed project model is identical regardless of input source type.
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
