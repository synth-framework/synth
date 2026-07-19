> This document is governed by **EXP-GENESIS-001 — Genesis Lifecycle & Artifact Schema**.

# Genesis Artifact Contract

This document defines the canonical Genesis lifecycle, artifact schema, approval gates, and governance integration for greenfield onboarding in SYNTH.

## Purpose

A project should begin with intent, not initialization. Genesis captures operator intent, classifies context, extracts constraints, negotiates scope, verifies feasibility, and only then materializes a Mission and Expedition proposals.

## Core Abstraction — Genesis Artifact

The **Genesis Artifact** is an immutable, replayable record of the transition from raw intent to an approved Mission. It is the canonical source of truth for everything that happens before repository materialization.

## 1. Genesis Lifecycle

```text
Intent Capture
      ↓
Context Classification
      ↓
Constraint Extraction
      ↓
Scope Negotiation
      ↓
Capability Verification
      ↓
Mission Materialization
```

### 1.1 Intent Capture

Accept raw intent from the operator:

- Natural language description.
- Optional declared audience.
- Optional success criteria.
- Optional constraints.

Output: a draft Genesis artifact with extracted intent.

### 1.2 Context Classification

Classify the project context:

- `repositoryType`: `greenfield`, `brownfield-product`, `brownfield-library`, etc.
- `phase`: current lifecycle phase (e.g., `intent-capture`, `architecture-discovery`).
- `implementationState`: `missing`, `partial`, `complete`.
- `sourceHistory`: `AVAILABLE`, `MISSING`, `EXTERNAL`, `UNKNOWN`.

### 1.3 Constraint Extraction

Capture hard constraints:

- budget
- timeline
- compliance
- existing stack
- team experience
- deployment targets
- operational requirements

### 1.4 Scope Negotiation

Produce a negotiated scope:

- Must Have
- Should Have
- Could Have
- Won't Have

### 1.5 Capability Verification

Verify assumptions before Mission creation:

- runtime availability
- framework support
- required SDKs
- platform constraints

### 1.6 Mission Materialization

Only after Genesis approval:

- initialize repository (if needed)
- create project manifest
- generate Mission
- propose Expeditions

## 2. Genesis Artifact Schema

```text
synth-genesis-artifact-v1
```

### 2.1 Fields

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | `"synth-genesis-artifact-v1"`. |
| `id` | string | Stable artifact identifier. |
| `status` | string | `"draft"` or `"approved"`. |
| `intent` | object | Captured operator intent. |
| `intent.statement` | string | Plain-language project goal. |
| `intent.audience` | string[] | Intended users or stakeholders. |
| `intent.successCriteria` | string[] | Measurable outcomes. |
| `context` | object | Classified project context. |
| `context.repositoryType` | string | Greenfield or brownfield classification. |
| `context.phase` | string | Current phase in the Genesis lifecycle. |
| `context.implementationState` | string | `missing`, `partial`, or `complete`. |
| `context.sourceHistory` | string | `AVAILABLE`, `MISSING`, `EXTERNAL`, `UNKNOWN`. |
| `constraints` | object | Extracted constraints. |
| `scope` | object | Negotiated scope (MoSCoW). |
| `unknowns` | string[] | Identified unknowns and risks. |
| `architectureCandidates` | object[] | Projection-only architecture alternatives. |
| `selectedArchitecture` | object | Architecture chosen at approval time. |
| `verificationReport` | object | Capability verification results. |
| `evidence` | object[] | References to supporting evidence. |
| `approval` | object | Approval record. |
| `approval.approvedAt` | ISO timestamp | When the artifact was approved. |
| `approval.approvedBy` | string | Actor who approved. |
| `approval.artifactHash` | string | Hash of the approved artifact content. |
| `provenance` | object | Lineage and replay provenance. |
| `provenance.sessionId` | string | Discovery/session id that produced the artifact. |
| `provenance.sessionHash` | string | Hash of the session. |

### 2.2 Immutability

Once approved, the Genesis artifact is immutable. Any revision creates a new artifact with lineage reference to the prior one.

## 3. Approval Gates

| Gate | Requirement | Emitted Event |
|------|-------------|---------------|
| Intent approved | Intent is unambiguous and complete. | `FIRST_CONTACT_STARTED` → `DISCOVERY_APPROVED` |
| Scope approved | Scope is bounded and feasible. | recorded in artifact approval |
| Feasibility verified | Capability verification passes. | `MISSION_MATERIALIZED` |
| Mission approved | Mission draft is approved. | `MISSION_CREATED`, `MISSION_APPROVED` |

## 4. Event Taxonomy

Genesis uses the First Contact event family:

| Event Type | Description |
|------------|-------------|
| `FIRST_CONTACT_STARTED` | Greenfield discovery session began. |
| `DISCOVERY_APPROVED` | Genesis artifact approved. |
| `MISSION_MATERIALIZED` | Mission created from approved artifact. |
| `EXPEDITIONS_PROPOSED` | Initial expeditions proposed. |

## 5. Replay Integration

- Every Genesis artifact must be reproducible from its inputs and approved state.
- The artifact hash must be stable for identical inputs.
- Mission materialization must emit events that replay reconstructs the same Mission state.

## 6. Governance Integration

- Genesis artifacts live under `.synth/first-contact/` during the draft phase.
- Approved artifacts are promoted before Mission materialization.
- No `.synth/data/` or event log entries are created until Mission materialization.
- Capability verification results are attached as evidence to the Mission.

## 7. Hard Constraints

> **No state before approval:** No repository, manifest, event log, or generated code may be created until the Genesis artifact is approved and the Mission is materialized.
>
> **Replayability:** Every Genesis artifact must be reproducible from its inputs and approved state.
>
> **Deterministic projections:** Architecture candidates are projections; the selected architecture becomes canonical only through approval.
