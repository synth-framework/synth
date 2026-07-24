# EXP-PLATFORM-001 — Canonical Infrastructure Matrix

**Status:** Complete  
**Scope:** `src/` TypeScript source files  
**Date:** 2026-07-21  

---

## Summary

| Concern | Canonical Owner (existing or proposed) | Current Implementations | Inlined Consumers | Canonical Consumers | Target | Status | Priority |
|---|---|---:|---:|---:|---|---|---|
| Paths | `src/infra/paths.ts` | 1 module + 28 inlined | 28 | 9 | 1 | partial | P0 |
| Workspace root | `sdk.workspace` (proposed) | 30 inlined | 30 | 0 | 1 | missing | P0 |
| Filesystem (sync) | `src/infra/filesystem.ts` | 1 module + 9 inlined | 9 | 13 | 1 | partial | P1 |
| Filesystem (async) | `src/infra/filesystem-provider.ts` | 1 module + 45 inlined | 45 | 13 | 1 | partial | P1 |
| JSON read | `src/runtime/governance-resolver.ts` (`readJsonMaybe`) | 1 function + 9 inlined | 9 | 2 | 1 | partial | P1 |
| JSON write | `sdk.json` (proposed) | 18 inlined | 18 | 0 | 1 | missing | P1 |
| Hashing | `src/core/hash.ts` | 1 module + 35 inlined | 35 | 7 | 1 | partial | P1 |
| Identity | `sdk.identity` (proposed) | 12 inlined `randomUUID` | 12 | 0 | 1 | missing | P2 |
| Temp directories/files | `sdk.temp` (proposed) | 2 inlined | 2 | 0 | 1 | missing | P2 |
| Process execution | `sdk.process` (proposed) | 16 inlined | 16 | 0 | 1 | missing | P2 |
| Event log access | `src/infra/event-store.ts` + `src/runtime/governance-resolver.ts` | 2 canonical + 13 inlined | 13 | 9 | 1 | partial | P2 |
| Canonical state access | `src/infra/state-store.ts` + `src/runtime/governance-resolver.ts` | 2 canonical + 13 inlined | 13 | 8 | 1 | partial | P2 |
| Manifest/config | `src/infra/paths.ts` + `src/runtime/governance-resolver.ts` | 2 canonical + 11 inlined | 11 | 11 | 1 | partial | P1 |
| Logging | `sdk.logging` (proposed) | 12 inlined `console.*` | 12 | 0 | 1 | missing | P3 |
| Environment | `src/environment/` (deprecated) | multiple providers + 5 inlined | 5 | ? | 1 | deprecated | P3 |

**Notes on counts:**

- "Current Implementations" counts distinct implementation locations. For concerns with a canonical module, it is `1 canonical module + N inlined implementations`. For concerns without one, it is the number of files with inline implementations.
- "Inlined Consumers" is the number of source files that implement the concern inline rather than importing a canonical owner.
- "Canonical Consumers" is the number of source files that import the existing canonical implementation.
- One file may appear in multiple concerns.
- All counts were produced with `ripgrep --no-ignore` over `src/`.

---

## Findings by concern

### 1. Paths — P0

**Canonical owner:** `src/infra/paths.ts`

Existing helpers:

- `getManifestPath(cwd)`
- `hasManifest(cwd)`
- `getRuntimeDataDir(cwd)`
- `ensureRuntimeDataDir(cwd)`
- `getRuntimeSnapshotDir(cwd)`
- `getLegacyDataDir(cwd)`

**Inlined `.synth` path construction (28 files):**

