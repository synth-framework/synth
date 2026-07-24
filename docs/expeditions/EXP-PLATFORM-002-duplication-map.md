# EXP-PLATFORM-002 — Duplication Map

| Operation | Duplicates | Locations | SDK Owner | Estimated Reduction |
|---|---|---|---|---|
| `.synth/data` path | 28 | CLI, verification, bootstrap, adapters, workspace | `sdk/paths` | 28 call sites → 1 function |
| `process.cwd()` default | 30 | Adapters, CLI, discovery, workspace | `sdk/workspace` | 30 defaults → 1 resolver |
| `fs.readFileSync` | 9 | Adapters, CLI | `sdk/files` | 9 → 1 |
| `fs.writeFileSync` | 9 | Adapters, CLI | `sdk/files` | 9 → 1 |
| `fs.existsSync` | 9 | Adapters, CLI | `sdk/files` | 9 → 1 |
| `fs.mkdirSync` | 9 | Adapters, CLI | `sdk/files` | 9 → 1 |
| `fs.readdirSync` | 9 | Adapters, CLI | `sdk/files` | 9 → 1 |
| `fs/promises` usage | 45 | Stores, CLI, adapters | `sdk/files` | 45 → 1 contract |
| `JSON.parse(await fs.readFile(...))` | 9 | CLI, adapters, workspace | `sdk/json` | 9 → 1 |
| `JSON.stringify(..., null, 2)` + write | 18 | Stores, CLI, first-contact | `sdk/json` | 18 → 1 |
| `crypto.createHash("sha256")` | 35 | Adapters, mission-studio, CLI | `sdk/hashing` | 35 → 1–3 functions |
| `stableId(...)` | 4 | Rule-based adapters | `sdk/hashing` | 4 → 1 |
| `crypto.randomUUID()` | 12 | CLI, API, genesis, observability | `sdk/identity` | 12 → 1 |
| `os.tmpdir()` + `mkdtemp` | 2 | Certification, first-contact | `sdk/temp` | 2 → 1 |
| `execSync` / `spawn` | 16 | Adapters, CLI, git providers | `sdk/process` | 16 → 1 contract |
| Direct `event-log.jsonl` read | 13 | CLI, runtime, verification | `sdk/events` | 13 → 1 facade |
| Direct `canonical-state.json` read | 13 | CLI, runtime, verification | `sdk/state` | 13 → 1 facade |
| Direct `manifest.json` read | 11 | CLI, verification, bootstrap | `sdk/manifest` | 11 → 1 |
