# EXP-PLATFORM-002 — Internal Platform SDK

> Also referenced as EXP-SIMPLIFICATION-003A.  
> Phase III of the SYNTH simplification program: create the canonical internal infrastructure layer.

## Authority

- Depends on: `EXP-SIMPLIFICATION-003` (extension model unification)
- Classification: **Application** (the SDK supports the kernel but is not part of it).
- Kernel: **Protected**. No changes to Event Store, Canonical State, Replay, ExecutionGate, or Runtime.

## Objective

Create the **Canonical Infrastructure Contracts** surface for SYNTH.

The repository currently solves the same infrastructure problems in many places: constructing `.synth` paths, reading and writing JSON, hashing, creating temporary directories, discovering the workspace, and loading canonical state. This expedition creates `src/sdk/` so that every feature uses the same canonical implementation.

The SDK is not a utilities folder. It is the single authoritative owner of each infrastructure concern.

```
One concern
      |
      v
One owner
      |
      v
Many consumers
```

The expedition succeeds when:

- Every repeated infrastructure operation has exactly one canonical implementation in `sdk/`.
- No feature constructs `.synth/` paths directly except through `sdk.paths`.
- No feature resolves workspace root directly except through `sdk.workspace`.
- No feature reads/writes JSON directly except through `sdk.json`.
- No feature computes SHA-256 directly except through `sdk.hashing`.
- No feature creates temporary resources directly except through `sdk.temp`.
- `sdk.events` and `sdk.state` are facades over the kernel `EventStore` and `StateStore`, not replacements.
- No kernel files are modified.
- Build and full test suite remain green.

## Constraints

- No new concepts.
- No new lifecycle states.
- No new events.
- No new public vocabulary.
- No kernel modifications.
- No new abstractions beyond the SDK modules listed below.
- Functions over objects: the SDK exposes stateless operations, not service locators.
- Single responsibility: one module per infrastructure concern.
- No business logic in the SDK.
- **Replacement rule:** No file may be added to `sdk/` unless at least one existing inline implementation elsewhere is deleted or deprecated during the same expedition.

## Mandatory artifacts

1. **Infrastructure Responsibility Matrix:** `docs/expeditions/EXP-PLATFORM-002-responsibility-matrix.md`
2. **SDK Surface:** `docs/expeditions/EXP-PLATFORM-002-sdk-surface.md`
3. **Duplication Map:** `docs/expeditions/EXP-PLATFORM-002-duplication-map.md`
4. **Migration Order:** `docs/expeditions/EXP-PLATFORM-002-migration-order.md`
5. **Deletion List:** `docs/expeditions/EXP-PLATFORM-002-deletion-list.md`

---

## Current state: duplicated infrastructure knowledge

### Path construction

A single source of truth already exists at `src/infra/paths.ts`, but path construction is still inlined in many places.

**Already centralized:**
- `getManifestPath(cwd)`
- `hasManifest(cwd)`
- `getRuntimeDataDir(cwd)`
- `ensureRuntimeDataDir(cwd)`
- `getRuntimeSnapshotDir(cwd)`

**Still inlined (sample):**
- `path.join(process.cwd(), ".synth", "manifest.json")` — CLI, verification, repository-identity
- `path.join(process.cwd(), ".synth", "discovery")` — CLI
- `path.join(process.cwd(), ".synth")` — CLI, first-contact, workspace
- `path.join(targetDir, ".synth", "data")` — CLI bootstrap-apply
- `path.join(cwd, ".synth", "expeditions.json")` — verification

**SDK owner:** `sdk.paths`

---

### Filesystem I/O

Two overlapping infrastructure abstractions already exist:

- `src/infra/filesystem.ts` — `FilesystemAdapter` (readFile, writeFile, appendFile, mkdir, exists, readdir)
- `src/infra/filesystem-provider.ts` — `FilesystemProvider` (readFile, writeFile, listDirectory, pathExists, isDirectory, ensureDirectory, deleteFile)

Despite these abstractions, direct `fs` usage is scattered across adapters and CLI:

- `fs.readFileSync` — adapters/repository/git.ts, adapters/filesystem/adapter.ts, adapters/specification/adapter.ts, adapters/document/adapter.ts, adapters/bdd/adapter.ts
- `fs.writeFileSync` — adapters/bdd/adapter.ts, adapters/tdd/adapter.ts, adapters/repository/git.ts
- `fs.mkdirSync` — adapters/bdd/adapter.ts, adapters/repository/git.ts
- `fs.existsSync` — adapters/tdd/adapter.ts, adapters/bdd/adapter.ts, adapters/filesystem/adapter.ts, adapters/specification/adapter.ts, adapters/document/adapter.ts, adapters/repository/git.ts
- `fs.readdirSync` — adapters/bdd/adapter.ts, adapters/filesystem/adapter.ts, adapters/repository/git.ts, adapters/specification/adapter.ts, adapters/document/adapter.ts

