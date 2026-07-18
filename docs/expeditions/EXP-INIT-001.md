# EXP-INIT-001 — Adapter-based Project Bootstrap

**Status:** Proposed  
**Kind:** Adoption / Initialization  
**Priority:** Critical  
**Program:** EXP-PROGRAM-019 — Universal Initialization  
**Depends On:** EXP-GOV-008 — Initialization as a Governed State Transition  
**Blocks:** EXP-INIT-002 — Initialization Evidence & Replay  

---

## Objective

Implement and validate the first-contact initialization path: a user declares a source, SYNTH resolves a generic adapter, and the result becomes the initial SYNTH state.

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

Because SYNTH does not establish the initial semantic context, agents entering the repository can select the wrong attractor, as demonstrated in the Windows first-contact experiments.

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

### Outcome 2 — Source Adapter Contract

Create the universal adapter boundary.

```ts
interface SourceAdapter {
  name: string
  canHandle(sourceDescription: string): boolean | number
  discover(sourceDescription: string): Promise<SourceDiscovery>
  inventory(discovery: SourceDiscovery): Promise<SourceInventory>
  classify(inventory: SourceInventory): Promise<SourceClassification>
  extract(inventory: SourceInventory): Promise<NormalizedKnowledge>
  normalize(knowledge: NormalizedKnowledge): Promise<CanonicalKnowledge>
}
```

Avoid domain coupling. No `ReactNativeAdapter`, `MarketplaceAdapter`, or `DocumentationAdapter`. Adapters answer:

> "What exists?"

SYNTH answers:

> "What does it mean?"

### Outcome 3 — Adapter Resolution

Given a source declaration, resolve the best adapter:

```
Source declaration
        ↓
AdapterRegistry.canHandle()
        ↓
Highest-confidence SourceAdapter
        ↓
discover() → inventory() → classify() → extract() → normalize()
```

If no adapter can handle the source, block and explain.

### Outcome 4 — Initial Project Model Creation

Every initialization produces a first SYNTH state. The initial state includes:

- `PROJECT_INITIALIZED` event with source metadata.
- Manifest with `governanceVersion`.
- Evidence artifact describing the source, adapter, inventory, and classification.
- Normalized knowledge model (not implementation, not generation).

The output is a first SYNTH state. Not a project conversion. Not implementation. Not generation.

### Outcome 5 — Semantic Attractor

Initialization creates the semantic context that agents need:

```
Repository Intent: Knowledge repository
Current phase: Specification
Implementation: Not started
Expected transformation: Knowledge → Architecture → Implementation
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

## Required Artifacts

```
src/
 ├── adapters/
 │    └── source-adapter.ts      # universal contract
 │    └── source-registry.ts     # adapter resolution
 │    └── filesystem-source-adapter.ts
 │    └── git-source-adapter.ts
 │    └── archive-source-adapter.ts
 │
 ├── cli/
 │    └── init-dialogue.ts       # natural language intake
 │
 ├── initialization/
 │    └── bootstrap-from-source.ts
 │    └── evidence-builder.ts
 │
 tests/
 └── initialization-cli.test.js
 └── source-adapter.test.js
```

---

## Acceptance Criteria

- [ ] `synth init` accepts a natural-language source declaration.
- [ ] SYNTH resolves the declaration to a generic `SourceAdapter`.
- [ ] The adapter produces an inventory, classification, and normalized knowledge.
- [ ] Initialization emits a `PROJECT_INITIALIZED` event.
- [ ] `synth status` reports the correct initial phase after initialization.
- [ ] Initialization evidence is written and inspectable.
- [ ] Existing `synth init --name` behavior is preserved or cleanly migrated.
- [ ] No Protected Asset is modified.

---

## Success Criteria

This expedition is complete when:

- A user can initialize a SYNTH project by declaring a source.
- The system resolves a generic adapter, produces evidence, and emits a replayable initialization event.
- `synth status` on the initialized project reports the correct semantic context.
- All tests pass and `npm run govern` succeeds.

---

## Conflict Analysis

Before acceptance, verify the following pending or recent work does not invalidate this expedition:

1. **EXP-PROGRAM-009 — Canonical First Contact Experience** (Active): Universal Initialization extends the first-contact interaction model. Coordinate scope so that first-contact narrative work and initialization mechanics do not duplicate each other.

2. **EXP-GOV-008 — Initialization as a Governed State Transition** (just completed): Established `PROJECT_INITIALIZED` event, `lifecycle: initialized`, and `governanceVersion: 2.1`. This expedition must reuse those primitives and must not introduce a second initialization event or a different layout under `.synth/`.

3. **EXP-ENV-013 / EXP-PROGRAM-017**: Established `.synth/data/` as the canonical runtime data directory. The proposed `.synth/state/`, `.synth/evidence/`, `.synth/knowledge/`, `.synth/replay/` layout conflicts with this boundary. A migration ADR is required if the layout changes.

4. **EXP-GOV-007 — Canonical State Resolution & Status Authority**: The resolver is the single interpreter of state. Initialization must produce state that the resolver understands without custom logic.

5. **EXP-GOV-006 — Agent Lifecycle Enforcement**: Initialization is the first valid transition. The agent intake gate must allow `InitializeProject` and block other actions in `uninitialized` directories.

6. **EXP-PROGRAM-016 — Governed Expedition Execution**: Initialization produces the initial state that expedition execution later mutates. The state format must be compatible.

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
