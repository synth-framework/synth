# EXP-CERT-001 — Failure Certification Framework

> **Certification expedition.** Establish a deterministic certification framework that validates SYNTH's behavior under mutation failures, interruptions, and recovery scenarios using only public operator workflows.

**Status:** Proposed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-BROWNFIELD-001 (Brownfield Bootstrap Hardening), EXP-RUNTIME-001 (Runtime Correctness and Recovery), EXP-CLI-001 (CLI UX and Diagnostics Hardening)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes (for certification DSL and runner contract)
```

---

## Objective

Make operator-facing resilience a first-class, certifiable property of SYNTH. The brownfield onboarding workflow is now deterministic under normal conditions; this framework proves that the same guarantees hold under abnormal conditions.

The expedition does not increase ordinary unit test coverage. It establishes a governed, replayable certification layer that any agent can execute to validate failure behavior and recovery paths.

---

## Origin Evidence

Recent certifications have moved from small sample projects to large, real-world brownfield repositories. The workflow is now discoverable, but recovery from failure still relies on operator ingenuity. For example:

- A mission could be approved without corresponding runtime events, requiring manual event-log repair.
- Operators had no supported command to reconcile runtime state with certified snapshots.
- There was no canonical taxonomy of failures or deterministic way to inject and verify them.

These gaps are not workflow-design gaps; they are resilience-certification gaps.

---

## Finding 1 — No Canonical Failure Taxonomy

### Observation

Failures are currently discovered ad hoc during certifications. There is no shared vocabulary for the classes of failures SYNTH should resist, which makes it impossible to track coverage or delegate scenario authoring to agents.

### Required Change

Define a canonical failure taxonomy:

```text
Lifecycle Failures
  - Draft creation
  - Approval
  - Commit
  - Execution
  - Completion

Persistence Failures
  - Partial writes
  - Interrupted writes
  - Missing artifacts
  - Corrupt artifacts

Replay Failures
  - Missing events
  - Invalid hashes
  - Event ordering
  - Unknown event types

Operator Failures
  - Invalid commands
  - Missing approvals
  - Concurrent operations
  - Interrupted execution

Environment Failures
  - Missing dependencies
  - Missing govern script
  - Corrupt installation
```

Every certification scenario must be classified against this taxonomy.

---

## Finding 2 — No Declarative Certification Format

### Observation

Certification scenarios are currently hand-authored scripts. This makes them inconsistent, hard to maintain, and hard for agents to generate or extend.

### Required Change

Introduce a declarative Certification DSL. Example:

```yaml
id: MF-002
name: Mission approval below confidence threshold

taxonomy:
  - lifecycle
  - approval

preconditions:
  - initialized project
  - mission draft exists

inject:
  - mission confidence = 0.67

expect:
  status:
    draft: true
    approved: false
  diagnostics:
    - approval blocked due to low confidence

verify:
  - synth verify
  - synth explain replay
