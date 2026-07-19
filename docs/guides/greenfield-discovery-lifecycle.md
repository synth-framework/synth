# Greenfield Discovery Lifecycle Specification

> **Normative reference for SYNTH greenfield onboarding.** Defines the canonical operator journey, CLI workflow, approval boundaries, mutation guarantees, expected artifacts, and certification criteria for turning an unstructured operator idea into an approved Mission before any project state is created.

**Version:** 1.0.0  
**Status:** Proposed  
**Governed by:** EXP-AIFC-001 — Discovery Lifecycle Specification  
**Program:** EXP-PROGRAM-022 — AI-Native First Contact

---

## 1. Scope

This specification applies when SYNTH is used to start a project from an operator idea rather than an existing repository.

A **greenfield idea** is any unstructured intent such as:

- "Let's build a space mission tracker."
- "Create me a markdown viewer in Python."
- "I need a small service that validates event schemas."

The specification does **not** apply to brownfield onboarding, which is governed by the [Brownfield Bootstrap Specification](brownfield-bootstrap-specification.md).

---

## 2. Core principle

> **Intent precedes materialization.**

Greenfield onboarding is a sequence of phases. Each phase has a single, well-defined responsibility. No phase may create repository state, governance artifacts, or code until the Discovery artifact has been approved and the Mission has been accepted.

---

## 3. Operator journey

The canonical greenfield operator journey has eight phases:

```text
Intake
   ↓
Intent Extraction
   ↓
Clarification
   ↓
Architecture Projection
   ↓
Capability Verification
   ↓
Discovery Approval
   ↓
Mission Materialization
   ↓
Expedition Proposal
```

### 3.1 Intake

**Question:** What does the operator want to build?

**Responsibility:** Capture the initial, unstructured operator idea.

**Inputs:**

- Plain-language description from the operator.
- Optional context (audience, constraints, technology preferences).

**Outputs:**

- Discovery transcript entry.
- Initial `DiscoveryArtifact` draft.

**Mutation guarantee:**

- No file modifications.
- No generated project artifacts.
- No event log entries.
- No governance state changes.

**Allowed commands:** `READ_ONLY` and `PROPOSAL_ONLY` only.

### 3.2 Intent Extraction

**Question:** What are the goals, audience, constraints, and success criteria?

**Responsibility:** Extract structured fields from the unstructured idea.

**Inputs:**

- Initial operator description.
- Discovery transcript.

**Outputs:**

- Structured `DiscoveryArtifact` fields:
  - `intent`
  - `audience`
  - `environment`
  - `capabilities`
  - `constraints`
  - `successCriteria`
- Confidence score per field.
- Identified unknowns.

**Mutation guarantee:**

- No repository or governance state changes.
- Updates only the in-memory or session-scoped Discovery artifact.

### 3.3 Clarification

**Question:** What is still ambiguous or missing?

**Responsibility:** Reduce uncertainty through targeted questions.

**Inputs:**

- `DiscoveryArtifact` with confidence scores.
- Minimum confidence threshold.

**Outputs:**

- Targeted clarification questions.
- Updated `DiscoveryArtifact`.
- Updated confidence scores.

**Mutation guarantee:**

- No repository or governance state changes.
- All questions and answers are recorded in the transcript.

**Termination conditions:**

- All required fields meet the confidence threshold.
- The operator explicitly accepts residual unknowns.
- No productive questions remain.

### 3.4 Architecture Projection

**Question:** What are the reasonable ways to build this?

**Responsibility:** Produce architecture candidates as read-only projections.

**Inputs:**

- Approved-clarification `DiscoveryArtifact`.

**Outputs:**

- One or more `architectureCandidates` entries, each with:
  - `name`
  - `description`
  - `rationale`
  - `tradeoffs`
  - `assumptions`
  - `recommended` flag
  - `confidence`

**Mutation guarantee:**

- Candidates are projections, not canonical state.
- No project files or governance state are created.

### 3.5 Capability Verification

**Question:** Can the selected architecture be realized in this environment?

**Responsibility:** Validate runtime, language, framework, and platform assumptions.

**Inputs:**

- Selected architecture candidate.
- Environment capability report.

**Outputs:**

- Capability verification report.
- Blocker list (`MISSING`, `DEGRADED`, `UNAVAILABLE`).

**Mutation guarantee:**

- No repository or governance state changes.
- No automatic installation of dependencies.

### 3.6 Discovery Approval

**Question:** Does the operator approve the Discovery artifact and selected architecture?

**Responsibility:** Capture explicit operator approval before any project state is created.

**Inputs:**

- Final `DiscoveryArtifact`.
- Selected architecture candidate.
- Capability verification report.

**Outputs:**

- Approved Discovery artifact.
- Approval event.

**Mutation guarantee:**

- No repository mutations except the approval record and Discovery artifact persistence.
- No `.synth/data/` initialization yet.

### 3.7 Mission Materialization

**Question:** How does the approved intent become a SYNTH Mission?

**Responsibility:** Initialize the repository, manifest, and Mission only after Discovery approval.

