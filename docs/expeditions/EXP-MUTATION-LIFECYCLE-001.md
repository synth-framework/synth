# EXP-MUTATION-LIFECYCLE-001 — Mutation Boundary Integration and Genesis Policy

> Route all SYNTH-controlled mutations through `ExecutionGate.execute()` and define the controlled exception model for genesis operations.

**Status:** Completed and accepted  
**Program:** EXP-PROGRAM-040 — Repository Simplification  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Authority:** ADR-004 Protected Assets, ADR-026 Governance Lifecycle Freeze, ADR-035 Genesis Protocol, EXP-CAPABILITY-BOUNDARY-001, Constitutional Baseline Mutation Authority Invariant  
**Touches Protected Assets:** Yes — `ExecutionGate`, Capability Model, Genesis Boundary  
**Completed:** 2026-07-24  

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

Ensure that every SYNTH-controlled mutation flows through the execution boundary, while explicitly classifying which mutations require governed authority and which are legitimate genesis operations.

```text
Before:

CLI/bootstrap
       |
       +--> fs.writeFile
       |
       +--> ExecutionGate


After:

Agent / CLI / Adapter
       |
       v
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
       Mutation Provider
              |
              v
        filesystem / repository / generated artifact
```

---

## Purpose

EXP-CAPABILITY-BOUNDARY-001 established the primitive. This expedition makes it unavoidable in production by:

1. Cataloguing every direct mutation path in `src/`.
2. Classifying each mutation as **governed**, **genesis**, or **external**.
3. Migrating governed mutations behind `ExecutionGate.execute()`.
4. Defining the restricted genesis authority model.
5. Proving that no uncontrolled SYNTH mutation path remains.

This is adoption of an existing primitive, not invention of a new one.

---

## Mutation Classes

### 1. Governed Mutation

- Requires an approved Mission.
- Requires an authorized Expedition.
- May be scoped.
- Must pass through `ExecutionGate.execute()`.
- Emits `EXPEDITION_AUTHORIZED` after success.

Examples:
- Agent writes source files during an expedition.
- Adapter generates tests or documentation.
- CLI materializes a homepage section.

### 2. Genesis Mutation

- Creates the governance substrate itself.
- Does not require a pre-existing Mission/Expedition.
- Uses a restricted Genesis authority path.
- Emits Genesis events.
- Must not modify product assets.

Examples:
- `synth init` creating `.synth/`.
- `synth bootstrap` seeding canonical state.
- Writing the initial agent contract or context files.

### 3. External Mutation

- Performed by external systems, not by SYNTH runtime logic.
- Not routed through the gate.
- Must be observed and recorded as evidence, not initiated by SYNTH.

Examples:
- A forge merges a pull request.
- A deployment platform rolls out an artifact.

---

## Deliverables

1. **Mutation path inventory** — every `fs.writeFile`, `fs.mkdir`, `fs.appendFile`, state write, and generated artifact path in `src/`.
2. **Classification table** — each path labelled `governed`, `genesis`, or `external`.
3. **Governed mutation migration** — at minimum, the CLI/bootstrap and adapter paths identified in EXP-CAPABILITY-BOUNDARY-001 evidence.
4. **Genesis authority model** — explicit rules for when `executeGenesis()` may be used and what it may touch.
5. **Regression tests**:
   - Governed mutation blocked without authority.
   - Genesis mutation allowed during initialization.
   - Governed mutation cannot masquerade as genesis.
   - Inventory check fails if a new direct write is added.
6. **Documentation of the migration pattern** for future direct-write removals.

Out of scope: new governance artifacts, new lifecycle states, new events beyond `EXPEDITION_AUTHORIZED`, policy engine expansion, agent behavior contracts.

---

## Non-deliverables

- No new ADR.
- No new governance artifacts (Alignment Contract, Divergence Gate, etc.).
- No new public vocabulary.
- No changes to the Mutation Authority Invariant.

---

## Implementation Order

1. Audit `src/` and produce the mutation path inventory.
2. Classify each path.
3. Implement genesis authority guard (restricted path, restricted targets).
4. Migrate governed paths behind `ExecutionGate.execute()`.
5. Add CI/static check that fails on new unclassified direct writes.
6. Verify with regression tests and replay.

---

## Success Criteria

After this expedition:

- Every SYNTH-controlled product mutation routes through `ExecutionGate.execute()`.
- Genesis mutations are explicitly separated and restricted.
- A search for direct `fs.writeFile` in production logic returns only provider internals and genesis bootstrapping.
- Regression tests prove the boundary cannot be bypassed.
- No existing tests regress.
- The public vocabulary remains unchanged.

---

## Relation to Current Work

This expedition consumes the `ExecutionGate.execute()` mutation boundary from EXP-CAPABILITY-BOUNDARY-001. It is the adoption phase: making the primitive unavoidable across all mutation surfaces.

---

## Open Design Question

> Are initialization paths mutations, or genesis operations?

Resolved: initialization paths that create the governance substrate itself are genesis operations. All product-asset mutations are governed operations. This distinction is enforced in `ExecutionGate.executeGenesis()` by an explicit allowlist of structural seed event types.

---

## Completion Evidence

- **Inventory:** `docs/expeditions/EXP-MUTATION-LIFECYCLE-001-inventory.md` catalogues every direct write in `src/` with classification.
- **Provider registration:** `FilesystemMutationProvider` is registered in `src/core/bootstrap.ts` immediately after `ExecutionGate` construction.
- **Genesis guard:** `src/control/execution-gate.ts` `executeGenesis()` rejects operational lifecycle events (`MISSION_APPROVED`, `EXPEDITION_APPROVED`, `EXPEDITION_COMMITTED`, `EXPEDITION_AUTHORIZED`, etc.). Only structural seed events are allowed.
- **Bypass audit:** `scripts/audit-bypass-map.js` reports `✅ No mutation bypass paths detected`.
- **Regression test:** `tests/governance/execution-gate-regression.test.js` passes and includes a new `testGenesisRejectsOperationalEvents` case.
- **Build/test:** `npm run build` and `npm test` pass (121 passed, 0 failed).
