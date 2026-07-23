# EXP-CAPABILITY-BOUNDARY-001 — Single Mutation Execution Boundary

> Establish `ExecutionGate.execute()` as the one unavoidable mutation surface for all SYNTH-controlled changes.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Authority:** ADR-004 Protected Assets, ADR-026 Governance Lifecycle Freeze, ADR-035 Genesis Protocol, Constitutional Baseline Mutation Authority Invariant  
**Touches Protected Assets:** Yes — `ExecutionGate`, Capability Model  
**Pre-Change Evidence:** `docs/expeditions/EXP-CAPABILITY-BOUNDARY-001-evidence.md`  
**Completion Evidence:** `docs/expeditions/EXP-CAPABILITY-BOUNDARY-001-completion.md`

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires expedition approval; no new concepts
  Requires ADR: No
```

---

## Goal

Collapse every SYNTH-controlled mutation into one primitive:

```text
MutationRequest
       |
       v
ExecutionGate.execute()
       |
       +---- denied
       |
       +---- allowed
              |
              v
        mutation occurs
              |
              v
           event
              |
              v
           replay
```

No capability, adapter, or CLI command may mutate repository state, filesystem, database, or generated artifacts except through this boundary.

---

## Purpose

The `ExecutionGate` is already the single mutation authority for canonical state and events. Direct `fs.writeFile`, `mkdir`, adapter writes, and CLI mutations still bypass it. This expedition closes that bypass by making the gate own the entry point to every mutation, not just the event-store append path.

This is not a new governance concept. It is the enforcement of the existing Mutation Authority Invariant.

---

## Deliverables

1. **`MutationRequest` contract** — minimal, type-safe request describing a mutation:
   ```ts
   {
     capability: string      // e.g. "filesystem"
     operation: string       // e.g. "write"
     target: string          // e.g. "website/index.html"
     payload: unknown
   }
   ```

2. **`ExecutionGate.execute()` as the single boundary** — accepts a `MutationRequest`, resolves authority, performs the mutation, emits the event.

3. **`filesystem` mutation adapter** — the first mutation provider; implements `write`, `mkdir`, `append`.

4. **Authority check inside `execute()`** — active Mission + authorized Expedition + optional scope before any mutation.

5. **`EXPEDITION_AUTHORIZED` event emitted after successful mutation**, not before.

6. **Regression tests**:
   - Direct `fs.writeFile` equivalent routed through `execute()` is blocked without authority.
   - Same request with authority succeeds.
   - Out-of-scope target is blocked.
   - Existing event-store mutations continue to work.

7. **Migration of one direct write path** as the reference pattern (e.g., `src/cli/agent-artifacts.ts` or `src/adapters/tdd/adapter.ts`).

Out of scope: policy engine expansion, new lifecycle states, new governance vocabulary, agent behavior contracts, CI linting.

---

## Non-deliverables

- No new ADR.
- No new governance artifacts (Alignment Contract, Divergence Gate, etc.).
- No `UNAUTHORIZED_MUTATION_ATTEMPT` policy event.
- No event-order validator.
- No AGENTS.md agent instruction.

---

## Implementation order

1. Add `MutationRequest` type to `src/types`.
2. Create `src/mutation/` provider index and `filesystem-mutation-provider.ts`.
3. Extend `ExecutionGate.execute()` to dispatch mutation requests to providers after authority check.
4. Migrate one direct write path to prove the pattern.
5. Add regression tests.
6. Document the migration pattern for future direct-write removals.

---

## Success criteria

After this expedition:

- `ExecutionGate.execute()` is the only code path that can cause a SYNTH-controlled mutation.
- At least one previously direct write path now routes through the gate.
- Tests prove blocked/allowed/scope behavior.
- No existing tests regress.
- The public vocabulary remains unchanged.

---

## Relation to current work

This expedition consumes the `ExecutionGate.authorize()` primitive added during the surgical governance change and folds it into `execute()`. The standalone `authorize()` method may be removed or retained as an internal helper; it is not user-facing.