**Inputs:**

- Approved Discovery artifact.
- Selected architecture candidate.

**Outputs:**

- Initialized repository (if needed).
- `.synth/manifest.json`.
- `.synth/data/event-log.jsonl`.
- `.synth/data/canonical-state.json`.
- Generated Mission.

**Mutation guarantee:**

- Materialization occurs only after explicit Discovery approval.
- All mutations are event-backed and replayable.

### 3.8 Expedition Proposal

**Question:** What is the first work to do?

**Responsibility:** Generate initial Expedition proposals from the approved Mission.

**Inputs:**

- Materialized Mission.
- Approved Discovery artifact.

**Outputs:**

- Initial Expedition proposals.

**Mutation guarantee:**

- Proposals are advisory until approved and committed.
- No execution occurs.

---

## 4. Command safety classification

Every SYNTH command must declare a mutation risk class:

| Class | Definition | Allowed in Discovery? | Requires Approval? |
|---|---|---|---|
| `READ_ONLY` | Observes state without modification | Yes | No |
| `PROPOSAL_ONLY` | Generates proposals or reports; no state mutation | Yes | No |
| `POTENTIALLY_MUTATING` | May modify state depending on flags | No | Yes if mutating |
| `MUTATING` | Explicitly modifies repository or governance state | No | Yes |

### 4.1 Discovery enforcement

During the greenfield Discovery phases (Intake through Capability Verification), SYNTH must:

- Reject any `POTENTIALLY_MUTATING` or `MUTATING` command.
- Emit a clear error explaining the phase boundary.
- Suggest the correct next phase command.

Example:

```bash
$ synth first-contact materialize
Error: first-contact materialize is a MUTATING command and cannot run before Discovery approval.
Run 'synth first-contact approve' to approve the Discovery artifact first.
```

---

## 5. Discovery Artifact Contract

The Discovery artifact is the canonical output of greenfield onboarding. It is immutable once approved and replayable from its inputs and transcript.

### 5.1 Location before approval

Before Mission materialization, the artifact may be persisted in a session-scoped location such as:

```text
.synth/first-contact/
    discovery-artifact.json
    transcript.jsonl
```

If no repository exists, the operator may specify an output directory or use a temporary session store. The artifact must not be confused with project governance state.

### 5.2 Location after materialization

After Mission materialization, the approved artifact is copied into the governed project:

```text
.synth/
    manifest.json
    data/
        event-log.jsonl
    first-contact/
        discovery-artifact.json
        transcript.jsonl
```

### 5.3 Provenance

The artifact must record:

```text
id
sessionId
version
createdAt
approvedAt
artifactHash
derivedFrom
  — eventIds
  — sessionHash
```

---

## 6. Approval gates

Two explicit approvals are required:

1. **Discovery Approval** — the operator confirms the Discovery artifact and selected architecture.
2. **Mission Approval** — the operator confirms the generated Mission.

No materialization may occur without both approvals.

---

## 7. CLI workflow

### 7.1 Typical greenfield session

```bash
# Phase 1: Intake and Intent Extraction
synth first-contact start "Let's build a space mission tracker"

# Phase 2: Clarification
synth first-contact clarify

# Phase 3: Architecture Projection
synth first-contact project

# Phase 4: Capability Verification
synth first-contact verify

# Phase 5: Discovery Approval
synth first-contact approve

# Phase 6: Mission Materialization (dry-run preview)
synth first-contact materialize --dry-run

# Phase 7: Mission Materialization (execute)
synth first-contact materialize --approve

# Phase 8: Expedition Proposal
synth mission status
synth expedition list
```

### 7.2 Help routing

Every command namespace must provide its own `--help` output:

```bash
synth first-contact --help
synth first-contact start --help
synth first-contact materialize --help
```

---

## 8. Expected artifacts

### 8.1 After Discovery Approval

```text
.synth/first-contact/
    discovery-artifact.json
    transcript.jsonl
```

### 8.2 After Mission Materialization

```text
.synth/
    manifest.json
    context.json
    data/
        event-log.jsonl
        canonical-state.json
    first-contact/
        discovery-artifact.json
        transcript.jsonl
    proof/
        first-contact-proof.json
```

---

## 9. Certification criteria

A greenfield onboarding certification passes when:

1. `synth first-contact start` captures intent without mutation.
2. Clarification reaches a confidence threshold or explicit residual unknowns.
3. Architecture projection produces candidates as read-only projections.
4. Capability verification reports missing or degraded assumptions clearly.
5. Materialization is blocked before Discovery approval.
6. `synth first-contact materialize --approve` creates a valid `.synth/` directory and Mission.
7. Initial Expedition proposals are deterministic for equivalent artifacts.
8. Every `first-contact` subcommand provides its own `--help`.
9. `npm run govern` passes after materialization.
10. Replay verification reconstructs the Discovery-to-Mission chain.

---

## 10. Versioning

This specification follows semantic versioning. Changes that alter the operator journey, mutation guarantees, or CLI contract require a minor or major version bump and a new expedition.
