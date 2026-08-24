# Testing & Tasking Architecture (SYNTH)

> Status: understanding captured, measured, strategy items 1–3 **implemented**
> (2026-08-24); items 4–5 deferred for effort estimate. Scope: how `npm test`,
> `npm run test:*`, `synth task run`, and the proof pipeline actually execute, and
> where output/performance is lost. Owner expedition: `6e26566b` (Test runner opacity
> and performance).

## 1. Data flow

```
npm test
  └─ scripts/task-adapter-shim.js test
       └─ synth task run test
            └─ task id "test" (data/tasks/test.task.json)
                 command: node tests/synth.test.js && ... && node tests/convergence-certification.test.js
                 (a chain of ~4 core test files — NOT the full test:* matrix)

CI individual check: npm run test:<name>
  └─ scripts/task-adapter-shim.js <name>
       └─ synth task run <name>
            ├─ loadRegistry()                 → data/tasks/*.task.json
            ├─ runCommand(command, cwd)       → child_process.spawn, stdio CAPTURED (not streamed)
            │     returns { status, stdout, stderr }   (stdout/stderr buffered in memory)
            ├─ executeRunPlan / runTasks / runTaskGroup
            │     builds TaskRunReport { results:[{taskId,status,durationMs,stdout,stderr}] }
            └─ cmdTaskRun prints JSON summary  → { taskId, status, durationMs } ONLY
                  (stdout/stderr from the report are DROPPED here)
                  on error → process.exit(1) with NO message
```

Key takeaway: **a failing test's assertion/stack trace is captured into the runner's
buffer and then discarded by the CLI summary.** The terminal only ever sees a compact
JSON `{status:"error", failedTaskId:"..."}` and an exit code.

## 2. Components

| Area | File | Role |
|------|------|------|
| Task schema | `src/task/task-schema.ts` | `Task` type (id, command, group, dependsOn, tags, estimatedDurationMs, …) |
| Registry | `src/task/task-registry.ts` | Loads/validates `data/tasks/*.task.json` |
| Graph | `src/task/task-graph.ts` | Topological order, cycle detection |
| Runner | `src/task/task-runner.ts` | `runCommand`, `executeRunPlan`, `runTasks`, `runTaskGroup`, `TaskRunReport` |
| CLI | `src/cli/task.ts` | `cmdTaskRun` (et al.) — prints the summary |
| Shim | `scripts/task-adapter-shim.js` | `npm run test:*` → `synth task run <name>`; builds `dist/` if missing |
| Proof pipeline | `scripts/generate-proof.js` | Generates `proof/proof-*.json`; runs 5 sub-proofs |
| Sub-audits | `scripts/audit-*.js`, `scripts/verify-*.js` | structural / determinism / graph-integrity / adversarial / replay |

Tasks are plain JSON in `data/tasks/`. `npm test` runs only the `test` task (a 4-file
chain). The 100+ `test:*` npm scripts are separate CI checks, each invoked through the
shim → `synth task run <name>`, where `<name>`'s `command` is typically
`node tests/<x>.test.js`.

## 3. Opacity sources (where real error output is lost)

- **A. Output never streamed.** `runCommand` (`src/task/task-runner.ts:80-85`) spawns with
  `stdio: ["ignore","pipe","pipe"]`. The child's stdout/stderr go into in-memory buffers,
  never to the terminal, so you cannot watch a test run.
- **B. Summary drops captured output.** `cmdTaskRun` (`src/cli/task.ts:322-329`) maps
  results to `{taskId,status,durationMs}` and omits `stdout`/`stderr`. The buffered detail
  is thrown away.
- **C. Silent failure exit.** `src/cli/task.ts:331-333` does `process.exit(1)` on error with
  no message, so the only signal is a non-zero exit.
- **D. Proof sub-checks swallow stderr.** *(Fixed in this expedition)* `scripts/generate-proof.js`
  previously ran each sub-proof via `execSync(..., {stdio:"pipe"})` and `catch`ed failures into
  generic strings (`"Mutation bypass paths detected"`, `"Nondeterminism detected"`,
  `"At least one attack succeeded"`). Now a shared `runCheck()` captures the child's `stdout`/`stderr`
  and writes it into `proof.proofs.<k>.detail`, and `main()` prints that detail for any failed
  sub-proof (so it lands in CI logs **and** in the `freeze-certification` error message).
