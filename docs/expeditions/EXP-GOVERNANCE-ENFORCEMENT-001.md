# EXP-GOVERNANCE-ENFORCEMENT-001 — Implementation Authority Ordering Enforcement

> Ensure SYNTH cannot operationalize architectural decisions before their governance authority is complete.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Authority:** `ADR-046` (pending acceptance), `ADR-004`, `ADR-026`, `ADR-035`, `ADR-039`, `ADR-045`, Constitutional Baseline Mutation Authority Invariant, Constitution Provision 52  
**Touches Protected Assets:** Yes — `ExecutionGate`  
**Depends On:** `EXP-CAPABILITY-BOUNDARY-001`  
**Blocks:** `EXP-MUTATION-LIFECYCLE-001` (clarifies priority)

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires expedition approval; no new concepts
  Requires ADR: Yes — ADR-046
```

---

## Goal

Add **implementation eligibility** evaluation inside `ExecutionGate` so that every SYNTH-controlled mutation is blocked until the full authority chain that permits it is complete.

```text
MutationRequest
       |
       v
ExecutionGate.execute()
       |
       +-- Authority check
       |      |
       |      +-- Mission/Expedition valid?
       |      +-- Scope permitted?
       |      +-- ADR dependencies Accepted?
       |      +-- Convergence Review complete?
       |
       +-- denied  -> reject with reason
       |
       +-- allowed -> provider mutates -> event -> replay
```

This expedition does not add a new gate, lifecycle term, or runtime object. It makes the existing authority state executable.

---

## Purpose

The runtime currently permits implementation mutations even when governing ADRs are still **Proposed** or Convergence Reviews are incomplete. The original observed drift included:

- `ADR-036-intent-refinement-and-alignment-governance.md` and `ADR-037-genesis-lifecycle-and-alignment-contracts.md` remained Proposed while `src/types/state.ts` and the event log already represented Genesis/Alignment concepts.
- `EXP-HOME-029` executed website mutations without an authorized expedition.
- Governance metadata itself drifted: ADR numbering collisions and a stale ADR index.

`EXP-SIMPLIFICATION-001` resolves the ADR metadata drift by renumbering and ratifying the Genesis/Alignment ADRs as ADR-047 and ADR-048. This expedition closes the remaining execution gap by evaluating authority-state completeness as a hard prerequisite inside the existing mutation boundary.

---

## Deliverables

1. **`ImplementationEligibility` type** — a resolved eligibility verdict attached to an execution attempt:
   ```ts
   {
     eligible: boolean
     reasons: string[]
     missingAuthority?: string[]
   }
   ```

2. **Authority-state resolver** — given an Expedition, resolve:
   - Approved Mission/Expedition authority
   - Declared ADR dependencies and their status
   - Required Convergence Review outcome
   - Permitted mutation scope

3. **Integration into `ExecutionGate.execute()`** — eligibility check runs after the existing Mission/Expedition/scope check and before any provider dispatch.

4. **Authority-state reconciliation**:
   - Assume ADR registry is consistent after `EXP-SIMPLIFICATION-001`.
   - Document any remaining Proposed ADR dependencies that could block implementation.

5. **Regression tests**:
   - Mutation blocked when dependency ADR is Proposed.
   - Mutation allowed when dependency ADR is Accepted.
   - Mutation blocked when Convergence Review is incomplete.
   - Existing valid mutations continue to pass.

6. **Replay proof** — eligibility decisions must be reconstructible from events and canonical state.

---

## Non-deliverables

- No new ADR beyond `ADR-046`.
- No new governance artifacts (Alignment Contract, Divergence Gate, etc.).
- No new lifecycle states.
- No new public vocabulary.
- No migration of all direct write paths (that is `EXP-MUTATION-LIFECYCLE-001`).
- No agent instruction changes.

---

## Out of Scope

- Migrating every `fs.writeFile`, `mkdir`, or adapter write behind `ExecutionGate`.
- Defining the genesis exception model.
- Changing the `SynthEvent` envelope.
- Modifying `Mission Studio`, `Genesis`, `Replay`, or the Proof Schema.

Those remain with `EXP-MUTATION-LIFECYCLE-001`.

---

## Implementation Order

1. Wait for `ADR-046` to reach **Accepted** status.
2. Add `ImplementationEligibility` type and resolver.
3. Integrate resolver into `ExecutionGate.execute()`.
4. Add dependency declaration to Expedition charters going forward.
5. Repair ADR numbering collisions and stale index.
6. Document reconciliation of Proposed ADRs with runtime state.
7. Add regression tests.
8. Run replay verification and produce proof.

---

## Success Criteria

After this expedition:

- `ExecutionGate.execute()` rejects mutations when authority state is incomplete.
- `ExecutionGate.execute()` permits mutations when authority state is complete.
- Governance metadata is internally consistent (no ADR numbering collisions, README current).
- Replay reconstructs every eligibility decision.
- No new SYNTH concepts, lifecycle states, or public vocabulary are introduced.

---

## Risks

| Risk | Mitigation |
|---|---|
| Existing runtime state depends on Proposed ADRs | Document reconciliation explicitly; do not retroactively accept Proposed ADRs. |
| Eligibility check blocks legitimate genesis/bootstrap paths | Genesis paths use `executeGenesis()`, which is evaluated under a separate genesis authority model in `EXP-MUTATION-LIFECYCLE-001`. |
| Performance cost of authority resolution | Cache resolved eligibility per transaction; invalidate only when governance events append. |
| Circular dependency declarations | Validate expedition dependency graph during charter review, not at runtime. |

---

## Definition of Done

- [ ] `ADR-046` accepted.
- [ ] `ImplementationEligibility` type defined.
- [ ] Authority-state resolver implemented.
- [ ] `ExecutionGate.execute()` performs eligibility check.
- [ ] ADR numbering collisions resolved.
- [ ] `docs/adr/README.md` updated through ADR-046.
- [ ] Reconciliation note for Proposed ADRs documented.
- [ ] Regression tests added and passing.
- [ ] Replay verification passing.
- [ ] Expedition accepted.