```

The DSL separates intent (what failure is being tested) from execution (how the scenario is prepared and verified).

---

## Finding 3 — No Certification Runner

### Observation

There is no single command an operator or agent can run to execute the certification suite and receive a deterministic report.

### Required Change

Introduce a certification runner:

```bash
synth certify failures
```

or

```bash
synth certify --suite mutation
```

The runner shall:

- Prepare an isolated scenario workspace.
- Execute the scenario declaratively.
- Capture observed behavior.
- Verify invariants via public commands (`synth verify`, `synth explain replay`, etc.).
- Produce a structured certification report.
- Refuse to pass any scenario whose recovery requires internal implementation access.

---

## Finding 4 — Recovery Is Not Certified

### Observation

When certifications encounter failure, recovery often requires manual intervention such as editing JSON or recomputing hashes. There is no rule that recovery must use only public CLI commands.

### Required Change

Add a recovery phase to every failure scenario. The acceptance rule is:

> **Recovery must use only supported public CLI commands.**

If a scenario can only be recovered by:

- editing JSON,
- recomputing hashes,
- using internal scripts,
- inspecting runtime objects,

the certification fails. This rule forces SYNTH to expose supported recovery paths rather than relying on operator improvisation.

---

## Finding 5 — No Certification Evidence Model

### Observation

Certification results are currently scattered across test output and ad hoc logs. There is no standard evidence artifact that can be attached to governance proofs or reviewed later.

### Required Change

Every certification run must produce a structured evidence report:

```text
Scenario
Failure Injected
Observed Behavior
Expected Behavior
Replay Verification
Recovery Verification
Verdict
Evidence
```

These reports become replayable governance artifacts and may be stored in `proof/` or `data/certifications/`.

---

## Finding 6 — No Coverage Matrix

### Observation

It is difficult to see which capabilities have been certified for normal, failure, and recovery conditions. Gaps are only discovered by running certifications, not by inspecting a matrix.

### Required Change

Produce and maintain a certification matrix:

| Capability | Normal | Failure | Recovery |
| ---------- | ------ | ------- | -------- |
| Bootstrap  | ✅      | ☐       | ☐        |
| Mission    | ✅      | ☐       | ☐        |
| Expedition | ✅      | ☐       | ☐        |
| Replay     | ✅      | ☐       | ☐        |
| Discover   | ✅      | ☐       | ☐        |

The matrix is updated automatically as scenarios are added or executed. It makes resilience gaps visible at a glance.

---

## Deliverables

### 1. Failure Taxonomy Document

Publish `docs/reference/failure-taxonomy.md` defining the canonical failure classes and examples for each.

### 2. Certification DSL Specification

Publish `docs/reference/certification-dsl.md` with:

- Schema for scenario definitions
- Supported preconditions
- Supported injection primitives
- Expected outcome assertions
- Verification commands

### 3. Certification Runner

Implement `synth certify` (or equivalent) in `src/cli/synth.ts`:

- Load scenarios from `tests/certifications/` or `certifications/`.
- Prepare isolated workspaces.
- Execute scenarios deterministically.
- Run public verification commands.
- Generate reports.

### 4. Initial Failure Scenario Library

Seed the library with scenarios covering:

- Mission approval below confidence threshold
- Expedition creation referencing a non-existent mission
- Interrupted mission approval (snapshot persisted, events missing)
- Corrupt event-log hash chain
- Missing `govern` script
- Invalid CLI command during discovery
- Concurrent expedition creation attempts

### 5. Recovery Certification Rules

Document and enforce the rule that recovery must use only public CLI commands. Add a linter or runner check that fails scenarios violating this rule.

### 6. Certification Evidence Reports

Implement structured report generation in JSON and human-readable formats. Reports include scenario, injection, observed behavior, expected behavior, replay verification, recovery verification, verdict, and evidence paths.

### 7. Certification Matrix

Implement automatic matrix generation from the scenario library. The matrix is regenerated on every `synth certify` run and checked into `docs/certification-matrix.md`.

### 8. ADR — Certification Framework Contract

Produce `docs/adr/ADR-0XX-certification-framework.md` covering:

- Why a declarative framework is preferred over hand-written tests
- DSL design rationale
- Runner architecture
- Evidence model
- Relationship to unit tests and governance proofs

---

## Goals

This expedition shall:

- Define a canonical failure taxonomy.
- Design and document a declarative Certification DSL.
- Implement a `synth certify` runner that executes scenarios using only public workflows.
- Seed an initial library of failure and recovery scenarios.
- Enforce the rule that recovery uses only public CLI commands.
- Produce structured certification evidence reports.
- Generate and maintain a certification coverage matrix.
- Ensure `npm run build` and `npm run govern` pass.

---

## Non-Goals

This expedition shall not:

- Replace unit tests or integration tests.
- Redesign the brownfield workflow.
- Modify the Discovery compiler architecture.
- Modify the runtime event model (see EXP-RUNTIME-001).
- Change CLI diagnostics and messaging (see EXP-CLI-001).
- Allow certifications to depend on internal implementation details.
- Introduce new public concepts beyond the seven (Mission, Expedition, Evidence, Plan, Event, State, Replay).

---

## Execution Constraints

1. **Public-surface-only.** Certifications may only use public CLI commands, documented artifacts, replay outputs, and verification outputs.
2. **No manual implementation access.** A certification fails if recovery requires editing JSON, recomputing hashes, or inspecting runtime objects.
3. **Deterministic.** The same scenario on the same SYNTH version produces the same verdict and evidence.
4. **Replayable.** Certification reports must be reproducible from the scenario definition and the SYNTH version.
5. **Append evidence, don't rewrite it.** Certification artifacts are append-only; historical reports are preserved.

---

## Acceptance Criteria

A successful expedition:

- [ ] Failure taxonomy is published.
- [ ] Certification DSL is documented and parseable.
- [ ] `synth certify` runner executes scenarios and produces reports.
- [ ] Initial scenario library covers at least the seeded cases.
- [ ] Every scenario includes a recovery phase certified via public CLI commands.
- [ ] Structured evidence reports are produced for every run.
- [ ] Certification matrix is generated automatically.
- [ ] ADR is published and accepted.
- [ ] `npm run build` passes.
- [ ] `npm run govern` passes.

---

## Architectural Principles

> **Certifications validate product behavior, not implementation details.**

> **A failure without a certified recovery path is an unresolved defect.**

> **Agents generate scenarios; humans review invariants.**

> **Resilience is a measurable, governable property.**

---

## Expected Outcome

After completion:

- SYNTH has a canonical failure taxonomy shared across teams and agents.
- New failure scenarios can be added declaratively.
- Any agent can run `synth certify` to validate resilience.
- Recovery paths are part of the product surface, not operator improvisation.
- Certification evidence is attached to governance proofs.
- The certification matrix makes resilience gaps visible.
- Future capability additions must include failure and recovery certification.

---

## Governance

### Protected

- Failure Taxonomy
- Certification DSL
- Public-Surface-Only Rule
- Recovery Certification Rule
- Certification Evidence Model

### Not Included

- Brownfield bootstrap workflow redesign
- Discovery compiler changes
- Runtime event model changes
- CLI diagnostics changes
- New client integrations

---

## Related Documents

- [EXP-BROWNFIELD-001 — Brownfield Bootstrap Hardening](EXP-BROWNFIELD-001.md)
- [EXP-RUNTIME-001 — Runtime Correctness and Recovery](EXP-RUNTIME-001.md)
- [EXP-CLI-001 — CLI UX and Diagnostics Hardening](EXP-CLI-001.md)
- [EXP-CONT-001 — Resume Briefing](EXP-CONT-001.md)
- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