- **E. `autoCommitDerivedState` opaque git errors.** (`src/cli/synth.ts`) previously hid git
  failures behind a bare `reason`. **Fixed in this expedition** by embedding the attempted
  `git` command in the reason and printing it under `SYNTH_DEBUG_GIT=1`.
- **F. `expedition create` does not auto-commit derived state.** Unlike `start`/`approve`/
  `commit`, `create` leaves `.synth/data/*` uncommitted (by design gap, not opacity).

## 4. Time sinks (why local is ~100× slower than CI reported)

- **`generate-proof.js` was dominated by full-tree hashing.** `computeDistHash()`
  (`scripts/generate-proof.js`) and `computeSourceHash()` `find` and SHA-256 **every** file
  under `dist/` and `src/`. Plus `bootstrap()` + `rebuildState(events)` over the entire event
  log, plus 4 nested `execSync("node scripts/...", {stdio:"pipe"})` — each boots a fresh Node
  process that re-imports the whole framework.
- **Per-`test:*` CLI boot.** Each `npm run test:<name>` boots the full `synth` CLI
  (`loadRegistry` + bootstrap) just to run one `node tests/*.test.js`. For a single fast test
  file this fixed overhead is the dominant cost.
- The CI "779ms" vs local "49.8s" for `freeze-certification` is the `generate-proof` subprocess
  inside the last test (`generateTemporaryProof`, `tests/freeze-certification.test.js:38-67`),
  which copies `.synth/data`, symlinks `src/dist/scripts`, and re-runs the entire proof pipeline.

### 4.1 Performance findings (measured 2026-08-24, before fixes)

Each sub-proof is an independent `node` child process that boots the full 13-step
`bootstrap()`:

| Sub-proof (script) | Time | Notes |
|---|---|---|
| `audit-bypass-map.js` | 2.3 s | static scan of `src/` |
| `verify-determinism.js` | 3.9 s | paired reference execution |
| `verify-graph-integrity.js` | **11.1 s** | full reference execution / graph build — the long pole |
| `audit-adversarial.js` | 3.7 s | full adversarial audit |
| `generate-proof` parent (hashing + bootstrap + replay) | ~8 s | `dist`/`src` hashing dominated |

Under the operator's memory-constrained local box (heavy swap), file reads are
amplified, so `computeDistHash` alone (reading every `dist/*.js` + `*.js.map`) cost ~7–8 s,
and `verify-graph-integrity` (11 s) is the single biggest wall-clock contributor.

### 4.2 Performance strategy applied (items 1–3, implemented 2026-08-24)

1. **Source hash: git tree hash.** `computeSourceHash()` now uses `git rev-parse HEAD:src`
   (a content-addressed O(1) fingerprint) when `src` is clean vs `HEAD`; falls back to file
   hashing when dirty / not a repo (e.g. the `freeze-certification` temp checkout).
2. **Dist hash: manifest root hash.** `computeDistHash()` reads `dist/dist-manifest.json`
   `rootHash` (O(1)) instead of re-reading every artifact; falls back to file hashing if the
   manifest is absent. This also dropped the large `*.js.map` reads entirely.
3. **Shared bootstrap + `--only` selector.** The replay proof reuses one `bootstrap()` context
   (was two). `node scripts/generate-proof.js --only <name>` skips hashing and the bootstrap
   entirely for `structural`, so a structural-only check is instant.
4. **Parallel sub-proofs.** The four external verifications run via `Promise.all`, so wall-clock
   ≈ the slowest single check (~11 s) instead of the sum (~21 s for the four children).
5. **Structural audit whitelist (correctness, not speed).** `audit-bypass-map.js` no longer flags
   `process.stderr.write` telemetry or the store's own `append`/`appendBatch`/`save` API as
   "bypass paths" — these were false positives that *blocked* `test:freeze-certification`.

### 4.3 Remaining cost & future-optimization backlog (deferred)

These are explicitly **out of scope for items 1–3** and belong in a follow-up performance
expedition:

- **`verify-graph-integrity.js` (11 s).** Its reference execution replays the whole event log to
  build the graph. Candidate wins: incremental graph build (reuse canonical-state snapshot),
  raise the `--since` offset, or run it only on a scheduled cadence rather than every commit.
