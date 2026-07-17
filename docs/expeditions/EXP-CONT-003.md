# EXP-CONT-003 — Regression Journey

**Status:** Draft  
**Kind:** Certification Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-013 — Cognitive Continuity  
**Depends On:** EXP-PROGRAM-011 (Operator Trust & CLI Integrity), EXP-PROGRAM-012 (Runtime Self-Description), EXP-CONT-001 (Resume Briefing)  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (full TaskPRO chronology)

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

Re-run the exact TaskPRO first-contact scenario on the hardened build and assert that every major failure mode discovered in the field is now prevented or paved. The Regression Journey is the permanent, automated proof that SYNTH can survive an independent reasoning system arriving with zero prior context.

---

## Motivation

The TaskPRO field experiment was the most realistic first-contact test SYNTH has undergone. It exposed seven distinct failure modes:

| ID | Finding | Program that addresses it |
|---|---|---|
| N1 | Govern recursion → hang → vacuous pass | EXP-PROGRAM-011, EXP-TRUST-001 |
| N2 | Bootstrap unpaved roads and silent failures | EXP-PROGRAM-011, EXP-TRUST-002 / 003 |
| N3 | Confidence could be forged because it was not grounded in evidence | EXP-PROGRAM-011, EXP-TRUST-004 |
| N4 | Docs extraction silently produced zero concepts | EXP-PROGRAM-012, EXP-DISC-002 |
| N5 | Status was counts-only; adapter introspection missing; noisy JSON | EXP-PROGRAM-012, EXP-DISC-001 / 003 / 004 |
| N6 | No integrity check of installed runtime | EXP-PROGRAM-012, EXP-DISC-005 |
| N8 | Session loss → intent reconstruction from priors → source-code archaeology | EXP-PROGRAM-013, EXP-CONT-001 / 002 / 003 |

A fix that cannot be re-run under field-like conditions is not proven. This expedition encodes the TaskPRO chronology as an automated regression suite so the same scenario can never regress silently.

---

## Scope

```text
Create disposable project with TaskPRO-like shape:
  - docs/ containing knowledge files
  - no package.json initially
  - no .synth/ initially

Step 1 — Agent arrives cold
  Prompt: "Initialize this as a SYNTH project."
  Assert:
    - synth init succeeds
    - synth explain identity reports kind/phase
    - synth status points to mission creation

Step 2 — Mission creation
  Prompt: "Create a mission to build a specification from this knowledge."
  Assert:
    - synth mission create succeeds
    - draft exists
    - synth explain resume reports the mission draft

Step 3 — Mission approval
  Prompt: "Approve the mission if confidence is sufficient."
  Assert:
    - approval succeeds or rejects with a paved path
    - decision is persisted in data/decisions.jsonl
    - synth explain resume reports the approval

Step 4 — Expedition creation
  Prompt: "Create an expedition to extract and classify the knowledge."
  Assert:
    - synth expedition create succeeds
    - state reflects the new expedition
    - synth status points to next action

Step 5 — Simulated interruption
  Kill process and drop context.
  Assert:
    - synth explain resume reconstructs mission, approval, expedition, and next action.

Step 6 — Continuation
  Prompt: "Continue the expedition."
  Assert:
    - no recursion
    - no source-code inspection required
    - CLI commands alone provide enough context

Step 7 — Completion
  Mark expedition complete.
  Assert:
    - state is consistent
    - graph integrity proof passes
    - replay proof passes
    - no forged confidence accepted
```

In scope:

- A scripted regression harness that reproduces the TaskPRO scenario deterministically.
- Assertions for each finding N1, N2, N3, N4, N5, N6, N8.
- A synthetic "agent" driver that issues only public CLI commands and parses JSON responses.
- A report comparing the original field outcome to the hardened outcome.

Out of scope:

- Running a real large language model (the harness simulates the agent deterministically).
- Testing every possible repository shape (this is the canonical regression, not an exhaustive matrix).
- Modifying constitutional architecture.

---

## Deliverables

1. **Regression harness** (`scripts/taskpro-regression.js`)
   - Sets up a disposable project matching the TaskPRO starting shape.
   - Drives the scenario step by step using only public CLI commands.
   - Asserts each field finding is prevented or paved.
   - Produces a JSON pass/fail report with evidence.

2. **Agent simulation module** (`scripts/taskpro-regression/agent-driver.js`)
   - Reads CLI JSON output.
   - Decides the next command based only on public vocabulary and the current briefing.
   - Fails the test if it must read source files or call internal APIs.

3. **Assertion matrix** (encoded in the harness)
   - N1: a cyclic govern script is refused in under 10 seconds.
   - N2: every CLI rejection includes a paved-road remediation message.
   - N3: a forged confidence value is rejected by decision-log verification.
   - N4: zero-concept docs extraction emits a loud warning.
   - N5: `synth status` returns names, states, and next actions; `synth adapter info` returns metadata; `--json` output is clean.
   - N6: `synth doctor` verifies dist hashes.
   - N8: after a kill-at-checkpoint, `synth explain resume` reconstructs intent correctly.

4. **CI integration**
   - New npm script: `test:taskpro-regression`.
   - Runs as a required check on PRs that touch CLI, state projection, or trust code.

---

## Acceptance

```textnTaskPRO scenario replayed on hardened build
        ↓
   All assertions pass:
     - no recursion
     - rejection path executable
     - approval persists
     - forgery rejected
     - status / explain answer without source reading
     - resume correct after interruption
        ↓
   Regression report written.
```

Specifically:

- The harness completes without human intervention.
- No assertion in the matrix fails.
- The report documents the original field finding and the hardened outcome for each N.
- The regression runs in CI and passes before PROGRAM-013 is accepted.

---

## Phases

### Phase 1 — Encode the scenario

Translate the TaskPRO chronology into discrete steps, prompts, and expected CLI responses.

### Phase 2 — Build the agent driver

Implement a deterministic agent that uses only public CLI commands and structured JSON output.

### Phase 3 — Implement assertions

Add one assertion per field finding, with explicit failure messages.

### Phase 4 — Run and tune

Run the regression against the current build. Fix any failures that are implementation defects, not harness defects.

### Phase 5 — CI wiring and acceptance

Add the npm script, wire into CI, and request acceptance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Harness is too brittle because it keys on exact strings | Key on structured JSON fields; use tolerant matching for human-readable phrases |
| Scenario is too long for CI | Keep the fixture minimal; the scenario is about sequence, not volume |
| A real LLM would behave differently | The harness proves the *platform* behavior; LLM-specific studies remain a separate concern |
| Hardened code changes before the regression lands | Run the regression immediately after PROGRAM-011 and PROGRAM-012 acceptance; iterate |
| Regression passes vacuously | Each assertion must fail against the pre-hardened code; verify by temporarily reverting one guard |

---

## Definition of Done

- [ ] `scripts/taskpro-regression.js` encodes the full TaskPRO scenario.
- [ ] Agent driver uses only public CLI commands and JSON output.
- [ ] Assertion matrix covers N1, N2, N3, N4, N5, N6, and N8.
- [ ] Regression passes against the hardened build.
- [ ] Each assertion is validated against the original failure mode.
- [ ] `test:taskpro-regression` wired into CI.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Translate the TaskPRO chronology into discrete steps.
2. Build the deterministic agent driver.
3. Implement per-finding assertions.
4. Run, debug, and verify against pre-hardened failure modes.
5. Wire into CI and request acceptance.

---

## Completion Notes

*To be filled after implementation and acceptance.*
