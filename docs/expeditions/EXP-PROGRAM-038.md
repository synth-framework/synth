# EXP-PROGRAM-038 — Platform Hardening

> Transform the stable architectural baseline into a secure, deterministic, release-ready platform.

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, ADR-040 — External Build Systems Are Adapters, Repository Baseline Report 2026-07-25  
**Scope:** Cross-domain hardening: structural integrity, determinism, security, and release validation  
**Era:** III — Validation & Hardening  
**Architecture Impact:** High  
**Constitutional Impact:** Low  
**Public Impact:** Low  
**Execution Impact:** High

---

> ## Era III entry path
>
> ADR-040 requires that new Programs in Era III be justified by observed friction from real-world use. The findings in this program originate from a comprehensive system audit (governance framework, execution gate integrity, projections, CLI, security, AI portability) commissioned by the Architecture Owner on 2026-07-22. Each expedition maps to concrete, observed gaps in the existing system — not speculative improvements.
>
> Phase 0 (Repository Baseline Closure, 2026-07-25) certified that the architecture era is complete. This program assumes that baseline and moves from architecture to productization.

---

## Thesis

> **A stable architecture is not a secure architecture. A secure architecture is not a releasable architecture.**

The repository is now architecturally settled. The next objective is to prove that the platform is hard enough to freeze: no bypasses, no nondeterminism, no unvalidated supply chain, and no release path that depends on tribal knowledge.

The audit findings from 2026-07-22 are the primary input, but the objective is broader than closing tickets. The objective is to reach **Release Candidate 1**.

---

## Audit Context (input)

On 2026-07-22, a comprehensive audit of the SYNTH codebase was conducted across four domains:

| Domain | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|
| Governance Framework | 12 | 0 | 5 | 4 | 3 |
| Security & Execution Gate | 10 | 3 | 1 | 4 | 2 |
| Projections & Documentation Sync | 7 | 0 | 2 | 3 | 2 |
| CLI Quality & AI Portability | 16 | 2 | 4 | 5 | 5 |

**Total: 45 findings (5 critical, 12 high, 16 medium, 12 low)**

These findings are distributed across the four workstreams below.

---

## Workstreams

### A — Structural Integrity

Objective: zero uncontrolled mutation paths.

```text
EXP-PROGRAM-038 / A
└── EXP-SEC-001   Execution Gate Bypass Hardening
        Close remaining critical/high bypasses (PartitionStore, FilesystemProvider,
        shell injection) and medium gaps (stack-trace guard, shallow freeze,
        dead code, verification stores).
```

Deliverable:

```text
Zero structural bypasses
```

### B — Determinism

Objective: clean clone → same hashes → same replay.

```text
EXP-PROGRAM-038 / B
└── EXP-GOV-014   Governance Model & Engine Integrity
        Update docs/governance.md, fix fake ReviewDecision synthesis,
        implement real self-approval identity check, quorum enforcement,
        wire intake gate to governance gate state.
```

Deliverable:

```text
Reproducible canonical state from event log across environments
```

### C — Security

Objective: release-ready supply chain.

```text
EXP-PROGRAM-038 / C
└── EXP-GOV-015   Gate Decision Completeness
        Implement condition fulfillment tracking for approve_with_conditions,
        add superseded to decision mapping, enforce Convergence Certification
        before Mission close.
```

Deliverable:

```text
Governance lifecycle cannot be closed without required evidence
```

### D — Release Validation

Objective: install, build, govern, replay, release.

```text
EXP-PROGRAM-038 / D
├── EXP-CLI-001   CLI Consistency & AI Portability
│       Fix adapter.ts structured output, unify error patterns,
│       fill discovery mode command registry, add help handlers.
│
└── EXP-DOC-002   Projection & Documentation Sync
        Add ADR/expedition-specific extractors, projection freshness
        verification, capability registry snapshotting in knowledge graph.
```

Deliverable:

```text
Release Candidate 1
```

---

## Dependency Chain

```text
A (Structural Integrity) ──┐
B (Determinism) ───────────┤
C (Security) ──────────────┤──► Release Candidate 1
D (Release Validation) ────┘
```

All four workstreams can execute in parallel. The program is complete when all deliverables are met and the release candidate checklist passes.

---

## Success Criteria

1. Execution bypass count drops from 3 to 0.
2. `docs/governance.md` accurately describes the three-layer gate model.
3. CLI error output is uniformly structured JSON with `kind` discriminators.
4. Projections include ADR/expedition metadata.
5. Gate decisions enforce condition fulfillment before acceptance.
6. Discovery safety model covers 100% of CLI commands.
7. Clean clone produces identical event-log replay hashes.
8. `npm run govern` and `npm test` pass after all hardening.

---

## Protected Assets

- **ExecutionGate API** — May be modified only by EXP-SEC-001, through the ADR-050 freeze lift already authorized.
- **Constitutional Baseline** — No changes required.
- **Public Vocabulary** — No changes to the seven canonical terms.
- **Event Model** — No changes to event schema or replay semantics.

---

## Relationship to Other Work

- **Repository Baseline Report 2026-07-25** — This program assumes that baseline.
- **ADR-050** — Authorized freeze lift for SEC-001's execution path modifications.
- **EXP-PROGRAM-035** — GOV-014 fixes gaps in this program's gate engine implementation.
- **EXP-PROGRAM-036** — GOV-015 extends this program's gate decision model.
- **EXP-GATE-013** — Dependency enforcement (parallel future work, no overlap).
- **EXP-PROGRAM-042 — Platform Freeze & Release Certification** — The successor program that freezes the platform after this one hardens it.

---

## Definition of Done

- [ ] Workstream A deliverable: zero structural bypasses.
- [ ] Workstream B deliverable: deterministic replay across environments.
- [ ] Workstream C deliverable: required evidence enforced before close.
- [ ] Workstream D deliverable: Release Candidate 1 exists and passes validation.
- [ ] All 45 audit findings are addressed or explicitly accepted as residual risk.
- [ ] `npm run govern` passes.