```
src/adapters/filesystem/adapter.ts
src/adapters/repository/git.ts
src/api/index.ts
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/bootstrap-context.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/core/bootstrap.ts
src/core/replay-verifier.ts
src/discovery/adapters/filesystem-adapter.ts
src/discovery/adapters/operational-artifact-adapter.ts
src/environment/orchestrator.ts
src/environment/rules.ts
src/first-contact/materialize/engine.ts
src/infra/paths.ts
src/initialization/evidence-store.ts
src/mission-studio/decision-log.ts
src/planning/engine.ts
src/runtime/governance-resolver.ts
src/runtime/historical-aliases.ts
src/verification/checks.ts
src/verification/context.ts
src/workspace/repository-health.ts
src/workspace/workspace.ts
```

**Canonical consumers (9 files):**

```
src/cli/synth.ts
src/cli/resume-briefing.ts
src/cli/repository-identity.ts
src/cli/explain-observability.ts
src/cli/explain-governance.ts
src/environment/evidence.ts
src/verification/context.ts
src/runtime/governance-resolver.ts
src/core/bootstrap.ts
src/infra/event-store.ts
src/infra/state-store.ts
src/infra/checkpoint-store.ts
```

**Recommendation:** Extend `sdk.paths` to cover every `.synth/` subpath and migrate all inlined construction to it.

---

### 2. Workspace root — P0

**Canonical owner:** None. Proposed: `sdk.workspace`

**Inlined `process.cwd()` defaults (30 files):**

```
src/adapters/bdd/adapter.ts
src/adapters/document/adapter.ts
src/adapters/filesystem-initialization-adapter.ts
src/adapters/filesystem/adapter.ts
src/adapters/repository/git.ts
src/adapters/specification/adapter.ts
src/adapters/tdd/adapter.ts
src/cli/adapter.ts
src/cli/bootstrap-apply.ts
src/cli/explain-governance.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/resume-briefing.ts
src/cli/synth.ts
src/cli/verify.ts
src/core/bootstrap.ts
src/discovery/adapters/filesystem-adapter.ts
src/discovery/adapters/operational-artifact-adapter.ts
src/discovery/node-context.ts
src/environment/evidence.ts
src/infra/checkpoint-store.ts
src/infra/event-store.ts
src/infra/git-adapter.ts
src/infra/state-store.ts
src/initialization/evidence-store.ts
src/workspace/language-auditor.ts
src/workspace/repository-health.ts
src/workspace/semantic-verifier.ts
src/workspace/workspace.ts
```

**Recommendation:** Introduce `sdk.workspace.root()` and `sdk.workspace.discover()` so features receive a resolved root instead of defaulting to `process.cwd()`.

---

### 3. Filesystem (sync) — P1

**Canonical owner:** `src/infra/filesystem.ts` (`NodeFilesystemAdapter`, `InMemoryFilesystemAdapter`)

**Inlined `fs.*Sync` usage (9 files):**

```
src/adapters/bdd/adapter.ts
src/adapters/document/adapter.ts
src/adapters/filesystem/adapter.ts
src/adapters/repository/git.ts
src/adapters/specification/adapter.ts
src/adapters/tdd/adapter.ts
src/cli/certification-runner.ts
src/cli/govern-delegation.ts
src/infra/paths.ts
```

**Canonical consumers (13 files):** import `src/infra/filesystem.ts`

**Recommendation:** Provide sync wrappers in `sdk.files` and migrate adapters incrementally. Kernel stores may remain on their existing abstractions.

---

### 4. Filesystem (async) — P1

**Canonical owner:** `src/infra/filesystem-provider.ts` (`PosixFilesystemProvider`, `InMemoryFilesystemProvider`)

**Inlined `fs/promises` usage (45 files):**

Representative list:

```
src/adapters/bdd/adapter.ts
src/adapters/document/adapter.ts
src/adapters/filesystem/adapter.ts
src/adapters/repository/git.ts
src/adapters/specification/adapter.ts
src/adapters/tdd/adapter.ts
src/cli/agent-artifacts.ts
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/certification-runner.ts
src/cli/explain-governance.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repo.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/core/replay-verifier.ts
src/discovery/adapters/filesystem-adapter.ts
src/documentation/documentation-expedition.ts
src/environment/evidence.ts
src/first-contact/evidence.ts
src/first-contact/experiment.ts
src/first-contact/materialize/engine.ts
src/first-contact/patterns.ts
src/infra/checkpoint-store.ts
src/infra/event-store.ts
src/infra/filesystem.ts
src/infra/state-store.ts
src/initialization/evidence-store.ts
src/mission-studio/decision-log.ts
src/mission-studio/draft-integrity.ts
src/mission-studio/snapshot-store.ts
src/mutation/filesystem-provider.ts
src/repository/adapters/github-adapter.ts
src/runtime/governance-resolver.ts
src/runtime/historical-aliases.ts
src/verification/checks.ts
src/verification/context.ts
src/workspace/language-auditor.ts
src/workspace/repository-health.ts
src/workspace/semantic-verifier.ts
src/workspace/workspace.ts
```

**Canonical consumers (13 files):** import `src/infra/filesystem-provider.ts`

**Recommendation:** Unify `sdk.files` contract and migrate application code. This is the largest surface area after workspace root.

---

### 5. JSON read — P1

**Canonical owner:** `src/runtime/governance-resolver.ts` (`readJsonMaybe`)

**Inlined `JSON.parse(await fs.readFile(...))` (9 files):**

```
src/adapters/bdd/adapter.ts
src/adapters/repository/git.ts
src/cli/bootstrap-apply.ts
src/cli/govern-delegation.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/infra/paths.ts
src/verification/checks.ts
src/workspace/workspace.ts
```

**Canonical consumers (2 files):**

```
src/runtime/governance-resolver.ts (definition)
src/cli/repository-identity.ts (partial)
```

**Recommendation:** Promote `readJsonMaybe` to `sdk.json.readJson` and migrate all inlined JSON reads.

---

### 6. JSON write — P1

**Canonical owner:** None. Proposed: `sdk.json`

**Inlined `JSON.stringify(..., null, 2)` + `fs.writeFile` (18 files):**

```
src/adapters/bdd/adapter.ts
src/cli/agent-artifacts.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/certification-runner.ts
src/cli/first-contact.ts
src/cli/synth.ts
src/first-contact/evidence.ts
src/first-contact/experiment.ts
src/first-contact/materialize/engine.ts
src/first-contact/patterns.ts
src/infra/checkpoint-store.ts
src/infra/state-store.ts
src/initialization/evidence-store.ts
src/mission-studio/decision-log.ts
src/mission-studio/draft-integrity.ts
src/runtime/historical-aliases.ts
src/workspace/workspace.ts
```

**Recommendation:** Introduce `sdk.json.writeJson` with deterministic formatting and migrate all inlined JSON writes.

---

### 7. Hashing — P1

**Canonical owner:** `src/core/hash.ts` (`sha256`, `stableStringify`, `sortKeys`, `computeEventHash`)

**Inlined `crypto.createHash("sha256")` (35 files):**

Representative list:

```
src/adapters/architecture/adapter.ts
src/adapters/bdd/adapter.ts
src/adapters/confidence/adapter.ts
src/adapters/conversation/adapter.ts
src/adapters/dependency/adapter.ts
src/adapters/document/adapter.ts
src/adapters/expedition-builder/adapter.ts
src/adapters/filesystem/adapter.ts
src/adapters/knowledge/adapter.ts
src/adapters/mission-builder/adapter.ts
src/adapters/objective-builder/adapter.ts
src/adapters/repository/git.ts
src/adapters/specification/adapter.ts
src/adapters/wizard/adapter.ts
src/cli/synth.ts
src/control/execution-gate.ts
src/core/execution-fingerprint.ts
src/core/hash.ts
src/discovery/canonical.ts
src/environment/evidence.ts
src/first-contact/artifact/canonical.ts
src/first-contact/verify/adapters/rule-based-verifier.ts
src/governance/project-mission.ts
src/knowledge/adapters/rule-based-adapter.ts
src/knowledge/validation/adapters/rule-based-adapter.ts
src/mission-studio/adapter-mapper.ts
src/mission-studio/canonical-json.ts
src/mission-studio/engine.ts
src/mission-studio/intake.ts
src/mission-studio/snapshot-integrity.ts
src/mission-studio/snapshot-lineage.ts
src/planning/engine.ts
src/runtime/partition-router.ts
src/semantic-modeling/domain/adapters/rule-based-adapter.ts
src/semantic-modeling/intent/adapters/rule-based-adapter.ts
```

