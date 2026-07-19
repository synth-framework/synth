# EXP-BROWNFIELD-001 — Brownfield Bootstrap Hardening

> **First Contact expedition.** Improve SYNTH brownfield onboarding so that the correct transformation path is the lowest-friction path for operators and AI agents, based on evidence from the Carta Natal brownfield onboarding certification.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-19  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-PROGRAM-006 (Discovery Platform), EXP-DISCOVERY-005 (Brownfield Genesis Integration)

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

## Objective

Improve SYNTH brownfield onboarding so that the correct transformation path is the lowest-friction path for operators and AI agents.

The brownfield onboarding workflow succeeded functionally during certification:

- Baseline was captured before governance artifacts.
- Bootstrap created the manifest and data plane.
- Mission confidence was increased through evidence.
- Mission approval worked.
- Replay verification passed.
- Constraints were respected.
- No application code was touched.

The failures are **interface and lifecycle boundary failures**. This expedition hardens those boundaries so that future certifications validate conformance rather than expose missing transitions.

---

## Origin Evidence

Carta Natal brownfield onboarding certification.

Observed gaps:

- A mutating command (`synth docs generate`) was accidentally executed during discovery.
- The agent had to infer repository classification.
- Mission Studio proposals and ExecutionGate runtime entities were disconnected.
- CLI help routing was inconsistent.
- `synth doctor` mixed environment health and project health.
- Missing Git history was not elevated to a governance concern.

---

## Finding 1 — Discovery Is Not Guaranteed to Be Pure

Evidence: `synth docs generate` was executed during discovery and created artifacts. Recovery worked, but the workflow allowed an invalid state transition.

### Required change

Introduce a **Discovery Safety Model** that classifies every command by mutation risk:

```text
READ_ONLY     → safe during discovery
PROPOSAL_ONLY → produces proposals, no state mutation
MUTATING      → modifies repository or governance state
```

Discovery mode must reject `MUTATING` operations.

Example:

```bash
synth discover
```

may produce:

```text
.synth/discovery/
    findings.json
    commands.jsonl
    evidence/
```

but must never produce:

```text
.synth/data/
```

---

## Finding 2 — Bootstrap Collapses Classification and Initialization

The current flow creates governance state immediately. Conceptually, it skips the explicit transformation from observation to classification to proposal.

### Required change

Make the brownfield intake explicit:

```text
Brownfield Intake
        ↓
Repository Classification
        ↓
Bootstrap Proposal
        ↓
Approval
        ↓
Governance Initialization
```

Introduce an **Agent Context Contract** artifact:

```text
.synth/context.json
```

Example:

```json
{
  "repositoryType": "brownfield-product",
  "phase": "architecture-discovery",
  "implementationState": "partial",
  "intent": "transform existing system under governance"
}
```

This context becomes the semantic attractor for every AI agent interacting with the project.

---

## Finding 3 — Mission Studio and Runtime Are Disconnected

Current state:

```text
Mission Studio
    creates
Mission / Expedition proposal

        X

ExecutionGate
    requires
runtime event
```

The operator discovered that `synth expedition create` does not produce something that `synth expedition start` can consume. The bridge script `.synth/scripts/commit-baseline.mjs` is evidence of a missing primitive.

### Required change

Introduce an explicit **Runtime Transition Contract**:

```text
Draft
  ↓ approve
Committed Intent
  ↓
Runtime Entity
  ↓
Executing
  ↓
Completed
```

Possible CLI:

```bash
synth expedition commit --proposal-id <id>
synth expedition start --id <id>
```

The transition from approved proposal to runtime entity must be deterministic and event-backed.

---

## Finding 4 — CLI Help Routing Needs Improvement

Observed: `synth bootstrap --help` and `synth adapter --help` returned generic help.

### Required change

Every command namespace must own its help.

Expected:

```bash
synth bootstrap --help
# Usage:
#  synth bootstrap [options]
# Options:
#  --name
#  --approve
#  --dry-run
```

---

## Finding 5 — Doctor Mixes Environment Health and Project Health

Observed: `distIntegrity: false` came from the global CLI installation, not the project.

### Required change

Split `synth doctor` output into:

```text
Runtime Health
  ✓ binary valid
  ✓ version compatible

Project Health
  ✓ manifest valid
  ✓ replay valid
  ✓ event chain valid
```

Environment signals and project signals must not be conflated.

---

## Finding 6 — Missing Git Should Be Classified

The agent correctly noted "No git repository present," but SYNTH did not elevate that into a governance concern.

### Required change

Brownfield intake should classify source history:

```text
Source History:
  AVAILABLE
  MISSING
  EXTERNAL
  UNKNOWN
```

