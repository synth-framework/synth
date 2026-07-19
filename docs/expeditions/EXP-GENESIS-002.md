# EXP-GENESIS-002 — Genesis Intent Capture & Classification

> **Architecture expedition.** Capture intent, classify context, extract constraints, and negotiate scope before Mission materialization.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-GENESIS-001 (Genesis Lifecycle & Artifact Schema)

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

Turn raw operator input into a classified, scoped Genesis artifact. This expedition focuses on the upstream half of Genesis: understanding what the operator wants and under what constraints.

---

## Required Change

### 2.1 Intent Capture

Accept evidence from:

- natural language
- documents
- URLs
- images
- diagrams
- existing repositories

Everything becomes evidence attached to the Genesis artifact.

### 2.2 Context Classification

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

### 2.3 Constraint Extraction

Capture hard constraints:

- budget
- timeline
- compliance
- existing stack
- team experience
- deployment targets
- operational requirements

### 2.4 Scope Negotiation

Produce:

```text
Must Have
Should Have
Could Have
Won't Have
```

Estimate complexity and recommend an MVP boundary before implementation planning.

### 2.5 Ambiguity and Unknown Tracking

Detect and record:

- ambiguous requirements
- missing constraints
- undefined terminology
- unresolved assumptions

---

## Deliverables

1. Intent capture engine contract — `docs/reference/genesis-intent-capture-contract.md` §1 and `src/first-contact/extract/types.ts`.
2. Context classifier contract — `docs/reference/genesis-intent-capture-contract.md` §2.
3. Constraint extraction rules — `docs/reference/genesis-intent-capture-contract.md` §3.
4. Scope negotiation strategy — `docs/reference/genesis-intent-capture-contract.md` §4.
5. Ambiguity detection rules — `docs/reference/genesis-intent-capture-contract.md` §5 and `src/first-contact/clarify/types.ts`.
6. Unknown tracker schema — `docs/reference/genesis-intent-capture-contract.md` §6 and `src/first-contact/extract/types.ts` (`ExtractedUnknown`).
7. Evidence attachment model — `docs/reference/genesis-intent-capture-contract.md` §7.
8. ADR on intent capture semantics — `docs/adr/ADR-028-genesis-intent-capture-semantics.md`.

---

## Acceptance Criteria

- A plain-language idea produces a classified Genesis artifact.
- Constraints and scope are extracted deterministically from the same evidence.
- Ambiguities and unknowns are surfaced and tracked.
- The artifact conforms to the EXP-GENESIS-001 schema.
- Two independent agents converge on substantially the same artifact from the same inputs.
- `npm run govern` passes.

---

## Out of Scope

- Genesis lifecycle and artifact schema (EXP-GENESIS-001).
- Capability verification (EXP-GENESIS-003).
- Mission materialization (EXP-GENESIS-003).
- Canonical domain modeling (EXP-PROGRAM-024).
- Canonical Knowledge Model (EXP-PROGRAM-025).

---

## Success Criteria

Genesis can deterministically capture, classify, and scope operator intent before any Mission exists.
