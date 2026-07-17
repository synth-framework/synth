# Constitutional Layer Boundaries

> **Authority:** Architectural Constitution  
> **Status:** Active  
> **Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (first end-to-end governed bootstrap, E1)

This document defines the boundary between **Governance** and **Implementation** in SYNTH, and the distinct roles of the **Expedition** and **Bootstrap** layers. It is derived from the [Architectural Constitution](constitution.md) and from field evidence gathered during the first governed bootstrap.

---

## Purpose

Governance and Implementation are not the same concern. During the E1 bootstrap, implementation details such as tool versions, package managers, and third-party service configuration were repeatedly treated as if they affected governance semantics. At the same time, governance concerns such as evidence normalization and reconciliation were conflated with adapter or bootstrap mechanics.

This document names the layers, assigns ownership, and provides a decision matrix so that future work does not drift across boundaries.

---

## Layers

### Governance Layer

Governance is the set of rules, invariants, and authorities that decide whether a state transition is permitted. It owns **semantics**, not mechanics.

**Responsibilities:**

- Define valid state transitions and their preconditions.
- Authorize mutations through the single mutation authority (`ExecutionGate`).
- Maintain the event log as the source of truth.
- Define, compute, and enforce invariants including replay, determinism, graph integrity, and proof.
- Normalize evidence consumed by Mission Studio and record its provenance.
- Reconcile expected state with actual state and surface discrepancies as governance events or review artifacts.
- Allocate identifiers from governed state; identifiers are **allocated, never assumed**.

**Boundaries:**

- Governance does not choose tools, package managers, runtimes, or environment-specific configuration.
- Governance does not implement adapters; it consumes the `Observation` values adapters produce.
- Governance does not perform one-time repository setup; that is Bootstrap.

### Implementation Layer

Implementation is everything that realizes the architecture on a target environment. It owns **mechanics**, not semantics.

**Responsibilities:**

- Execute capabilities through registered adapters.
- Manage tool versions, dependencies, build outputs, and environment configuration.
- Implement adapters that observe external systems and emit `Observation` values.
- Produce deterministic projections from state.
- Satisfy governance invariants; never bypass them.

**Boundaries:**

- Implementation cannot authorize mutations.
- Implementation cannot alter the event log, governance rules, or proof semantics.
- Implementation cannot treat environment choices as governance decisions.

### Expedition Layer

An Expedition is the bounded engineering unit that produces evidence. It is a governance mechanism because it requires authorization and produces replayable artifacts, but it is not the same as the work it performs.

**Responsibilities:**

- Declare objective, scope, acceptance criteria, risks, and impact.
- Produce implementation changes or documentation changes within its declared impact.
- Record decisions, reconciliations, and evidence as governance events or review artifacts.

**Boundaries:**

- An Expedition does not redefine constitutional provisions.
- An Expedition's implementation work belongs to the Implementation layer; its authorization and evidence belong to Governance.

### Bootstrap Layer

Bootstrap is the one-time transformation of a repository into a SYNTH project. It creates the initial governance record and project scaffolding, but it is not a governance operation in the steady state.

**Responsibilities:**

- Initialize `.synth/manifest.json` and the event log.
- Create the initial governance record (`initialization`).
- Detect the environment and write implementation-specific configuration.
- Record bootstrap completion as a governance event.

**Boundaries:**

- Bootstrap does not approve Missions or Expeditions.
- Bootstrap does not emit mission/expedition state transitions.
- Bootstrap configuration (package manager, tooling, service credentials) is implementation, not governance.

---

## Decision Matrix

| Concern | Layer | Rationale |
|---|---|---|
| Tool versions (Node, npm, TypeScript, etc.) | Implementation | A version change affects how code runs, not what governance permits. |
| Package manager choice (npm/pnpm/yarn) | Implementation | Dependency resolution is an environment-mechanics concern. |
| Third-party service configuration (Supabase, DB URLs, etc.) | Implementation | Runtime credentials and endpoints are environment-specific. |
| Evidence normalization | Governance | Deciding what counts as evidence and how gaps are reported determines planning confidence. |
| Reconciliations between expected and actual state | Governance | Recognizing a discrepancy and recording it is a governance judgment. |
| Identifier allocation | Governance | Identifiers are allocated from governed state; guessing them violates determinism. |
| Adapter implementation | Implementation | Adapters produce observations; governance consumes them. |
| Expedition approval | Governance | Authorizing work is a governance transition. |
| Bootstrap scaffolding | Bootstrap | One-time setup; afterward it becomes an implementation artifact. |

---

## E1-Derived Examples

These examples are drawn from `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md`.

### Tool versions → Implementation

During E1 the agent inspected `package.json`, the Node version, and the PowerShell execution policy. These conditions shaped what could run, but they never changed whether a Mission was approved or what the event log meant. They belong to Implementation.

### Package manager → Implementation

The agent created a `package.json` and defined an `npm run govern` script to satisfy bootstrap output. The choice of npm and the script contents are environment mechanics. When the script caused a recursion loop, the fix belonged to implementation scaffolding and CLI integrity, not governance semantics.

### Supabase configuration → Implementation

Any database endpoint, service key, or cloud-provider setting required by the runtime is environment configuration. It may be referenced by a capability, but it is not part of the constitutional baseline.

### Evidence normalization → Governance

The `docs generate` extractor silently skipped `.md.txt` files and reported `status: ok`. Deciding what counts as evidence, how it is normalized, and how gaps are reported is a governance concern because it determines the confidence Mission Studio can claim.

### Reconciliations → Governance

When the agent's approved Mission "evaporated" because memory-mode state was not persisted, the gap between expected state (approved snapshot) and actual state (empty missions list) is a reconciliation. Discovering, recording, and acting on that gap is governance. The persistence mechanism that fixes it is implementation.

---

## Relationship to Other Documents

- [Architectural Constitution](constitution.md) — supreme authority; this document derives from it.
- [Governance Specification](../governance.md) — operational proof lifecycle and enforcement.
- [08 - Governance](08-governance.md) — policy evaluation, permits, and attestation.
- [Governance Record schema](../schemas/governance-record.schema.json) — canonical schema for governance transitions.
- [E1 Evidence Annex](../operator/EXP-PROGRAM-010-evidence-annex-taskpro.md) — field observations that motivated these boundaries.

---

## Enforcement

These boundaries are enforced by:

- Expedition charters that declare `Impact` and `Protected Assets`.
- `synth verify` (EXP-GOV-005) — executable checks for replay integrity, projection consistency, evidence integrity, and governance invariants.
- The ADR process for any change affecting layer boundaries or import rules.

Changes that move a concern across a layer require explicit review and an ADR if they touch constitutional architecture.