Replayability of SYNTH state and replayability of source history are different concerns. Both must be explicit.

---

## Deliverables

### 1. Brownfield Bootstrap Specification

A normative document (`docs/guides/brownfield-bootstrap-specification.md`) defining:

```text
Discover
  ↓
Classify
  ↓
Propose
  ↓
Approve
  ↓
Initialize
  ↓
Verify
```

with explicit inputs, outputs, mutation guarantees, and approval boundaries for each phase.

### 2. Discovery Safety Model

Command mutation classification and enforcement during discovery.

### 3. Runtime Transition Contract

Mission/Expedition lifecycle with explicit `Draft → Approved → Committed → Executing → Completed` states.

### 4. Agent Context Contract

`.synth/context.json` schema and generation rules.

### 5. CLI UX Certification

Tests verifying:

- Every command `--help` works.
- Every invalid state gives an explanation.
- Every mutation requires approval.

### 6. Brownfield Certification Test Suite

Final acceptance: a clean repository allows an agent to execute:

```bash
discover
proposal
approval
bootstrap
mission
expedition
verify
```

without inventing missing workflow steps.

---

## Goals

This expedition shall:

- Define the Brownfield Bootstrap Specification.
- Implement the Discovery Safety Model with command mutation classification.
- Introduce the Runtime Transition Contract for Mission/Expedition lifecycle.
- Define and generate the Agent Context Contract artifact.
- Improve CLI help routing for all namespaces.
- Split `synth doctor` into Runtime Health and Project Health sections.
- Classify source history availability during brownfield intake.
- Add the Brownfield Certification Test Suite.
- Ensure `npm run govern` passes.

---

## Non-Goals

This expedition shall not:

- Redesign the core brownfield workflow.
- Modify the Discovery compiler architecture.
- Modify Protected Assets.
- Change the Genesis event model.
- Build full IDE, MCP, or Web client integrations.

---

## Execution Constraints

During execution, the following constraints apply:

1. **Do not modify existing application behavior.** Harden interfaces and boundaries; do not change what SYNTH already does correctly.
2. **Do not change public SYNTH vocabulary without a separate proposal.** Mission, Expedition, Evidence, Plan, Event, State, and Replay remain stable.
3. **Do not introduce new lifecycle states without updating replay contracts.** Any new state must be replayable and event-backed.
4. **Preserve backward compatibility with existing `.synth` event logs.** Existing governed repositories must continue to replay correctly.
5. **Every behavior change requires evidence and certification coverage.** Each hardening change must be testable through the Brownfield Certification Test Suite.

---

## Acceptance Criteria

A successful expedition:

- [ ] Brownfield Bootstrap Specification is published.
- [ ] Discovery Safety Model rejects mutating commands during discovery.
- [ ] Runtime Transition Contract defines `Draft → Approved → Committed → Executing → Completed`.
- [ ] Agent Context Contract (`.synth/context.json`) is generated during classification.
- [ ] Every command namespace provides its own `--help` output.
- [ ] `synth doctor` separates Runtime Health from Project Health.
- [ ] Source history is classified as `AVAILABLE`, `MISSING`, `EXTERNAL`, or `UNKNOWN`.
- [ ] Brownfield Certification Test Suite passes on a clean repository.
- [ ] Existing `tests/brownfield-validation.test.js` passes without regression.
- [ ] `npm run build` passes.
- [ ] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **Certification exposes boundary failures; expeditions harden boundaries.**

> **Discovery is read-only. Bootstrap is mutating. The boundary is explicit.**

> **Proposals and runtime entities are connected by a committed transition.**

> **Agent context is a first-class artifact, not an inferred assumption.**

---

## Expected Outcome

After completion:

- Brownfield onboarding follows a hardened, self-guiding workflow.
- Agents no longer need to invent classification, transition, or approval steps.
- Discovery cannot accidentally mutate repository or governance state.
- Mission/Expedition lifecycle has explicit runtime transitions.
- `synth doctor`, `synth bootstrap --help`, and source-history classification reduce operator/agent ambiguity.
- Future brownfield certifications validate conformance to a defined specification.

---

## Governance

### Protected

- Brownfield Bootstrap Specification
- Discovery Safety Model
- Runtime Transition Contract
- Agent Context Contract schema

### Not included

- Discovery compiler architecture changes
- Genesis event model changes
- Full IDE/MCP/Web client implementations

---

## Related Documents

- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-005 — Brownfield Genesis Integration](EXP-DISCOVERY-005.md)
- [EXP-DISCOVERY-007 — IDE / MCP / Web Consumers](EXP-DISCOVERY-007.md)
