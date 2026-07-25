# EXP-PROGRAM-042 — Platform Freeze & Release Certification

> Certify that SYNTH v1.0 is frozen, stable, and ready for release.

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, Repository Baseline Report 2026-07-25  
**Scope:** Final certification of the SYNTH v1.0 platform freeze  
**Era:** III — Validation & Hardening  
**Architecture Impact:** High  
**Constitutional Impact:** High  
**Public Impact:** High  
**Execution Impact:** High

---

## Thesis

> **A platform is not released. A platform is certified frozen, and then released.**

After Program 038 hardens the platform, this program locks the architectural surface. It produces the authoritative evidence that SYNTH v1.0 is complete, consistent, and reproducible.

This program does not implement features. It certifies the boundary between architecture and productization.

---

## Purpose

Produce authoritative certification that:

- The kernel is frozen.
- The SDK is frozen.
- The event model is frozen.
- The capability registry is frozen.
- The governance lifecycle is frozen.
- The replay engine is frozen.
- The architecture baseline is documented and accepted.
- The platform can be built, governed, and replayed from a clean clone.

---

## Deliverables

| Artifact | Description |
|---|---|
| **Kernel Freeze Certificate** | Document certifying that `src/core/`, `src/control/`, `src/runtime/`, and `src/domain/` are frozen. |
| **SDK Freeze Certificate** | Document certifying that `src/sdk/` public surface is frozen. |
| **Event Model Freeze Certificate** | Document certifying that `src/types/event.ts` and replay semantics are frozen. |
| **Capability Registry Freeze Certificate** | Document certifying that canonical capabilities are frozen. |
| **Governance Lifecycle Freeze Certificate** | Document certifying that Mission/Expedition lifecycle semantics are frozen. |
| **ADR Freeze List** | Final list of accepted ADRs; any new architectural ADR requires a v2 initiative. |
| **Release Readiness Report** | Checklist covering install, build, govern, replay, security, documentation. |
| **Clean Clone Certification** | Evidence that a fresh clone passes the full governance pipeline. |
| **Reproducible Build Certification** | Evidence that builds are byte-for-byte reproducible or hash-stable. |
| **Architecture Baseline v1.0** | Consolidated architecture document referencing all frozen artifacts. |

---

## Program Composition

```text
EXP-PROGRAM-042
Platform Freeze & Release Certification
│
├── EXP-FREEZE-001  Kernel Freeze Certification
│
├── EXP-FREEZE-002  SDK Freeze Certification
│
├── EXP-FREEZE-003  Event Model & Replay Freeze Certification
│
├── EXP-FREEZE-004  Capability Registry Freeze Certification
│
├── EXP-FREEZE-005  Governance Lifecycle Freeze Certification
│
├── EXP-FREEZE-006  ADR Freeze & Architectural Baseline v1.0
│
├── EXP-FREEZE-007  Clean Clone Certification
│
├── EXP-FREEZE-008  Reproducible Build Certification
│
└── EXP-FREEZE-009  Release Readiness Report
```

---

## Success Criteria

- All freeze certificates are published in `docs/freeze/`.
- The Architecture Baseline v1.0 is accepted.
- Clean clone certification passes on a machine-independent environment.
- Reproducible build certification passes.
- No architectural changes are permitted without a new platform program or v2 initiative.
- `npm run govern` passes from a clean clone.

---

## Governance Rule After Closure

> **Any architectural change to the kernel, SDK, event model, governance lifecycle, or replay engine requires a new platform program or a v2 architecture initiative.**

Bug fixes, security patches, performance improvements, and documentation updates are allowed within the frozen surface.

---

## Relationship to Other Work

- **EXP-PROGRAM-038 — Platform Hardening** is the immediate predecessor. This program cannot begin until 038 closes.
- **EXP-PROGRAM-029, 032, 034, 037** are adoption-era programs that may begin only after this program closes.
- **Repository Baseline Report 2026-07-25** defines the architectural settlement that precedes freeze.

---

## Definition of Done

- [ ] All nine freeze/certification expeditions are completed and accepted.
- [ ] Freeze certificates are published and cross-referenced.
- [ ] Clean clone and reproducible build certifications pass.
- [ ] The governance rule above is recorded in `docs/governance.md`.
- [ ] `npm run govern` passes from a clean clone.
