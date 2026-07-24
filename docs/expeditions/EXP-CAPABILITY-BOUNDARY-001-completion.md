# EXP-CAPABILITY-BOUNDARY-001 — Completion Evidence

> Recorded after implementation and verification.

```yaml
EXP-CAPABILITY-BOUNDARY-001:
  status: completed

  objective:
    Establish ExecutionGate.execute() as the single authorization boundary
    for SYNTH-controlled mutations.

  completed:
    - MutationRequest contract introduced in src/types/transaction.ts
    - MutationProvider contract and filesystem provider created under src/mutation/
    - ExecutionGate.execute() extended with MUTATE_EXTERNAL phase
    - FilesystemWrite capability registered in src/capability/registry.ts
    - CapabilityResult now carries mutations?: MutationRequest[]
    - Executor preserves mutation requests from capability result through to gate evaluation
    - Reference migration added in src/cli/agent-artifacts.ts (optional gate path)
    - Regression coverage added in tests/governance/execution-gate-regression.test.js

  verification:
    tests:
      npm_test:
        passed: true
        result: "113 passed, 0 failed"

      execution_gate_regression:
        passed: true
        scenarios:
          - unauthorized FilesystemWrite blocked
          - approved mission + committed expedition allows mutation
          - out-of-scope mutation blocked
          - EXPEDITION_AUTHORIZED event emitted after successful mutation

      replay_consistency:
        passed: true
        operational_hash: "1940196585"
        replay_hash: "1940196585"
        operational_hash_matches_replay_hash: true

      protected_asset_escalation:
        passed: true

  boundary_cases_verified:
    - unauthorized FilesystemWrite blocked
    - approved mission + committed expedition allows mutation
    - out-of-scope mutation blocked
    - EXPEDITION_AUTHORIZED event emitted after mutation

  architectural_fix:
    description: >
      CapabilityResult now carries mutations?: MutationRequest[], and the
      executor propagates those mutation requests into ExecutionResult so the
      gate can authorize and apply them. Before this fix, mutations were lost
      between capability discovery and gate evaluation, leaving the boundary
      documentary rather than executable.

  follow_up:
    - EXP-MUTATION-LIFECYCLE-001 — Mutation Boundary Integration and Genesis Policy
```

---

## Files changed

| File | Change |
|------|--------|
| `src/types/transaction.ts` | Added `MutationRequest`, `MutationResult`, `MutationProvider`, and optional `mutations` to `ExecutionResult` |
| `src/types/capability.ts` | Added optional `mutations` to `CapabilityResult` |
| `src/mutation/mutation-provider.ts` | Provider contract and registry |
| `src/mutation/filesystem-provider.ts` | Filesystem provider implementing `write`, `mkdir`, `append` |
| `src/mutation/index.ts` | Provider exports |
| `src/control/execution-contract.ts` | Added `MUTATE_EXTERNAL` phase |
| `src/control/execution-gate.ts` | `execute()` dispatches mutations after authority check; emits `EXPEDITION_AUTHORIZED` |
| `src/runtime/executor.ts` | Propagates `mutations` from `CapabilityResult` into `ExecutionResult` |
| `src/capability/registry.ts` | Added `FilesystemWrite` capability |
| `src/core/bootstrap.ts` | Registers `FilesystemMutationProvider` on the gate |
| `src/cli/agent-artifacts.ts` | Reference migration: optional gated write path |
| `tests/synth.test.js` | Updated capability count `34 → 35`; asserted `FilesystemWrite` |
| `tests/governance/execution-gate-regression.test.js` | Rewritten to exercise the new boundary |

---

## Completion note

The architectural primitive is now executable. The remaining work is adoption: routing production mutation paths through the gate and resolving the controlled exception model for genesis operations.
