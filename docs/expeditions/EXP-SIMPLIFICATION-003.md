# EXP-SIMPLIFICATION-003 — Extension Model Unification

> Phase 3 of the SYNTH simplification program: eliminate duplicate responsibilities across the extension/discovery models.

## Authority

- Depends on: `EXP-COMPLEXITY-AUDIT-001`, `EXP-SIMPLIFICATION-002` (test infrastructure)
- Classification: **Application** (all three models are outside the kernel).
- Kernel: **Protected**. No changes to Event Store, Canonical State, Replay, ExecutionGate, or Runtime.

## Objective

Eliminate duplicate responsibilities across `src/adapters/`, `src/environment/`, and `src/discovery/`.

The expedition does **not** predetermine that everything moves into `src/discovery/`. The destination of each component is a consequence of the responsibility analysis, not the goal.

The expedition succeeds when:

- One extension registration model remains.
- One extension lifecycle remains.
- One discovery pipeline remains.
- One observation model remains.
- One implementation exists for each external system (Git, filesystem, process, etc.).
- Zero overlapping responsibilities remain.
- Zero kernel files are modified.

## Constraints

- No new concepts.
- No new lifecycle states.
- No new events.
- No new public vocabulary.
- No kernel modifications.
- No new abstractions.
- Every production file touched must have exactly one owner, one responsibility, one registration path, and one lifecycle.
- **Replacement rule:** No file may be added unless at least one existing production file is deleted during the same expedition.
- Public API changes ideally zero; any breaking change must be quantified.

## Mandatory artifact

**Responsibility Matrix:** `docs/expeditions/EXP-SIMPLIFICATION-003-responsibility-matrix.md`

Every directory, service, registry, provider, and adapter in scope gets exactly one row. Every code change must correspond to one decision in the matrix.

---

## Current state: three overlapping models

### Model A — `src/adapters/` (AdapterRegistry)

**Responsibility in one sentence:**
> Provide structured observations about the repository and project to support mission planning and expeditions.

**Components:**
- `AdapterRegistry` with 17 adapter factories
- Lifecycle: discovered → configured → validated → enabled → disabled
- Adapters: repository/git, github, tdd, bdd, conversation, document, filesystem, specification, knowledge-extraction, confidence, dependency, architecture, mission-builder, expedition-builder, objective-builder, wizard

**Consumers:**
- Mission Studio (`mission-studio-adapter-collector`, `mission-studio-adapter-mapper`)
- API (`api-adapter-integration`)
- Planning

**Files:** 36 TypeScript files
**LOC:** 5,650

---

### Model B — `src/environment/` (DiscoveryOrchestrator + CapabilityProvider)

**Responsibility in one sentence:**
> Discover environmental capabilities (filesystem, git, runtime, package manager, forge) and select the best provider for each.

**Components:**
- `DiscoveryOrchestrator`
- `DiscoveryRule` + `CapabilityProvider`
- Evidence artifact: `DiscoveryEvidence`
- Capability families: Environment, Workspace, Filesystem, Revision, Process, Tool, Runtime, Package, Network, Forge, Secrets, Identity, Versioning
- Reference providers in `src/environment/providers/reference.ts`

**Consumers:**
- Bootstrap (environment capability report)
- Environment certification tests
- CLI `synth doctor` / capability reporting

**Files:** 18 TypeScript files
**LOC:** 3,725

---

### Model C — `src/discovery/` (DiscoveryEngine)

**Responsibility in one sentence:**
> Collect, normalize, correlate, project, and verify repository observations into a deterministic DiscoverySession.

**Components:**
- `DiscoveryEngine` with pipeline: Acquire → Normalize → Correlate → Project → Verify
- `DiscoveryAdapterRegistry`
- Observation capabilities: filesystem, git, operational-artifact
- Correlation capabilities
- Projection capabilities: findings, project-model
- Providers: git-provider, process-git-provider
- Consumers: CLI, JSON, replay, drift
- Evidence artifact: `DiscoverySession`

**Consumers:**
- Bootstrap (`bootstrap-discovery-integration`)
- CLI discovery/replay commands
- Planning

**Files:** 27 TypeScript files
**LOC:** 5,617

---

## Responsibility overlap matrix

