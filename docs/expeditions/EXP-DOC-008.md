# EXP-DOC-008 — Generated Documentation Provenance

> **Operational readiness expedition.** Ensure `synth docs generate` emits provenance metadata that satisfies `synth verify`, closing the gap left by EXP-DOC-007.

**Status:** Completed  
**Kind:** Documentation Remediation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-044 — Operational Readiness & Self-Hosting  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-DOC-007 (Generated Documentation Provenance)  
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

`synth docs generate` already writes projections, but without a charter there was no governed guarantee that every generated file carries the provenance markers `synth verify` expects. This expedition codifies the behavior and adds regression tests so the provenance contract cannot silently regress.

The required metadata markers are:

- `sourceStateHash:`
- `computedAt:`
- `schemaVersion:`

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| P1 | No expedition charter governed the provenance behavior | Low | Fixed |
| P2 | CLI output reported `provenance: false` even though metadata was embedded by default | Low | Fixed |

---

## Deliverables

### 1. Provenance embedding in `src/documentation/documentation-expedition.ts`

`runDocumentationExpedition` computes a deterministic `sourceStateHash` from the extracted knowledge sources and embeds a footer comment containing:

```text
<!--
sourceStateHash: <sha256>
computedAt: <ISO 8601 timestamp>
schemaVersion: synth-documentation-expedition-v1
projection: synth-documentation-expedition-v1
-->
```

### 2. CLI default behavior in `src/cli/synth.ts`

`synth docs generate` now reports `provenance: true` by default, matching the help text that describes `--provenance` as the default behavior. The `--provenance` flag remains accepted as an explicit no-op for scripts and CI.

### 3. Regression tests in `tests/docs-provenance.test.js`

- Asserts generated files contain the three required markers.
- Asserts `synth docs generate --provenance` is accepted and regenerates docs.
- Asserts `synth docs generate --help` documents `--provenance`.
- Asserts `synth verify` reports `WARN-DOCS-001` when provenance markers are stripped from stale generated docs.

---

## Acceptance Criteria

1. ✅ `synth docs generate` produces files containing `sourceStateHash:`, `computedAt:`, and `schemaVersion:`.
2. ✅ `synth docs generate --provenance` is accepted and behaves identically.
3. ✅ `synth verify` reports `WARN-DOCS-001` when generated docs lack provenance.
4. ✅ All documentation-projection tests pass.
5. ✅ `synth validate` passes before merge.

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

- `docs/expeditions/EXP-PROGRAM-044.md`
- `docs/expeditions/EXP-DOC-007.md`
- `src/documentation/documentation-expedition.ts`
- `src/cli/synth.ts`
- `tests/docs-provenance.test.js`
- `src/verification/checks.ts`
