# EXP-DOCS-004 — Environment Layer Reference

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Depends On:** EXP-DOCS-001  
**Blocks:** EXP-DOCS-006

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Publish the canonical public reference for the Environment Layer: its architecture, provider contracts, discovery evidence model, and provider registration status.

---

## Motivation

EXP-PROGRAM-007 introduced the Environment Layer as the boundary between SYNTH Core and the execution environment, governed by ADR-006 through ADR-017. Today there is no single public document that describes the layer as a whole. The architectural concept is mentioned only in `docs/architecture/constitutional-baseline.md`; the details live scattered across twelve ADRs and the `src/environment/` source tree. Operators, contributors, and AI agents need one authoritative reference.

---

## Deliverables

1. **Environment Layer reference document**
   - New reference page under `docs/reference/` describing the Environment Layer: purpose, position in the architecture, and relationship to the core boundary (ADR-017).

2. **Provider contract summary**
   - For each capability provider: contract surface, discovery behavior, and evidence produced.

3. **Registration status matrix**
   - Table mapping each capability family to its ADR, provider implementation, and registration status — including families whose providers exist but are not yet registered in the bootstrap path.

4. **Discovery evidence model**
   - Describe how environment discovery produces replayable evidence (ADR-015).

---

## Acceptance

- A single reference document accurately describes the Environment Layer as implemented in `src/environment/`.
- The registration status matrix matches the actual provider registry, including known gaps.
- `npm run docs:check-links` passes.
- `npm run docs:verify-projection` passes.

---

## Phases

### Phase 1 — Source inventory

Extract the provider contracts, registry contents, and evidence model from `src/environment/`.

### Phase 2 — Reference document

Write the Environment Layer reference.

### Phase 3 — Cross-linking

Link the reference from the architecture index, glossary, and capability reference.

### Phase 4 — Verify

Run documentation integrity checks and the full validation plan.

---

## Risks

| Risk | Mitigation |
|---|---|
| Reference duplicates ADR content | Reference summarizes and links; ADRs remain authoritative for decisions |
| Registration matrix goes stale | Derive it from the provider registry in `src/environment/` at writing time |
| Known gaps read as defects | Present unregistered families as recorded status, with pointers to follow-up work |

---

## Definition of Done

- [ ] Environment Layer reference document published under `docs/reference/`.
- [ ] Provider contract summary covers every provider in `src/environment/`.
- [ ] Registration status matrix matches the implementation, including known gaps.
- [ ] Discovery evidence model documented.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Inventory `src/environment/` providers, registry, and evidence model.
2. Write the Environment Layer reference.
3. Cross-link from architecture index, glossary, and capability reference.
4. Run documentation integrity checks and validation.
5. Request acceptance.

---

## Completion Notes

Pending.
