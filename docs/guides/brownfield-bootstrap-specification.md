# Brownfield Bootstrap Specification

> **Normative reference for SYNTH brownfield onboarding.** Defines the canonical operator journey, CLI workflow, approval boundaries, mutation guarantees, expected artifacts, and certification criteria for adopting SYNTH governance on an existing repository.

**Version:** 1.0.0  
**Status:** Proposed  
**Governed by:** EXP-BROWNFIELD-001 — Brownfield Bootstrap Hardening  
**Program:** EXP-PROGRAM-004 — First Contact Program

---

## 1. Scope

This specification applies when SYNTH is introduced to a repository that predates SYNTH governance.

A **brownfield repository** is any project with existing:

- source code,
- documentation,
- dependencies,
- build configuration,
- runtime history,
- or operational context

that must be understood before governance can begin.

The specification does **not** apply to greenfield initialization (`synth init`), which starts from an empty or intentionally minimal state.

---

## 2. Core principle

> **Understanding precedes governance.**

Brownfield onboarding is a sequence of phases. Each phase has a single, well-defined responsibility. No phase may assume the work of a later phase has already occurred.

---

## 3. Operator journey

The canonical brownfield operator journey has six phases:

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

### 3.1 Discover

**Question:** What is this repository?

**Responsibility:** Produce a read-only, deterministic understanding of the repository.

**Inputs:**

- Path to existing repository.
- Optional declared intent from the operator.

**Outputs:**

- `DiscoverySession`
- `DiscoveryFindings`
- `ProjectModel` projection

**Mutation guarantee:**

- No file modifications.
- No generated artifacts outside `.synth/discovery/`.
- No event log entries.
- No governance state changes.

**Allowed commands:** `READ_ONLY` and `PROPOSAL_ONLY` only.

### 3.2 Classify

**Question:** What kind of repository is this and what transformation is intended?

**Responsibility:** Convert Discovery output into a structured Repository Intent model.

**Inputs:**

- `DiscoverySession`
- `ProjectModel`

**Outputs:**

- `.synth/context.json` (Agent Context Contract)
- Repository classification
- Source history classification
- Lifecycle phase assignment

**Mutation guarantee:**

- No governance state changes.
- May write `.synth/context.json` as a proposal artifact.

### 3.3 Propose

**Question:** What is the recommended path to SYNTH governance?

**Responsibility:** Generate a Bootstrap Proposal containing the first Mission and Expedition.

**Inputs:**

- `.synth/context.json`
- `DiscoverySession`

**Outputs:**

- Bootstrap Proposal
- First Mission proposal
- First Expedition proposal
- Expected artifacts list
- Uncertainty report

**Mutation guarantee:**

- No governance state changes.
- No event log entries.
- Proposal is advisory until approved.

### 3.4 Approve

**Question:** Does the operator accept the proposed path?

**Responsibility:** Capture explicit operator approval before any mutating action.

**Inputs:**

- Bootstrap Proposal

**Outputs:**

- Approved Mission
- Approved Expedition
- Approval event

**Mutation guarantee:**

- No repository mutations except the approval record.
- No `.synth/data/` initialization yet.

### 3.5 Initialize

**Question:** How does SYNTH establish governance?

**Responsibility:** Write governance artifacts and initialize the event log.

**Inputs:**

- Approved Mission
- Approved Expedition

**Outputs:**

- `.synth/manifest.json`
- `.synth/data/event-log.jsonl`
- `.synth/data/canonical-state.json`
- Baseline snapshot
- Generated documentation (if requested and approved)

**Mutation guarantee:**

- Mutations occur only after explicit approval.
- All mutations are event-backed and replayable.

### 3.6 Verify

**Question:** Is the governed state correct?

**Responsibility:** Run SYNTH validation and prove replay consistency.

**Inputs:**

- Initialized `.synth/` directory

**Outputs:**

- Validation report
- Replay proof
- Certification result

**Mutation guarantee:**

- Verification is read-only.

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

During the Discover phase, SYNTH must:

- Reject any `POTENTIALLY_MUTATING` or `MUTATING` command.
- Emit a clear error explaining the phase boundary.
- Suggest the correct next phase command.

Example:

```bash
$ synth docs generate
Error: docs generate is a MUTATING command and cannot run during Discovery.
Run 'synth bootstrap --approve' or complete Discovery before generating documentation.
```

---

## 5. Agent Context Contract

The Agent Context Contract is stored at `.synth/context.json` and serves as the semantic attractor for all AI agents interacting with the project.

### 5.1 Schema

```json
{
  "schema": "synth-agent-context-v1",
  "repositoryType": "brownfield-product",
  "phase": "architecture-discovery",
  "implementationState": "partial",
  "intent": "transform existing system under governance",
  "sourceHistory": "AVAILABLE",
  "classificationConfidence": "high",
  "generatedAt": "2026-07-18T00:00:00.000Z",
  "derivedFrom": {
    "discoverySessionId": "session-...",
    "discoverySessionHash": "..."
  }
}
```

