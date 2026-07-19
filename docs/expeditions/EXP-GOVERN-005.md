# EXP-GOVERN-005 — Advanced Optimization

> **Architecture expedition.** Optimize the incremental governance system with parallel execution, remote/shared proof cache, watch mode, and CI-specific strategies while preserving determinism and the governance contract.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-021 — Incremental Governance  
**Depends On:** EXP-GOVERN-004 (Incremental Scheduler)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

Once governance is incremental, exploit the dependency graph to run independent checks in parallel, share proofs across machines, and provide development-time feedback loops.

This expedition is explicitly last. It builds on measured data (EXP-GOVERN-001), declared dependencies (EXP-GOVERN-002), fingerprints (EXP-GOVERN-003), and scheduling (EXP-GOVERN-004).

---

## Required Change

### 5.1 Parallel execution

Execute checks whose dependency subgraphs are independent concurrently:

```text
Check A ──→ Check B
            ↓
Check C ──→ Check D
```

Independent branches run in parallel up to a configurable concurrency limit.

### 5.2 Remote/shared proof cache

Allow the proof cache to be stored in a shared location:

- local filesystem path.
- CI cache artifact.
- future: object storage (S3-compatible, etc.).

Shared caches must be content-addressed by fingerprint to avoid collisions.

### 5.3 Watch mode

Provide a `synth govern --watch` mode that:

- runs an initial incremental govern.
- monitors files for changes.
- re-runs only the affected subgraph on change.
- reports results immediately.

### 5.4 CI optimizations

- **Split validation**: allow CI to run module-specific checks in parallel jobs based on the dependency graph.
- **Cache upload/download**: produce cache artifacts that CI systems can restore.
- **Early exit**: fail fast on protected-asset checks while allowing non-critical checks to continue.

### 5.5 Resource limits

Add configurable limits:

```text
--max-concurrency <n>
--timeout-per-check <ms>
--memory-limit-per-check <mb>
```

---

## Deliverables

1. **Parallel scheduler** respecting the dependency DAG.
2. **Remote cache backend** abstraction with local and CI artifact implementations.
3. **Watch mode** for development-time incremental governance.
4. **CI integration guide** for cache and parallel job strategies.
5. **ADR** on parallel execution and remote cache safety.

---

## Acceptance Criteria

- Independent checks execute concurrently without data races.
- Remote cache hits produce the same results as local cache hits.
- Watch mode re-runs only affected checks on file change.
- CI can split governance into module-specific jobs using the dependency graph.
- Resource limits are enforced and reported.

---

## Out of Scope

- Changing governance semantics.
- Adding new checks.
- Modifying protected assets.
- Cloud-specific CI integrations beyond generic artifact caching.

---

## Success Criteria

The expedition succeeds when:

- A developer can run `synth govern --watch` and get near-instant feedback on localized changes.
- CI can reuse proofs across builds and parallelize independent checks.
- Full governance remains deterministic and equivalent to a cold run.
