# EXP-ENV-011 — AI Environment Planning

**Status:** Completed  
**Kind:** Constitutional Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-010  
**Blocks:** EXP-ENV-012

---

```yaml
Impact:
  Constitutional: Yes
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Enable AI agents to plan execution across environments using capability information rather than implicit assumptions.

---

## Motivation

AI agents need to know what an environment can do before they plan. This expedition exposes capability information in an agent-consumable form.

---

## Deliverables

1. **Agent-facing capability report**
2. **Planning prompts updated**
3. **AGENTS.md guidance**

---

## Acceptance

An AI agent can read the capability report and plan a Mission without assuming Git, npm, GitHub, or any specific environment.

---

## Definition of Done

- [x] Capability report format defined.
- [x] Planning prompts updated.
- [x] AGENTS.md references capability planning.
- [x] Tests pass.
- [x] ADR approved.
- [x] Expedition is accepted.

---

## Completion Notes

- **ADR:** [ADR-016 — AI Environment Planning](../adr/ADR-016-ai-environment-planning.md) (Accepted), including the Completeness Rule (every constitutional family appears; unsupported families are stated, never omitted) and the Planning Binding Rule (agents plan against the Capability Report, not assumptions).
- **Implementation:** `src/environment/capability-report.ts` — `buildCapabilityReport(evidence)` projects `synth-capability-report-v1` from discovery evidence (status/provider/confidence/reason per family, `unavailable` quick-scan list, assumptions, embedded planning guidance) and `renderCapabilityReportMarkdown(report)` renders the agent-consumable document. Exported via `src/environment/index.ts`.
- **Agent surface:** `scripts/generate-capability-report.js` (markdown stdout, `--json` for machine format).
- **Planning prompts updated:** `docs/guides/agents/prompts/create-mission.md` (capability report as step 0), `docs/guides/agents/prompts/generate-expeditions.md` (capability-scoped expeditions + safety rule), `docs/guides/agents/planning.md` (new Stage 0: Environment Discovery; planning rule 5; v1.1.0).
- **AGENTS.md:** new "Environment capability planning" section referencing the report and ADR-016.
- **Test coverage:** `tests/environment-capability-report.test.js` — 8 tests covering 12-family completeness, supported/unsupported entries, unavailable list, assumptions mapping, embedded guidance, determinism, and markdown rendering.
- **npm script:** `test:environment-capability-report`, included in `test:all`.
- Expedition accepted via PR #65.
