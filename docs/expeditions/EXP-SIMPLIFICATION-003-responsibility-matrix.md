# EXP-SIMPLIFICATION-003 Responsibility Matrix

> Every directory, service, registry, provider, and adapter in scope gets exactly one row.
> This matrix is authoritative: every code change must correspond to one decision here.

## Classification key

| Decision | Meaning |
|----------|---------|
| **KEEP** | Survives unchanged or with only import/path updates. |
| **MERGE** | Responsibility overlaps another component; unify implementations. |
| **MOVE** | Responsibility is valid but lives in the wrong directory. |
| **DELETE** | Responsibility is duplicated or obsolete; remove after migrating callers. |
| **SPLIT** | File holds two responsibilities; separate them. |

---

## src/adapters/

| Component | Responsibility | Decision | Rationale |
|-----------|---------------|----------|-----------|
| `registry.ts` | Register and instantiate Mission Studio adapters by string name. | **MOVE** | Same name as `src/discovery/adapter-registry.ts` but different responsibility. Moved to `src/mission-studio/adapter-registry.ts` to clarify it serves Mission Studio planning, not discovery. |
| `repository/git.ts` | (a) Read Git repository state for observations; (b) mutate Git (commit, branch, merge, push, install hooks, promote). | **SPLIT** | Observation responsibility overlaps `src/discovery/adapters/git-adapter.ts`. Mutation responsibility is an integration/execution concern, not observation. |
| `filesystem/adapter.ts` | Read local files and emit text/binary observations for Mission Studio. | **MERGE** | Same responsibility as `src/discovery/adapters/filesystem-adapter.ts`. Merge observation logic into the discovery adapter. |
| `github/adapter.ts` | GitHub API integration: read status, create/update issues and PRs, create releases. | **KEEP** | External-system integration adapter. Not a duplicate of discovery observation. May move later, but not in this expedition. |
| `tdd/adapter.ts` | Detect TDD signals in existing observations. | **KEEP** | Planning/intelligence adapter. No duplicate in discovery. |
| `bdd/adapter.ts` | Detect BDD signals in existing observations. | **KEEP** | Planning/intelligence adapter. No duplicate in discovery. |
| `conversation/adapter.ts` | Detect conversation-pattern signals in observations. | **KEEP** | Planning/intelligence adapter. No duplicate in discovery. |
| `document/adapter.ts` | Parse documents into observations. | **KEEP** | External-system/document adapter. No direct duplicate. |
| `specification/adapter.ts` | Detect specification artifacts in observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `knowledge/adapter.ts` | Transform raw observations into knowledge-level observations. | **MERGE** | Overlaps with discovery projections (findings, project-model). Knowledge extraction is a projection responsibility. |
| `confidence/adapter.ts` | Score confidence of observations. | **MERGE** | Confidence scoring already exists in `src/discovery/types.ts` and projections. Consolidate into discovery confidence model. |
| `dependency/adapter.ts` | Detect dependency observations. | **KEEP** | Planning adapter. Could become a projection rule, but not a direct duplicate. |
| `architecture/adapter.ts` | Detect architecture observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `mission-builder/adapter.ts` | Build mission observations from intent/capability observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `expedition-builder/adapter.ts` | Build expedition observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `objective-builder/adapter.ts` | Build objective observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `wizard/adapter.ts` | Wizard observations. | **KEEP** | Planning adapter. No direct duplicate. |
| `initialization-adapter.ts` | Universal contract for translating external input into pre-implementation evidence. | **MOVE** | Initialization is a separate lifecycle concern from observation. Move to `src/initialization/`. |
| `filesystem-initialization-adapter.ts` | Filesystem-specific initialization evidence. | **MOVE** | Move with `initialization-adapter.ts`. |

---

## src/environment/