### 5.2 Fields

- `repositoryType`: classification of the repository (e.g., `brownfield-product`, `brownfield-library`, `greenfield`).
- `phase`: current phase in the brownfield journey (e.g., `architecture-discovery`, `baseline-capture`, `governance-transition`).
- `implementationState`: `complete`, `partial`, or `missing`.
- `intent`: human-readable transformation goal.
- `sourceHistory`: `AVAILABLE`, `MISSING`, `EXTERNAL`, or `UNKNOWN`.
- `classificationConfidence`: confidence in the classification.
- `derivedFrom`: provenance linking the context to the DiscoverySession that produced it.

---

## 6. Runtime Transition Contract

Mission and Expedition entities move through explicit states:

```text
Draft
  ↓ approve
Approved
  ↓ commit
Committed
  ↓ start
Executing
  ↓ complete
Completed
```

### 6.1 State definitions

- **Draft:** A proposal generated by Mission Studio.
- **Approved:** Operator has accepted the proposal.
- **Committed:** The approved intent has been recorded as a runtime entity in the event log.
- **Executing:** Work on the Expedition has begun.
- **Completed:** The Expedition has produced evidence and been accepted.

### 6.2 CLI transitions

```bash
# Create a proposal (Draft)
synth mission create ...
synth expedition create ...

# Approve a proposal (Draft → Approved)
synth mission approve --draft-id <id>
synth expedition approve --draft-id <id>

# Commit approved intent to runtime (Approved → Committed)
synth expedition commit --proposal-id <id>

# Begin execution (Committed → Executing)
synth expedition start --id <id>

# Complete execution (Executing → Completed)
synth expedition complete --id <id> --evidence <path>
```

Until `commit` is executed, the proposal is not a runtime entity and cannot be started.

---

## 7. Source history classification

During Classify, SYNTH must classify source history availability:

| Value | Meaning |
|---|---|
| `AVAILABLE` | A Git repository is present and accessible. |
| `MISSING` | No version control repository is present. |
| `EXTERNAL` | Version control lives outside the repository (e.g., monorepo, external VCS). |
| `UNKNOWN` | Source history status could not be determined. |

A `MISSING` or `UNKNOWN` classification must be surfaced as a governance concern in the Bootstrap Proposal.

---

## 8. CLI workflow

### 8.1 Typical brownfield session

```bash
# Phase 1: Discover
synth discover /path/to/repo

# Phase 2: Classify (implicit or explicit)
synth bootstrap /path/to/repo --dry-run

# Phase 3: Propose (output shown by --dry-run)
# Review proposal

# Phase 4: Approve and Initialize
synth bootstrap /path/to/repo --approve

# Phase 5: Verify
cd /path/to/repo
npm run govern
```

### 8.2 Help routing

Every command namespace must provide its own `--help` output:

```bash
synth bootstrap --help
synth discover --help
synth mission --help
synth expedition --help
synth doctor --help
synth adapter --help
```

Generic help is returned only for `synth --help`.

---

## 9. Expected artifacts

### 9.1 After Discover

```text
.synth/discovery/
    findings.json
    project-model.json
    session.json
```

### 9.2 After Classify

```text
.synth/context.json
```

### 9.3 After Propose

```text
.synth/proposals/
    bootstrap-proposal.json
    mission-proposal.json
    expedition-proposal.json
```

### 9.4 After Approve and Initialize

```text
.synth/
    manifest.json
    context.json
    data/
        event-log.jsonl
        canonical-state.json
    proof/
        baseline-proof.json
```

---

## 10. Doctor output

`synth doctor` must report two distinct sections:

```text
Runtime Health
  ✓ binary valid
  ✓ version compatible
  ✓ global installation clean

Project Health
  ✓ manifest valid
  ✓ replay valid
  ✓ event chain valid
  ✓ discovery baseline present
```

Environment signals and project signals must not be conflated.

---

## 11. Certification criteria

A brownfield onboarding certification passes when:

1. `synth discover` runs without mutation.
2. `synth bootstrap --dry-run` produces a proposal with Repository Intent.
3. `synth bootstrap --approve` initializes governance only after operator approval.
4. The first Mission is about establishing a deterministic governance baseline.
5. The first Expedition is Brownfield Baseline Discovery.
6. `.synth/context.json` is present and valid.
7. Source history is classified.
8. Every command namespace provides its own `--help`.
9. `synth doctor` separates Runtime and Project Health.
10. `npm run govern` passes after initialization.
11. Replay verification passes.

---

## 12. Versioning

This specification follows semantic versioning. Changes that alter the operator journey, mutation guarantees, or CLI contract require a minor or major version bump and a new expedition.
