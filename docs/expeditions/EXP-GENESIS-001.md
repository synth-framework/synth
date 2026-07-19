# EXP-GENESIS-001 — Genesis (Greenfield Discovery)

> **Architecture expedition.** Define the canonical greenfield intent-to-knowledge workflow, artifact schema, clarification strategy, and Mission materialization pipeline.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-GOVERN-006 (Governance Completion), EXP-PROGRAM-006 (Discovery Platform)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Objective

A project should begin with intent, not initialization.

Genesis transforms:

```text
Idea
  ↓
Governable Knowledge
```

before any repository exists.

---

## Required Change

### 1.1 Intent Capture

Accept evidence from:

- Natural language
- Documents
- URLs
- Images
- Diagrams
- Existing repositories

Everything becomes evidence.

### 1.2 Context Classification

Determine:

```text
Greenfield
Brownfield
Hybrid

Internal
Commercial
OSS

Prototype
Production

Criticality

Domain
```

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

Produce:

```text
Must Have
Should Have
Could Have
Won't Have
```

Estimate complexity and recommend an MVP boundary before implementation planning.

### 1.5 Domain Modeling

Produce an implementation-independent model:

- entities
- relationships
- invariants
- aggregates
- bounded contexts
- ubiquitous language

Technology remains a projection, not canonical state.

### 1.6 Canonical Knowledge Model

Replace the notion of a "living specification" with a versioned, replayable Knowledge Model from which Missions, architectures, requirements, and documentation are projected.

### 1.7 Validation

Before any code:

- wireframes
- acceptance criteria
- architecture alternatives
- prototype validation
- runtime capability checks

### 1.8 Mission Materialization

Only after Genesis approval:

```text
Discovery
  ↓
Mission
  ↓
Expeditions
  ↓
Repository Materialization
```

No `init` before approved intent.

---

## Deliverables

1. Genesis lifecycle specification.
2. Genesis artifact schema.
3. Intent extraction engine contract.
4. Clarification strategy.
5. Architecture projection engine contract.
6. Capability verification framework.
7. Domain model schema.
8. Canonical Knowledge Model.
9. Mission materialization pipeline.
10. Greenfield operator experience.
11. Replay and governance integration.
12. ADR on Genesis artifact semantics.

---

## Acceptance Criteria

- A user can start with "Build me a markdown editor."
- SYNTH produces a Genesis artifact, architecture alternatives, capability verification, an approval-ready Mission, and Expedition proposals.
- No repository state, code, or governance artifacts are generated before Mission approval.
- Genesis artifacts are replayable and integrate with governance proofs.
- Two independent agents produce substantially the same artifact from the same intent evidence.
- `npm run govern` passes.

---

## Out of Scope

- Changes to Mission lifecycle semantics.
- Changes to Expedition execution semantics.
- Brownfield discovery (handled by EXP-BROWNFIELD-002).
- Code generation quality as a goal.
- IDE or editor integrations.

---

## Success Criteria

Greenfield onboarding is a deterministic intent-discovery system that delays all materialization until approved intent exists.
