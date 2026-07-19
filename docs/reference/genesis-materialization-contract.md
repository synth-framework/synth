> This document is governed by **EXP-GENESIS-003 — Genesis Validation & Mission Materialization**.

# Genesis Materialization Contract

This document defines the contract for Mission materialization, Expedition proposal generation, repository materialization, and the greenfield CLI operator experience. Materialization is the final stage of Genesis and is gated on an approved artifact.

## 1. Mission Materialization Pipeline

### 1.1 Purpose

Transform an approved Genesis artifact into a governed Mission proposal. The Mission is derived from the artifact's intent and selected architecture, not from raw operator input.

### 1.2 Inputs

- `approvedArtifact`: the approved Genesis artifact (`IntentExtractionResult`).
- `selectedArchitecture`: the operator-selected `ArchitectureCandidate`.
- `verificationReport`: a `CapabilityVerificationReport` with status `passed`.
- `projectRoot`: the directory where the project will be created.
- `projectName`: optional human-readable project name.

Source of truth: `src/first-contact/materialize/types.ts`.

### 1.3 Outputs — `MaterializationResult`

| Field | Description |
|-------|-------------|
| `projectRoot` | Target project directory. |
| `manifestPath` | Path to `.synth/manifest.json`. |
| `eventLogPath` | Path to `.synth/data/event-log.jsonl`. |
| `statePath` | Path to `.synth/data/canonical-state.json`. |
| `artifactPath` | Path to `.synth/first-contact/discovery-artifact.json`. |
| `transcriptPath` | Path to `.synth/first-contact/transcript.jsonl`. |
| `missionProposalPath` | Path to `.synth/proposals/mission-proposal.json`. |
| `expeditionProposalsPath` | Path to `.synth/proposals/expedition-proposals.json`. |
| `mission` | The generated `MissionProposal`. |
| `expeditions` | The generated `ExpeditionProposal[]`. |

### 1.4 Mission Proposal Shape

| Field | Description |
|-------|-------------|
| `id` | Stable mission identifier. |
| `subject` | Short subject derived from intent. |
| `purpose` | Governance purpose referencing the selected architecture. |
| `derivedFrom.discoveryArtifactId` | Link back to the Genesis artifact. |
| `derivedFrom.selectedArchitectureId` | Link to the selected architecture. |

### 1.5 Preconditions

Materialization throws if:

- The capability verification report is not `passed`.
- The approved artifact is missing intent or goals.
- The selected architecture is not part of the projection result.

---

## 2. Expedition Proposal Generation

### 2.1 Purpose

Produce initial Expedition proposals from the materialized Mission. These proposals are not canonical until committed and started through the Expedition lifecycle.

### 2.2 Generated Proposals

The default materialization engine generates at least two proposals:

1. **Greenfield Baseline Capture** — capture approved intent, architecture, and constraints as governed state.
2. **Architecture Validation** — validate selected architecture assumptions and produce the first working increment.

Additional proposals may be generated based on the artifact's scope and constraints.

### 2.3 Proposal Shape

| Field | Description |
|-------|-------------|
| `id` | Stable expedition identifier. |
| `missionId` | Parent mission identifier. |
| `subject` | Short subject. |
| `goal` | What the expedition proves or builds. |

---

## 3. Repository Materialization

### 3.1 Gating Rule

Repository state is created only after Mission materialization is invoked with `--approve`. No `.synth/data/`, manifest, event log, or generated code exists before that point.

### 3.2 Created Artifacts

Materialization writes the following artifacts:

```text
.synth/
  manifest.json
  data/
    event-log.jsonl
    canonical-state.json
  first-contact/
    discovery-artifact.json
    transcript.jsonl
  proposals/
    mission-proposal.json
    expedition-proposals.json
```

### 3.3 Event Taxonomy

The materialization engine emits the following events in order:

| Event Type | Description |
|------------|-------------|
| `FIRST_CONTACT_STARTED` | Genesis session began from the approved artifact. |
| `DISCOVERY_APPROVED` | Genesis artifact approved and hashed. |
| `MISSION_MATERIALIZED` | Mission created from the approved artifact. |
| `EXPEDITIONS_PROPOSED` | Initial expeditions proposed. |

Events are chained by `previousHash` and replay must reconstruct the same canonical state.

### 3.4 Dry-Run Semantics

`synth first-contact materialize --dry-run` (or `synth genesis materialize --dry-run`) lists the files that would be created without writing them. It does not mutate project state.

---

## 4. Greenfield CLI Operator Experience

### 4.1 Command Namespace

The canonical greenfield onboarding namespace is `synth first-contact`. `synth genesis` is provided as an alias and dispatches to the same handlers.

### 4.2 Command Flow

```text
synth first-contact start "<intent>"
  ↓
synth first-contact clarify
  ↓
synth first-contact project
  ↓
synth first-contact verify
  ↓
synth first-contact approve
  ↓
synth first-contact materialize --dry-run
  ↓
synth first-contact materialize --approve
  ↓
synth explain replay
```

### 4.3 Command Reference

| Command | Safety | Description |
|---------|--------|-------------|
| `start` | `PROPOSAL_ONLY` | Extract intent and create a draft. |
| `clarify` | `PROPOSAL_ONLY` | Show or apply clarification answers. |
| `project` | `READ_ONLY` | Project architecture candidates. |
| `verify` | `READ_ONLY` | Verify capability assumptions. |
| `status` | `READ_ONLY` | Report current Genesis state. |
| `approve` | `MUTATING` | Approve the draft (requires approval). |
| `materialize --dry-run` | `PROPOSAL_ONLY` | Preview materialization output. |
| `materialize --approve` | `MUTATING` | Materialize the approved artifact. |

### 4.4 Help Surfaces

Each namespace owns its help:

```bash
synth --help
synth first-contact --help
synth genesis --help
synth first-contact <subcommand> --help
```

---

## 5. Hard Constraints

> **No state before approval:** No repository, manifest, event log, or generated code may be created until the Genesis artifact is approved and the Mission is materialized.
>
> **Verification gate:** Materialization requires a passing capability verification report.
>
> **Replayability:** Every emitted event must replay to the same canonical state.
>
> **Deterministic projections:** Architecture candidates are projections; only the selected architecture becomes canonical through approval.
