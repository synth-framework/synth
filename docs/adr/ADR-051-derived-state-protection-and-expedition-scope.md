# ADR-051 — Derived-State Protection and Expedition Scope Enforcement

**Status:** Accepted  
**Date:** 2026-07-31  
**Author:** Synth Agent  
**Deciders:** EXP-PROGRAM-043 / EXP-GUARD-001  

---

## Context

The TaskPRO brownfield migration showed that agents will hand-edit derived files when the boundary is not explicit. Incidents included direct edits to `.synth/data/canonical-state.json` and `AGENTS.md`, and expeditions touching files far outside their stated intent (e.g. a mobile-defect expedition modifying `.synth/` or `knowledge/`).

Derived files are projections of the immutable event log. If they can be edited directly, replay no longer proves state, and the system loses its root of trust. Expedition scope is the operational contract that bounds what a governed engineering objective may touch.

## Decision

1. **Derived-file guard in the public SDK.** `src/sdk/files/index.ts` rejects `writeFile` and `appendFile` calls whose target matches a known derived path:
   - `.synth/data/canonical-state.json`
   - `.synth/data/event-log.jsonl`
   - `AGENTS.md`
   - `docs/generated/*.md`

   Kernel stores (EventStore, StateStore, CheckpointStore) continue to write these files through their existing module-private authorization tokens, which bypass the SDK surface.

2. **ExecutionGate mutation authority.** Before any filesystem mutation is applied, `ExecutionGate.authorize` checks:
   - Whether the target is derived (reject regardless of scope).
   - Whether the target matches the declared scope of an authorized expedition.
   - Whether an explicit out-of-scope override reason is supplied.

3. **Scope declaration on expedition creation.** `synth expedition create` accepts repeated `--scope <glob>` flags. The globs are stored in `expedition.metadata.scope` and matched with a lightweight glob implementation supporting `**` and `*`.

4. **Auditable out-of-scope override.** When a mutation is allowed because `context.authorizeOutOfScope` is present, an `OUT_OF_SCOPE_AUTHORIZED` event is appended to the event log recording the expedition, target, and reason.

## Consequences

- Agents can no longer accidentally edit canonical state or generated docs through the SDK.
- Every file mutation that passes through the ExecutionGate is bounded by expedition scope unless explicitly overridden and logged.
- The kernel stores retain their existing write tokens; no new runtime path is created for derived-file writes.
- Out-of-scope writes become audit events, making them visible to `synth explain diagnostics` and replay.

## Proof Impact

- **P1 Replay Integrity:** Rejecting direct derived-file edits keeps operational state equal to replayed state.
- **P2 Governance Traceability:** `OUT_OF_SCOPE_AUTHORIZED` events provide an audit trail for scope exceptions.
- **P3 Capability Boundary:** Scope enforcement exercises the ExecutionGate mutation authority invariant.

## Kernel Impact

None. `ExecutionGate` already enforces mutation authority; this change only strengthens the checks it performs and adds an audit event type. Kernel stores are unaffected.

## Constitutional Baseline Impact

No constitutional rules are changed. The change enforces the existing invariant that only the ExecutionGate may mutate state and adds scope as an operational contract.

## Related

- `docs/expeditions/EXP-GUARD-001.md`
- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/adr/ADR-046-implementation-authority-ordering.md`
- `docs/adr/ADR-017-constitutional-compliance-core-boundary.md`
