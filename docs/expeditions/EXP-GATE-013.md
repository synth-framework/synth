# EXP-GATE-013 — Gate State & Dependency Enforcement

> **Engine expedition.** Enforce dependency chains between expeditions, propagate certification status across the gate graph, and block downstream work when upstream gates are unresolved or in `partial_pass` state.

**Status:** Proposed  
**Kind:** Engine Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Phase:** 3 — Engine  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GOVERNABILITY-003, EXP-GOVERNABILITY-004, EXP-GOVERNABILITY-005  
**Blocks:** EXP-GATE-012, EXP-HOME-028

---

```yaml
Impact:
  Constitutional: Yes (ADR-050)
  Product: No
  User Facing: No
  Architecture Freeze: Lifted per ADR-050
  Requires ADR: ADR-050
```

---

## Gap Identified

During EXP-GOVERNABILITY-005 convergence certification and the associated governability gap analysis, three related framework gaps were identified:

### Gap 1: No dependency graph enforcement
Expedition dependency chains are maintained manually in markdown (`Depends On` / `Blocks` headers). The runtime does not verify that a dependent expedition's upstream dependencies are resolved before allowing state transitions. A downstream expedition can begin while an upstream gate is awaiting decision.

**Evidence:** EXP-GATE-012 previously listed 11 dependencies (GATE-001 through GATE-011) in its charter despite most of those expeditions never having executed. Nothing prevented this.

### Gap 2: No status propagation
A `partial_pass` certification result lives only in a markdown file (`governability-regression-certification.json`). It does not propagate to dependent expeditions — no automated mechanism blocks downstream work when an upstream certification is incomplete.

**Evidence:** EXP-REFINE-009 was Proposed while EXP-GOVERNABILITY-001 (its upstream dependency) was `partial_pass`. Nothing enforced the dependency.

### Gap 3: No gate-state-aware blocking
The execution engine does not check whether an upstream gate is in an unresolved or incomplete state before permitting downstream capability execution.

**Evidence:** Mission completion can be attempted without checking whether Convergence Certification has been performed (this was caught by the EXP-GOVERNABILITY-005 tests, which add explicit checks — but the pattern is not generalized).

---

## Objective

Make the dependency graph a first-class runtime concern rather than a documentary one:

1. **Dependency graph as data** — Parse `Depends On` / `Blocks` from expedition charters into machine-readable records.
2. **Status propagation** — When a certification expedition completes with `partial_pass` or `fail`, propagate that status to all downstream dependents.
3. **Gate-state-aware blocking** — The execution engine checks upstream gate state before permitting capability execution for dependent expeditions.

---

## Design

### Dependency records

```text
DependencyRecord {
  expeditionId: string
  dependsOn: string[]    // expedition IDs
  blocks: string[]       // expedition IDs
  upstreamGateStatus?: "resolved" | "partial" | "unresolved"
}
```

Derived from expedition charter headers. Parsed once at bootstrap or on demand.

### Status propagation rules

| Upstream certification result | Downstream effect |
|---|---|
| `pass` | No restriction |
| `partial_pass` | Downstream certification expeditions blocked; implementation expeditions warned |
| `fail` | All downstream expeditions blocked |
| `proposed` / no result | Downstream expeditions that declare a `Depends On` relationship blocked |

### Execution gate integration

When a capability is invoked, the engine checks:

```
Capability → associated expedition → dependency records → upstream gate states
                                                                ↓
                                          Any upstream blocked? → deny execution
```

---

## Deliverables

1. **DependencyRecord type** and parser from expedition charter headers.
2. **Status propagation logic** — when a certification result is recorded, update downstream dependency states.
3. **Gate-state check** in the execution engine pre-flight that verifies upstream dependencies are resolved.
4. **Integration tests** proving:
   - A downstream expedition is blocked when upstream is `partial_pass`.
   - A downstream expedition proceeds when upstream is `pass`.
   - Dependency chains are correctly resolved from charter headers.
5. **Documentation** of the dependency graph model.

---

## Acceptance Criteria

1. Expedition charter `Depends On` / `Blocks` headers are parseable into `DependencyRecord` instances.
2. Setting a certification to `partial_pass` automatically blocks dependent expeditions.
3. Setting a certification to `pass` unblocks downstream expeditions.
4. The execution engine pre-flight check correctly denies capability execution for blocked expeditions.
5. Existing tests pass; new dependency enforcement tests pass.
6. ADR-050 freeze lift conditions are satisfied. Re-freeze is certified via `npm run govern`.

---

## Out of Scope

- Real-time dependency graph visualization.
- Automatic re-certification when upstream dependencies change.
- Cross-program dependency resolution.
- Modifying the expedition charter markdown format.

---

## Relationship to Other Work

- **EXP-GOVERNABILITY-004** — Gate enforcement and evaluation wiring; this expedition extends the pattern to dependency-aware state.
- **EXP-GATE-012** — Certification expedition; this expedition provides the dependency enforcement that GATE-012 depends on.
- **EXP-REFINE-009** — Program 036 certification; this expedition ensures REFINE-009 is blocked if EXP-GOVERNABILITY-001 remains `partial_pass`.
- **ADR-045** — Governance Lifecycle State Machine; dependency enforcement is a runtime realization of the stop conditions defined in ADR-045.
- **ADR-050** — Execution Gate State Dependency Enforcement; documents the freeze lift, proof preservation, and re-freeze certification for this expedition.

---

## After EXP-GATE-013

- GATE-012 can execute knowing its dependencies are enforced at runtime.
- The `partial_pass` → `pass` progression becomes a tracked state transition rather than a documentary update.
- The pattern generalizes to any future certification expedition.
