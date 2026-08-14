# Adapter Catalog Architecture

## Two adapter concepts that share a lifecycle

SYNTH currently overloads the word "adapter." There are two distinct concepts that happen to implement the same `Adapter` lifecycle interface:

### 1. External-system adapters
These bridge project reality into SYNTH. They read or act on external state.

- **Discovery** — `discovery:filesystem`, `discovery:git`, `discovery:operational-artifacts`
- **Initialization** — `initialization:filesystem`, future `initialization:repository`, `initialization:conversation`
- **Integration / operations** — `repository`, `github`
- **Runtime / workflow** — `nextjs-runtime`, `api-route`, `python-cli`, `methodology:tdd`

### 2. Mission Studio adapters
These are reasoning plugins. They do not mutate project state; they transform observations into plans or higher-level observations.

- **Evidence** — `evidence:conversation`, `evidence:document`, `evidence:filesystem`, `evidence:specification`
- **Intelligence** — `intelligence:knowledge-extraction`, `intelligence:confidence`, `intelligence:dependency`, `intelligence:architecture`
- **Planning** — `planning:mission-builder`, `planning:expedition-builder`, `planning:objective-builder`, `planning:wizard`
- **Methodology** — `methodology:tdd`, `methodology:bdd`

Both implement `discover → configure → validate → enable → healthCheck → disable`, but they are used at different lifecycle stages and should have distinct namespaces.

## Adapter lifecycle diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODULE LOAD / BUILD TIME                            │
│  Adapter modules export createXAdapter() factories.                         │
│  createDefaultAdapterCatalog() calls each factory once, invokes describe(),  │
│  and registers { descriptor, factory }.                                      │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADAPTER CATALOG (singleton)                         │
│  • descriptors: Map<id, AdapterDescriptor>                                   │
│  • factories:  Map<id, () => Adapter>                                        │
│  • query(criteria) → ranked AdapterDescriptor[]                              │
│  • resolve(id)     → AdapterDescriptor | undefined                           │
│  • create(id)      → Adapter instance                                        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐
│   Discovery     │   │  Initialization  │   │      Mission Studio         │
│     Engine      │   │     Engine       │   │      Registry               │
│                 │   │                  │   │                             │
│ query({         │   │ query({          │   │ query({                     │
│   family: [     │   │   family:        │   │   family: [                 │
│     "discovery",│   │   "initialization"│   │     "evidence",             │
│     "filesystem",│  │ })               │   │     "intelligence",         │
│     "operational-artifact"                 │     "planning",             │
│   ],            │   │                  │   │     "methodology"           │
│   availableIn: {│   │ create(id)       │   │   ]                         │
│     git, network│   │   → instance     │   │ })                          │
│   }             │   │                  │   │                             │
│ })              │   │                  │   │ create(id)                  │
│                 │   │                  │   │   → instance                │
│ for each desc:  │   │ for each desc:   │   │                             │
│   createObservationCapability(desc)        │ configure({...})            │
│   → ObservationCapability                  │ enable()                    │
│                 │   │                  │   │ observe() / buildFrom()     │
└─────────────────┘   └──────────────────┘   └─────────────────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐
│  collectObs()   │   │  collectEvidence()│   │      observe()              │
│  per source     │   │  per source      │   │  / buildFrom()              │
│                 │   │                  │   │                             │
│  → Observation[]│   │  → Evidence      │   │  → Observation[]            │
│                 │   │  → ProjectModel  │   │                             │
└─────────────────┘   └──────────────────┘   └─────────────────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYNTH GOVERNANCE LIFECYCLE                          │
│  ProjectModel + manifest + event-log exist. ExecutionGate drives state.     │
│  Adapters now produce evidence/observations; they do not mutate state.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## How an adapter is selected

1. **Descriptor query** — engine asks the catalog: "which adapters match these criteria?"
   - `family`, `kind`, `capability`, `sourceType`, `runtime`, `language`, `platform`
   - `availableIn: { git, network, filesystem, auth }` — filters out adapters whose prerequisites are missing
2. **Explicit resolution** — code calls `catalog.resolve(id)` or `catalog.create(id)`
3. **Task hint** (future) — a task declares `adapterHint: ["evidence:document"]`; the task loader validates it against the catalog

## How an adapter is configured and called

```
createDefaultAdapterCatalog()
  │
  ├─► catalog.query({ family: "discovery", availableIn: { git: true } })
  │     ├─► descriptor: discovery:git
  │     └─► create("discovery:git") → GitDiscoveryAdapter instance
  │            ├─ discover()        → "discovered"
  │            ├─ configure({...})  → "configured"
  │            ├─ validate()        → "validated"
  │            ├─ enable()          → "enabled"
  │            └─ collectObservations(source, context) → Observation[]
  │
  ├─► catalog.query({ family: "initialization" })
  │     └─► create("initialization:filesystem") → FilesystemInitializationAdapter
  │            └─ collectEvidence(input) → InitializationEvidence → ProjectModel
  │
  └─► registry = catalog-backed view({ family: ["evidence", "intelligence", "planning", "methodology"] })
        └─► registry.create("planning:mission-builder")
              └─ observe(observations) → mission proposal observations
```

## Naming proposal

Use a `domain:name` namespace so the two adapter concepts never collide:

| Domain | Examples |
|---|---|
| `discovery:` | `discovery:filesystem`, `discovery:git`, `discovery:operational-artifacts` |
| `initialization:` | `initialization:filesystem`, `initialization:repository`, `initialization:conversation` |
| `integration:` | `integration:repository`, `integration:github` (or keep `repository`, `github` as short IDs) |
| `runtime:` | `runtime:nextjs`, `runtime:api-route`, `runtime:python-cli` |
| `evidence:` | `evidence:conversation`, `evidence:document`, `evidence:filesystem`, `evidence:specification` |
| `intelligence:` | `intelligence:knowledge-extraction`, `intelligence:confidence`, `intelligence:dependency`, `intelligence:architecture` |
| `planning:` | `planning:mission-builder`, `planning:expedition-builder`, `planning:objective-builder`, `planning:wizard` |
| `methodology:` | `methodology:tdd`, `methodology:bdd` |

## Open decisions

1. Should the catalog itself store factories, or should a separate `AdapterFactoryRegistry` hold them?
2. Should `AdapterRegistry` remain as a Mission Studio-specific filter, or be deleted in favor of `catalog.query()`?
3. Should observation capabilities be descriptors in the catalog, or stay as separate capability objects resolved by the catalog?
4. Should environment availability be declarative (`availability: { git: true }`) or checked via a function (`availabilityCheck(env) => boolean`)?
