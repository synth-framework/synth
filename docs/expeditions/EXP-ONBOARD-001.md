# EXP-ONBOARD-001 — Guided First-Contact Command

> Replace the `synth bootstrap . --approve` black box with an explicit, step-by-step guided flow for greenfield and brownfield projects.

**Status:** Draft  
**Kind:** Governance Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, TaskPRO onboarding retrospective  
**Depends On:** EXP-GOV-024 (brownfield blockers fixed), EXP-CLI-001 (CLI consistency)  
**Blocks:** EXP-PROGRAM-043 Workstreams B, C, D

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

Real-world onboarding showed that agents cannot tell whether to run `synth bootstrap`, `synth alignment prepare`, or `synth mission create` first. Bootstrap currently auto-creates an alignment contract, resolves a divergence gate, and initializes the project without explaining any of those steps. This expedition adds a guided first-contact command that:

1. Detects greenfield vs. brownfield vs. legacy-Synth state.
2. Explains each stage before mutating the repo.
3. Lets the operator choose "archive old state" vs. "import old state."
4. Creates and approves the first mission automatically or interactively.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| O1 | Bootstrap is a black box | Critical | Fix planned |
| O2 | No clear first-command guidance | High | Fix planned |
| O3 | Legacy Synth state detection is manual | Medium | Fix planned |

---

## Deliverables

### 1. `synth first-contact` command

A new top-level command that walks through:

- Repository type detection (empty, existing project, legacy `.synth/` present).
- Explanation of what will happen at each stage.
- Choice to archive (`.synth → .synth_bk`) or attempt migration.
- Optional creation and approval of the baseline mission.

### 2. `--approve` and `--dry-run` flags

- `--dry-run` prints the plan without writing files.
- `--approve` skips interactive prompts and applies the recommended plan.

### 3. Clean JSON/human output

- Machine-readable by default.
- Diagnostic logs routed to stderr so stdout remains pure JSON.

---

## Acceptance Criteria

1. `synth first-contact --dry-run` returns a plan with no mutations.
2. `synth first-contact --approve` succeeds on an empty repo and produces a valid `.synth/` tree.
3. In a repo with an existing `.synth/`, the command detects legacy state and offers archive.
4. Each stage explains itself in the returned JSON (`stage`, `description`, `nextStep`).
5. `tests/first-operator-experience.test.js` passes with the new command.
6. `npm run build` succeeds and targeted tests pass.

---

## Out of Scope

- Importing legacy v1 expeditions as live v2 records (keep archive-only).
- Changing the bootstrap event model or event payloads.
- Generalizing beyond first-contact onboarding.

---

## Governance

### Protected

- Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Event model and replay semantics.

### Not included

- New runtime concepts.
- Changes to the constitutional baseline.

---

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GOV-024.md`
- `docs/expeditions/EXP-CLI-001.md`
