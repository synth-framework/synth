# EXP-PROGRAM-038 — Audit Remediation

**Status:** Proposed  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Cross-domain audit remediation  
**Era:** III — Validation & Hardening  
**Architecture Impact:** Medium  
**Constitutional Impact:** Low  
**Public Impact:** Low  
**Execution Impact:** High

---

> ## Era III entry path
>
> ADR-040 requires that new Programs in Era III be justified by observed friction from real-world use. The findings in this program originate from a comprehensive system audit (governance framework, execution gate integrity, projections, CLI, security, AI portability) commissioned by the Architecture Owner on 2026-07-22. Each expedition maps to concrete, observed gaps in the existing system — not speculative improvements.

---

## Audit Context

On 2026-07-22, a comprehensive audit of the SYNTH codebase was conducted across six domains:

| Domain | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|
| Governance Framework | 12 | 0 | 5 | 4 | 3 |
| Security & Execution Gate | 10 | 3 | 1 | 4 | 2 |
| Projections & Documentation Sync | 7 | 0 | 2 | 3 | 2 |
| CLI Quality & AI Portability | 16 | 2 | 4 | 5 | 5 |

**Total: 45 findings (5 critical, 12 high, 16 medium, 12 low)**

Each finding maps to at least one expedition in this program.

---

## Composition

```
EXP-PROGRAM-038 — Audit Remediation
│
├── EXP-SEC-001   Execution Gate Bypass Hardening
│       Close 3 critical security bypasses (PartitionStore, FilesystemProvider, shell injection)
│       + 4 medium gaps (stack-trace guard, shallow freeze, dead code, verification stores)
│
├── EXP-GOV-014   Governance Model & Engine Integrity
│       Update docs/governance.md, fix fake ReviewDecision synthesis,
│       implement real self-approval identity check, quorum enforcement,
│       wire intake gate to governance gate state
│
├── EXP-CLI-001   CLI Consistency & AI Portability
│       Fix adapter.ts structured output, unify error patterns,
│       fill discovery mode command registry, add help handlers
│
├── EXP-DOC-002   Projection & Documentation Sync
│       Add ADR/expedition-specific extractors, projection freshness verification,
│       capability registry snapshotting in knowledge graph
│
└── EXP-GOV-015   Gate Decision Completeness
│       Implement condition fulfillment tracking for approve_with_conditions,
│       add superseded to decision mapping,
│       enforce Convergence Certification before close
```

---

## Dependency Chain

```text
EXP-SEC-001  (no deps — independent)
    ↓
EXP-GOV-014  (no deps — independent from SEC)
EXP-CLI-001  (no deps — independent)
EXP-DOC-002  (no deps — independent)
EXP-GOV-015  (depends on understanding of existing gate model — post-GOV-014)
```

All five expeditions can execute in parallel except GOV-015 which depends on GOV-014.

---

## Success Criteria

1. Execution bypass count drops from 3 to 0.
2. `docs/governance.md` accurately describes the three-layer gate model.
3. CLI error output is uniformly structured JSON with `kind` discriminators.
4. Projections include ADR/expedition metadata.
5. Gate decisions enforce condition fulfillment before acceptance.
6. Discovery safety model covers 100% of CLI commands.
7. `npm run govern` and `npm test` pass after all remediations.

---

## Protected Assets

- **ExecutionGate API** — May be modified only by EXP-SEC-001, through the ADR-050 freeze lift already authorized.
- **Constitutional Baseline** — No changes required.
- **Public Vocabulary** — No changes to the seven canonical terms.
- **Event Model** — No changes to event schema or replay semantics.

---

## Relationship to Other Work

- **ADR-050** — Authorized freeze lift for SEC-001's execution path modifications.
- **EXP-PROGRAM-035** — GOV-014 fixes gaps in this program's gate engine implementation.
- **EXP-PROGRAM-036** — GOV-015 extends this program's gate decision model.
- **EXP-GATE-013** — Dependency enforcement (parallel work, no overlap).