**SDK owner:** `sdk.files` (unified filesystem operations, building on the result of a future filesystem-contract unification expedition if needed)

---

### JSON operations

Patterns repeated throughout the repository:

- `JSON.parse(await fs.readFile(path, "utf-8"))` — CLI, mission-studio, first-contact, workspace, verification, runtime/governance-resolver
- `JSON.stringify(obj, null, 2)` — CLI, mission-studio, first-contact, workspace, infra/state-store, infra/checkpoint-store
- `JSON.parse(JSON.stringify(obj))` deep clone — governance/review-gate-engine.ts, mission-studio/snapshot-store.ts, infra/state-store.ts, runtime/executor.ts
- `JSON.stringify(sortKeys(value))` canonical serialization — environment/evidence.ts, core/hash.ts

**SDK owner:** `sdk.json` (`readJson`, `writeJson`, `deepClone`, `canonicalize`)

---

### Hashing

`src/core/hash.ts` already provides canonical hashing utilities (`sha256`, `stableStringify`, `sortKeys`, `computeEventHash`), but inline hashing is still common:

- `crypto.createHash("sha256").update(...).digest("hex")` appears in 30+ locations
- Many adapters slice the digest to 8, 12, or 16 characters
- Duplicate `stableId` implementations exist in four rule-based adapters

**SDK owner:** `sdk.hashing` (`sha256`, `shortHash`, `stableStringify`, `stableId`)

---

### Temporary resources

Current usage is small but inconsistent:

- `os.tmpdir()` + `fs.mkdtemp` — CLI certification-runner, first-contact experiment
- `crypto.randomUUID()` — used for IDs across CLI, genesis, API, subsystems, observability

**SDK owner:** `sdk.temp` (`project()`, `directory()`, `file()`), `sdk.identity` (`uuid()`, `shortId()`)

---

### Workspace root

`process.cwd()` is used as a default root parameter in dozens of functions and constructors across adapters, CLI, discovery, and first-contact.

**SDK owner:** `sdk.workspace` (`root()`, `synthDir()`, `dataDir()`, `discover(root?)`)

---

### State and event access

Already encapsulated in:

- `src/infra/event-store.ts`
- `src/infra/state-store.ts`
- `src/runtime/governance-resolver.ts` (`readJsonMaybe`, `readEventLog`)

But CLI and bootstrap code still directly reads `event-log.jsonl` and `canonical-state.json`.

**SDK owner:** `sdk.state` and `sdk.events` (thin wrappers that delegate to the existing kernel stores, not replacements)

---

## Responsibility overlap matrix

| Concern | Current locations | SDK owner | Priority |
|---|---|---|---|
| `.synth/` path construction | `src/infra/paths.ts`, CLI, verification, first-contact, workspace | `sdk.paths` | 1 |
| Filesystem read/write | `src/infra/filesystem.ts`, `src/infra/filesystem-provider.ts`, adapters, CLI | `sdk.files` | 2 |
| JSON read/write/clone | CLI, mission-studio, first-contact, workspace, governance, infra stores | `sdk.json` | 2 |
| SHA-256 hashing | `src/core/hash.ts`, adapters, mission-studio, CLI | `sdk.hashing` | 3 |
| Temporary directories/files | CLI certification-runner, first-contact experiment | `sdk.temp` | 4 |
| Identity generation | CLI, genesis, API, subsystems, observability | `sdk.identity` | 4 |
| Workspace root resolution | adapters, CLI, discovery, first-contact | `sdk.workspace` | 1 |
| Event log access | `src/infra/event-store.ts`, CLI, runtime resolver | `sdk.events` | 5 |
| Canonical state access | `src/infra/state-store.ts`, CLI, runtime resolver | `sdk.state` | 5 |
| Process execution | adapters/tdd, adapters/bdd, CLI | `sdk.process` | 6 |
| Manifest read | `src/infra/paths.ts`, CLI, verification | `sdk.manifest` | 1 |

---

## Baseline metrics

Captured before any SDK implementation.

