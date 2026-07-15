# EXP-HARDEN-007 — Observability

**Status:** Proposed  
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

- [ ] CLI output formats designed.
- [ ] Aggregate lineage command implemented.
- [ ] Proposal lineage command implemented.
- [ ] Snapshot lineage command implemented.
- [ ] Graph visualization command implemented.
- [ ] Relationship diagnostics implemented.
- [ ] Replay diagnostics implemented.
- [ ] Documentation updated.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Extend `synth explain` with new subcommands.
2. Add diagnostic modules in `src/core/` or `src/cli/`.
3. Add tests.
4. Document in operator and developer guides.

---

## Completion Notes

Pending.