| Component | Responsibility | Decision | Rationale |
|-----------|---------------|----------|-----------|
| `types.ts` | Capability family taxonomy and environment evidence types. | **MERGED** | Canonical types moved to `src/discovery/types.ts`. Environment module now re-exports them. |
| `rules.ts` | Observe environment capabilities (workspace, revision, filesystem, package, runtime, process, tool, forge, versioning). | **KEEP** | Overlaps discovery observation conceptually, but behavioral contract differs (`DiscoveryObservation` + `ObservationContext` vs `Observation` + `DiscoveryAdapter`). Merging requires an adapter bridge; stopped per hard-stop rule. |
| `orchestrator.ts` | Run discovery rules, evaluate providers, resolve best provider per capability family, produce `DiscoveryEvidence`. | **KEEP** | Overlaps discovery engine conceptually, but output contract differs (`DiscoveryEvidence` vs `DiscoverySession`). Absorbing it would add a projection/bridge. Stopped per hard-stop rule. |
| `providers/reference.ts` | Reference capability providers for environment capabilities. | **KEEP** | Evaluates providers against capability families using `ObservationContext`. Contract differs from discovery providers. Merging requires bridge. Stopped per hard-stop rule. |
| `capability-report.ts` | Project environment capability report projection. | **MOVED** | Moved to `src/discovery/projections/capability-report.ts`. Consumes `DiscoveryEvidence`; a legitimate discovery projection. |
| `evidence.ts` | `DiscoveryEvidence` serialization, hashing, replay, persistence. | **KEEP** | `DiscoveryEvidence` is not semantically equivalent to `DiscoverySession`. It is a persistent evidence artifact; `DiscoverySession` is a transient pipeline result. Used by verification script. |
| `node-context.ts` | Create `ObservationContext` backed by Node.js runtime. | **MOVED** | Moved to `src/discovery/node-context.ts`. Produces the observation context used by the discovery pipeline. |
| `graph.ts` | Build and resolve capability graph from evidence. | **MOVED** | Moved to `src/discovery/projections/capability-graph.ts`. Analytical projection over discovery evidence. |
| `filesystem-capability.ts` | `FilesystemProvider` interface + POSIX/in-memory implementations. | **MOVED** | Moved to `src/infra/filesystem-provider.ts`. Filesystem access is infrastructure, not environment taxonomy. |
| `git-versioning-provider.ts` | Git-backed versioning capability (mutating). | **DELETED** | Unused by production code outside environment. Versioning mutations are handled by `src/adapters/repository/git.ts` and `src/infra/git-adapter.js`. |
| `workspace-capability.ts` | Filesystem-backed workspace provider. | **DELETED** | Unused by production code. Workspace detection is duplicated by `workspaceRule` in `rules.ts` and discovery project model. |
| `revision-capability.ts` | Revision capability interface. | **DELETED** | Unused by production code. Revision detection duplicated by `revisionRule` and discovery git capability. |
| `process-capability.ts` | Local shell process/tool provider. | **DELETED** | Unused by production code. Process execution is duplicated by `ObservationContext.execTool` and `src/infra/filesystem.js`. |
| `runtime-capability.ts` | Node.js runtime and npm package providers. | **DELETED** | Unused by production code. Runtime/package detection duplicated by `runtimeRule`/`packageRule` and discovery projections. |
| `forge-capability.ts` | GitHub forge provider. | **DELETED** | Unused by production code. GitHub integration duplicated by `src/adapters/github/adapter.ts` and `forgeRule`. |
| `secrets-capability.ts` | Secrets capability interface. | **DELETED** | Unused by production code. No implementation. |
| `versioning-capability.ts` | Versioning capability interface. | **DELETED** | Unused by production code. Interface and types superseded by existing git adapters. |

---

## src/discovery/