| Concern | `src/adapters/` | `src/environment/` | `src/discovery/` |
|---|---|---|---|
| Observe filesystem | ✅ FilesystemAdapter | ✅ node-filesystem provider | ✅ filesystem observation capability |
| Observe git | ✅ GitRepositoryAdapter | ✅ git-revision / git-versioning providers | ✅ git observation capability |
| Observe runtime | ❌ | ✅ node-runtime / npm-package providers | ❌ |
| Observe forge | ✅ GitHubAdapter | ✅ github-forge provider | ❌ (operational artifact partially) |
| Adapter/capability registry | ✅ AdapterRegistry | ❌ (provider list) | ✅ AdapterRegistry |
| Lifecycle | discovered→configured→validated→enabled→disabled | rule → provider evaluation | capability adapter → projection |
| Evidence artifact | observations | DiscoveryEvidence | DiscoverySession |
| Replay/verification | ❌ | ❌ | ✅ replay verification |
| Project model | ❌ | ❌ | ✅ project-model projection |
| Planning observations | ✅ primary consumer | ❌ | ✅ bootstrap consumes |

**Evidence of duplication:**

1. **Two adapter registries:** `src/adapters/registry.ts` and `src/discovery/adapter-registry.ts` both resolve adapters.
2. **Two git observation implementations:** `src/adapters/repository/git.ts`, `src/environment/providers/reference.ts` (git-revision / git-versioning), and `src/discovery/adapters/git-adapter.ts`.
3. **Two filesystem observation implementations:** `src/adapters/filesystem/adapter.ts`, `src/environment/providers/reference.ts` (node-filesystem), and `src/discovery/adapters/filesystem-adapter.ts`.
4. **Two evidence formats:** `DiscoveryEvidence` (environment) and `DiscoverySession` (discovery).
5. **Two capability/provider concepts:** `CapabilityProvider` (environment) and `ObservationCapability` (discovery).

---

## Baseline metrics

Captured before any Pass 1 changes.

| Metric | Baseline |
|---|---|
| TypeScript files in scope | 81 |
| TypeScript LOC in scope | 14,992 |
| Adapter classes | 17 |
| Adapter factory functions | 18 |
| Adapter/capability registries | 2 |
| Discovery orchestration mechanisms | 2 (`DiscoveryOrchestrator`, `DiscoveryEngine`) |
| Evidence artifact types | 2 (`DiscoveryEvidence`, `DiscoverySession`) |
| Filesystem observation implementations | 4 |
| Git observation implementations | 4 |
| Environment capability interfaces | 8 |
| External consumers of these modules | 22 files |
| Full test runtime | ~13.3s |
| Full test result | 119 passed, 0 failed |

---

## Execution plan

### Pass 1 — Remove duplicate registrations

**Goal:** Collapse the two adapter registries and unify how components are discovered/registered.

**Changes:**
- Merge `src/adapters/registry.ts` into `src/discovery/adapter-registry.ts` or delete it if no consumer needs name-based lookup.
- Update consumers (Mission Studio, API, Planning) to use the unified registry.
- Remove duplicate registration boilerplate.

**Stop gate:** Build green, full test suite green, metrics updated.

### Pass 2 — Merge duplicate implementations

**Goal:** Eliminate overlapping observation and orchestration implementations.

**Changes:**
- Merge filesystem observation logic into `src/discovery/adapters/filesystem-adapter.ts`.
- Merge git observation logic into `src/discovery/adapters/git-adapter.ts`.
- Convert environment discovery rules/providers into discovery observation capabilities or delete them if redundant.
- Absorb `DiscoveryOrchestrator` into `DiscoveryEngine` pipeline.
- Merge capability/provider taxonomy into `src/discovery/types.ts`.
- Move `buildCapabilityReport` to discovery projections.
- Move `FilesystemProvider` and `ObservationContext` to appropriate infrastructure locations.

**Stop gate:** Build green, full test suite green, metrics updated.

### Pass 3 — Delete obsolete code

**Goal:** Remove directories and files whose responsibilities have been migrated.

**Changes:**
- Delete `src/environment/evidence.ts` (replaced by `DiscoverySession`).
- Delete empty/obsolete environment capability interface files.
- Delete `src/adapters/registry.ts` if not already removed.
- Remove obsolete directories only when all consumers are migrated.

**Stop gate:** Build green, full test suite green, final metrics captured.

---

## Success metrics

| Metric | Before | After | Change |
|---|---|---|---|
| TypeScript files in scope | 81 | 71 | -10 (-12%) |
| TypeScript LOC in scope | 14,992 | 13,034 | -1,958 (-13%) |
| Exported symbols in scope | 480 | 393 | -87 (-18%) |
| External consumers of `src/adapters/` / `src/environment/` / `src/discovery/` | 22 | 12 | -10 (-45%) |
| Adapter registry naming collisions | 2 (`AdapterRegistry` in adapters + discovery) | 0 | -2 |
| Capability/provider taxonomies | 2 (environment + discovery) | 1 (discovery) | -1 |
| Unused capability provider files | 8 | 0 | -8 |
| Public API changes | — | 0 | — |
| Kernel files touched | — | 0 | — |
| Test failures after migration | — | 0 | — |
| Full test runtime | ~13.3s | ~13.4s | no regression |

