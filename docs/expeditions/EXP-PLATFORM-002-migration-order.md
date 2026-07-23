# EXP-PLATFORM-002 — Migration Order

## Wave 1 — Repository Reality ✅ COMPLETE

1. `sdk.workspace`
   - Implement `root()`, `resolve()`, `discover()`
   - Migrate `process.cwd()` defaults in CLI entry points
   - Migrate adapter constructors to accept explicit root
2. `sdk.paths`
   - Implement all `.synth/` subpath helpers
   - Replace inline `path.join(..., ".synth", ...)` in CLI
   - Replace inline path construction in verification, bootstrap, adapters
   - Added `proposalsDir` to `src/sdk/paths/artifacts.ts`
   - Added ownership invariant test to `tests/synth.test.js`
   - Captured `data/expeditions/EXP-PLATFORM-002/sdk-path-ownership.json`
   - Build: pass; Tests: 120 passed, 0 failed, 0 skipped

## Wave 2 — File and Serialization Boundary ✅ COMPLETE

3. `sdk.files`
   - Implemented async and sync primitives in `src/sdk/files/index.ts`
   - `src/infra/filesystem-provider.ts` now delegates to `sdk.files`
   - Dogfooded inside `src/sdk/paths/*` and `src/sdk/workspace/discovery.ts`
   - Migrated CLI and first-contact consumers
4. `sdk.json`
   - Implemented `readJson`, `readJsonMaybe`, `writeJson`, `writeJsonNewline` in `src/sdk/json/index.ts`
   - Migrated bootstrap-apply, first-contact, repository-identity, materialize engine, initialization evidence store
5. `sdk.hashing`
   - Implemented `sha256`, `shortHash`, `stableId` in `src/sdk/hashing/index.ts`
   - Migrated 13 adapter private `hash` methods to `shortHash`
   - Migrated 4 duplicate rule-based `stableId` implementations to canonical `stableId`
   - Migrated `synth.ts` direct `crypto.createHash` calls to `sha256`
   - Captured `data/expeditions/EXP-PLATFORM-002/sdk-files-json-hashing-ownership.json`
   - Build: pass; Tests: 120 passed, 0 failed, 0 skipped

## Wave 3 — Platform Identity ✅ COMPLETE

6. `sdk.manifest`
   - Implemented `readManifest`, `readManifestMaybe`, `writeManifest`, `manifestExists`
   - Migrated verification checks, AI metadata refresh, and `synth init`
7. `sdk.identity`
   - Implemented `uuid()` and `shortId()`
   - Migrated CLI, API, planning, genesis, bootstrap, and first-contact UUID generation
8. `sdk.temp`
   - Implemented `directory()` and `file()`
   - Migrated certification runner and first-contact experiment temporary workspaces
9. `sdk.process`
   - Implemented `execSync`, `spawnSync`, and `spawn` with deterministic `ProcessResult`
   - Migrated bootstrap govern, certification runner, first-contact experiment, and workspace environment checks
   - Captured `data/expeditions/EXP-PLATFORM-002/sdk-manifest-identity-temp-process-ownership.json`
   - Build: pass; Tests: 120 passed, 0 failed, 0 skipped

## Wave 4 — Kernel Access Facades ✅ COMPLETE

10. `sdk.events`
    - Implemented `readEvents`, `countEvents`, `getLastEvent` in `src/sdk/events/index.ts`
    - Migrated CLI direct `event-log.jsonl` reads in `synth.ts`, `repository-identity.ts`, `explain-governance.ts`
    - Writes remain exclusive to `ExecutionGate → EventStore`
11. `sdk.state`
    - Implemented `readState`, `readStateOrThrow` in `src/sdk/state/index.ts`
    - Migrated CLI direct `canonical-state.json` reads in `synth.ts`, `repository-identity.ts`, `ai-metadata.ts`
    - Writes remain exclusive to `ExecutionGate → StateStore`
    - Added ownership invariant test to `tests/synth.test.js`
    - Captured `data/expeditions/EXP-PLATFORM-002/sdk-events-state-ownership.json`
    - Build: pass; Tests: 121 passed, 0 failed, 0 skipped

## Wave 5 — Cleanup ✅ COMPLETE

12. Deleted obsolete helpers
    - `src/infra/paths.ts` (superseded by `sdk/paths` and `sdk/workspace`)
    - Verified no duplicate `stableId` implementations remain (all rule-based adapters import from `sdk/hashing`)
13. Updated remaining kernel store imports (`src/infra/event-store.ts`, `src/infra/state-store.ts`, `src/infra/checkpoint-store.ts`, `src/infra/index.ts`) to use `sdk/paths`
14. Evaluated `src/infra/filesystem.ts` and `src/infra/filesystem-provider.ts`
    - Both retained as distinct capability boundaries
    - `filesystem-provider.ts` already delegates to `sdk.files`
15. Captured `data/expeditions/EXP-PLATFORM-002/sdk-final-metrics.json`
    - Build: pass; Tests: 121 passed, 0 failed, 0 skipped
    - `src/`: 293 TS files, 52,413 LOC
    - `src/sdk/`: 17 files
    - `src/infra/`: 8 files
    - Zero inline `.synth` path construction in forbidden directories