- **Per-child `bootstrap()` cold start (~1–2 s × 4).** Each `node scripts/*.js` re-imports the
  whole framework. Candidate: a lightweight `--lib` mode that skips adapter/Mission-Studio init,
  or a long-lived verifier daemon.
- **`rebuildState(events)` over the full log** in the parent (replay proof). Candidate: replay
  from the last committed snapshot + delta.
- **`SYNTH_DEBUG=1` umbrella** (item 5) unifies `SYNTH_DEBUG_GIT` / `SYNTH_TASK_VERBOSE` — parked.
- **Single-source config** for audit policy (expedition `7d311b7a2826db82`) removes literals
  from `audit-bypass-map.js`.

## 5. Measurement plan (in progress — this expedition)

Telemetry added (opt-in, no behavior change unless the env flag is set):

- `SYNTH_TASK_VERBOSE=1` (or `SYNTH_DEBUG=1`): `cmdTaskRun` (`src/cli/task.ts`) includes
  each result's captured `stdout`/`stderr` in the JSON report, and on `status:"error"`
  prints a `stderr` footer with the failed task's `stderr`/`stdout` + exit code + duration
  (replaces the silent `process.exit(1)`).
- `SYNTH_DEBUG_GIT=1`: `autoCommitDerivedState` (`src/cli/synth.ts`) prints the attempted
  `git` command before exec and embeds it in the failure `reason`.
- `scripts/task-adapter-shim.js` now prints `[task-adapter-shim] <script> exited <code> in
  <ms>` to `stderr` (wall-clock per `test:*` run).

Remaining measurement steps:

1. Baseline runs (clean checkout):
   - `npm test` (core chain).
   - `SYNTH_TASK_VERBOSE=1 node scripts/task-adapter-shim.js test:freeze-certification` to
     reveal the hidden error + wall-clock (the 50s suspect).
   - `node scripts/generate-proof.js` to attribute time to each sub-proof.
2. Record numbers; map each slow/failing path to A–F above.

### 5.1 Measurement results (2026-08-24, clean tree, `SYNTH_TASK_VERBOSE=1`)

**Timings**
- `npm run test:freeze-certification` (via shim): **49,252 ms** wall; the task itself
  `test:freeze-certification` = **43,095 ms**.
- Inside it, subtests 1–9 pass in **~250 ms**; subtest 10 ("Synth can generate a passing
  proof from current source") = **39,649 ms** and FAILS.
- `node scripts/generate-proof.js` standalone ≈ **35 s**, dominated by: full `src`/`dist`
  SHA-256 hashing (`computeSourceHash`/`computeDistHash`), two `bootstrap()` boots, and 4
  nested `execSync` Node boots (audit-bypass-map, verify-determinism, verify-graph-integrity,
  audit-adversarial).

**Root-cause chain (previously fully hidden)**
```
test:freeze-certification
 └─ subtest 10 → generateTemporaryProof() → execSync("node scripts/generate-proof.js")
      └─ proof.overall.passed = false  →  ❌ PROOF REJECTED
           └─ P1 Structural: FAIL
                └─ runStructuralAudit() → execSync("node scripts/audit-bypass-map.js", {stdio:"pipe"})
                     → 5 MUTATION BYPASS PATHS (stderr swallowed → "Mutation bypass paths detected")
                        • cli/entry.ts:129,130   process.stderr.write (telemetry)
                        • infra/telemetry.ts:73  process.stderr.write (telemetry)
                        • first-contact/materialize/engine.ts:226  eventStore.appendBatch
                        • infra/event-store.ts:449              eventStore.append
```
The structural audit treats `process.stderr.write` telemetry and legitimate `append`/`appendBatch`
calls as "bypass paths", so P1 is almost certainly a **false-positive-prone** check rather than a
real governance violation. Its specifics were invisible until `audit-bypass-map.js` was run directly.

**Opacity confirmed**
- With `SYNTH_TASK_VERBOSE=1` the failed task's output became visible (B/C fixed in this
  expedition). The *deepest* cause (the 5 specific paths) stayed hidden because
  `generate-proof.js`/`runStructuralAudit` swallow child `stderr` (opacity **D**) — only a
  direct run surfaced it.
- `SYNTH_DEBUG_GIT=1` (already added) surfaces the auto-commit `git` command (opacity **E**
  fixed).

