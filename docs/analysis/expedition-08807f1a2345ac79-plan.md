# Plan: Full Adapter Catalog Unification (08807f1a2345ac79)

## Decisions

### 1. Catalog is the canonical factory registry

The catalog will store both descriptors and factories.

```ts
interface AdapterCatalog {
  register(descriptor: AdapterDescriptor, factory?: () => Adapter): void
  registerFrom(adapter: { describe(): AdapterDescriptor }): void
  create(id: string): Adapter | undefined
  query(criteria: AdapterCatalogQuery): AdapterDescriptor[]
  resolve(id: string): AdapterDescriptor | undefined
  list(): string[]
  all(): AdapterDescriptor[]
}
```

`createDefaultAdapterCatalog()` registers every built-in adapter with its factory.

### 2. AdapterRegistry becomes a catalog-backed view

`src/mission-studio/adapter-registry.ts` is reduced to a thin wrapper:

```ts
export function createAdapterRegistry(catalog = createDefaultAdapterCatalog()) {
  return {
    create: (name: string) => catalog.create(name),
    list: () => catalog.query({ family: ["evidence", "intelligence", "planning", "methodology", "integration"] }).map(d => d.id),
    descriptor: (name: string) => catalog.resolve(name),
    descriptors: () => catalog.query({ family: ["evidence", "intelligence", "planning", "methodology", "integration"] }),
    // typed getters preserved for backward compatibility
    getRepositoryAdapter: () => catalog.create("repository") as GitRepositoryAdapter,
    ...
  }
}
```

The `PLANNING_ADAPTER_FACTORIES` map moves into `adapter-catalog.ts`.

### 3. Observation capabilities are catalog entries

Discovery capabilities are registered as a special kind of catalog entry. The descriptor carries:

```ts
type AdapterDescriptor = {
  ...
  capability?: {
    observationContract?: ObservationContract
    correlation?: CorrelationCapability
  }
}
```

`createObservationCapability(descriptor)` becomes a lookup in the catalog, not a hardcoded switch.

### 4. Availability is declarative

```ts
type AdapterAvailability = {
  git?: boolean
  network?: boolean
  filesystem?: boolean
  auth?: boolean
}
```

`catalog.query()` accepts an environment snapshot:

```ts
catalog.query({
  family: "discovery",
  availableIn: { git: true, network: false }
})
```

The query filters out adapters whose `availability` requirements are not satisfied.

### 5. Namespaced adapter IDs

All adapter IDs use `domain:name`. This is a breaking change for any code that hardcodes the old IDs.

| Old ID | New ID |
|---|---|
| `filesystem` (MS) | `evidence:filesystem` |
| `filesystem-initialization` | `initialization:filesystem` |
| `conversation` | `evidence:conversation` |
| `document` | `evidence:document` |
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
| `repository` | `integration:repository` |
| `github` | `integration:github` |
| `nextjs-runtime` | `runtime:nextjs` |
| `api-route` | `runtime:api-route` |
| `python-cli` | `runtime:python-cli` |

Runtime descriptors keep their short IDs for first-contact backward compatibility, OR we update first-contact to use namespaced IDs. Decision needed.

## Implementation sequence

### Phase 1: Extend descriptor and catalog

1. Add `availability` and `capability` fields to `AdapterDescriptor` in `src/types/adapter.ts`.
2. Extend `AdapterCatalog` interface and implementation:
   - `register(descriptor, factory?)`
   - `create(id)`
   - `query()` supports `availableIn`
3. Move factory map from `AdapterRegistry` into `AdapterCatalog`.
4. Update all `createDefaultAdapterCatalog()` registrations to include factories.
5. Add tests for catalog factory creation and availability filtering.

### Phase 2: Namespace adapter IDs

1. Update every adapter's `describe().id` to namespaced form.
2. Update `AdapterRegistry` typed getters to use new IDs.
3. Update first-contact recommendation if runtime IDs change.
4. Update CLI `synth init` capability list derivation.
5. Update all tests that hardcode adapter IDs.

### Phase 3: Standardize observation capabilities

1. Add `capability` metadata to discovery adapter descriptors.
2. Replace `createObservationCapability()` switch with catalog lookup.
3. Update `discovery/engine.ts` to use the new resolver.
4. Add tests for capability resolution.

### Phase 4: Collapse AdapterRegistry

1. Rewrite `AdapterRegistry` as a catalog-backed view.
2. Remove `PLANNING_ADAPTER_FACTORIES` from registry.
3. Update all consumers (`src/core/bootstrap.ts`, `src/cli/adapter.ts`, `src/mission-studio/adapter-observation-collector.ts`, etc.).
4. Add tests for registry as catalog view.

