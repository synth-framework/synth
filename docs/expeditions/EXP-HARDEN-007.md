# EXP-HARDEN-007 — Observability

**Status:** Completed and accepted
**Kind:** Implementation Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-010 — Constitutional Hardening Program  
**Depends On:** EXP-HARDEN-006  
**Blocks:** none

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Provide lineage, visualization, and diagnostic tooling so every defect discovered during Program 010 can be explained by replay.

---

## Motivation

The forensic analysis of EXP-FIRSTCONTACT-003 required manual inspection of source code and event logs. Future investigations should be supported by tooling that reveals aggregate lineage, snapshot provenance, and replay diagnostics without code archaeology.

---

## Deliverables

1. **Aggregate lineage visualization**
   - Display the tree from Project → Mission → Expedition → Objective → Work Item.

2. **Proposal lineage**
   - Show how a proposal traces back to observations and evidence.

3. **Snapshot lineage**
   - Show snapshot version history and parent relationships.

4. **Graph visualization**
   - Render the aggregate graph for inspection.

5. **Relationship diagnostics**
   - Report broken or missing parent references.

6. **Replay diagnostics**
   - Show which events contributed to which state fields.

7. **Validation dashboards**
   - Summarize the status of all hardening validations.

---

## Acceptance

A developer can run a single command to inspect the aggregate graph, snapshot lineage, and replay diagnostics for any example or project.

---

## Phases

### Phase 1 — Design CLI outputs

Define JSON and human-readable output formats.

### Phase 2 — Implement lineage commands

Add commands such as `synth explain lineage` or `synth explain graph`.

### Phase 3 — Implement diagnostics

Add commands for relationship and replay diagnostics.

### Phase 4 — Documentation

Document the observability commands for operators and architects.

---

## Risks

| Risk | Mitigation |
|---|---|
| Output becomes too verbose | Support `--json` and `--summary` modes |
| Tooling depends on internal structures | Keep outputs stable and versioned |
| Scope creep | Focus on read-only diagnostics, not new UIs |

---

## Definition of Done

- [x] CLI output formats designed.
- [x] Aggregate lineage command implemented.
- [x] Proposal lineage command implemented.
- [x] Snapshot lineage command implemented.
- [x] Graph visualization command implemented.
- [x] Relationship diagnostics implemented.
- [x] Replay diagnostics implemented.
- [x] Documentation updated.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Extend `synth explain` with new subcommands.
2. Add diagnostic modules in `src/core/` or `src/cli/`.
3. Add tests.
4. Document in operator and developer guides.

---

## Completion Notes

Completed via PR (see branch `feat/exp-harden-007`).

**Phase 1 — Output formats.** Human-readable default, `--json` for versioned machine output (`kind` + `version: 1` per command), `--summary` for compact views. Exit-code contract: exit 0 when inspection completes (findings are data, matching the existing `explain replay` behavior); exit 1 for unknown subcommand, malformed `--log`, or snapshot-certification failure (mirroring `synth mission snapshot`).

**Phase 2 — Lineage commands.** `synth explain lineage` (Project → Mission → Expedition → Objective → Work Item tree with broken/missing parents inline), `synth explain proposals` (proposal → observations → evidence, sourced from the persisted snapshot store; graceful "no snapshots persisted" note when absent), `synth explain snapshots` (version history + parent chains via `getSnapshotLineage`, per-version certification status from the HARDEN-002 store), `synth explain graph` (aggregate graph rendering with per-node status, per-edge resolution, per-kind rollup).

**Phase 3 — Diagnostics.** `synth explain diagnostics`: relationship diagnostics with a per-kind violation rollup (absorbs the EXP-HARDEN-004 deferred item) plus replay attribution from the new pure module `src/core/replay-attribution.ts` — a single ordered pass over the log with a touch table mirroring `applyEvent`'s exact payload extraction, recording per-aggregate `createdBy`/`lastWrittenBy`/`writeCount` and unattributed-event counts. `synth explain status`: the validation dashboard — replay verdict, graph-invariant PASS/NOT-EVENT-PROVABLE counts, snapshot certification, overall `pass`/`warn`/`fail`.

**Single-command acceptance.** `synth explain all [--log <path>]` reports aggregate graph, snapshot lineage, and replay diagnostics together with a top-level verdict. `--log` (same semantics as `verify-replay.js --log`; state/checkpoint/snapshot paths derive from the log's directory) makes any example or project inspectable. Verified on the committed first-contact archive: 32 events, verdict `warn`, violation rollup exactly `{broken-parent-reference: 12, orphan-aggregate: 12, broken-navigation: 12}` — the known 36-violation profile. The repo's own log shows the pinned 206-violation profile.

**Phase 4 — Documentation.** New `docs/operator/15-observability.md` (operator-guide conventions, public vocabulary), reading-order row in `docs/operator/README.md`, one bullet in `README.md`, one command-table row in `AGENTS.md`.

**Validation.** Build + typecheck pass; new suite 25/25 (archive 36-violation pin, tampered-snapshot exit 1, read-only proof — tmpdir tree sha256 identical after 16 CLI spawns); replay-graph-integrity 19/19; graph-integrity 15/15; validation-expansion 18/18; synth 113/113; synth-cli, public-vocabulary-audit, documentation-integrity, bypass audit, verify-replay, check-links, website sync all pass. `data/event-log.jsonl` sha256 byte-identical before/after; no files created under `data/`. Full governance pipeline runs via the CI `proof` check on the PR.

**Deferred findings (PROGRAM-010 report candidates).**

1. `synth explain replay` reports `status: "error"` on inconsistency but exits 0 (pre-existing CLI convention, preserved deliberately); a `--strict` flag for hard exit codes from `explain status` verdicts is a future additive expedition.
2. Bootstrap emits its 13-step INFO log to stderr on every explain invocation (pre-existing; stdout stays clean) — a `--quiet` bootstrap would speed read-only tooling.
3. Canonical `WORK_ITEM_CREATED` payloads still carry no objective edge (the documented `not-event-provable` gap from EXP-HARDEN-005); lineage lists canonical work items flat with that note — awaiting the ADR decision.
