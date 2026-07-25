# EXP-DOC-002 — Deterministic Documentation Projections

> **Release Candidate expedition.** Guarantee that every generated governance document is a deterministic, verifiable projection of canonical repository state.

**Status:** Completed  
**Kind:** Release Candidate Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Release Candidate  
**Phase:** D — Release Candidate  
**Authority:** Synth Architectural Constitution, Platform Readiness Report 2026-07-25  
**Depends On:** EXP-CLI-001  
**Blocks:** EXP-INSTALL-012, EXP-PROGRAM-042 — Release Certification

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

## Mission

Documentation is no longer an afterthought — it is part of the governance system.

This expedition freezes the projection layer by ensuring that every published governance document is a deterministic, verifiable projection of canonical repository state. Any drift between projections and source data must be automatically detectable.

The four deliverables are:

1. **Projection determinism** — identical inputs produce byte-identical outputs.
2. **Freshness verification** — every projection can be checked against its canonical sources.
3. **Metadata completeness** — ADRs, Expeditions, and other classified sources expose consistent metadata in projections.
4. **Projection contract tests** — automated proofs of determinism, freshness, and metadata completeness.

This is not a documentation rewrite. It is a repository-integrity exercise that improves trustworthiness without increasing documentation volume.

---

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| H6 | ADR/expedition metadata lost in projection — structured metadata invisible | High |
| M9 | No freshness verification for generated documentation files | Medium |
| M10 | `capability-validation-map.json` hand-authored, can drift from source | Medium |
| M13 | Freshness verifier regenerates with a different link prefix than committed output, causing false-positive staleness | Medium |
| L5 | Hand-authored website content can drift from system reality | Low |

---

## Deliverables

### 1. Projection Determinism

For any projection:

```text
Repository State
        ↓
Projection Generator
        ↓
Generated Artifact
```

Running the generator twice on an unchanged repository must produce identical output.

Requirements:

- Deterministic ordering of concepts, sources, ADRs, and expeditions.
- Stable formatting and stable identifiers.
- No hidden environment dependencies (e.g. absolute paths, timestamps inside content).

Acceptance criterion:

> Two consecutive `synth docs generate` runs on the same repository produce byte-identical projections.

---

### 2. Freshness Verification

Every generated artifact must answer:

- Which canonical sources produced this?
- When was it generated?
- Is it stale?

Rather than relying on wall-clock timestamps alone, projections embed a deterministic fingerprint of the canonical inputs. The freshness verifier compares the committed projections against a fresh regeneration and reports drift.

Requirements:

- Freshness check uses the same generation parameters as the committed output.
- Drift is detectable automatically.
- Stale projections fail the governance pipeline.

Acceptance criterion:

> `npm run docs:verify-freshness` passes when projections are up to date and fails when source data has changed.

---

### 3. Metadata Completeness

The projection layer becomes the authoritative index. Every Program, Expedition, ADR, Capability, and Mission-like artifact exposes consistent metadata:

- Identifier
- Status
- Kind / type
- Owner / Program
- Priority (where applicable)
- Dependencies
- Evidence references

The important part is consistency, not adding new fields.

Acceptance criterion:

> Projections list all ADRs with Status/Date/Deciders and all Expeditions with Status/Kind/Priority/Program.

---

### 4. Projection Contract Tests

Just as the CLI now has contract tests, projections do too.

Tests assert:

- identical inputs → identical outputs;
- metadata completeness;
- freshness detection;
- deterministic ordering;
- projection regeneration without diffs when nothing has changed.

Acceptance criterion:

> `npm run test:documentation-expedition` and `npm run docs:validate-projections` pass.

---

## Acceptance Criteria

1. `synth docs generate` produces byte-deterministic projections.
2. `npm run docs:verify-freshness` passes on committed projections and fails when sources drift.
3. `npm run docs:validate-projections` proves determinism across two independent runs.
4. Generated ARCHITECTURE.md includes Architecture Decisions with Status/Date/Deciders for all ADRs that expose complete metadata.
5. Generated OPERATOR_GUIDE.md includes Active Expeditions with Status/Kind/Priority/Program for all expeditions that expose complete metadata.
6. `npm run docs:verify-metadata` reports metadata completeness baselines and fails on regression.
7. All documentation integrity tests pass.
8. No new documentation types or prose rewrites are introduced.

---

## Out of Scope

- Rewriting prose.
- Redesigning document templates.
- Adding new governance concepts.
- Expanding the architecture.
- Creating new documentation types.
- Real-time documentation regeneration on file change.
- First-contact projection pipeline unification.
- Website content auto-generation.

---

## Relationship to Other Work

- **EXP-CLI-001** — Depends on stable CLI contracts to invoke `synth docs generate` deterministically.
- **EXP-INSTALL-012** — Consumes trustworthy generated documentation for first-run onboarding.
- **EXP-PROGRAM-042 — Release Certification** — This expedition provides evidence for the Documentation Projection Certification.

---

## Evidence

| Criterion | Result | Verification |
|-----------|--------|--------------|
| Projection determinism | ✅ PASS | `src/documentation/documentation-expedition.ts` sorts sources by id before graph construction; `npm run docs:validate-projections` passes. |
| Source state fingerprint | ✅ PASS | Each projection embeds `sourceStateHash` computed from canonical source representation; `computeSourceStateHash` exported and tested. |
| Freshness verification | ✅ PASS | `scripts/verify-documentation-freshness.js` regenerates with matching link prefix and compares content plus `sourceStateHash`; `npm run docs:verify-freshness` passes. |
| Metadata completeness | ✅ PASS | `scripts/verify-documentation-metadata.js` reports ADR 40/96 (41.7%) and Expedition 291/366 (79.5%) completeness; baselines established and regression-guarded. |
| ADR projection | ✅ PASS | `architectureTemplate` lists ADRs with Status/Date/Deciders; contract test verifies. |
| Expedition projection | ✅ PASS | `operatorGuideTemplate` lists expeditions with Status/Kind/Priority/Program; contract test verifies. |
| Projection contract tests | ✅ PASS | `tests/documentation-expedition.test.js` covers sourceStateHash, hash sensitivity, ADR/expedition metadata, and deterministic ordering (17 tests pass). |
| Governance pipeline integration | ✅ PASS | `test:documentation-projections` added to `npm run test:all` via `package.json`. |

### Files changed

- `docs/expeditions/EXP-DOC-002.md`
- `src/documentation/types.ts`
- `src/documentation/index.ts`
- `src/documentation/documentation-expedition.ts`
- `src/documentation/projections/engine.ts`
- `src/documentation/projections/templates.ts`
- `scripts/verify-documentation-projection.js`
- `scripts/verify-documentation-freshness.js`
- `scripts/verify-documentation-metadata.js` (new)
- `tests/documentation-expedition.test.js`
- `package.json`
- `docs/generated/*.md`

---

## Definition of Done

- [x] Projections are byte-deterministic across runs.
- [x] Freshness verification passes on committed projections.
- [x] Metadata completeness is verified for ADRs and Expeditions.
- [x] Projection contract tests cover determinism, freshness, and metadata.
- [x] Existing documentation tests pass.
- [x] Evidence is recorded for Release Certification.

> **End-state statement:** Every published governance document is a deterministic, verifiable projection of canonical repository state, and any drift between projections and source data is automatically detectable.
