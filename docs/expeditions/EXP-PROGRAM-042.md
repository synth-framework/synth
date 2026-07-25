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

SYNTH Platform v1.0 is **feature complete**. Program 038 — Release Candidate has closed. The remaining work is exclusively the collection of evidence that proves the platform is ready to ship.

Freeze is an outcome; certification is the work.

---

## Release Candidate Policy

> **On the v1.0 branch, only the following changes are permitted:**
>
> 1. **Defect correction** — fixes for issues discovered during certification.
> 2. **Certification evidence** — artifacts, measurements, and proofs required by this program.
> 3. **Release artifacts** — changelogs, release notes, version tags, and packaging metadata.
>
> **No new capabilities. No architectural expansion. No "while we're here..." improvements.**
>
> Anything else belongs to vNext or a post-v1.0 program.

This policy protects Release Candidate 1 (RC1) from feature creep while allowing the legitimate work required to finish the release.

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

## Certification Tracks

Program 042 is organized into five certification tracks. Each track collects evidence and produces one certificate.

### Track A — Reproducibility

> **Question:** Can a fresh clone reproduce the validated state?

Evidence required:

- Clean clone of the repository
- Successful `npm install`
- Successful `npm run build`
- Successful `npm run govern`
- Deterministic replay hashes across runs
- Deterministic state hashes across environments
- Build hash stability (byte-for-byte or manifest-hash-stable)

Deliverable:

```text
Reproducibility Certificate
```

---

### Track B — Operator Experience

> **Question:** Can a first-time operator adopt SYNTH without tribal knowledge?

Evidence required:

- First Operator Experience test passes (`tests/first-operator-experience.test.js`)
- Installer contract tests pass
- `synth doctor` JSON contract documented
- Discovery safety validated
- Onboarding guide published (`docs/getting-started/first-five-minutes.md`)

Deliverable:

```text
Operator Experience Certificate
```

---

### Track C — Governance

> **Question:** Does the governance system enforce its own rules deterministically?

Evidence required:

- Governance lifecycle replay certification
- Convergence certification
- Bypass audit clean
- Condition / acceptance enforcement validated
- Identity governance validator clean (0 errors, 0 warnings)
- Expedition governance validator clean

Deliverable:

```text
Governance Certificate
```

---

### Track D — Architecture

> **Question:** Is the architecture frozen and documented?

Evidence required:

- Kernel boundary freeze
- SDK public surface freeze
- Event model freeze
- Capability registry freeze
- ADR freeze list
- Architecture Baseline v1.0
- Historical program/expedition/ADR index

Deliverable:

```text
Architecture Baseline Certificate
```

---

### Track E — Release Readiness

> **Question:** Is the release package complete?

Evidence required:

- Changelog
- Migration notes
- Release notes
- npm package validation
- Version tag
- SBOM / dependency audit
- Signed release artifact or provenance record

Deliverable:

```text
Release Readiness Certificate
```

---

## Program Composition

```text
EXP-PROGRAM-042
Release Certification
│
├── Track A — Reproducibility
│   └── Reproducibility Certificate
│
├── Track B — Operator Experience
│   └── Operator Experience Certificate
│
├── Track C — Governance
│   └── Governance Certificate
│
├── Track D — Architecture
│   └── Architecture Baseline Certificate
│
├── Track E — Release Readiness
│   └── Release Readiness Certificate
│
└── SYNTH Platform v1.0 Certification Report
    (historical narrative record of the release)
```

---

## Success Criteria

- All five certificates are published in `docs/certifications/`.
- The SYNTH Platform v1.0 Certification Report is published.
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

- **EXP-PROGRAM-038 — Release Candidate** is now complete. This program inherits its validated state.
- **EXP-PROGRAM-029, 032, 034, 037** are adoption-era programs that may begin only after this program closes.
- **Platform Readiness Report 2026-07-25** defines the Release Candidate framing and the v1.0/v2 boundary.
- **Repository Baseline Report 2026-07-25** defines the architectural settlement that precedes certification.

---

## Definition of Done

- [x] Track A — Reproducibility Certificate published.
- [x] Track B — Operator Experience Certificate published.
- [x] Track C — Governance Certificate published.
- [x] Track D — Architecture Baseline Certificate published.
- [x] Track E — Release Readiness Certificate published.
- [x] SYNTH Platform v1.0 Certification Report published.
- [x] The Release Candidate policy is recorded in `docs/governance.md`.
- [ ] Release Review checklist is completed and signed off.
- [ ] `npm run govern` passes from a clean clone (final operator validation).
