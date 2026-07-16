# EXP-GOV-004 — Projection Model

**Status:** Draft  
**Kind:** Documentation / Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-014 — Governance Maturation  
**Depends On:** EXP-PROGRAM-014, EXP-GOV-002, EXP-GOV-003  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (governed bootstrap E1)

---

```yaml
Impact:
  Constitutional: Yes
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Resolve the unresolved question that appeared during E1: **What is canonical state, what is a projection, and what authority does each have?** The Projection Model expedition defines the rules for deriving views from the event store, what may be cached, what must be recomputed, and what must never be duplicated.

---

## Motivation

The E1 exercise repeatedly raised versions of the same question:

- Should expedition status live in `.synth/expeditions.json`, or be replay-derived?
- Is repository identity a file, a projection, or a decision?
- Can `synth status` cache its briefing, or must it recompute from events every time?
- If documentation is a projection, where does the cache live and who invalidates it?

These are not TaskPRO concerns. They are SYNTH architectural concerns. Without a written Projection Model, every team will answer them differently, leading to mutable state masquerading as truth and duplicated authority across files.

---

## Scope

In scope:

- Define **Canonical State** — the single authoritative materialized projection of the event store.
- Define **Projection** — any derived view constructed by replaying events.
- Define **Cached Projection** — a projection stored for performance, with mandatory provenance.
- Define **Forbidden Duplication** — any place where the same authority is stored twice.
- Answer the E1 questions explicitly:
  - Expedition status: replay-derived from events and state.
  - Repository identity: replay-derived from events, state, and drafts.
  - Operator briefing: recomputed on read.
  - Documentation projections: cached under `docs/generated/` with a provenance stamp.
- Publish the model as `docs/architecture/projection-model.md`.

Out of scope:

- Implementing new projections (other expeditions own those).
- Changing the event model.
- Implementing the verification engine (EXP-GOV-005).

---

## Deliverables

1. **Projection Model document** — `docs/architecture/projection-model.md` with:
   - Definitions of Canonical State, Projection, Cached Projection, and Source of Truth.
   - Authority rules: what can be cached, what must be recomputed, what must never be duplicated.
   - Invalidation rules: when a cached projection must be refreshed or rejected.
   - Provenance requirements: every cached projection must carry `sourceStateHash`, `computedAt`, and `schemaVersion`.
   - Concrete answers to the E1 projection questions.

2. **Projection classification table** — classify existing SYNTH outputs:
   - `canonical-state.json`
   - `data/checkpoint.json`
   - `docs/generated/`
   - `synth status` output
   - `synth explain` output
   - `.synth/manifest.json`
   - Mission Drafts and Approved Snapshots

3. **Governance invariants** — three invariants derived from the model:
   - A projection may never be edited as a source artifact.
   - A cached projection is valid only if its `sourceStateHash` matches current state.
   - No canonical fact may exist in more than one mutable location.

---

## Acceptance

- A contributor can classify any SYNTH output as canonical state, recomputed projection, or cached projection.
- The E1 questions have explicit, defensible answers in the document.
- The classification table covers all listed artifacts.
- No existing architecture document contradicts the projection model.
- Documentation integrity checks pass.

---

## Phases

### Phase 1 — Survey

Inventory every SYNTH output that could be mistaken for source truth.

### Phase 2 — Define taxonomy

Write definitions and authority rules.

### Phase 3 — Answer E1 questions

Apply the taxonomy to expedition status, repository identity, operator briefing, and documentation.

### Phase 4 — Classify existing artifacts

Build the classification table.

### Phase 5 — Integrate and verify

Link from constitution and governance docs; run integrity checks.

---

## Risks

| Risk | Mitigation |
|---|---|
| Model is too abstract to apply | Every rule is paired with a concrete SYNTH artifact. |
| Existing caches violate the model | Survey phase identifies them; contradictions are documented as technical debt or fixed in the same PR if trivial. |
| Other expeditions block on this one | The document is a charter deliverable; implementation expeditions can proceed once the model is merged. |

---

## Definition of Done

- [ ] `docs/architecture/projection-model.md` exists and defines the projection taxonomy.
- [ ] E1 projection questions are answered explicitly.
- [ ] Classification table covers all listed artifacts.
- [ ] Governance invariants are documented.
- [ ] Cross-references added from constitution and governance docs.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Survey SYNTH outputs.
2. Draft taxonomy and authority rules.
3. Answer E1 questions.
4. Classify artifacts.
5. Integrate links and verify.

---

## Completion Notes

*(pending)*
