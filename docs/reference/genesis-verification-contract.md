> This document is governed by **EXP-GENESIS-003 — Genesis Validation & Mission Materialization**.

# Genesis Verification Contract

This document defines the contracts for capability verification, architecture-alternative projection, and acceptance validation in the Genesis lifecycle. These steps ensure a scoped Genesis artifact is feasible before any Mission is materialized.

## 1. Capability Verification

### 1.1 Purpose

Capability verification confirms that the assumptions of a selected architecture candidate can be satisfied by the current environment before Mission creation. It is deterministic for a fixed environment and adapter version.

### 1.2 Inputs

- A selected `ArchitectureCandidate` from `projectArchitecture(artifact)`.
- The candidate's `assumptions` array (e.g., `Node >= 20`, `Python >= 3.10`).
- An optional `CapabilityVerifier` adapter; defaults to `RuleBasedCapabilityVerifier`.

Source of truth: `src/first-contact/verify/types.ts`.

### 1.3 Outputs — `CapabilityVerificationReport`

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"passed" \| "blocked" \| "overridden"` | Aggregate result of verification. |
| `checks` | `CapabilityCheck[]` | Per-assumption check result. |
| `blockers` | `CapabilityBlocker[]` | Assumptions that prevent materialization. |
| `reportHash` | string | Deterministic hash of the canonical report content. |

Each `CapabilityCheck` carries:

| Field | Description |
|-------|-------------|
| `capability` | Normalized capability name. |
| `status` | `AVAILABLE`, `DEGRADED`, `UNAVAILABLE`, or `MISSING`. |
| `message` | Human-readable explanation. |

### 1.4 Status Semantics

| Status | Meaning |
|--------|---------|
| `AVAILABLE` | Capability is present and satisfies the assumption. |
| `DEGRADED` | Capability is present but does not satisfy the stated requirement. |
| `UNAVAILABLE` | Capability cannot be verified automatically (e.g., external service). |
| `MISSING` | Capability is not present or not recognized. |

Only `MISSING` and `DEGRADED` capabilities block materialization. `UNAVAILABLE` capabilities are surfaced as warnings so the operator can confirm them manually.

### 1.5 Determinism

For the same set of assumptions and verifier version, the report hash and checks must be identical across runs. The verifier must not depend on non-deterministic environment signals such as wall-clock time or process IDs.

### 1.6 CLI Surface

```bash
synth first-contact verify
synth first-contact verify --architecture <candidate-id>
synth genesis verify
synth genesis verify --architecture <candidate-id>
```

The command exits non-zero when verification is `blocked`.

---

## 2. Architecture Alternatives Projection

### 2.1 Purpose

Architecture candidates are projections derived from the Genesis artifact. They are not canonical state. The operator selects one candidate at approval time; only the selected candidate becomes part of the approved artifact.

### 2.2 Inputs

- The approved-clarification `IntentExtractionResult`.
- An optional `ArchitectureProjectionAdapter`; defaults to `RuleBasedArchitectureProjectionAdapter`.

Source of truth: `src/first-contact/project/types.ts`.

### 2.3 Outputs — `ArchitectureProjectionResult`

| Field | Type | Description |
|-------|------|-------------|
| `candidates` | `ArchitectureCandidate[]` | All projected alternatives. |
| `recommended` | `ArchitectureCandidate` | The adapter's recommended default. |

Each `ArchitectureCandidate` carries:

| Field | Description |
|-------|-------------|
| `id` | Stable identifier for selection. |
| `name` | Human-readable name. |
| `description` | What the architecture proposes. |
| `rationale` | Why this candidate fits the intent and constraints. |
| `tradeoffs.advantages` | Conditions where this candidate excels. |
| `tradeoffs.disadvantages` | Conditions where this candidate is weaker. |
| `assumptions` | Capabilities that must hold for this candidate. |
| `recommended` | Whether the adapter recommends this candidate. |
| `confidence` | Adapter confidence score. |

### 2.4 Projection Rules

1. Candidates are derived only from the Genesis artifact fields.
2. No candidate may introduce constraints that were not present in the artifact.
3. Every candidate must list the assumptions required for feasibility.
4. Candidates are ranked by confidence; one may be marked `recommended`.
5. The operator may override the recommendation by selecting another candidate.

### 2.5 CLI Surface

```bash
synth first-contact project
synth first-contact project --architecture <candidate-id>
synth genesis project
synth genesis project --architecture <candidate-id>
```

---

## 3. Acceptance Validation

### 3.1 Purpose

Every capability and scope item must have measurable acceptance criteria before Mission approval. Acceptance validation checks that the Genesis artifact contains enough criteria to judge Mission success.

### 3.2 Requirements

At approval time the artifact must contain:

- At least one intent goal.
- At least one success criterion per required capability.
- A selected architecture with a passing capability verification report.
- No unresolved blocking unknowns.
- No unresolved ambiguities.

### 3.3 Approval Gate

`synth first-contact approve` enforces:

1. `clarify(artifact).canApprove === true`.
2. Capability verification for the selected candidate passes.
3. The approved artifact is hashed and stored under `.synth/first-contact/approved-artifact.json`.

Failure at any gate emits an error with the next required operator action.

### 3.4 CLI Surface

```bash
synth first-contact approve [--architecture <candidate-id>]
synth genesis approve [--architecture <candidate-id>]
```

---

## 4. Hard Constraints

> **No Mission before verification:** A Mission cannot be materialized unless capability verification is `passed`.
>
> **Projections are not canonical:** Architecture candidates exist only as projections until one is selected at approval time.
>
> **Deterministic verification:** Verification reports must be reproducible for the same assumptions in the same environment.
