# EXP-PLATFORM-002 — Deletion List

## Confirmed deletions after migration

| File / Helper | Reason | Wave |
|---|---|---|
| `src/infra/paths.ts` | Superseded by `sdk/paths` and `sdk/workspace` | 5 ✅ |

## Evaluated and kept

| File / Helper | Reason | Decision |
|---|---|---|
| `src/infra/filesystem.ts` | Kernel EventStore/StateStore filesystem abstraction; distinct from `sdk/files` primitives | KEEP |
| `src/infra/filesystem-provider.ts` | Canonical FilesystemProvider capability boundary; now delegates to `sdk/files` | KEEP |
| `stableId()` in `src/knowledge/adapters/rule-based-adapter.ts` | Moved to `sdk/hashing` | 2 |
| `stableId()` in `src/knowledge/validation/adapters/rule-based-adapter.ts` | Moved to `sdk/hashing` | 2 |
| `stableId()` in `src/semantic-modeling/domain/adapters/rule-based-adapter.ts` | Moved to `sdk/hashing` | 2 |
| `stableId()` in `src/semantic-modeling/intent/adapters/rule-based-adapter.ts` | Moved to `sdk/hashing` | 2 |
| Inline `process.cwd()` defaults across adapters | Replaced by `sdk.workspace.root()` | 1 |
| Inline `.synth` path construction across CLI | Replaced by `sdk.paths.*` | 1 |
| Inline `JSON.parse(await fs.readFile(...))` | Replaced by `sdk.json.readJson` | 2 |
| Inline `JSON.stringify(..., null, 2)` writes | Replaced by `sdk.json.writeJson` | 2 |
| Inline `crypto.createHash("sha256")` in adapters | Replaced by `sdk.hashing.*` | 2 |
| Inline `crypto.randomUUID()` in CLI/API/genesis | Replaced by `sdk.identity.uuid()` | 3 |
| Inline `execSync`/`spawn` in adapters/CLI | Replaced by `sdk.process.*` | 3 |
| Inline `os.tmpdir()` + `mkdtemp` | Replaced by `sdk.temp.*` | 3 |

## Deferred deletions

| File / Helper | Reason | Decision |
|---|---|---|
| `src/core/hash.ts` | Keep as kernel hashing authority; `sdk/hashing` may re-export | KEEP |
| `src/infra/event-store.ts` | Keep as kernel event authority; `sdk/events` is a facade | KEEP |
| `src/infra/state-store.ts` | Keep as kernel state authority; `sdk/state` is a facade | KEEP |
| `console.*` usages | Defer to logging audit; not causing architectural drift | DEFER |