**Canonical consumers (7 files):**

```
src/control/execution-gate.ts
src/genesis/intake.ts
src/genesis/certification.ts
src/domain/execution.ts
src/api/index.ts
src/runtime/partition-router.ts
src/first-contact/materialize/engine.ts
```

**Recommendation:** Promote `src/core/hash.ts` patterns to `sdk.hashing` with `sha256`, `shortHash`, and `stableId`. Migrate adapter-specific short-hash patterns.

---

### 8. Identity — P2

**Canonical owner:** None. Proposed: `sdk.identity`

**Inlined `crypto.randomUUID()` (12 files):**

```
src/api/index.ts
src/cli/bootstrap-apply.ts
src/cli/first-contact.ts
src/cli/repo.ts
src/cli/synth.ts
src/control/execution-gate.ts
src/first-contact/experiment.ts
src/first-contact/materialize/engine.ts
src/genesis/intake.ts
src/observability/tracer.ts
src/planning/subsystems.ts
src/types/node-modules.d.ts
```

**Recommendation:** Introduce `sdk.identity.uuid()` and `sdk.identity.shortId()`.

---

### 9. Temp directories/files — P2

**Canonical owner:** None. Proposed: `sdk.temp`

**Inlined `os.tmpdir()` / `fs.mkdtemp` (2 files):**

```
src/cli/certification-runner.ts
src/first-contact/experiment.ts
```

**Recommendation:** Introduce `sdk.temp.directory()` and `sdk.temp.file()`.

---

### 10. Process execution — P2

**Canonical owner:** None. Proposed: `sdk.process`

**Inlined `execSync` / `spawn` / `child_process` (16 files):**

```
src/adapters/bdd/adapter.ts
src/adapters/repository/git.ts
src/adapters/tdd/adapter.ts
src/cli/bootstrap-apply.ts
src/cli/certification-runner.ts
src/cli/govern-delegation.ts
src/cli/synth.ts
src/discovery/node-context.ts
src/discovery/providers/process-git-provider.ts
src/first-contact/experiment.ts
src/first-contact/verify/adapters/rule-based-verifier.ts
src/governance/impact-analyzer.ts
src/infra/git-adapter.ts
src/knowledge/validation/adapters/rule-based-adapter.ts
src/types/node-modules.d.ts
src/workspace/workspace.ts
```

**Recommendation:** Introduce `sdk.process.exec()` and `sdk.process.execSync()` with shell-safe defaults.

---

### 11. Event log access — P2

**Canonical owners:**

- `src/infra/event-store.ts`
- `src/runtime/governance-resolver.ts` (`readEventLog`)

**Inlined `event-log.jsonl` access (13 files):**

```
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/explain-governance.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/first-contact/materialize/engine.ts
src/infra/event-store.ts
src/runtime/governance-resolver.ts
src/runtime/state-consistency-validator.ts
src/verification/context.ts
```

**Canonical consumers (9 files):**

```
src/cli/explain-governance.ts
src/cli/explain-observability.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/core/bootstrap.ts
src/runtime/governance-resolver.ts
src/runtime/state-consistency-validator.ts
src/verification/context.ts
src/infra/event-store.ts
```

**Recommendation:** Provide `sdk.events.readEvents()` and `sdk.events.appendEvent()` as thin wrappers over the kernel `EventStore`. Application code should not directly parse `event-log.jsonl`.

