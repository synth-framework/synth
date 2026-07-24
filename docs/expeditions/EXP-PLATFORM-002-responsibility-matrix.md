# EXP-PLATFORM-002 — Responsibility Matrix

| Concern | Canonical Owner | Current Implementations | Consumers | Action |
|---|---|---|---|---|
| Workspace root | `sdk/workspace` | `process.cwd()` in 30 files | All features | CREATE SDK, MIGRATE |
| Paths | `sdk/paths` | `src/infra/paths.ts` + 28 inlined | CLI, verification, bootstrap, adapters | EXTEND SDK, MIGRATE |
| Filesystem | `sdk/files` | `src/infra/filesystem.ts`, `src/infra/filesystem-provider.ts`, 54 inlined | Stores, adapters, CLI | UNIFY, MIGRATE |
| JSON | `sdk/json` | `src/runtime/governance-resolver.ts` (`readJsonMaybe`) + 27 inlined | Stores, CLI, adapters | CREATE SDK, MIGRATE |
| Hashing | `sdk/hashing` | `src/core/hash.ts` + 35 inlined | Kernel, adapters, mission-studio | CREATE SDK, MIGRATE |
| Manifest | `sdk/manifest` | `src/infra/paths.ts` + resolver + 11 inlined | CLI, verification, bootstrap | CREATE SDK, MIGRATE |
| Identity | `sdk/identity` | `crypto.randomUUID()` in 12 files | CLI, API, genesis, observability | CREATE SDK, MIGRATE |
| Temp | `sdk/temp` | `os.tmpdir()`/`mkdtemp` in 2 files | Certification, first-contact | CREATE SDK, MIGRATE |
| Process | `sdk/process` | `execSync`/`spawn` in 16 files | Adapters, CLI, git providers | CREATE SDK, MIGRATE |
| Events | `sdk/events` | `src/infra/event-store.ts` + resolver + 13 inlined | CLI, runtime, verification | FACADE, MIGRATE |
| State | `sdk/state` | `src/infra/state-store.ts` + resolver + 13 inlined | CLI, runtime, verification | FACADE, MIGRATE |
| Logging | `sdk/logging` | `console.*` in 12 files | CLI, observability | DEFER |