| Component | Responsibility | Decision | Rationale |
|-----------|---------------|----------|-----------|
| `engine.ts` | Discovery pipeline: acquire → normalize → correlate → project → verify. | **KEEP** | Core discovery pipeline. Survives as the unified discovery engine. |
| `types.ts` | Discovery types: observations, evidence graph, projections, session, adapters, consumers. | **KEEP** | Absorb required environment taxonomy. Survives as unified types. |
| `adapter-registry.ts` | Resolve discovery adapters by source, ordered deterministically. | **KEEP** | Renamed type to `DiscoveryAdapterRegistry` to distinguish from Mission Studio registry. Survives as the canonical discovery adapter registry. |
| `adapters/filesystem-adapter.ts` | Filesystem observation adapter. | **KEEP** | Survives. Absorb observation logic from `src/adapters/filesystem/adapter.ts`. |
| `adapters/git-adapter.ts` | Git observation adapter. | **KEEP** | Survives. Absorb observation logic from `src/adapters/repository/git.ts`. |
| `adapters/operational-artifact-adapter.ts` | Operational-artifact observation adapter. | **KEEP** | No duplicate. |
| `capabilities/filesystem-capability.ts` | Bundle filesystem adapter + contract + correlation. | **KEEP** | Survives as canonical filesystem observation capability. |
| `capabilities/git-capability.ts` | Bundle git adapter + contract. | **KEEP** | Survives as canonical git observation capability. |
| `capabilities/operational-artifact-capability.ts` | Bundle operational-artifact adapter + contract + correlation. | **KEEP** | No duplicate. |
| `capabilities/filesystem-correlation.ts` | Filesystem correlation rules. | **KEEP** | No duplicate. |
| `providers/git-provider.ts` | Git provider interface + in-memory test provider. | **KEEP** | Abstraction for git execution. Survives. |
| `providers/process-git-provider.ts` | Process-backed Git provider. | **KEEP** | Survives. |
| `projections/findings.ts` | Findings projection over evidence graph. | **KEEP** | No duplicate. |
| `projections/project-model-capability.ts` | Project model projection. | **KEEP** | No duplicate. |
| `consumers/*` | Render/consume discovery session output. | **KEEP** | No duplicate. |
| `consumer-registry.ts` | Register and execute discovery consumers. | **KEEP** | No duplicate. |
| `replay.ts` | Verify discovery session replay. | **KEEP** | No duplicate. |
| `canonical.ts` | Canonical hashing. | **KEEP** | No duplicate. |
| `normalize.ts` | Normalize observations. | **KEEP** | No duplicate. |
| `correlate.ts` | Correlate evidence graph. | **KEEP** | No duplicate. |
| `session-provider.ts` | Provide discovery sessions. | **KEEP** | No duplicate. |
| `index.ts` | Public API exports. | **KEEP** | Update to export unified surface. |

---

## Summary of decisions

| Decision | Count |
|----------|-------|
| KEEP | 41 |
| MERGE | 10 |
| MOVE | 5 |
| DELETE | 9 |
| SPLIT | 1 |

### Duplicate responsibilities to eliminate

1. **Adapter registries** — `src/adapters/registry.ts` ↔ `src/discovery/adapter-registry.ts`
2. **Filesystem observation** — `src/adapters/filesystem/adapter.ts` ↔ `src/discovery/adapters/filesystem-adapter.ts` (+ environment rules/provider)
3. **Git observation** — `src/adapters/repository/git.ts` (observation part) ↔ `src/discovery/adapters/git-adapter.ts` (+ environment rules/providers)
4. **Environment discovery orchestration** — `src/environment/orchestrator.ts` ↔ `src/discovery/engine.ts`
5. **Capability/provider taxonomy** — `src/environment/types.ts` + `providers/reference.ts` ↔ `src/discovery/types.ts` + capabilities/providers
6. **Evidence artifact** — `src/environment/evidence.ts` (`DiscoveryEvidence`) ↔ `src/discovery/session.ts` (`DiscoverySession`)
7. **Knowledge projection** — `src/adapters/knowledge/adapter.ts` ↔ discovery projections
8. **Confidence scoring** — `src/adapters/confidence/adapter.ts` ↔ discovery confidence model

### Non-duplicates that survive

- Planning/intelligence adapters (mission-builder, expedition-builder, objective-builder, wizard, tdd, bdd, conversation, document, specification, dependency, architecture).
- External-system integration adapters (GitHub).
- Discovery engine pipeline, types, registry, providers, projections, consumers, replay.
