# EXP-INSTALL-012 — First-Run / Installer Experience Validation

> **Release Candidate expedition.** Validate that a third party can install, initialize, discover, and start a governed mission within minutes.

**Status:** Proposed  
**Kind:** Release Candidate Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-038 — Release Candidate  
**Phase:** D — Release Candidate  
**Authority:** Synth Architectural Constitution, Platform Readiness Report 2026-07-25  
**Depends On:** EXP-CLI-001  
**Blocks:** Release Certification

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

## Thesis

> **The product is not the repository. The product is the first five minutes.**

A stable architecture and clean CLI do not matter if a new operator cannot become productive immediately. This expedition exercises the complete first-run journey as an end-to-end validation, treating the installer experience as a first-class release requirement.

---

## First-Run Journey

```text
Install
  ↓
synth --version
  ↓
synth doctor
  ↓
synth init --name "My Project"
  ↓
synth discover
  ↓
synth mission create --subject ... --purpose ...
  ↓
synth mission approve --draft-id ...
  ↓
First governed mission is executing
```

---

## Findings Addressed

| ID | Finding | Severity |
|----|---------|----------|
| I1 | No end-to-end validation of the bootstrap → first mission journey | Critical |
| I2 | `synth doctor` output is not machine-discriminable | High |
| I3 | `synth init` evidence store may lack required write tokens | High |
| I4 | Discovery mode safety model not exercised against real commands | High |
| I5 | First-run error messages do not guide the operator to the next step | Medium |

---

## Deliverables

1. **First-run test** — Automated script that performs the complete journey in a clean temporary directory and asserts each step succeeds.
2. **`synth doctor` JSON contract** — Structured output with `status`, `checks`, and `recommendations` fields.
3. **Discovery-mode validation** — Proof that `synth discover` rejects mutating commands and reports classification correctly.
4. **Error guidance** — First-run errors include the required next action.
5. **Documentation** — A one-page `docs/getting-started/first-five-minutes.md` guide.

---

## Acceptance Criteria

1. A clean environment can run the full first-run journey without human intervention.
2. `synth doctor` returns JSON with explicit `ok`/`warning`/`error` per check.
3. `synth init` produces a valid `.synth/manifest.json` and required data directories.
4. `synth discover` classifies the current directory and rejects mutating intents.
5. A mission can be created and approved through the CLI using structured commands.
6. The journey completes with a governed mission in `approved` or `executing` state.
7. All existing tests pass.

---

## Out of Scope

- New installation channels (npm publishing, Homebrew, etc.) — see Program 029.
- IDE/MCP/Web integrations.
- Operator optimization or task orchestration.

---

## Relationship to Other Work

- **EXP-CLI-001** — Depends on structured CLI output and unified error handling.
- **EXP-PROGRAM-042 — Release Certification** — This expedition provides evidence for the Operator / CLI Certification and Release Readiness Report.
- **EXP-PROGRAM-019 — Universal Initialization** — Provides the foundational `synth init` capability being validated here.

---

## Definition of Done

- [ ] Automated first-run test passes in a clean temporary directory.
- [ ] `synth doctor` JSON contract is documented and tested.
- [ ] Discovery-mode safety is validated for the first-run command set.
- [ ] `docs/getting-started/first-five-minutes.md` is published.
- [ ] Evidence is recorded for Release Certification.
