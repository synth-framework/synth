# EXP-DOC-007 — Generated Documentation Provenance

> **Documentation remediation expedition.** Ensure every file in `docs/generated/` carries the provenance metadata required by `synth verify`, eliminating the persistent `ProjectionConsistency` warning.

**Status:** Draft  
**Kind:** Documentation Remediation Expedition  
**Priority:** Low  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-DOCS-001 (Documentation Projection System)  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`synth verify` currently reports a `ProjectionConsistency` warning for every `.md` file under `docs/generated/`:

> Generated documentation 'AI_CONTEXT.md' lacks required provenance metadata.

The required metadata markers are:

- `sourceStateHash:`
- `computedAt:`
- `schemaVersion:`

Running `synth docs generate` does not inject these markers, so the warning persists after regeneration. This expedition fixes the projection engine so generated docs are self-describing and `synth verify` passes cleanly.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| P1 | Generated docs lack `sourceStateHash`, `computedAt`, and `schemaVersion` provenance headers | Low | Fix planned |
| P2 | `synth docs generate` does not write the metadata that `synth verify` expects | Low | Fix planned |

---

## Deliverables

### 1. Define the provenance header format

Choose a deterministic, parseable format. Options:

- YAML front-matter at the top of each generated markdown file.
- A HTML/Markdown comment block containing the three required fields.

Selected format must contain all three markers and survive regeneration.

### 2. Update the documentation projection engine

Modify the generator invoked by `synth docs generate` so that every emitted markdown file includes:

```yaml
---
sourceStateHash: <sha256 of canonical state or knowledge base inputs>
computedAt: <ISO 8601 timestamp>
schemaVersion: <version of the projection schema>
---
```

The `sourceStateHash` should be derived from the inputs used to generate the file (e.g., canonical state hash or knowledge base fingerprint), not a random value.

### 3. Regenerate docs/generated/

Run `synth docs generate` so the existing seven files are updated with provenance headers.

### 4. Tests

- Add or update a verification test that asserts generated markdown files contain the three required markers.
- Update `tests/documentation-projections.test.js` or create `tests/docs-provenance.test.js` to guard against regression.

---

## Acceptance Criteria

1. Every `.md` file in `docs/generated/` contains `sourceStateHash:`, `computedAt:`, and `schemaVersion:`.
2. `synth docs generate` produces files that satisfy criterion 1.
3. `synth verify` no longer reports `ProjectionConsistency` warnings for generated documentation.
4. All existing documentation-projection tests still pass.
5. `npm run govern` passes before merge.

---

## Out of Scope

- Changing the set of generated documents.
- Changing `synth verify` to require different or additional provenance fields.
- Runtime implementation changes.
- Governance semantic changes.

---

## Governance

### Protected

- Public vocabulary.
- Projection Rule: derived artifacts must be reproducible from constitutional sources.

### Not included

- Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, or Constitutional Baseline changes.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-008.md`
- `docs/expeditions/EXP-DOCS-001.md`
- `src/verification/checks.ts`
- `src/documentation/projections/engine.ts`
