# EXP-GENESIS-003 — Genesis Validation & Mission Materialization

> **Product expedition.** Verify capability feasibility, validate acceptance, and materialize the first Mission and Expedition proposals.

**Status:** Proposed  
**Kind:** Product Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-GENESIS-002 (Genesis Intent Capture & Classification)

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

Validate that the scoped Genesis artifact is feasible and then materialize the first Mission and Expedition proposals. This expedition closes the Genesis pipeline.

---

## Required Change

### 3.1 Capability Verification

Verify feasibility before Mission creation:

- chosen runtime exists
- framework compatibility
- deployment target availability
- dependency availability
- required SDKs and tools

### 3.2 Architecture Alternatives

Generate architecture candidates as projections, not canonical state:

- rationale for each alternative
- tradeoffs
- recommended choice
- assumptions

### 3.3 Acceptance Validation

Ensure every capability has measurable acceptance criteria before Mission approval.

### 3.4 Mission Materialization

Only after Genesis approval:

```text
Genesis Artifact
  ↓
Mission
  ↓
Expedition Proposals
  ↓
Repository Materialization
```

No repository state is created before Mission approval.

### 3.5 Greenfield Operator Experience

Design the CLI and interactive flow for greenfield onboarding:

- `synth genesis create`
- `synth genesis approve`
- `synth genesis materialize`
- help and explanation at each gate

---

## Deliverables

1. Capability verification framework.
2. Architecture alternative projection engine.
3. Acceptance criteria validation.
4. Mission materialization pipeline.
5. Expedition proposal generation.
6. Greenfield CLI operator experience.
7. ADR on Mission materialization semantics.

---

## Acceptance Criteria

- A project can reach Mission approval without production code.
- Capability verification produces deterministic feasibility evidence.
- Architecture alternatives are projections, not canonical state.
- Mission and Expedition proposals are generated from the Genesis artifact.
- Repository materialization is gated on Mission approval.
- `npm run govern` passes.

---

## Out of Scope

- Genesis lifecycle and artifact schema (EXP-GENESIS-001).
- Intent capture and classification (EXP-GENESIS-002).
- Canonical domain modeling (EXP-PROGRAM-024).
- Canonical Knowledge Model (EXP-PROGRAM-025).
- Prototype-first validation beyond capability checks (EXP-PROGRAM-025).

---

## Success Criteria

Genesis closes with an approved Mission and Expedition proposals, and no repository state exists before that point.