### Phase 5: Apply availability filtering

1. Implement environment detection helper (`hasGit()`, `hasNetwork()`, etc.).
2. Update discovery engine to filter by availability.
3. Update initialization engine to filter by availability.
4. Add tests for unavailable adapters being excluded.

### Phase 6: Integration and governance

1. Run targeted tests.
2. Run `npm run govern` (operator).
3. Attach evidence and complete expedition.

## Risks

- **Breaking change:** namespacing IDs affects tests, CLI, and any hardcoded references.
- **Scope creep:** this expedition touches many files; must stay disciplined.
- **Typed getters:** preserving `getRepositoryAdapter()` etc. requires casting; may be a sign the registry should remain.

## Mission Studio adapters: current state and lifecycle gaps

Mission Studio adapters are reasoning plugins that consume `Observation[]` and emit higher-level observations or planning artifacts. They are registered through the catalog but are **not automatically invoked** during `synth mission create` today.

### Adapter families and roles

| Family | Role | Adapters |
|---|---|---|
| `evidence:*` | Read sources and emit raw `Observation[]` | `conversation`, `document`, `filesystem`, `specification` |
| `intelligence:*` | Transform observations into higher-level observations | `knowledge-extraction`, `confidence`, `dependency`, `architecture` |
| `planning:*` | Turn observations into planning artifacts | `mission-builder`, `expedition-builder`, `objective-builder`, `wizard` |
| `methodology:*` | Enforce workflows | `tdd`, `bdd` |

### How they are invoked today

```
Mission Studio planning request / CLI: synth adapter observe
       │
       ▼
collectPlanningObservations(registry, { adapterNames?, enrich? })
       │
       ├─► Phase 1: for each requested adapter
       │       adapter = registry.create(name)
       │       if adapter.observe:  batch = await adapter.observe()
       │
       └─► Phase 2 (if enrich !== false): for each adapter
               adapter = registry.create(name)
               enrich = adapter.buildFrom || adapter.extractFrom || ...
               if enrich and rawObservations.length > 0:
                   batch = await enrich(rawObservations)
       │
       ▼
mapObservationsToPlanningObservations(allObservations)
       │
       ▼
PlanningObservation[]
```

### What currently triggers them

- `src/api/index.ts` calls `collectPlanningObservations()` only when `params.adapterNames` is supplied.
- `synth mission create` passes only the basic mission observation; it does **not** pass `adapterNames`, so Mission Studio adapters are skipped.
- `synth adapter observe` can invoke them explicitly, but that is a separate manual command.
- `methodology:tdd` and `methodology:bdd` have no automated consumer.

### Current gaps

1. **No automatic trigger during mission creation.** `synth mission create` does not run evidence/intelligence/planning adapters.
2. **No configuration persistence.** Adapter config is passed at call time; nothing is stored in `.synth/manifest.json` or state.
3. **No health monitoring.** Adapters are created, used, and discarded.
4. **Methodology adapters are dead code.** `tdd` and `bdd` are registered but never invoked.
5. **No adapter-selection UI.** The operator cannot say "use only document and confidence adapters for this mission."

### Proposed whole-lifecycle wiring

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
│   ├─► integration:repository adapter: branch, commit, install hooks
│   ├─► integration:github adapter: create PR, link to issue
│   ├─► methodology:tdd adapter: ensure tests exist before implementation
│   └─► evidence:filesystem adapter: observe changed files for evidence
│
└─► Expedition completes:
    ├─► integration:repository adapter: merge branch, tag snapshot
    ├─► integration:github adapter: merge PR, create release
    └─► proof artifact generated
```

This expedition will unify the catalog so the same registry can serve initialization, Mission Studio planning, and lifecycle integration. The wiring above will be implemented in follow-up expeditions; this expedition only delivers the unified catalog and namespaced descriptors.

## Open questions for operator

1. Should runtime adapters (`nextjs-runtime`, `api-route`, `python-cli`) also be namespaced, or kept as short IDs for manifest stability?
2. Should `AdapterRegistry` be deleted entirely, or kept as a Mission Studio convenience wrapper?
3. Should availability checks also include language/runtime presence (e.g., `node: true`, `python: true`)?
4. Should `synth mission create` automatically invoke evidence/intelligence/planning adapters, or should that remain an explicit `--adapters` option?
5. Where should adapter configuration persist — `.synth/manifest.json`, a dedicated `.synth/adapter-config.json`, or event log?