| Metric | Baseline |
|---|---|
| Files with direct `.synth/` path construction | 15+ |
| Files with direct `fs.*Sync` calls | 12+ |
| Files with inline `JSON.parse(...readFile)` | 20+ |
| Files with inline `JSON.stringify(..., null, 2)` | 25+ |
| Files with inline `crypto.createHash("sha256")` | 30+ |
| Files defaulting to `process.cwd()` | 35+ |
| Files using `crypto.randomUUID()` | 15+ |
| Inline `stableId` implementations | 4 |
| Infrastructure helper modules | 4 (`paths`, `filesystem`, `filesystem-provider`, `hash`) |
| Full test result | 119 passed, 0 failed |

---

## SDK architecture

```
src/sdk/
├── workspace/
│   ├── root.ts
│   └── discovery.ts
├── paths/
│   ├── synth.ts
│   ├── runtime.ts
│   └── artifacts.ts
├── files/
│   ├── read.ts
│   ├── write.ts
│   └── atomic.ts
├── json/
│   ├── read.ts
│   └── write.ts
├── hashing/
│   ├── sha256.ts
│   ├── stable-id.ts
│   └── canonical.ts
├── manifest/
├── identity/
├── temp/
├── process/
├── events/
└── state/
```

Do **not** create:

```
src/sdk/utils
src/sdk/helpers
src/sdk/common
```

## SDK design principles

1. **One concern per module.** `sdk.paths` only paths.
2. **Stateless.** `paths.runtimeData(root)`, not `paths.state()`.
3. **No business logic.** `workspace.findRoot()`, not `workspace.bootstrapRepository()`.
4. **Composable.** `json.read(paths.state(workspace.root()))`.
5. **No SDK module without deleting duplication.** Wrappers are not simplifications.
6. **Canonical ownership.** Every concern has exactly one authoritative implementation.

## Execution plan

### Wave 1 — Repository Reality

#### 1. sdk.workspace (P0)

**Goal:** Remove the hidden assumption that `process.cwd() == repository root`.

**Changes:**
- Create `sdk/workspace/root.ts` with `root()` and `resolve()`.
- Create `sdk/workspace/discovery.ts` with `discover()`.
- Replace `process.cwd()` defaults with explicit root resolution.

**Stop gate:** Build green, tests green, no new `process.cwd()` defaults in application code.

#### 2. sdk.paths (P0)

**Goal:** Centralize every `.synth/` subpath.

**Changes:**
- Create `sdk/paths/synth.ts`, `sdk/paths/runtime.ts`, `sdk/paths/artifacts.ts`.
- Provide helpers for `data()`, `events()`, `state()`, `manifest()`, `snapshots()`, `discovery()`, `firstContact()`, `artifacts()`.
- Replace all inline `path.join(..., ".synth", ...)` with `sdk.paths.*`.

**Stop gate:** Build green, tests green, all `.synth/` path construction routed through `sdk.paths`.

### Wave 2 — File and Serialization Boundary

#### 3. sdk.files (P1)

**Goal:** Provide a single filesystem primitive surface.

**Changes:**
- Create `sdk/files/read.ts`, `sdk/files/write.ts`, `sdk/files/atomic.ts`.
- Migrate application code; leave kernel stores as consumers of `sdk.files` where appropriate.

**Stop gate:** Build green, tests green, no direct `fs.*Sync` or `fs/promises` in application code.

#### 4. sdk.json (P1)

**Goal:** Remove inline JSON serialization.

**Changes:**
- Create `sdk/json/read.ts` and `sdk/json/write.ts`.
- Provide `readJson()`, `readJsonMaybe()`, `writeJson()`, `writeJsonAtomic()`.
- Migrate all inline `JSON.parse(...readFile)` and `JSON.stringify(...writeFile)`.

**Stop gate:** Build green, tests green, no inline JSON serialization in application code.

#### 5. sdk.hashing (P1)

**Goal:** Remove inline SHA-256 usage.

**Changes:**
- Create `sdk/hashing/sha256.ts`, `sdk/hashing/stable-id.ts`, `sdk/hashing/canonical.ts`.
- Migrate adapters and CLI; preserve kernel `computeEventHash` semantics.

**Stop gate:** Build green, tests green, inline `crypto.createHash` reduced to kernel-only use cases.

### Wave 3 — Platform Identity

#### 6. sdk.manifest (P1)

**Goal:** Centralize manifest access.

**Changes:**
- Create `sdk/manifest/read.ts` with `read()`, `exists()`, `validate()`.
- Migrate CLI, verification, and resolver consumers.

**Stop gate:** Build green, tests green.

#### 7. sdk.identity (P2)

**Goal:** Centralize ID generation.

