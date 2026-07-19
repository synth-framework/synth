> This expedition is part of **EXP-PROGRAM-026 — AI Agent Interoperability**.

# EXP-AI-007 — Agent Certification

> **Certification expedition.** Create deterministic test suites that validate AI agent compliance with the Genesis Protocol and SYNTH governance contracts.

**Status:** Completed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-026 — AI Agent Interoperability  
**Depends On:** EXP-AI-001 (Genesis Protocol), EXP-AI-002 (Agent Skill Catalog), EXP-AI-005 (Interoperability SDK)  
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

## Objective

Provide a certification framework that proves an agent can correctly participate in SYNTH workflows. Certification uses only public CLI commands and documented artifacts; it never inspects agent internals.

---

## Origin Evidence

Without certification, "SYNTH-compliant" is meaningless. Operators need an objective way to know whether an agent will respect governance boundaries, produce deterministic artifacts, and recover correctly from drift.

---

## Required Change

### 1.1 Certification levels

```text
Level 1 — Protocol Compliance
    ↓
Level 2 — Governance Compliance
    ↓
Level 3 — Replay Determinism
    ↓
Level 4 — Discovery Quality
    ↓
Level 5 — Multi-Agent Coordination
```

### 1.2 Test scenarios

- **Repository detection:** Agent identifies a SYNTH repository from `.synth/ai/` metadata.
- **Lifecycle understanding:** Agent determines current phase and next valid action.
- **Discovery execution:** Agent produces a deterministic Discovery artifact from input.
- **Approval respect:** Agent does not mutate state without required approval.
- **Replay consumption:** Agent reconstructs previous decisions from replay.
- **Recovery:** Agent uses `synth repair replay` to recover from drift.
- **Conflict handling:** Agent escalates conflicts instead of overwriting artifacts.

### 1.3 Certification runner

A command such as:

```bash
synth certify agent --agent <descriptor>
```

prepares scenarios, executes them, captures evidence, and produces a certification report.

### 1.4 Evidence model

Each certification produces:

```text
Scenario
Failure Injected (if any)
Observed Behavior
Expected Behavior
Replay Verification
Recovery Verification
Verdict
Evidence
```

---

## Deliverables

1. **Agent Certification Framework** document under `docs/reference/agent-certification.md`.
2. **Certification scenario catalog** covering all levels.
3. **Certification runner** implementation.
4. **Reference certified agent** example.
5. **Certification matrix** showing coverage across capabilities.

---

## Acceptance Criteria

- Certification uses only public CLI commands and documented artifacts.
- Every scenario has a deterministic expected outcome.
- The certification report is itself a replayable governance artifact.
- A certified agent is proven to respect approval boundaries and mutation policies.

---

## Out of Scope

- Genesis Protocol specification (EXP-AI-001).
- Repository metadata schema (EXP-AI-003).
- Multi-agent coordination protocol details (EXP-AI-006).

---

## Success Criteria

The expedition succeeds when an operator can run a single command to certify that an agent correctly participates in SYNTH workflows.