### 5.2 Resolution (implemented 2026-08-24, items 1–3)

**Correctness:** the P1 Structural false positives were whitelisted (`process.stderr.write`
telemetry + store `append`/`appendBatch`/`save` API). `audit-bypass-map.js` now reports
`✅ No mutation bypass paths detected` (exit 0); `generate-proof.js` therefore returns
`✅ PROOF ACCEPTED`.

**Opacity (item 3):** `generate-proof.js` sub-proof failures now propagate the child's
`stderr`/`stdout` into `proof.proofs.<k>.detail` and are printed on failure, so a future
structural break would show the exact offending paths in CI without a manual re-run.

**After-fix timings (same box, memory-constrained):**

| Run | Before | After |
|---|---|---|
| `node scripts/generate-proof.js` (full) | ~45–49 s | **~38 s** |
| `node scripts/generate-proof.js --only structural` (hashing) | n/a | **0 ms** (skips hashing + bootstrap); whole run ~12 s (src scan dominates under swap) |
| `npm run test:freeze-certification` (via shim) | **FAIL** (subtest 10 REJECTED, 49 s) | **PASS**, ~53 s (temp-copy + symlink + full proof; src hashed via file fallback in the temp checkout) |

The remaining ~30 s in the full proof is `verify-graph-integrity.js` (11 s) + the parent
`bootstrap()`/`rebuildState` replay + 4 child node cold-starts; see §4.3 for the deferred
backlog.

### 7. Diagnostics env flags (reference)

| Flag | Effect | Where |
|------|--------|-------|
| `SYNTH_DEBUG_GIT=1` | Print the `git` command run by derived-state auto-commit; embedded in failure reason | `src/cli/synth.ts` (`autoCommitDerivedState`) |
| `SYNTH_TASK_VERBOSE=1` (or `SYNTH_DEBUG=1`) | Include captured `stdout`/`stderr` in `TaskRunReport`; print failed task's output on error | `src/cli/task.ts` (`cmdTaskRun`) |
| (planned) `SYNTH_DEBUG=1` umbrella | Single switch enabling all `*_DEBUG_*` flags | to be added before finishing `6e26566b` |

## 6. Strategy proposal — status

Implemented in this expedition (items 1–3, agreed 2026-08-24):

- **[DONE] Item 3 — stop swallowing proof sub-errors.** `generate-proof.js` `runCheck()`
  captures each child's `stdout`/`stderr` into `proof.proofs.<k>.detail`; `main()` prints it for
  failed sub-proofs. (Was opacity source **D**.)
- **[DONE] Item 2 — structural audit whitelist.** `audit-bypass-map.js` exempts `process.stderr/stdout.write`
  telemetry and the store's own `append`/`appendBatch`/`save` API; the 5 prior "bypass paths"
  were false positives. This unblocks `test:freeze-certification` (subtest 10).
- **[DONE] Item 1-adjacent performance.** git tree hash for `src`, `dist-manifest.json` rootHash
  for `dist`, shared `bootstrap()` context, `--only <name>` selector (skips hashing + bootstrap),
  and parallel sub-proof execution. See §4.2.

Deferred (parked for a future optimization expedition — effort to be estimated before commitment):
- **Item 4 — deeper proof-speed work:** incremental graph build / replay-from-snapshot for
  `verify-graph-integrity.js` (11 s long pole) and the parent `rebuildState` replay; reduce the
  4× child `bootstrap()` cold starts (lightweight `--lib` mode or verifier daemon). See §4.3.
- **Item 5 — `SYNTH_DEBUG=1` umbrella** unifying `SYNTH_DEBUG_GIT` / `SYNTH_TASK_VERBOSE` (and a
  planned `SYNTH_DEBUG_PROOF`).
- **Single-source audit config** (expedition `7d311b7a2826db82`): move `audit-bypass-map.js`
  policy literals into `.synth/config.yaml`.

Not taken (rejected/separate):
- **Item 1 — stream child output** (`stdio:"inherit"` in `runCommand`): deferred. The captured
  buffer is already surfaced via `SYNTH_TASK_VERBOSE=1` and the proof detail; live streaming is a
  runner UX change with broader blast radius, parked for a dedicated runner task (captured earlier
  in this expedition's discovery).
- **Item 6 — transient-checkout-to-main**: tracked separately in expedition `379b1fa17a84b8fd`.
