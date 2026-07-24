# Post-Expedition Duplicate Audit: EXP-SIMPLIFICATION-003

**Scope:** Find similar implementations across `src/` after consolidation of adapters, environment providers, and discovery into a single extension model.  
**Status:** Read-only audit. No production code changed.  
**Build:** `npm run build` succeeds.  
**Tests:** 119 passed, 0 failed.

---

## 1. Threshold for merge/unify decisions

A candidate pair or group is classified by four axes. The action depends on how many axes match.

### Axes

| Axis | Question |
|------|----------|
| **Responsibility** | Do they provide the same observable behavior to a user or operator? |
| **Contract** | Do they accept and return the same shape of inputs/outputs? |
| **Kernel interaction** | Do they interact with canonical state in the same mode (read-only, event emission, direct mutation)? |
| **Consumer independence** | Is any consumer relying on the two remaining separate? |

### Decision matrix

| Responsibility | Contract | Kernel mode | Consumer independence | Verdict |
|---|---|---|---|---|
| Same | Same | Same | No consumer depends on separation | **Merge now** |
| Same | Equivalent (name differences only) | Same | No consumer depends on separation | **Merge in dedicated expedition** |
| Same | Different semantics | Same | — | **Keep separate or redesign one** |
| Different | — | — | — | **Keep separate** |
| Same | Same | Different | — | **Keep separate** (different authority) |
| Any | Any | Any | Consumer depends on separation | **Keep separate** unless consumer is also refactored |

### Hard stop for unification

Do **not** merge if it requires:

- a new abstraction layer,
- a compatibility bridge between two contracts,
- an adapter-to-adapter translator,
- a temporary coexistence mechanism,
- or a change to kernel event semantics.

Those cases become their own expeditions with explicit scope and acceptance criteria.

---

## 2. Methodology

1. Listed all exported `*Adapter`, `*Provider`, `*Registry`, `*Engine`, `*Store`, `*Service` symbols in `src/`.
2. Identified files with identical basenames across different directories.
3. Compared interfaces and implementations for overlapping responsibilities.
4. Searched for duplicated utility functions (`stableId`, `computeConfidence`, `canonicalizeEvidence`, `normalizeInput`, etc.).
5. Applied the threshold above to each candidate.
6. Excluded anything that is a naming pattern rather than an implementation duplicate.

Repository snapshot used for the audit:

- TypeScript source files: 278
- Source directories: 79
- Tests passed: 119/119

---

## 3. Findings

### A. Infrastructure filesystem abstraction duplication — MERGE IN DEDICATED EXPEDITION

**Files:**

- `src/infra/filesystem.ts` — `FilesystemAdapter` interface: `readFile`, `writeFile`, `appendFile`, `mkdir`, `exists`, `readdir`
- `src/infra/filesystem-provider.ts` — `FilesystemProvider` interface: `readFile`, `writeFile`, `listDirectory`, `pathExists`, `isDirectory`, `ensureDirectory`, `deleteFile`

**Analysis:**

| Axis | Match? | Notes |
|---|---|---|
| Responsibility | Yes | Both abstract filesystem I/O for the runtime. |
| Contract | Equivalent but not identical | Method names differ (`exists` vs `pathExists`, `readdir` vs `listDirectory`, etc.). Both have POSIX and in-memory implementations. |
| Kernel mode | Yes | Infrastructure read/write; no canonical-state mutation. |
| Consumer independence | Partial | Consumers import one or the other; a unified contract would require updating call sites. |

**Recommendation:** Open a dedicated expedition to unify these two into a single `FilesystemProvider`/`FilesystemAdapter` contract. The merge should be a pure contract normalization: rename methods, update consumers, delete the redundant interface. No new abstraction layer.

**Estimated impact:** ~2 files deleted, ~15–25 consumers updated, no kernel changes.

---

### B. Git abstraction triplication — KEEP SEPARATE, CLARIFY NAMING

**Files:**

- `src/infra/git-adapter.ts` — `GitAdapter`: `commit`, `rollback`, `getHeadCommit`, `log` (mutating)
- `src/discovery/providers/git-provider.ts` + `src/discovery/providers/process-git-provider.ts` — `GitProvider`: `isGitRepository`, `getRepositoryState`, `getRemotes`, `getBranches`, `getTags`, `getRecentCommits`, `getWorkingTreeState` (read-only introspection)
- `src/adapters/repository/git.ts` — `GitRepositoryAdapter implements RepositoryAdapter`: Mission Studio integration adapter with lifecycle, health, observations

**Analysis:**

| Axis | Match? | Notes |
|---|---|---|
| Responsibility | No | Mutation, read-only introspection, and Mission Studio observation are three different responsibilities. |
| Contract | No | Each exposes a different surface. |
| Kernel mode | Different | Mutation vs read-only vs observation emission. |
| Consumer independence | Yes | Consumers intentionally use different abstractions. |

