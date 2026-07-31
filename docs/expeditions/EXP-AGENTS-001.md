# EXP-AGENTS-001 — AGENTS.md Synchronization Command

> Provide a deterministic CLI command to regenerate the repository's AI operator contract (`AGENTS.md`) from its canonical source fragments.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, EXP-GUARD-001 (derived-state protection), TaskPRO onboarding retrospective  
**Depends On:** EXP-GUARD-001, EXP-GUARD-002  
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

`AGENTS.md` is a derived file — it is the AI operator contract for the repository — but today it is edited by hand. During the TaskPRO migration, an agent updated stale sections of `AGENTS.md` directly, violating the derived-state rule that EXP-GUARD-001 later formalized. This expedition adds `synth project AGENTS.md` so the root contract can be regenerated deterministically from:

1. A shared baseline template maintained in the SYNTH framework.
2. Per-directory `AGENTS.md` fragments that override or extend the baseline for their subtree.
3. Project metadata from `.synth/manifest.json` (project name, governance version, active mission).

The command is read-only with respect to governance state and only writes `AGENTS.md`, which is already in the derived-files catalog.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| A1 | `AGENTS.md` edited manually despite being derived | High | Proposed |
| A2 | No command to regenerate the AI operator contract | High | Proposed |
| A3 | Subdirectory agent contracts not merged into root contract | Medium | Proposed |

## Deliverables

### 1. `synth project AGENTS.md` command

```bash
synth project AGENTS.md [--check]
```

- Without `--check`: regenerates `./AGENTS.md` from baseline + fragments + manifest.
- With `--check`: exits with code 1 if `./AGENTS.md` is stale relative to the inputs; does not write.

### 2. Baseline template

A framework baseline is embedded in the CLI at `src/cli/agents-baseline.md` (or loaded from `docs/guides/agents/handbook.md` when available). It contains the generic AI operator contract language that applies to every SYNTH repository.

### 3. Fragment merge

The command discovers every `AGENTS.md` file under the project except the root, sorted by path for determinism. Each fragment is appended to the baseline under a source heading:

```markdown
## Source: packages/homepage-runtime/AGENTS.md

<fragment content>
```

Fragments allow sub-packages or sub-systems to add constraints without hand-editing the root contract.

### 4. Project metadata section

The generated `AGENTS.md` includes a footer block with:

- Project name from `.synth/manifest.json` or `package.json`.
- Governance version.
- `generatedAt` ISO timestamp.
- `generatedBy: synth project AGENTS.md`.

### 5. Derived-file guard compatibility

The command respects the derived-files catalog:

- It refuses to run if `AGENTS.md` is not listed as derived (defense in depth).
- It uses the public filesystem provider, so direct SDK writes to `AGENTS.md` are still blocked by EXP-GUARD-001.

### 6. Tests

- `tests/agents-md-sync.test.js` covering:
  - Baseline generation produces a non-empty `AGENTS.md`.
  - Fragments are merged in path order.
  - `--check` detects stale output.
  - Running the command twice produces deterministic output for identical inputs.

## Acceptance Criteria

1. `synth project AGENTS.md` regenerates `./AGENTS.md` from the framework baseline.
2. Subdirectory `AGENTS.md` fragments are merged deterministically.
3. Project metadata and generation provenance are embedded.
4. `synth project AGENTS.md --check` returns a non-zero exit code when the file is stale.
5. `npm run build` succeeds and targeted tests pass.

## Out of Scope

- Editing subdirectory fragments (they remain hand-authored source material).
- Web-based AGENTS.md editor.
- Automatic AGENTS.md regeneration on every `synth docs generate`.

## Governance

### Protected

- ExecutionGate as sole mutation authority for governance state.
- Derived-files catalog.

### Not included

- New constitutional rules.
- Event model changes.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GUARD-001.md`
- `docs/expeditions/EXP-GUARD-002.md`
- `docs/guides/agents/index.md`
