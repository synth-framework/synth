# EXP-GOV-003 — Constitutional Layer Boundaries

**Status:** Completed and accepted  
**Kind:** Documentation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-014 — Governance Maturation  
**Depends On:** EXP-PROGRAM-014, EXP-GOV-002  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (governed bootstrap E1)

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Formalize the boundary between **Governance** and **Implementation** in SYNTH, and between **Expedition** and **Bootstrap**. The E1 exercise made this distinction concrete: several implementation concerns were treated as governance decisions, and several expedition-level concerns were conflated with bootstrap mechanics. Documenting these boundaries prevents future architectural drift.

---

## Motivation

During the first end-to-end governed bootstrap, the following confusions appeared naturally:

- Tool versions were discussed as if they affected governance semantics.
- Package manager choice was weighed as a governance decision.
- Supabase configuration was treated as part of the constitutional baseline.
- Evidence normalization — a governance concern — was not distinguished from adapter implementation detail.
- Reconciliations between expected and actual state were not clearly owned by either layer.

None of these are governance kernel issues. They are boundary-definition issues. Without a written boundary, implementation concerns slowly migrate into governance documents, bloating the constitution and making the kernel harder to evolve.

---

## Scope

In scope:

- Define the Governance layer: what it owns, what it decides, and what it protects.
- Define the Implementation layer: what it owns and what it must not influence.
- Define the Expedition layer: bounded engineering objectives that produce evidence.
- Define the Bootstrap layer: one-time transformation of a repository into a SYNTH project.
- Document concrete examples from E1 and assign each to the correct layer.
- Publish the boundary document under `docs/architecture/constitutional-layer-boundaries.md`.

Out of scope:

- Changing the governance kernel.
- Changing the bootstrap command semantics.
- Adding new public concepts.
- Implementing verification logic (EXP-GOV-005 owns executable checks).

---

## Deliverables

1. **Constitutional layer boundaries document** — `docs/architecture/constitutional-layer-boundaries.md` with:
   - Governance layer definition and responsibilities.
   - Implementation layer definition and responsibilities.
   - Expedition layer definition and responsibilities.
   - Bootstrap layer definition and responsibilities.
   - A decision matrix: given a concern, which layer owns it?
   - Concrete E1 examples mapped to the correct layer.

2. **Boundary examples annex** — at least five E1-derived examples:
   - Tool versions → Implementation
   - Package manager → Implementation
   - Supabase config → Implementation
   - Evidence normalization → Governance
   - Reconciliations → Governance

3. **Cross-reference updates** — link the boundary document from `docs/architecture/constitution.md`, `docs/governance.md`, and any expedition documents that touch these concerns.

---

## Acceptance

- A contributor can read the boundary document and correctly classify a new concern as Governance, Implementation, Expedition, or Bootstrap.
- No existing constitutional document contradicts the new boundary definitions.
- The five E1 examples are explicitly mapped and cited.
- `check-links` and `verify-expedition-governance` pass.

---

## Phases

### Phase 1 — Inventory

Collect every boundary confusion from the E1 evidence annex and from existing ADRs/expedition documents.

### Phase 2 — Draft definitions

Write the four layer definitions and the decision matrix.

### Phase 3 — Map E1 examples

Assign each collected example to a layer and explain the reasoning.

### Phase 4 — Integrate and link

Add the document to the architecture index and update cross-references.

### Phase 5 — Verify

Run documentation integrity checks and governance verification.

---

## Risks

| Risk | Mitigation |
|---|---|
| Boundaries feel arbitrary | Every boundary rule is backed by a concrete E1 example and a principle from the constitution. |
| Existing documents contradict the new boundaries | Phase 1 inventories existing docs; contradictions are resolved in the same PR. |
| Document is ignored | Cross-reference it from constitution, governance, and program charters; make it required reading for new expeditions. |

---

## Definition of Done

- [x] `docs/architecture/constitutional-layer-boundaries.md` exists and defines the four layers.
- [x] Decision matrix covers at least the five E1 examples.
- [x] Cross-references added from constitution, governance, and relevant expeditions.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check).
- [x] Expedition is accepted.

---

## Implementation Plan

1. Inventory boundary confusions from E1 evidence.
2. Draft layer definitions and decision matrix.
3. Map concrete examples.
4. Integrate links.
5. Verify and request acceptance.

---

## Completion Notes

Document `docs/architecture/constitutional-layer-boundaries.md` formalizes the four layers and maps the five E1 examples. Cross-references were added from the Architectural Constitution, the Governance Specification, and this expedition file. Documentation integrity checks and CI `proof` passed. Expedition accepted.