**Recommendation:** Keep them separate. The names are confusing, but the responsibilities are not duplicated. Consider renaming to make the separation explicit, e.g.:

- `GitAdapter` → `GitMutationAdapter`
- `GitProvider` → `GitIntrospectionProvider` (already descriptive)
- `GitRepositoryAdapter` → keep (Mission Studio domain)

---

### C. GitHub adapter naming collision — KEEP SEPARATE, RENAME

**Files:**

- `src/adapters/github/adapter.ts` — `GitHubAdapterImpl implements GitHubAdapter` (Mission Studio integration: health, lifecycle, issues, PRs)
- `src/repository/adapters/github-adapter.ts` — `GitHubAdapter implements ForgeAdapter` (repository forge: PRs, releases, checks)

**Analysis:**

| Axis | Match? | Notes |
|---|---|---|
| Responsibility | Partial overlap | Both touch PRs, but one is a general integration adapter and the other is a forge command adapter. |
| Contract | No | Different interfaces and callers. |
| Kernel mode | Different | Mission Studio observation vs repository forge command emission. |

**Recommendation:** Keep them separate. Rename `src/repository/adapters/github-adapter.ts` class to `GitHubForgeAdapter` to eliminate the export-name collision.

---

### D. Rule-based adapter pattern — EXTRACT SHARED UTILITY, KEEP ADAPTERS

**Files:**

- `src/knowledge/adapters/rule-based-adapter.ts`
- `src/knowledge/validation/adapters/rule-based-adapter.ts`
- `src/semantic-modeling/domain/adapters/rule-based-adapter.ts`
- `src/semantic-modeling/intent/adapters/rule-based-adapter.ts`
- `src/first-contact/extract/adapters/rule-based-adapter.ts`
- `src/first-contact/project/adapters/rule-based-adapter.ts`

**Analysis:**

| Axis | Match? | Notes |
|---|---|---|
| Responsibility | No | Each implements a different domain adapter interface. |
| Contract | No | Different input/output types. |
| Pattern | Yes | All are deterministic heuristic adapters. |

**Recommendation:** Do not merge the adapters. Extract duplicated utility functions:

- `stableId(...parts: string[]): string` — duplicated in 4 files
- `computeConfidence` — duplicated in 5 files with different signatures

Create `src/util/stable-id.ts` and migrate identical `stableId` implementations. `computeConfidence` has different signatures; extract only if a common shape can be defined without forcing callers to adapt.

**Estimated impact:** ~4 files simplified, ~1 new utility file, no behavioral change.

---

### E. Registry proliferation — KEEP SEPARATE, WATCH FOR GENERIC PATTERN

**Files:**

- `src/mission-studio/adapter-registry.ts` — Mission Studio planning adapters
- `src/discovery/adapter-registry.ts` — Discovery adapters
- `src/capability/registry.ts` — Capability registry
- `src/mutation/mutation-provider.ts` — Mutation provider registry

**Analysis:**

| Axis | Match? | Notes |
|---|---|---|
| Responsibility | No | Four different domains. |
| Contract | No | Different registration and lookup shapes. |
| Kernel mode | Different | Some touch canonical capabilities, some are application-level. |

**Recommendation:** Keep them separate. They share the *pattern* of a registry but not a responsibility. If a fifth registry appears, consider a generic `Registry<T>` utility; until then, the duplication is nominal.

---

### F. Utility function duplication — EXTRACT WHERE CONTRACTS MATCH

**Functions found in multiple files:**

| Function | Locations | Action |
|---|---|---|
| `stableId(...parts: string[]): string` | 4 rule-based adapters | Extract to `src/util/stable-id.ts` |
| `computeConfidence` | governance, validation, first-contact, filesystem-init | Signatures differ; keep separate unless a common confidence model is defined |
| `canonicalizeEvidence` / `sortKeys` | `src/environment/evidence.ts`, possibly elsewhere | Audit remaining `sortKeys` copies and extract if identical |
| `normalizeInput` / `detectKeywords` | `src/first-contact/extract/adapters/rule-based-adapter.ts` | Single use; keep local |

**Recommendation:** Create a small `src/util/` directory for stateless, domain-independent helpers. Only extract functions with identical signatures and semantics.

---

### G. Build functions for models — INVESTIGATE BEFORE ACTION

**Functions:**

- `buildKnowledgeGraph` — `src/knowledge/engine.ts` and `src/documentation/knowledge-graph.ts`
- `buildIntentModel` / `buildIntentGraph` — `src/governance/intent-model.ts`, `src/semantic-modeling/intent/engine.ts`, `src/execution/intent-synthesizer.ts`
- `buildDomainModel` — `src/semantic-modeling/domain/engine.ts`
- `buildCapabilityReport` / `createCapabilityGraph` — `src/discovery/projections/`

**Analysis:**

These share a naming convention (`build*`, `create*`) but may represent:

- canonical reducers,
- derived projections,
- documentation generators,
- or observation builders.

