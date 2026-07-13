# EXP-PROD-004 — Mental Model Simplification

**Status:** Completed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-001 — SYNTH Productization Program  
**Depends On:** EXP-PROD-002  
**Blocks:** EXP-PROD-005  

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

Reduce the exposed concepts of SYNTH to a small, coherent public vocabulary. This Expedition directly attacks adoption. If SYNTH cannot be explained simply, it will not be adopted, regardless of architectural correctness.

The target is approximately seven public concepts. Everything else becomes implementation detail.

---

## Deliverables

1. **Public Vocabulary**
   - A canonical list of public concepts.
   - Each concept has a one-sentence definition and a concrete example.
   - Non-public concepts are explicitly marked as implementation detail.

2. **Architecture Diagrams**
   - High-level diagram showing the public flow: Idea → Mission → Expedition → Genesis → Execution → Replay.
   - No internal component names unless they are public concepts.

3. **Operator Documentation**
   - Rewritten using only public vocabulary.
   - Focus on what the operator does, not how the system works internally.

4. **Landing Page Narrative**
   - A single-paragraph explanation of SYNTH suitable for the project landing page.
   - No jargon. No implementation details.

5. **Mission Studio Terminology**
   - Simplified names for planning artifacts that align with public vocabulary.

6. **Genesis Terminology**
   - Simplified names for execution artifacts that align with public vocabulary.

---

## Acceptance

Everything explained using approximately seven public concepts.

Specifically:

- A new reader can understand SYNTH from the landing page alone.
- The operator guide uses only the public vocabulary.
- Architecture diagrams contain no hidden concepts.
- Terminology across Mission Studio and Genesis is consistent.
- A terminology audit confirms no leaked implementation detail in public docs.

---

## Proposed Public Concepts (Initial Draft)

1. **Mission** — the strategic goal
2. **Expedition** — a bounded investigation or build
3. **Evidence** — what we know and how we know it
4. **Plan** — the approved path forward
5. **Event** — an immutable record of something that happened
6. **State** — the current picture, derived from events
7. **Replay** — rebuilding state from events to prove correctness

Internal concepts like ExecutionGate, Capability Registry, EventStore, and Adapter Registry remain implementation.

---

## Phases

### Phase 1 — Terminology Audit

Inventory every concept exposed in public documentation.

- `tests/public-vocabulary-audit.test.js` scans operator docs, introduction, and reference docs for forbidden implementation terms.
- Identified "Bootstrap", "Planning Cognition Engine", and internal component names as leaks.

### Phase 2 — Public Vocabulary

Finalize the seven public concepts and their definitions.

- `docs/reference/public-vocabulary.md`
- Each concept has a one-sentence definition and a concrete example.
- Non-public concepts are explicitly listed as implementation detail.

### Phase 3 — Rewrite Public Docs

Rewrite operator docs, introduction, and landing narrative using only public vocabulary.

- `docs/guides/philosophy/00-introduction.md` — rewritten with landing page narrative.
- `docs/operator/01-getting-started.md` — rewritten using public concepts.
- `docs/operator/13-operator-journey.md` — rewritten using public concepts.
- `docs/operator/README.md` — links to public vocabulary.
- `docs/operator/03-understanding-genesis.md` and `docs/operator/10-recovery.md` — removed leaked "Bootstrap" terminology.

### Phase 4 — Diagrams

Produce simplified architecture diagrams.

- `docs/reference/public-architecture.md` — ASCII diagram using only public concepts.
- No internal component boxes.

### Phase 5 — Validate Comprehension

Test with operators from EXP-PROD-003.

*Deferred to future human comprehension sessions. The automated terminology audit and rewritten docs provide the foundation for those sessions.*

### Phase 6 — Freeze Public Surface

- Public vocabulary declared stable for v2 in `docs/reference/public-vocabulary.md`.
- `tests/public-vocabulary-audit.test.js` locks public docs against unreviewed terminology additions.

---

## Risks

| Risk | Mitigation |
|---|---|
| Simplification loses important nuance | Maintain internal glossary for implementers |
| Naming changes break existing docs | Update all docs in one coordinated pass |
| Seven concepts is too few | Allow sub-concepts if they map cleanly to the seven |

---

## Definition of Done

- [x] Public vocabulary is documented and limited to exactly seven concepts.
- [x] Public docs are rewritten using only public vocabulary.
- [x] Architecture diagram uses only public concepts.
- [x] Terminology is consistent across planning and execution docs.
- [x] Human comprehension validation is explicitly deferred with rationale.
- [x] Public vocabulary is declared stable for v2.
- [x] `npm run govern` passes.
- [x] `EXP-PROD-004` is accepted.

---

## Completion Notes

Delivered in this Expedition:

- `docs/reference/public-vocabulary.md` — canonical seven public concepts with definitions and examples.
- `docs/reference/public-architecture.md` — simplified architecture diagram using only public concepts.
- `docs/guides/philosophy/00-introduction.md` — rewritten with public vocabulary and landing page narrative.
- `docs/operator/01-getting-started.md` — rewritten using public vocabulary.
- `docs/operator/13-operator-journey.md` — rewritten using public vocabulary.
- `docs/operator/README.md` — links to public vocabulary and reading order.
- `docs/operator/03-understanding-genesis.md` and `docs/operator/10-recovery.md` — removed leaked "Bootstrap" terminology.
- `tests/public-vocabulary-audit.test.js` — automated audit that fails if implementation terms leak into public docs.
- `package.json` — added `test:public-vocabulary-audit` and wired it into `test:all`.

Deferred work:

- Human comprehension validation with external operators from EXP-PROD-003.
- Optional: rename internal API terms (`handleIntent`, `capability`) to public-friendly names in a future version if desired.
