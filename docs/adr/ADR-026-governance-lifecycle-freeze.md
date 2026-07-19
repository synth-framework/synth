> This ADR is required by **EXP-GOVERN-006 — Governance Completion**.

# ADR-026 — Governance Lifecycle Freeze

## Status

Accepted

## Context

SYNTH has demonstrated that Mission and Expedition governance work in practice. Brownfield onboarding, CLI diagnostics, runtime transitions, and replay recovery have all been certified. Before building Genesis — the upstream intent-to-Mission layer — the governance lifecycle must become a stable, contract-defined platform rather than an evolving dependency.

If Genesis builds on moving governance semantics, every Genesis artifact risks becoming incompatible with future governance changes. Freezing the lifecycle now creates a reliable foundation.

## Decision

The following governance semantics are frozen as of this ADR:

1. **Mission lifecycle states and transitions**
   - States: `draft`, `active`, `completed`, `archived`.
   - Transitions: `draft → active` (approve), `active → completed`, `completed → archived`.

2. **Expedition lifecycle states and transitions**
   - States: `draft`, `approved`, `committed`, `executing`, `completed`, `cancelled`.
   - Transitions: `draft → approved` (approve), `approved → committed` (commit), `committed → executing` (start), `executing → completed` (complete).

3. **Governance event taxonomy**
   - Canonical events: `MISSION_CREATED`, `MISSION_APPROVED`, `MISSION_COMPLETED`, `MISSION_ARCHIVED`, `EXPEDITION_CREATED`, `EXPEDITION_APPROVED`, `EXPEDITION_COMMITTED`, `EXPEDITION_STARTED`, `EXPEDITION_COMPLETED`.
   - Event payloads must include the entity id and status as specified in the Governance Lifecycle Contract.

4. **Approval semantics**
   - Required evidence, default confidence threshold of 0.7, blocking unknown prevention, and explicit rejection/revision path.

5. **Mutation boundaries**
   - Public commands classified as `READ_ONLY`, `PROPOSAL_ONLY`, `POTENTIALLY_MUTATING`, or `MUTATING`.
   - Discovery phase allows only `READ_ONLY` and `PROPOSAL_ONLY`.

## Consequences

- Genesis and downstream programs can depend on stable governance semantics.
- Future changes to these semantics require a new ADR and an Architecture Expedition.
- Runtime correctness improvements (atomicity, recovery) are still allowed under EXP-RUNTIME-001 as long as the contract is preserved.

## References

- `docs/reference/governance-lifecycle-contract.md`
- `docs/architecture/09-event-model.md`
- `src/types/state.ts`
- `src/types/event.ts`
- `tests/governance-lifecycle-contract.test.js`
