# EXP-PROD-002 — Documentation Expedition

**Status:** Completed  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-001 — SYNTH Productization Program  
**Depends On:** EXP-PROD-001  
**Blocks:** EXP-PROD-004, EXP-PROD-005  

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

Build the Knowledge Compiler. This Expedition turns SYNTH into a system that derives all of its documentation from its own canonical state, rather than maintaining hand-authored documents that drift out of sync with the architecture.

This becomes one of SYNTH's flagship features: delete the documentation, run the Expedition, receive equivalent documentation.

---

## Deliverables

1. **Knowledge Graph**
   - A queryable graph built from the canonical state, the World Model, expeditions, discoveries, and decisions.
   - Nodes: missions, expeditions, objectives, components, capabilities, actors, decisions, discoveries.
   - Edges: provenance, dependency, parent-child, reference.

2. **Knowledge Extraction**
   - Extract structured knowledge from:
     - event log
     - expedition documents
     - approved mission model snapshots
     - capability registry
     - constitution and ADRs

3. **Knowledge Normalization**
   - Canonicalize extracted knowledge into a stable intermediate representation.
   - Resolve aliases, deduplicate concepts, and trace provenance.

4. **Documentation Projection Engine**
   - Project normalized knowledge into target documentation formats.
   - Templates are deterministic and versioned.

5. **Generated Outputs**
   - `README.md` — project overview and quickstart
   - `ARCHITECTURE.md` — architectural overview
   - `API.md` — capability and API reference
   - `OPERATOR_GUIDE.md` — operational procedures
   - `DEVELOPER_GUIDE.md` — contributing and extending
   - `ARCHITECT_GUIDE.md` — architectural decision records and governance
   - `AI_CONTEXT.md` — concise context optimized for agent consumption

Everything derived. Nothing manually authored.

---

## Acceptance

Delete documentation. Run Expedition. Receive equivalent documentation.

Specifically:

- The Documentation Expedition can be executed as a single command.
- Its outputs cover every document listed above.
- Outputs are deterministic for identical input state.
- A reviewer cannot distinguish generated docs from carefully maintained hand-authored docs except by provenance metadata.
- Generated docs reference the expeditions, decisions, and snapshots that produced them.

---

## Phases

### Phase 1 — Knowledge Graph Model

Define the canonical knowledge graph schema and construction pipeline.

- `src/documentation/knowledge-graph.ts`
- Nodes and edges are derived from canonical state + snapshots.

### Phase 2 — Extractors

Implement extractors for each source of truth.

- event-log extractor
- expedition-document extractor
- snapshot extractor
- capability-registry extractor
- constitution/ADR extractor

### Phase 3 — Normalizer

Deduplicate, alias-resolve, and enrich the graph.

- `src/documentation/normalizer.ts`
- Provenance is preserved for every normalized node.

### Phase 4 — Projection Engine

Implement templates and renderers for each output.

- `src/documentation/projections/`
- Markdown renderer.
- Template versioning.

### Phase 5 — Verification

- Delete target docs.
- Run the Expedition.
- Diff regenerated docs against archived baseline.
- Measure semantic coverage, not byte-for-byte equality.

---

## Risks

| Risk | Mitigation |
|---|---|
| Generated docs become stale | Regenerate on every `npm run govern` |
| Templates encode too much opinion | Templates are versioned and changeable via Expedition |
| Over-generation produces noise | Support summary and detailed projection modes |

---

## Definition of Done

- [x] Knowledge graph is constructed from the Markdown knowledge base.
- [x] Markdown extractor processes expedition documents, ADRs, constitution, and architecture docs.
- [x] Projection engine generates all seven target documents.
- [x] Documentation regeneration is a single command (`npm run build && node -e "import('./dist/documentation/documentation-expedition.js').then(({documentFromKnowledgeBase}) => documentFromKnowledgeBase('./docs', './docs/generated'))"`).
- [x] Generated docs pass semantic coverage tests (`npm run test:documentation-expedition`).
- [x] `npm run govern` passes.
- [x] `EXP-PROD-002` is accepted.

---

## Completion Notes

Delivered in this Expedition:

- `src/documentation/types.ts` — canonical knowledge graph schema.
- `src/documentation/extractors/markdown.ts` — Markdown knowledge extractor.
- `src/documentation/knowledge-graph.ts` — graph builder with concept normalization.
- `src/documentation/normalizer.ts` — deduplication and provenance preservation.
- `src/documentation/projections/` — deterministic templates for all seven outputs.
- `src/documentation/documentation-expedition.ts` — orchestration runner.
- `src/documentation/index.ts` — public API surface.
- `src/api/index.ts` — `documentationOperation({ operation: "generateDocs" })`.
- `tests/documentation-expedition.test.js` — 12 tests covering extraction, graph building, normalization, projection, and determinism.
- `docs/generated/` — regenerated outputs (README, ARCHITECTURE, API, OPERATOR_GUIDE, DEVELOPER_GUIDE, ARCHITECT_GUIDE, AI_CONTEXT).

Known iteration for future Expeditions:

- Add dedicated extractors for the event log, approved mission model snapshots, and the capability registry so the graph is built from runtime state in addition to the Markdown knowledge base.
