# EXP-INSTALL-012 — First Operator Experience Certification

> **Release Candidate expedition.** Certify that a first-time operator can successfully install, initialize, understand, and execute their first governed mission without prior repository knowledge.

---

## Evidence

| Phase | Artifact | Result |
|---|---|---|
| Phase 1 — Installation | `tests/first-operator-experience.test.js` | ✅ `synth --version` and `synth doctor` produce structured JSON with nextSteps |
| Phase 2 — First Contact | `tests/first-operator-experience.test.js` | ✅ `synth init` creates manifest, data directory, and guides operator to mission create |
| Phase 3 — Brownfield Discovery | `tests/first-operator-experience.test.js` | ✅ `synth discover` is read-only and classifies empty repos as greenfield |
| Phase 4 — First Mission | `tests/first-operator-experience.test.js` | ✅ mission create → alignment prepare → evidence add → approve reaches approved state |
| Phase 5 — Recovery | `tests/first-operator-experience.test.js` | ✅ missing flags, missing alignment contract, invalid draft, and uninitialized doctor all return guided errors |
| Operator Guide | `docs/getting-started/first-five-minutes.md` | ✅ published |
| Test Automation | `package.json` | ✅ `test:first-operator-experience` added to scripts and `test:all` |

**Test result:** 70 passed, 0 failed.

**Status:** Completed  
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

## Mission

> **The product is not the repository. The product is the first five minutes.**

A stable architecture and clean CLI do not matter if a new operator cannot become productive immediately. This expedition certifies the complete first-run journey as an end-to-end validation, treating the operator experience as a first-class release requirement.

The overarching success criterion is:

> **A technically competent developer with no prior SYNTH knowledge can complete the entire first-run workflow from installation through a successfully governed mission without requiring undocumented steps or repository-specific knowledge.**

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

## Scope

This expedition is organized into five certification phases. Each phase produces evidence that Program 042 — Release Certification can consume directly.

### Phase 1 — Installation

Verify that a clean machine reaches a healthy environment without manual intervention.

* npm install
* binary resolution
* dependency validation
* Node version validation
* `synth doctor`

Acceptance: `synth doctor` reports a healthy environment with structured, machine-discriminable output.

---

### Phase 2 — First Contact

The operator should immediately understand what SYNTH is, what repository they're in, and what to do next.

Every first-run message should reduce uncertainty.

Acceptance: A first-time user knows the next command without reading repository internals.

---

### Phase 3 — Brownfield Discovery

Exercise `synth discover` in a fresh repository.

Verify:

* read-only behavior
* clear findings
* understandable output
* safe execution

Acceptance: Discovery is informative without being intimidating.

---

### Phase 4 — First Mission

A new operator should be able to create a Mission, create an Expedition, execute, govern, and complete it without consulting source code.

```text
Create Mission
  ↓
Create Expedition
  ↓
Execute
  ↓
Govern
  ↓
Complete
```

Acceptance: The journey completes with a governed mission in `approved` or `executing` state through CLI commands only.

---

### Phase 5 — Recovery

Don't just test the happy path. Intentionally trigger validation failures, governance failures, missing prerequisites, and malformed commands.

The question is not *"does it fail?"* The question is:

> **Does it teach the operator how to recover?**

Acceptance: Every failure mode produces a structured error with a clear next action.

---

## Deliverables

1. **Automated first-run test** — Performs the complete journey in a clean temporary directory and asserts each step succeeds.
2. **`synth doctor` JSON contract** — Structured output with `status`, `checks`, and `recommendations` fields.
3. **Discovery-mode validation** — Proof that `synth discover` rejects mutating commands and reports classification correctly.
4. **Error guidance** — First-run errors include the required next action.
5. **Operator onboarding guide** — `docs/getting-started/first-five-minutes.md`.
6. **Phase evidence transcripts** — Command transcripts, expected output, observed output, elapsed time, and recovery notes for each phase.

---

## Acceptance Criteria

1. A clean environment can run the full first-run journey without human intervention.
2. `synth doctor` returns JSON with explicit `ok`/`warning`/`error` per check.
3. `synth init` produces a valid `.synth/manifest.json` and required data directories.
4. `synth discover` classifies the current directory and rejects mutating intents.
5. A mission can be created and approved through the CLI using structured commands.
6. The journey completes with a governed mission in `approved` or `executing` state.
7. Failure modes produce structured errors with recovery guidance.
8. All existing tests pass.

---

## Out of Scope

- New installation channels (npm publishing, Homebrew, etc.) — see Program 029.
- IDE/MCP/Web integrations.
- Operator optimization or task orchestration.
- Architectural changes beyond what is required to make the first-run journey succeed.

---

## Relationship to Other Work

- **EXP-CLI-001** — Depends on structured CLI output and unified error handling.
- **EXP-PROGRAM-042 — Release Certification** — This expedition produces evidence for the Operator / CLI Certification and Release Readiness Report.
- **EXP-PROGRAM-019 — Universal Initialization** — Provides the foundational `synth init` capability being validated here.

---

## Definition of Done

- [x] Phase 1 — Installation validation evidence recorded.
- [x] Phase 2 — First Contact messaging validated.
- [x] Phase 3 — Brownfield Discovery safety validated.
- [x] Phase 4 — First Mission end-to-end test passes in a clean temporary directory.
- [x] Phase 5 — Recovery path tests pass with guided error output.
- [x] `synth doctor` JSON contract is documented and tested.
- [x] Discovery-mode safety is validated for the first-run command set.
- [x] `docs/getting-started/first-five-minutes.md` is published.
- [x] Evidence is recorded for Release Certification.
