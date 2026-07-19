> This ADR is required by **EXP-RUNTIME-001 — Runtime Correctness and Recovery**.

# ADR-034 — Replay Recovery Primitives

## Status

Accepted

## Context

SYNTH's execution model is event-sourced: every state change is recorded as an immutable, append-only event, and canonical state is reconstructed by replaying the event log. This makes the system deterministic and auditable, but it also creates a recovery problem. If runtime events are missing while certified planning artifacts (such as approved Mission snapshots) remain, replay reconstructs a state that contradicts the certified record.

The brownfield and greenfield certifications exposed this gap. An operator could approve a Mission, observe that the snapshot was certified, but discover that the corresponding `MISSION_CREATED` and `MISSION_APPROVED` events were absent from the runtime log. Recovery required manual reconstruction of hashes and events, which violates the principle that every state mutation must pass through the ExecutionGate.

EXP-RUNTIME-001 introduces recovery primitives that let the runtime reconcile itself with certified snapshots using only public CLI commands.

## Decision

1. The canonical recovery command is `synth repair replay`.
2. `synth repair replay` (without flags) performs a dry-run: it detects drift between certified Mission snapshots and runtime state, and proposes compensating actions without mutating state.
3. `synth repair replay --approve` applies compensating actions through the ExecutionGate, making the mutation path identical to normal operator workflows.
4. Compensating actions are limited to deterministic runtime lifecycle events (`CreateMission`, `ApproveMission`, etc.) required to bring runtime state into consistency with certified snapshots.
5. After repairs are applied, a `REPAIR_ACCEPTED` audit event is emitted through the ExecutionGate to record the repair session.
6. `REPAIR_ACCEPTED` is an audit-only event: it does not mutate canonical state, but it is part of the append-only event log and is therefore replayable and tamper-evident.
7. The repair event payload includes a stable `repairId`, the repair plan, and the list of applied actions.
8. Hash-chain semantics are preserved: every emitted event, including `REPAIR_ACCEPTED`, chains its `previousHash` to the preceding event and receives a deterministic `eventHash`.
9. Recovery never requires editing `.jsonl` files, recomputing hashes, or running internal scripts. The only supported path is public CLI commands.
10. The `RecordRepair` capability is registered in the capability registry with no preconditions, because the only authority required is the operator's explicit `--approve` decision mediated by the CLI.

## Consequences

- Runtime drift can be detected and repaired without manual event-log surgery.
- Every repair leaves an audit trail in the event log.
- Replay remains deterministic: `REPAIR_ACCEPTED` is a no-op during state reconstruction.
- Operators and agents have a single supported recovery path, reducing the risk of improvised repairs.
- The event model gains a new event type, which requires replay and aggregate-graph validators to treat it as audit-only.

## Proof Impact

- P1 (event model): adds `REPAIR_ACCEPTED` to the canonical event taxonomy.
- P2 (governance integration): repairs are executed through the ExecutionGate and recorded in the event log.
- P4 (deterministic derivation): identical drift and identical approval produce identical repair events and replayed state.

## Kernel Impact

None. This ADR adds a capability and an event type without modifying Protected Assets.

## Constitutional Baseline Impact

None. The append-only and hash-chain invariants are preserved.

## Related

- `docs/expeditions/EXP-RUNTIME-001.md`
- `docs/reference/replay-specification.md`
- `src/cli/synth.ts` (`cmdRepairReplay`)
- `src/capability/registry.ts` (`RecordRepair`)
- `src/runtime/replay.ts` (`REPAIR_ACCEPTED` no-op handler)
