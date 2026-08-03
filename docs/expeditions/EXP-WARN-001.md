# EXP-WARN-001 — Stable Warning IDs and Actionable Fixes

> Give every persistent CLI warning a stable ID and a one-line fix command so operators and agents know exactly what to run.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-CLI-002 (clean output), EXP-EVENTLOG-001 (read-only tooling)  
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

## Purpose

Persistent warnings like `ProjectionConsistency: Generated documentation 'AI_CONTEXT.md' lacks required provenance metadata` are currently vague. They do not tell the user which command fixes the problem, and they have no stable ID for agents to pattern-match against. This expedition adds:

1. A stable warning code (e.g., `WARN-DOCS-001`).
2. A `fixCommand` field in the warning output.
3. A `--fix` mode on the relevant command where safe and deterministic.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| W1 | Docs-provenance warning has no stable ID | Medium | Completed |
| W2 | Docs-provenance warning does not say how to fix it | High | Completed |
| W3 | Agents cannot pattern-match warnings to recovery commands | Medium | Completed |

---

## Deliverables

### 1. Stable warning IDs

Warnings emitted by `synth verify`, `synth explain diagnostics`, and related commands include a `code` field:

```json
{
  "status": "warning",
  "code": "WARN-DOCS-001",
  "message": "Generated documentation 'AI_CONTEXT.md' lacks required provenance metadata.",
  "fixCommand": "synth docs generate --provenance"
}
```

### 2. One-line fix command

Add `synth docs generate --provenance` as an explicit alias that:

- Regenerates all documentation projections.
- Ensures every generated file carries `sourceStateHash`, `computedAt`, and `schemaVersion` provenance markers.
- Exits 0 only if all files are fresh after regeneration.

### 3. Warning catalog

Introduce `src/verification/warning-catalog.ts` that maps warning codes to:

- Human-readable message template.
- Fix command or manual remediation step.
- Severity.

### 4. Backward compatibility

Existing warning output without a `code` field continues to work. New warnings include `code` and `fixCommand` alongside the legacy fields.

---

## Design Notes

### Warning code schema

Codes follow `WARN-<DOMAIN>-<NNN>`:

- `WARN-DOCS-001` — generated docs missing provenance metadata.
- `WARN-REPLAY-001` — replay divergence detected.
- `WARN-CAP-001` — required capability unavailable.

### Fix command contract

A `fixCommand` must be:

- Deterministic: running it twice produces the same result.
- Safe: it does not delete user data or bypass gates.
- Documented: the warning catalog explains what it does.

### `--provenance` flag

`synth docs generate --provenance` is implemented as a no-op semantic flag. The documentation engine already includes provenance metadata in generated files; the flag simply makes the intent explicit and can be used by scripts and runbooks.

---

## Acceptance Criteria

1. `synth docs generate --provenance` regenerates docs and exits 0.
2. Generated docs contain `sourceStateHash`, `computedAt`, and `schemaVersion` markers.
3. `synth verify` reports `WARN-DOCS-001` with `fixCommand: "synth docs generate --provenance"` when provenance is missing.
4. Existing documentation-projection tests still pass.
5. `npm run build` succeeds and targeted tests pass.

## Completion Evidence

- `src/verification/warning-catalog.ts` defines `WARN-DOCS-001` with message template, severity, and `fixCommand: "synth docs generate --provenance"`.
- `src/verification/checks.ts` `checkProjectionConsistency` emits `WARN-DOCS-001` with `code`, `fixCommand`, and `nextStep` when generated docs lack provenance metadata.
- `src/cli/synth.ts` `cmdDocsGenerate` accepts `--provenance`, regenerates projections, and includes `provenance: true` in the structured output.
- `tests/docs-provenance.test.js` verifies `--provenance` acceptance, provenance markers in generated docs, and `WARN-DOCS-001` reporting with `fixCommand`.
- Existing documentation-projection tests (`documentation-expedition.test.js`, `documentation-integrity.test.js`, `continuous-publication.test.js`) continue to pass.

---

## Out of Scope

- Auto-fixing replay divergence.
- Auto-fixing missing capabilities.
- Changing the set of generated documents.

---

## Governance

### Protected

- Public vocabulary.
- Verification semantics.

### Not included

- Event model changes.
- Replay logic changes.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-DOC-007.md`
- `docs/expeditions/EXP-CLI-002.md`
