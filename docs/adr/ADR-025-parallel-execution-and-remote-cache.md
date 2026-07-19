# ADR-025 — Parallel Execution and Remote Cache Safety

## Status

Accepted

## Context

EXP-GOVERN-004 made `synth govern` incremental: only checks affected by the current change execute. EXP-GOVERN-005 now exploits the dependency graph to execute independent checks concurrently and to share proofs across CI builds.

Parallel execution introduces two risks:

1. **Ordering violations.** Independent checks must not run before their dependencies. The existing dependency graph provides the required ordering.
2. **Non-determinism from shared state.** Concurrent `npm` scripts may write to the same directories (e.g., `dist/`). Checks that produce shared outputs must declare those outputs and, where necessary, dependencies on the producers.

Remote/shared caching introduces another risk:

3. **Trust boundary.** A proof cached on one machine must be integrity-verified before reuse on another. The proof model already includes a `proofHash` over the canonical proof fields, so remote proofs can be validated locally.

## Decision

1. **Parallel execution is gated by the dependency graph.** `ParallelRunner` executes checks concurrently up to `--max-concurrency` but never starts a check until all declared dependencies have completed successfully.
2. **Failed checks block downstream dependents.** A failing check does not cascade into dependent checks; they are marked `blocked`. Independent checks continue to run.
3. **Per-check timeouts are enforced by the runner.** `--timeout-per-check <ms>` terminates a check that exceeds its budget.
4. **Proof cache backends are abstracted.** `ProofCacheBackend` defines a minimal contract: `loadProofs()` and `saveProofs(proofs)`. Concrete backends include `LocalFileProofCacheBackend` and `CiArtifactProofCacheBackend`. Future object-storage backends implement the same contract.
5. **Remote proofs are integrity-verified on sync.** `ProofStore.syncFrom(backend)` ignores proofs that fail `isValidProof()` or `verifyIntegrity()`. This prevents corrupted or malicious remote proofs from affecting local governance.
6. **Watch mode is a development convenience, not a CI primitive.** `synth govern --watch` re-runs the incremental scheduler on file changes but is not used for certification.

## Consequences

- Governance can now run independent checks in parallel, reducing wall-clock time for full and cross-cutting runs.
- CI systems can upload and download a single `govern-proofs.jsonl` artifact to warm the proof cache.
- The dependency graph must remain accurate. Missing dependencies can cause ordering bugs under concurrency that were hidden when checks ran sequentially.
- Failed checks block dependents, which may hide downstream failures. This is acceptable because the root failure must be fixed first, and the scheduler will re-execute the subgraph on the next run.
- Watch mode may trigger on its own output (`proof/`, `.synth/cache/`). The watcher ignores these paths to avoid loops.

## Alternatives Considered

- **Task-based parallelism with shared process pool.** Rejected because `npm run` scripts are already well-isolated processes; managing a custom pool adds complexity without benefit.
- **Remote cache keyed only by check id.** Rejected because it would allow stale proofs after input changes. Proofs are keyed by `(checkId, fingerprint)`.
- **Distributed locking for shared outputs.** Rejected as over-engineering for the current scale. Output conflicts are prevented by dependency declarations.