They cannot be classified without reading each caller. This is the largest remaining uncertainty.

**Recommendation:** Open a focused read-only spike to classify each `build*`/`create*` function as canonical, derived, or presentation. Only then decide whether any pair is a true duplicate.

---

### H. Identical basenames with different responsibilities — RENAME FOR CLARITY

**Files sharing basenames across domains:**

| Basename | Locations | Problem |
|---|---|---|
| `intake.ts` | governance, genesis, mission-studio | Three unrelated intake boundaries. |
| `replay.ts` | runtime, discovery | State replay vs discovery session replay. |
| `evidence.ts` | environment, first-contact | Discovery evidence vs first-contact evidence. |
| `context.ts` | verification, types | Runtime context vs type definitions. |
| `canonical.ts` | discovery, first-contact/artifact | Discovery canonicalization vs artifact canonicalization. |
| `adapter-registry.ts` | mission-studio, discovery | Already handled in E. |
| `git-adapter.ts` | infra, adapters/github/client? | Already handled in B. |
| `filesystem-provider.ts` | infra, mutation | Already handled in A. |

**Analysis:**

These are not implementation duplicates. They are naming collisions that slow navigation and increase the risk of importing the wrong module.

**Recommendation:** Rename during upcoming simplification expeditions when a file is already being touched. Suggested renames:

- `src/governance/intake.ts` → `src/governance/agent-intake-gate.ts`
- `src/genesis/intake.ts` → `src/genesis/genesis-intake.ts`
- `src/mission-studio/intake.ts` → `src/mission-studio/mission-intake.ts`
- `src/runtime/replay.ts` → `src/runtime/state-replay.ts`
- `src/discovery/replay.ts` → `src/discovery/discovery-replay.ts`

Do not perform a rename-only expedition. Apply these opportunistically.

---

### I. Store implementations — KEEP SEPARATE

**Files:**

- `src/infra/state-store.ts`
- `src/infra/event-store.ts`
- `src/infra/checkpoint-store.ts`
- `src/mission-studio/snapshot-store.ts`

**Analysis:**

Each owns a distinct persistence concern: canonical state, event log, recovery checkpoints, and Mission Studio snapshots. Contracts differ; kernel interaction differs.

**Recommendation:** Keep separate. Some in-memory vs filesystem implementation patterns are similar, but that is an implementation pattern, not a responsibility duplicate.

---

### J. Engine proliferation — KEEP SEPARATE

**Files:**

- `src/planning/engine.ts`
- `src/runtime/engine.ts`
- `src/initialization/engine.ts`
- `src/governance/governance-engine.ts`
- `src/policy/policy-engine.ts`
- `src/semantic-modeling/domain/engine.ts`
- `src/semantic-modeling/intent/engine.ts`
- `src/discovery/engine.ts`

**Analysis:**

Every engine has a different domain responsibility. The shared word `engine` is a naming convention, not a shared abstraction.

**Recommendation:** Keep separate. Do not create an `Engine` base class or interface.

---

## 4. Synthesis

### What the audit found

- The adapter/environment/discovery consolidation removed the largest source of structural duplication.
- Remaining duplication is concentrated in **infrastructure utilities** (`FilesystemAdapter`/`FilesystemProvider`, `stableId`) and **naming collisions**.
- There is no evidence of a new missing lifecycle concept, kernel change, or governance gate.

### What the audit did not find

- No duplicate Mission Studio adapters.
- No duplicate canonical reducers.
- No duplicate event-store or state-store implementations.
- No second extension model hiding elsewhere.

### Recommended next expeditions

| Priority | Expedition | Purpose | Kernel impact? |
|---|---|---|---|
| 1 | EXP-SIMPLIFICATION-004 or filesystem-contract-unification | Unify `FilesystemAdapter` and `FilesystemProvider` | No |
| 2 | Utility extraction spike | Extract `stableId` and audit `sortKeys`/`canonicalizeEvidence` duplicates | No |
| 3 | Build-function classification spike | Classify every `build*`/`create*` model function as canonical, derived, or presentation | No |
| 4 | Rename pass (opportunistic) | Rename `intake.ts`, `replay.ts`, `evidence.ts`, and `GitHubAdapter` collision | No |

### Guardrails for future simplification

- Apply the threshold in section 1 before any merge.
- If a merge requires a bridge, stop and make it its own expedition.
- If two files share a basename but different responsibilities, rename rather than merge.
- Track metrics for each expedition: files deleted, LOC removed, exported symbols removed, consumers updated, tests passing.

---

## 5. Conclusion

EXP-SIMPLIFICATION-003 succeeded in removing the structural duplication between adapters, environment providers, and discovery. The remaining repository is not free of overlap, but the overlaps are small, localized, and resolvable without touching the kernel or adding new abstractions.

The highest-leverage next step is to unify the two filesystem infrastructure contracts. After that, the simplification program should shift from large structural consolidation to targeted utility extraction and naming cleanup.
