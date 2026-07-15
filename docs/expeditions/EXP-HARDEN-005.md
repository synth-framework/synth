# EXP-HARDEN-005 — Graph Integrity

**Status:** Proposed  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-003, EXP-HARDEN-004  
**Blocks:** EXP-HARDEN-006

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Introduce Graph Integrity as a first-class constitutional proof, equal in importance to Replay Integrity.

---

## Motivation

SYNTH's execution model is a graph: Missions contain Expeditions, Expeditions contain Objectives, and Objectives produce Work Items. If this graph is broken, Replay may still pass while the system is semantically invalid. Graph Integrity must be provable independently.

---

## Deliverables

1. **Graph Integrity model**
   - Formal definition of a valid SYNTH aggregate graph.

2. **Graph Integrity validator**
   - Every Mission is reachable from the project root.
   - Every Expedition belongs to exactly one Mission.
   - Every Objective belongs to exactly one Expedition.
   - Every Work Item belongs to exactly one Objective.
   - No orphan nodes exist.
   - No cycles exist.
   - Every parent reference resolves.
   - Every root is reachable.

3. **Graph Integrity proof artifact**
   - A proof report certifying graph validity.

4. **CI integration**
   - Graph Integrity checks run in `npm run govern`.

---

## Acceptance

A broken event log with orphan aggregates or invalid parent references fails Graph Integrity, while a valid event log produces a Graph Integrity proof.

---

## Phases

### Phase 1 — Define graph invariants

Write the formal definition and add it to reference documentation.

### Phase 2 — Implement validator

Build a standalone graph integrity validator.

### Phase 3 — Generate proofs

Produce proof artifacts after validation.

### Phase 4 — CI integration

Wire the validator into the governance pipeline.

---

## Risks

| Risk | Mitigation |
|---|---|
| Overly strict rules | Start with core invariants, expand iteratively |
| Performance on large graphs | Cache graph state and validate incrementally |
| Incompatible with legacy data | Document exceptions and migration path |

---

## Definition of Done

- [ ] Graph invariants documented.
- [ ] Graph Integrity validator implemented.
- [ ] Proof artifact generated.
- [ ] Validator integrated into CI.
- [ ] Tests cover valid and invalid graphs.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add `src/core/graph-integrity.ts` module.
2. Define validation rules.
3. Integrate with `src/core/replay-verifier.ts`.
4. Add proof generation.
5. Add tests and CI wiring.

---

## Completion Notes

Pending.
