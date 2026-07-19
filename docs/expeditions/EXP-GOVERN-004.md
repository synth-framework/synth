# EXP-GOVERN-004 — Incremental Scheduler

> **Architecture expedition.** Build a dependency-driven scheduler that uses the validation graph, fingerprints, and proof cache to run only the checks affected by the current changes, with transparent skip explanations.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-021 — Incremental Governance  
**Depends On:** EXP-GOVERN-003 (Fingerprint and Proof Cache)

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

Make `synth govern` incremental. Given a set of changed files, the scheduler:

1. identifies affected modules.
2. invalidates fingerprints for checks whose inputs changed.
3. schedules only the invalidated checks and their downstream dependents.
4. reuses cached proofs for everything else.
5. explains why each check ran or was skipped.

---

## Required Change

### 4.1 Detect affected modules

From `git diff` or an explicit diff input, determine which governance modules are touched:

```text
src/runtime/events.ts  → runtime module
website/index.html     → website module
docs/architecture.md   → documentation module
```

### 4.2 Invalidate fingerprints

For each affected module, invalidate checks whose `inputs` intersect the changed paths. Also invalidate any check whose `inputs` include invalidated outputs from another check.

### 4.3 Schedule the subgraph

Build a minimal execution subgraph containing:

- invalidated checks.
- downstream checks that depend on invalidated outputs.
- global checks that are not cacheable.

Execute in topological order respecting dependencies.

### 4.4 Reason engine

Produce a structured reason for every check:

```json
{
  "checkId": "documentation-generation",
  "decision": "skipped",
  "reason": "No dependency changes detected in documentation module."
}
```

Or:

```json
{
  "checkId": "replay-verification",
  "decision": "executed",
  "reason": "runtime module changed: src/runtime/events.ts"
}
```

### 4.5 CLI integration

Add `--explain` or include the reason summary in the default GovernSummary:

```text
Changed:
  src/runtime/events.ts

Affected:
  ✓ runtime validation
  ✓ replay verification

Skipped:
  ✓ documentation
  ✓ website
  ✓ missions
  ✓ contracts

Reason:
  No dependency changes detected in skipped modules.
```

### 4.6 Force full run

Preserve a `--full` flag (or `npm run govern:full`) that bypasses incrementality and runs every check. This is required for:

- cold runs.
- CI baseline runs.
- cache recovery.

---

## Deliverables

1. **Incremental scheduler** integrated into the governance pipeline.
2. **Module-to-change mapping** based on git diff or explicit input.
3. **Reason engine** producing per-check run/skip explanations.
4. **CLI output** showing affected and skipped checks.
5. **ADR** on incremental scheduling semantics.

---

## Acceptance Criteria

- A change in `src/runtime/` schedules runtime and dependent checks but skips documentation, website, and missions.
- A change in `docs/` schedules documentation checks but skips runtime checks.
- A cross-cutting change (e.g., `src/core/`) schedules all dependent modules.
- A full run (`--full`) executes every check regardless of cache state.
- The reason engine explains every scheduling decision.

---

## Out of Scope

- Parallel execution (EXP-GOVERN-005).
- Remote cache (EXP-GOVERN-005).
- Watch mode (EXP-GOVERN-005).
- Adding or removing checks.

---

## Success Criteria

The expedition succeeds when a one-line change in a single module completes in a small fraction of the full governance time, while a full architectural change still runs the complete validation graph.
