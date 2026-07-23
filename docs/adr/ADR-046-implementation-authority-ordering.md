# ADR-046 — Implementation Authority Ordering

**Status:** Proposed  
**Date:** 2026-07-21  
**Author:** SYNTH Architecture  
**Deciders:** Architecture Owner, Program Stewards  
**Stakeholders:** Operators, AI Agents, Mission Studio, Governance

---

## Context

SYNTH has mature governance mechanisms:

- ADR process (`docs/adr/`)
- Architectural Convergence Review (`ADR-039`)
- Constitution Provision 52 (`docs/architecture/constitution.md`)
- Protected Assets (`ADR-004`)
- Kernel Freeze (`docs/kernel-freeze.md`)
- ExecutionGate (`docs/kernel-freeze.md:23-32`)

Despite these mechanisms, recent incidents showed that proposed architectural concepts could become implemented runtime state before their authority state was resolved:

- `ADR-036-intent-refinement-and-alignment-governance.md` and `ADR-037-genesis-lifecycle-and-alignment-contracts.md` remained **Proposed** while `src/types/state.ts` already contained `intentModels`, `refinementSessions`, and `alignmentContracts`.
- The event log already contained Genesis and Alignment events.
- `docs/adr/README.md` listed ADRs only through ADR-040, omitting ADR-041 through ADR-045.
- ADR numbers 036 and 037 each had two colliding files.

`EXP-SIMPLIFICATION-001` resolved the immediate drift by renumbering the Proposed ADRs to ADR-047 and ADR-048, accepting them, and refreshing the ADR registry. This ADR establishes the permanent rule that prevents the pattern from recurring: authority must precede runtime representation.

The failure is not a missing abstraction. The abstractions exist. The failure is that the runtime does not evaluate whether the authority chain for a proposed mutation is complete.

## Decision

Adopt the following interpretation of existing governance mechanisms:

> A concept becomes part of SYNTH only after the authority chain that permits its representation is complete. Runtime representation must not precede architectural authority.

To enforce this, **Implementation Eligibility** becomes a required condition inside the existing `ExecutionGate` authority check.

An Expedition is implementation-eligible only when all of the following are true:

1. It is authorized by an approved Mission/Expedition authority.
2. Any ADRs it depends on are **Accepted**, not Proposed, Rejected, or Superseded.
3. Any required Architectural Convergence Review is complete and produced a **CONVERGED** outcome.
4. Its mutation scope is within the approved Expedition scope.

This is not a new lifecycle concept, gate, or vocabulary term. It is an enforcement condition applied to the existing `ExecutionGate.execute()` boundary established by `EXP-CAPABILITY-BOUNDARY-001`.

## Consequences

### Positive

- Prevents proposed architectural concepts from becoming de facto runtime reality.
- Keeps governance truth and runtime truth consistent.
- Closes the entire class of incidents that produced the Program 027 homepage drift, the EXP-HOME-029 unauthorized mutation, and the Genesis/Alignment concept expansion.
- Reuses existing mechanisms rather than adding new ones.

### Negative

- Implementation may be blocked when an expedition depends on an ADR still in Proposed status.
- Expeditions must declare ADR and Convergence Review dependencies explicitly.
- Some existing runtime state may need to be reconciled with authority state.

## Proof Impact

- **P1 — Constitutional proofs:** This ADR becomes part of the constitutional baseline as an interpretation of existing provisions.
- **P2 — Governance proofs:** Implementation eligibility decisions are recorded as evidence attached to execution attempts.
- **P3 — Replay proofs:** Replay must reconstruct the authority state that permitted or blocked a mutation.

## Kernel Impact

Modifies the authority evaluation inside `ExecutionGate.execute()`. The frozen interface remains unchanged:

```ts
class ExecutionGate {
  execute(invocation: CapabilityInvocation): Promise<ExecutionResult>
  executeGenesis(events: SynthEvent[]): Promise<void>
}
```

Only the internal authority check gains an additional condition. This is a permitted extension within the frozen interface.

## Constitutional Baseline Impact

This ADR interprets the Program and Expedition lifecycle provisions already in `docs/architecture/constitutional-baseline.md`. It does not introduce new provisions. A minor version bump of the Program Lifecycle provision is recommended to record the interpretation.

## Related

- `ADR-004` — Synth Eras and Protected Assets
- `ADR-026` — Governance Lifecycle Freeze
- `ADR-035` — Genesis Protocol
- `ADR-039` — Architectural Convergence Review
- `ADR-045` — Governance Lifecycle State Machine
- `docs/architecture/constitution.md` — Provision 52
- `docs/kernel-freeze.md` — ExecutionGate interface
- `docs/expeditions/EXP-CAPABILITY-BOUNDARY-001.md`
- `docs/expeditions/EXP-MUTATION-LIFECYCLE-001.md`
