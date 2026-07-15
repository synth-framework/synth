# EXP-DOCS-002 — Capability Model Documentation

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

Bring the public capability documentation in line with the Capability Graph Model (ADR-007) and the environment capability families delivered by EXP-PROGRAM-007.

---

## Motivation

`docs/reference/capability-reference.md` currently documents only domain execution capabilities (Ticket, Plan, Milestone, Project). It does not document the environment capability families introduced by the Environment Layer: Workspace, Filesystem, Revision, Process, Runtime, Package, Forge, Secrets, and Identity. `docs/architecture/07-capability-model.md` predates the Capability Graph and does not reference ADR-006 through ADR-017. Operators and AI agents reading the public documentation see a capability model that no longer matches the implementation.

---

## Deliverables

1. **Environment capability reference**
   - Extend `docs/reference/capability-reference.md` with the environment capability families.
   - For each family document: purpose, contract surface, provider model, and the governing ADR.

2. **Capability Graph architecture update**
   - Update `docs/architecture/07-capability-model.md` to describe the Capability Graph and the boundary between domain capabilities and environment capabilities.
   - Cross-link ADR-006 through ADR-017 where each concept is governed.

3. **Terminology consistency**
   - Ensure capability terminology is consistent across the reference, architecture, and ADR documents.

---

## Acceptance

- Every environment capability family delivered by EXP-PROGRAM-007 appears in the public capability reference.
- `docs/architecture/07-capability-model.md` accurately describes the Capability Graph and the Environment Layer boundary.
- `npm run docs:check-links` passes.
- `npm run docs:verify-projection` passes.

---

## Phases

### Phase 1 — Inventory

List the capability families, their providers, and their governing ADRs from `src/environment/` and `docs/adr/`.

### Phase 2 — Reference documentation

Extend the capability reference with the environment capability families.

### Phase 3 — Architecture update

Update the capability model architecture page to describe the Capability Graph.

### Phase 4 — Verify

Run documentation integrity checks and the full validation plan.

---

## Risks

| Risk | Mitigation |
|---|---|
| Documentation drifts from implementation again | Derive family list from `src/environment/` and ADRs, not from memory |
| Overlap with EXP-DOCS-004 | This expedition covers the capability model; EXP-DOCS-004 covers the Environment Layer as a whole |

---

## Definition of Done

- [ ] Environment capability families documented in `docs/reference/capability-reference.md`.
- [ ] `docs/architecture/07-capability-model.md` updated for the Capability Graph.
- [ ] ADR-006 through ADR-017 cross-linked from the relevant sections.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Inventory capability families from `src/environment/` and ADR-006 through ADR-017.
2. Extend `docs/reference/capability-reference.md`.
3. Update `docs/architecture/07-capability-model.md`.
4. Run documentation integrity checks and validation.
5. Request acceptance.

---

## Completion Notes

Pending.
