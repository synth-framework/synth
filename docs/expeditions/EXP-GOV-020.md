# EXP-GOV-020 — Certification Profiles

**Status:** Completed and accepted  
**Kind:** Product Expedition  
**Program:** EXP-PROGRAM-030 — Intelligent Governance Orchestration  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Completed In:** PR #205

---

## Thesis

> **Different promotion contexts require different validation scope: local feedback, merge confidence, main certification, and release certification.**

This expedition introduces certification profiles that map context to required validator classes. A profile does not change governance guarantees; it changes which validators must execute for the context.

---

## Acceptance Criteria

- The following profiles are defined:
  - `local-fast` — operator feedback, skips heavy integration suites when safe.
  - `pull-request` — merge confidence, runs all affected validators.
  - `main-branch` — repository certification, runs full validation.
  - `release` — production certification, runs complete certification including proofs.
- Profiles are selectable via `--profile <name>`.
- A profile expands, never reduces, the validators required for safety.
- Profiles are deterministic and versioned.

---

## Artifacts

- `scripts/governance/profiles.js` — profile definitions and resolution.
- `src/cli/synth.ts` — `--profile` support for `synth govern` and `synth validate`.
- `scripts/govern-profiler.js` — `--profile` support.
- `tests/governance-orchestration.test.js` — profile tests.

---

## Relationship

- Builds on `EXP-GOV-015 Governance Classes` and `EXP-GOV-016 Validation Planner`.
- Feeds `EXP-GOV-019 CI Orchestration`.
