# EXP-PROGRAM-040 — Repository Simplification

> Reduce SYNTH's conceptual complexity by collapsing parallel abstraction layers, hardening the kernel mutation boundary, and making workflow and governance state derived from canonical truth.

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, ADR-004, ADR-045, ADR-046, ADR-047, ADR-048  
**Scope:** Structural simplification of the SYNTH repository above the kernel boundary  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** Medium  
**Public Impact:** Medium  
**Execution Impact:** High

---

## Purpose

SYNTH's kernel is appropriately complex for its guarantees, but the application layer accumulated parallel abstraction layers during rapid evolution. This program restores alignment between the conceptual model and the storage model, then hardens the kernel mutation boundary so simplification cannot introduce new bypasses.

---

## Program Composition

```text
EXP-PROGRAM-040
Repository Simplification
│
├── Assessment
│   ├── EXP-SIMPLIFICATION-ASSESSMENT-001  Complexity and Ownership Inventory
│   └── EXP-COMPLEXITY-AUDIT-001           SYNTH Complexity Reduction Assessment
│
├── Phase 1 — Governance Foundation
│   └── EXP-CAPABILITY-BOUNDARY-001        Single Mutation Execution Boundary
│
├── Phase 2 — Shared Test Infrastructure
│   └── EXP-SIMPLIFICATION-002             Test Infrastructure Unification
│
├── Phase 3 — Extension Model Unification
│   └── EXP-SIMPLIFICATION-003             Extension Model Unification
│
├── Phase 4 — Canonical State Simplification
│   └── EXP-SIMPLIFICATION-001             Canonical State Simplification & Authority Restoration
│
└── Phase 5 — Authority Enforcement (proposed)
    ├── EXP-GOVERNANCE-ENFORCEMENT-001     Implementation Authority Ordering Enforcement
    └── EXP-MUTATION-LIFECYCLE-001         Mutation Boundary Integration and Genesis Policy
```

### Why authority enforcement lives in this program

`EXP-GOVERNANCE-ENFORCEMENT-001` and `EXP-MUTATION-LIFECYCLE-001` are governance-execution expeditions, but they were intentionally deferred until simplification reduced the canonical state surface. Enforcing authority ordering against a bloated `CanonicalState` would have locked in accidental complexity; the resolver now evaluates against irreducible truth. They remain under Repository Simplification because their objective is to complete the simplified mutation-authority boundary, not to add general governance orchestration or validation scheduling.

---

## Protected Assets

- Event Model
- CanonicalState semantics
- Replay semantics
- ExecutionGate
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

---

## Success Criteria

- `CanonicalState` contains only irreducible domain truth.
- Workflow, governance, execution, and audit state are derived projections.
- The kernel mutation boundary blocks unauthorized mutations.
- Extension/discovery responsibilities have exactly one owner.
- Test infrastructure is unified and shared.
- Every simplification decision cites evidence from the complexity audit.

---

## Relationship to Other Work

- **EXP-PROGRAM-041 — Platform Canonicalization** provides the canonical infrastructure SDK that this program consumes.
- **EXP-PROGRAM-027 — Mission Studio Homepage** validated the governance model that this program protects.
- **EXP-PROGRAM-030 — Intelligent Governance Orchestration** owns general validation planning, dependency graphs, and proof-cache orchestration; the authority enforcement here is scoped to the mutation boundary, not the validation schedule.
- **EXP-PROGRAM-038 — Audit Remediation** builds on `EXP-CAPABILITY-BOUNDARY-001` to close execution-gate bypasses.
- **docs/strategy/simplification-program.md** is the strategic roadmap that chartered this program.
