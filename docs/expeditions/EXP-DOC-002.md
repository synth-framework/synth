# EXP-DOC-002 — Projection & Documentation Sync

> **Documentation expedition.** Add structured ADR/expedition metadata to knowledge graph projections, implement freshness verification, and reduce concept noise.

**Status:** Proposed  
**Kind:** Documentation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 1 — Documentation  
**Authority:** Synth Architectural Constitution  
**Depends On:** None  
**Blocks:** None

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

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| H6 | ADR/expedition metadata lost in projection — 8700+ noisy concepts; structured metadata invisible | High |
| M9 | No freshness verification for generated documentation files | Medium |
| M10 | `capability-validation-map.json` hand-authored, can drift from source | Medium |
| L5 | Hand-authored website content can drift from system reality | Low |

---

## Deliverables

1. **ADR-specific extractor** — Parse `**Status:**`, `**Date:**`, `**Deciders:**` from ADR documents. Create typed KnowledgeNode entries enriched with ADR metadata. Add "Architecture Decisions" section to ARCHITECTURE.md template.
2. **Expedition-specific extractor** — Parse `**Status:**`, `**Kind:**`, `**Priority:**`, `**Program:**` from expedition documents. Add "Active Expeditions" section to OPERATOR_GUIDE.md.
3. **Projection freshness verification** — Script that regenerates projections to a temp directory and reports when on-disk outputs are stale. Embed `sourceStateHash` (hash of input file manifest) in generated docs.
4. **Capability registry snapshotting** — Script that reads `src/capability/registry.ts` and generates `docs/reference/capability-list.json` automatically. Verify against hand-authored `capability-validation-map.json`.
5. **Concept quality improvement** — Weight by heading depth, filter CLI flag references and numeric-only fragments, use document domain metadata for template filtering.

---

## Acceptance Criteria

1. `synth docs generate` produces ARCHITECTURE.md with an "Architecture Decisions" section listing ADRs with their Status and Date.
2. `synth docs generate` produces OPERATOR_GUIDE.md with an "Active Expeditions" section.
3. Freshness script detects when generated docs are out of date.
4. Capability list can be regenerated from source (automated or semi-automated).
5. Concept count drops by at least 50% (noise reduction).
6. All existing documentation tests pass.

---

## Out of Scope

- Real-time documentation regeneration on file change.
- First-contact projection pipeline unification (separate concern).
- Website content auto-generation.

---

## Relationship to Other Work

- **EXP-PROGRAM-038** — Parent program. No dependency on other expeditions.
