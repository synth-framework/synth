# EXP-PROGRAM-042 — Release Certification

> Produce authoritative evidence that SYNTH Platform v1.0 is complete, consistent, and reproducible.

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, Repository Baseline Report 2026-07-25, Platform Readiness Report 2026-07-25  
**Scope:** Certification of the SYNTH v1.0 release across kernel, SDK, event model, capability registry, governance lifecycle, operator surface, documentation, and build reproducibility  
**Era:** III — Validation & Hardening  
**Architecture Impact:** High  
**Constitutional Impact:** High  
**Public Impact:** High  
**Execution Impact:** High

---

## Thesis

> **A platform is not released. A platform is certified, and then released.**

Freeze is an outcome; certification is the work. This program runs in parallel with the final Release Candidate implementation (Program 038 / Workstream D) and produces the authoritative evidence that SYNTH v1.0 is complete, consistent, and reproducible.

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

| Certificate | Description |
|---|---|
| **Kernel Certification** | `src/core/`, `src/control/`, `src/runtime/`, `src/domain/` are frozen and validated. |
| **SDK Certification** | `src/sdk/` public surface is frozen and documented. |
| **Event Model & Replay Certification** | `src/types/event.ts`, replay semantics, and derived-state contracts are frozen. |
| **Capability Registry Certification** | Canonical capabilities are frozen and listed. |
| **Governance Lifecycle Certification** | Mission/Expedition lifecycle semantics are frozen and deterministic. |
| **Operator / CLI Certification** | CLI commands produce structured output and the discovery safety model is complete. |
| **Documentation Certification** | Generated projections are fresh and include ADR/expedition metadata. |
| **ADR Freeze List** | Final list of accepted ADRs; any new architectural ADR requires a v2 initiative. |
| **Release Readiness Report** | Checklist covering install, build, govern, replay, security, documentation. |
| **Clean Clone Certification** | Evidence that a fresh clone passes the full governance pipeline. |
| **Reproducible Build Certification** | Evidence that builds are byte-for-byte reproducible or hash-stable. |
| **Architecture Baseline v1.0** | Consolidated architecture document referencing all frozen artifacts. |

---

## Program Composition

Certification expeditions will be chartered under this program as the Release Candidate dimensions stabilize. Each deliverable above maps to one or more certification expeditions that collect evidence, produce the certificate, and record it in the event log.

```text
EXP-PROGRAM-042
Release Certification
│
├── Kernel Certification
├── SDK Certification
├── Event Model & Replay Certification
├── Capability Registry Certification
├── Governance Lifecycle Certification
├── Operator / CLI Certification
├── Documentation Certification
├── ADR Freeze & Architectural Baseline v1.0
├── Clean Clone Certification
├── Reproducible Build Certification
└── Release Readiness Report
```

---

## Success Criteria

- All certificates are published in `docs/certifications/`.
- The Architecture Baseline v1.0 is accepted.
- Clean clone certification passes on a machine-independent environment.
- Reproducible build certification passes.
- No architectural changes are permitted without a new platform program or v2 initiative.
- `npm run govern` passes from a clean clone.

---

## Governance Rule After Closure

> **Any architectural change to the kernel, SDK, event model, governance lifecycle, capability registry, or replay engine requires a new platform program or a v2 architecture initiative.**

Bug fixes, security patches, performance improvements, and documentation updates are allowed within the frozen surface.

---

## Relationship to Other Work

- **EXP-PROGRAM-038 — Release Candidate** runs in parallel; this program collects certification evidence as 038 stabilizes.
- **EXP-PROGRAM-029, 032, 034, 037** are adoption-era programs that may begin only after this program closes.
- **Platform Readiness Report 2026-07-25** defines the Release Candidate framing and the v1.0/v2 boundary.
- **Repository Baseline Report 2026-07-25** defines the architectural settlement that precedes certification.

---

## Definition of Done

- [ ] All certification expeditions are completed and accepted.
- [ ] Certificates are published and cross-referenced.
- [ ] Clean clone and reproducible build certifications pass.
- [ ] The governance rule above is recorded in `docs/governance.md`.
- [ ] `npm run govern` passes from a clean clone.