### Metrics not achieved (and why)

| Metric | Target | Actual | Reason |
|---|---|---|---|
| Filesystem observation implementations | 1 | 2 | Mission Studio `src/adapters/filesystem/adapter.ts` and Discovery `src/discovery/adapters/filesystem-adapter.ts` serve different consumers with different observation contracts. Merging requires an adapter bridge; stopped per hard-stop rule. |
| Git observation implementations | 1 | 2 | Same reason: Mission Studio `src/adapters/repository/git.ts` (observation + mutation) and Discovery `src/discovery/adapters/git-adapter.ts` have different contracts. |
| Evidence artifact types | 1 | 2 | `DiscoveryEvidence` (persistent evidence artifact) and `DiscoverySession` (transient pipeline result) are not semantically equivalent. |
| Discovery orchestration mechanisms | 1 | 2 | `DiscoveryOrchestrator` (`DiscoveryEvidence`) and `DiscoveryEngine` (`DiscoverySession`) have different output contracts. Unification requires a projection bridge. |

---

## Non-goals

- Do not redesign the Discovery engine pipeline.
- Do not change the kernel.
- Do not add new lifecycle states or events.
- Do not introduce new public vocabulary.
- Do not migrate all tests to shared helpers unless those tests are already being touched.
- Do not perform unrelated refactoring.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Bootstrap depends on both environment and discovery outputs | Update bootstrap to call unified Discovery engine; verify with `synth-bootstrap.test.js` and `bootstrap-discovery-integration.test.js` |
| CLI `synth doctor` uses environment capability report | Move capability report to Discovery projection; verify with `runtime-integrity.test.js` and `environment-capability-report.test.js` |
| Mission Studio depends on AdapterRegistry | Update to use `src/discovery/adapter-registry.ts`; verify with `mission-studio-*.test.js` |
| Planning depends on adapter observations | Update import paths; verify with `api-adapter-integration.test.js` |
| Replacement rule blocks a necessary helper | The helper must justify itself by replacing an existing file; otherwise inline it. |

---

## Approval

Approved with the refinement that the objective is **eliminating duplicate responsibilities**, not relocating everything into `src/discovery/`. The Responsibility Matrix and objective metrics are mandatory deliverables.


---

## Pass 2 hard stops

The following merges were evaluated and rejected because they would have required a new abstraction, compatibility layer, adapter-to-adapter bridge, or temporary architecture:

1. **Environment rules → Discovery observation capabilities**
   - Same responsibility conceptually, but different behavioral contracts (`DiscoveryObservation` + `ObservationContext` vs `Observation` + `DiscoveryAdapter`).
   - Merge would require a bridge between the two observation models.
   - Decision: KEEP both; address in a future expedition if a unified observation model is justified.

2. **DiscoveryOrchestrator → DiscoveryEngine**
   - Both perform discovery, but output contracts differ (`DiscoveryEvidence` vs `DiscoverySession`).
   - Absorbing orchestrator into engine would violate the engine's single responsibility.
   - Decision: KEEP `DiscoveryOrchestrator` as a separate consumer of discovery evidence.

3. **DiscoveryEvidence → DiscoverySession**
   - `DiscoveryEvidence` is a persistent, hashable evidence artifact.
   - `DiscoverySession` is a transient pipeline result with provenance and replay.
   - They are not the same abstraction.
   - Decision: KEEP both.

4. **Mission Studio filesystem/git adapters → Discovery filesystem/git adapters**
   - Different observation types (`src/types/observation.ts` vs `src/discovery/types.ts`).
   - Mission Studio adapters support lifecycle/mutation methods; discovery adapters are read-only.
   - Decision: KEEP as separate responsibilities.

---

## Post-expedition audit recommendation

Several similar implementations remain outside the scope of this expedition and should be evaluated in a follow-up audit:

- `src/adapters/github/adapter.ts` vs `src/repository/adapters/github-adapter.ts`
- `src/adapters/repository/git.ts` (mutation methods) vs `src/infra/git-adapter.js`
- `src/infra/filesystem.ts` (`FilesystemAdapter`) vs `src/infra/filesystem-provider.ts` (`FilesystemProvider`)
- `src/environment/rules.ts` (observation rules) vs `src/discovery/` (observation capabilities)

The audit should apply the same three-proof rule:
1. Same responsibility
2. Same behavioral contract
3. Same kernel interaction

Only components satisfying all three proofs should be merged.