**Changes:**
- Create `sdk/identity.ts` with `uuid()` and `shortId()`.
- Migrate `crypto.randomUUID()` call sites.

**Stop gate:** Build green, tests green.

#### 8. sdk.temp (P2)

**Goal:** Centralize temp resource creation.

**Changes:**
- Create `sdk/temp.ts` with `directory()` and `file()`.
- Migrate `os.tmpdir()` + `mkdtemp()` usages.

**Stop gate:** Build green, tests green.

#### 9. sdk.process (P2)

**Goal:** Establish deterministic process execution contract.

**Changes:**
- Create `sdk/process.ts` with `exec()`, `execSync()`, and a deterministic result shape.
- Migrate `execSync`/`spawn` usages in adapters and CLI.

**Stop gate:** Build green, tests green.

### Wave 4 — Kernel Access Facades

#### 10. sdk.events (P2)

**Goal:** No direct JSONL access outside EventStore.

**Changes:**
- Create `sdk/events.ts` as a thin facade over `src/infra/event-store.ts`.
- Migrate CLI commands that read `event-log.jsonl` directly.

**Stop gate:** Build green, tests green.

#### 11. sdk.state (P2)

**Goal:** No direct canonical-state access outside StateStore.

**Changes:**
- Create `sdk/state.ts` as a thin facade over `src/infra/state-store.ts`.
- Migrate CLI commands that read `canonical-state.json` directly.

**Stop gate:** Build green, tests green.

### Pass 5 — Cleanup

**Goal:** Delete obsolete helpers and update artifacts.

**Changes:**
- Delete `src/infra/paths.ts` if fully superseded.
- Delete duplicate `stableId` implementations.
- Remove migrated inline implementations.
- Update responsibility matrix, duplication map, deletion list.

**Stop gate:** Build green, full test suite green, final metrics captured.

---

## Success metrics

| Metric | Before | After target |
|---|---|---|
| Files with direct `.synth/` path construction | 15+ | 0 (only `sdk/paths`) |
| Files with direct `fs.*Sync` calls in application code | 12+ | 0 (kernel stores exempt) |
| Files with inline `JSON.parse(...readFile)` | 20+ | 0 (only `sdk/json`) |
| Files with inline `JSON.stringify(..., null, 2)` | 25+ | 0 (only `sdk/json`) |
| Files with inline `crypto.createHash("sha256")` | 30+ | ≤2 (kernel hash utilities) |
| Files defaulting to `process.cwd()` | 35+ | ≤5 (SDK consumers pass `sdk.workspace.root()`) |
| Inline `stableId` implementations | 4 | 1 (`sdk/hashing`) |
| SDK modules | 0 | 8–10 |
| Kernel files touched | — | 0 |
| Public API changes | — | 0 |
| Test failures after migration | — | 0 |

---

## Non-goals

- Do not redesign EventStore, StateStore, Replay, or ExecutionGate.
- Do not introduce dependency injection or a service locator.
- Do not add runtime configuration or dynamic plugin loading to the SDK.
- Do not migrate tests to SDK unless those tests are already being touched.
- Do not unify `FilesystemAdapter` and `FilesystemProvider` unless that unification is explicitly scoped and safe.
- Do not change the kernel.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Every feature depends on slightly different filesystem semantics | Define `sdk.files` contract explicitly; migrate only callers that fit. Keep outliers in existing abstractions until a separate expedition can unify them. |
| Adapters rely on sync `fs` calls | Provide sync variants in `sdk.files` initially (`readTextSync`, `writeTextSync`); deprecate gradually. |
| Kernel stores indirectly depend on inlined behavior | Kernel stores remain untouched; they may later become consumers of `sdk.files` but are not modified in this expedition. |
| Large blast radius from migrating CLI | Migrate one CLI command at a time; run full test suite after each. |
| SDK becomes a junk drawer | Enforce single responsibility per module; reject additions that do not eliminate an existing duplicate. |

---

## Approval

Approve as an insertion into the simplification program before `EXP-SIMPLIFICATION-004` (extension simplification continuation) or any broad application simplification. The SDK becomes the stable foundation that later expeditions can rely on.

Required deliverables:

1. `EXP-SIMPLIFICATION-003A-responsibility-matrix.md`
2. `EXP-SIMPLIFICATION-003A-sdk-surface.md`
3. `EXP-SIMPLIFICATION-003A-duplication-map.md`
4. `EXP-SIMPLIFICATION-003A-migration-order.md`
5. `EXP-SIMPLIFICATION-003A-deletion-list.md`
