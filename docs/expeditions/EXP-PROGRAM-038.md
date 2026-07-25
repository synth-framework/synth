# EXP-PROGRAM-038 — Release Candidate

> Final operator-facing finish work and validation before SYNTH Platform v1.0.

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, ADR-040 — External Build Systems Are Adapters, Repository Baseline Report 2026-07-25, Platform Readiness Report 2026-07-25  
**Scope:** CLI consistency, documentation sync, installer experience, and release-candidate validation  
**Era:** III — Validation & Hardening  
**Architecture Impact:** High  
**Constitutional Impact:** Low  
**Public Impact:** High  
**Execution Impact:** High

---

> ## Era III entry path
>
> ADR-040 requires that new Programs in Era III be justified by observed friction from real-world use. The findings in this program originate from a comprehensive system audit (governance framework, execution gate integrity, projections, CLI, security, AI portability) commissioned by the Architecture Owner on 2026-07-22.
>
> Phase 0 (Repository Baseline Closure, 2026-07-25) certified that the architecture era is complete. Workstreams A/B/C of this program have since closed all hardening gaps. The program now focuses on the **Release Candidate finish line**: the operator-facing surface and the validation required to tag v1.0.

---

## Thesis

> **Architecture is complete. The remaining work is release engineering.**

The repository is architecturally settled and hardened. The next objective is to ensure a third party can install, initialize, operate, and validate SYNTH without tribal knowledge. The audit findings from 2026-07-22 are closed or accepted as residual risk. The new standard for every change is:

> *Does this move the Release Candidate to 100%?*

If the answer is no, the work belongs to Era IV.

---

## Audit Context (input)

On 2026-07-22, a comprehensive audit of the SYNTH codebase was conducted across four domains. Workstreams A/B/C addressed those findings:

| Domain | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|
| Governance Framework | 12 | 0 | 5 | 4 | 3 |
| Security & Execution Gate | 10 | 3 | 1 | 4 | 2 |
| Projections & Documentation Sync | 7 | 0 | 2 | 3 | 2 |
| CLI Quality & AI Portability | 16 | 2 | 4 | 5 | 5 |

**Total: 45 findings (5 critical, 12 high, 16 medium, 12 low)**

All findings are now addressed or explicitly deferred beyond v1.0.

---

## Workstreams

### A — Structural Integrity ✅

Objective: zero uncontrolled mutation paths.

```text
EXP-PROGRAM-038 / A
└── EXP-SEC-001   Execution Gate Bypass Hardening  [COMPLETED]
```

Deliverable:

```text
✅ Zero structural bypasses
```

### B — Determinism ✅

Objective: clean clone → same hashes → same replay.

```text
EXP-PROGRAM-038 / B
└── EXP-GOV-014   Governance Model & Engine Integrity  [COMPLETED]
```

Deliverable:

```text
✅ Reproducible canonical state from event log across environments
```

### C — Security ✅

Objective: release-ready governance enforcement.

```text
EXP-PROGRAM-038 / C
└── EXP-GOV-015   Gate Decision Completeness  [COMPLETED]
```

Deliverable:

```text
✅ Governance lifecycle cannot be closed without required evidence
```

### D — Release Candidate

Objective: the platform is installable, operable, documented, and certifiable.

```text
EXP-PROGRAM-038 / D
├── EXP-CLI-001        CLI Consistency & AI Portability
│       Structured JSON output, unified errors, discovery safety coverage.
│
├── EXP-DOC-002        Projection & Documentation Sync
│       ADR/expedition metadata in projections, freshness verification.
│
└── EXP-INSTALL-012   First-Run / Installer Experience Validation
        End-to-end validation: install → doctor → init → discover → first mission.
```

Deliverable:

```text
Release Candidate 1 — the platform can be installed, operated, and certified by a third party.
```

---

## Dependency Chain

```text
A (Structural Integrity)  ✅
B (Determinism)           ✅
C (Security)              ✅
D (Release Candidate)     ──► Release Candidate 1
```

Workstream D is the only remaining implementation work. Program 042 — Release Certification runs in parallel and collects evidence as D stabilizes.

---

## Success Criteria

1. ✅ Execution bypass count is zero.
2. ✅ `docs/governance.md` accurately describes the three-layer gate model and v1.0 quorum boundary.
3. CLI error output is uniformly structured JSON with `kind` discriminators.
4. Projections include ADR/expedition metadata.
5. ✅ Gate decisions enforce condition fulfillment before acceptance.
6. Discovery safety model covers 100% of CLI commands.
7. A third party can complete the first-run flow within minutes.
8. Clean clone produces identical event-log replay hashes.
9. `npm run govern` and `npm test` pass after all changes.

---

## Protected Assets

- **ExecutionGate API** — May be modified only by EXP-SEC-001, through the ADR-050 freeze lift already authorized.
- **Constitutional Baseline** — No changes required.
- **Public Vocabulary** — No changes to the seven canonical terms.
- **Event Model** — No changes to event schema or replay semantics.

---

## Relationship to Other Work

- **Platform Readiness Report 2026-07-25** — Defines the Release Candidate framing and the v1.0/v2 boundary.
- **Repository Baseline Report 2026-07-25** — This program assumes that baseline.
- **ADR-050** — Authorized freeze lift for SEC-001's execution path modifications.
- **EXP-PROGRAM-035** — GOV-014 fixes gaps in this program's gate engine implementation.
- **EXP-PROGRAM-036** — GOV-015 extends this program's gate decision model.
- **EXP-GATE-013** — Dependency enforcement (parallel future work, no overlap).
- **EXP-PROGRAM-042 — Release Certification** — Collects evidence in parallel and certifies the platform after this program closes.

---

## Definition of Done

- [x] Workstream A deliverable: zero structural bypasses.
- [x] Workstream B deliverable: deterministic replay across environments.
- [x] Workstream C deliverable: required evidence enforced before close.
- [ ] Workstream D deliverable: Release Candidate 1 exists and passes validation.
- [x] All 45 audit findings are addressed or explicitly accepted as residual risk.
- [ ] `npm run govern` passes from a clean clone.