---

### 12. Canonical state access — P2

**Canonical owners:**

- `src/infra/state-store.ts`
- `src/runtime/governance-resolver.ts`

**Inlined `canonical-state.json` access (13 files):**

```
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/resume-briefing.ts
src/cli/synth.ts
src/first-contact/materialize/engine.ts
src/infra/state-store.ts
src/runtime/governance-resolver.ts
src/runtime/state-consistency-validator.ts
src/verification/context.ts
```

**Canonical consumers (8 files):**

```
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/explain-observability.ts
src/cli/repository-identity.ts
src/cli/resume-briefing.ts
src/cli/synth.ts
src/runtime/governance-resolver.ts
src/verification/context.ts
src/infra/state-store.ts
```

**Recommendation:** Provide `sdk.state.readState()` and `sdk.state.writeState()` as thin wrappers over the kernel `StateStore`.

---

### 13. Manifest / config — P1

**Canonical owners:**

- `src/infra/paths.ts` (`getManifestPath`, `hasManifest`)
- `src/runtime/governance-resolver.ts`

**Inlined `manifest.json` access (11 files):**

```
src/cli/ai-interaction-manifest.ts
src/cli/ai-metadata.ts
src/cli/bootstrap-apply.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/first-contact/materialize/engine.ts
src/infra/paths.ts
src/runtime/governance-resolver.ts
src/verification/checks.ts
src/verification/context.ts
```

**Canonical consumers (11 files):**

```
src/cli/bootstrap-apply.ts
src/cli/first-contact.ts
src/cli/repository-identity.ts
src/cli/synth.ts
src/infra/paths.ts
src/runtime/governance-resolver.ts
src/verification/checks.ts
src/verification/context.ts
src/core/bootstrap.ts
src/cli/ai-metadata.ts
src/cli/ai-interaction-manifest.ts
```

**Recommendation:** Centralize manifest parsing in `sdk.manifest` or `sdk.config`.

---

### 14. Logging — P3

**Canonical owner:** None. Proposed: `sdk.logging`

**Inlined `console.log/error/warn` (12 files):**

```
src/cli/adapter.ts
src/cli/ai-metadata.ts
src/cli/certification-runner.ts
src/cli/explain-governance.ts
src/cli/explain-observability.ts
src/cli/first-contact.ts
src/cli/repo.ts
src/cli/resume-briefing.ts
src/cli/synth.ts
src/cli/verify.ts
src/observability/tracer.ts
src/main.ts
```

**Recommendation:** Introduce a minimal `sdk.logging` interface. This is lower priority because `console.*` is not causing architectural drift.

---

### 15. Environment — P3

**Canonical owner:** `src/environment/` (deprecated, being consolidated into discovery)

**Inlined environment access (5 files):**

```
src/adapters/tdd/adapter.ts
src/cli/govern-delegation.ts
src/cli/synth.ts
src/discovery/node-context.ts
src/observability/tracer.ts
```

**Recommendation:** Do not create a new SDK module for environment access until the consolidation of `src/environment/` into `src/discovery/` is complete.

---

## Recommendations for EXP-PLATFORM-002

1. **P0:** Create `sdk.paths` and `sdk.workspace`. These have the highest consumer count and the clearest ROI.
2. **P1:** Create `sdk.files`, `sdk.json`, `sdk.hashing`, and `sdk.manifest`. These eliminate large classes of duplication.
3. **P2:** Create `sdk.identity`, `sdk.temp`, `sdk.process`, `sdk.events`, `sdk.state`.
4. **P3:** Defer `sdk.logging` and environment SDK until higher-priority modules are stable.

## Audit methodology

All counts were produced with `ripgrep 15.0.0` using `--no-ignore` over `src/`.

Example command:

```bash
rg --no-ignore -l 'process\.cwd\(\)' src | wc -l
```

Counts are file-level. A single file may implement multiple concerns, so row sums do not represent total files.
