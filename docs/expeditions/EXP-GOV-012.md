# EXP-GOV-012 — Repository Impact Model

**Status:** Completed and accepted  
**Kind:** Architecture Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **SYNTH already classifies changed files into capabilities and protected assets, but it does not yet surface governance classes, artifact types, or promotion risk in a single impact model.**

This expedition extends the existing impact analyzer so the orchestration layer can answer:

- What governance classes are affected?
- What artifact types changed?
- What is the promotion risk?
- Which certification profiles apply?

---

## Acceptance Criteria

- The impact model reports affected governance classes.
- The impact model reports affected artifact types.
- The impact model assigns a promotion risk level.
- Protected Asset changes force high risk regardless of other signals.
- The model is deterministic: the same diff produces the same report.

---

## Artifacts

- `src/governance/impact-analyzer.ts` — extended with governance class and risk surfaces.
- `scripts/governance/orchestrator.js` — consumes the extended impact model.
- `tests/impact-analyzer.test.js` — verifies classification behavior.

---

## Relationship

- Builds on `src/governance/impact-analyzer.ts` from earlier governance work.
- Feeds `EXP-GOV-016 Validation Planner`.
