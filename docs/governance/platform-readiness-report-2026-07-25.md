# SYNTH Platform Readiness Report

**Date:** 2026-07-25  
**Authority:** Repository Baseline Report 2026-07-25, EXP-PROGRAM-038 — Release Candidate  
**Purpose:** Portfolio review to determine the minimum work required to declare SYNTH Platform v1.0 complete.

---

## Executive Summary

The architecture era is complete. The repository has a certified governance lifecycle, deterministic replay, canonical SDK ownership, and a clean identity/ownership baseline. SYNTH is now entering the **Release Candidate phase**.

The remaining v1.0 work is **release engineering**, not architecture. Only **one program is actively in flight** (038), and only **three expeditions** remain on the critical path:

- **EXP-CLI-001** — CLI Consistency & AI Portability
- **EXP-DOC-002** — Projection & Documentation Sync
- **EXP-INSTALL-012** — First-Run / Installer Experience Validation

After those close, the remaining work is **certification**, not implementation:

- **EXP-PROGRAM-042** — Release Certification
- Clean-clone validation of `npm run govern`
- Reproducible build evidence
- v1.0 tag

All other proposed programs are adoption/orchestration/architecture-evolution work that should be deferred to the post-v1.0 era.

> **Release Candidate rule:** Every remaining change must answer "Does this move the Release Candidate to 100%?" If the answer is no, it does not go into v1.0.

---

## 1. Which Programs Are Actually Still Active?

### Programs marked Active

| Program | Title | Status | Assessment |
|---------|-------|--------|------------|
| **038** | Release Candidate | Active | Correctly active. Hardening is complete; remaining work is CLI, docs, installer validation, and release certification. |

### Programs marked Proposed

| Program | Title | v1.0 Relevance | Recommendation |
|---------|-------|----------------|----------------|
| **029** | AI Ecosystem Distribution | Adoption-era | **Defer** to v2 / Era IV |
| **031** | Architectural Convergence | Architecture-evolution | **Defer** to v2 |
| **032** | Operator Optimization Pipeline | Operator-experience evolution | **Defer** to v2 |
| **034** | Task Orchestration Engine | Orchestration replacement for npm | **Defer** to v2 |
| **037** | Ecosystem Adoption & Community Growth | Growth/marketing | **Defer** to v2 |
| **042** | Release Certification | v1.0 gate | **Activate immediately**; run in parallel with remaining implementation work and collect evidence as CLI/docs/installer stabilize. |

### Programs recently completed and correctly closed

- 027, 035, 036, 039, 040, 041 — all complete and accepted.
- 001–028 (with noted supersessions) — historical, complete.

---

## 2. Which Proposed Programs Are Actually v2 Work?

| Program | Why It Is v2 |
|---------|--------------|
| **029** | Distribution assumes a frozen, trustworthy platform. Skills, MCP servers, IDE rules, and npm packages are adoption accelerators, not v1.0 prerequisites. |
| **031** | Continuous architectural convergence review is a governance maturity capability. It stabilizes a growing portfolio, but the current portfolio is already settled. |
| **032** | Operator optimization is a projection-layer enhancement. It improves efficiency but does not change whether the platform can execute deterministically. |
| **034** | Replacing `package.json` orchestration with a canonical task engine is a deep architectural change. It should happen after v1.0 is frozen and reproducible. |
| **037** | Community growth, launch campaigns, and social channels require a released platform and working installation/docs. |

---

## 3. What Are the True Blockers to v1.0?

A blocker is defined as work that, if omitted, prevents SYNTH from being **installed, governed, and released** by a third party.

| Blocker | Expedition | Why It Blocks v1.0 |
|---------|------------|--------------------|
| CLI produces structured, machine-readable output | EXP-CLI-001 | AI agents and CI systems cannot reliably parse current CLI output. This is the primary operator interface. |
| Discovery safety model covers all commands | EXP-CLI-001 | Prevents accidental mutation during brownfield/agent discovery. |
| Error output is uniform and discriminable | EXP-CLI-001 | Required for deterministic automation and debugging. |
| Documentation projections include ADR/expedition metadata | EXP-DOC-002 | Operators need an authoritative, generated view of architecture decisions and active work. |
| Projection freshness verification | EXP-DOC-002 | Without it, generated docs can drift from source silently. |
| First-run installer experience is validated end-to-end | EXP-INSTALLER-001 | A third party must be able to install, initialize, discover, and start a governed mission within minutes. |
| Clean-clone `npm run govern` passes | Release Certification | The release must be reproducible from a fresh clone. |
| Reproducible build certification | Release Certification | Required to prove that `dist/` and proofs are deterministic. |
| Release certificates published | Release Certification | Required to establish the v1.0 architectural boundary. |

### Non-blockers (already satisfied or deferred)

- Governance lifecycle — ✅ certified
- Deterministic replay — ✅ certified
- Structural integrity / bypass audit — ✅ clean
- Condition fulfillment and convergence enforcement — ✅ complete
- Numeric quorum, rich decisions, score defaults — explicitly deferred
- Distribution, adoption, task orchestration, operator optimization — Era IV

---

## 4. Minimal Remaining Critical Path to v1.0

```text
┌─────────────────────────────────────────┐
│  Program 038 — Release Candidate        │
│  ├─ EXP-CLI-001        CLI Consistency  │
│  ├─ EXP-DOC-002        Documentation    │
│  └─ EXP-INSTALLER-001  Installer Experience
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Close Program 038                      │
│  - all 45 audit findings closed/deferred│
│  - `npm run govern` passes              │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Program 042 — Release Certification    │
│  (run in parallel with implementation)  │
│  ├─ Kernel Certification                │
│  ├─ SDK Certification                   │
│  ├─ Event Model & Replay Certification  │
│  ├─ Capability Registry Certification   │
│  ├─ Governance Lifecycle Certification  │
│  ├─ Operator / CLI Certification        │
│  ├─ Documentation Certification         │
│  ├─ ADR Freeze & Architecture Baseline  │
│  ├─ Clean Clone Certification           │
│  ├─ Reproducible Build Certification    │
│  └─ Release Readiness Report            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Tag SYNTH Platform v1.0                │
└─────────────────────────────────────────┘
```

---

## 5. Expeditions Explicitly Deferred Beyond v1.0

### Adoption & distribution (Era IV)

- All **EXP-ADOPT-*** (21 expeditions under Program 037)
- All **EXP-DIST-*** (4+ expeditions under Program 029)
- **EXP-PROGRAM-029** — AI Ecosystem Distribution
- **EXP-PROGRAM-037** — Ecosystem Adoption & Community Growth

### Architecture evolution (post-freeze)

- **EXP-PROGRAM-031** — Architectural Convergence
- **EXP-PROGRAM-032** — Operator Optimization Pipeline
- **EXP-PROGRAM-034** — Task Orchestration Engine
- **EXP-GATE-013** — Gate State & Dependency Enforcement (already noted as deferred in Program 035)
- **EXP-REFINE-010, 014, 015, 016** — Refinement enhancements

### Governance semantics deferred by design

- Numeric quorum, weighted voting, hierarchical/delegated approvals
- Rich review decisions (split/merge/supersede/escalate)
- Alignment-contract score defaults

### Expeditions to close or merge

| Expedition | Current Status | Action |
|------------|----------------|--------|
| EXP-GENESIS-001 | Executing | Close as complete; Program 023 is accepted and Genesis is operational. |
| EXP-GENESIS-002 | Executing | Close as complete; intent capture/classification is implemented via Mission Studio and first-contact flow. |
| EXP-BROWNFIELD-002 | Executing | Verify whether discovery-safety gaps are covered by EXP-CLI-001. If yes, close; if not, finish as part of Workstream D. |
| EXP-ADP-000 | Accepted | Mark Completed — adapter architecture spec is canonical. |
| EXP-CONVERGENCE-001 | Accepted | Mark Completed — Program 020 → 027 convergence is done. |
| EXP-DISC-001 | Accepted | Mark Completed — status taxonomy is in use. |
| EXP-FIRSTCONTACT-003, 010 | Accepted | Mark Completed — first-contact artifacts are shipped. |
| EXP-GOVERNABILITY-001–005 | Accepted | Mark Completed — these certifications/designs are already implemented and operational. |
| EXP-REFINE-013 | Accepted | Mark Completed — mission projection is operational. |

---

## 6. Supporting Artifacts

### Release Dashboard

Create a single executive view that tracks Release Candidate completion:

```text
Release Candidate Dashboard

Architecture          ██████████ 100%
Governance            ██████████ 100%
Replay                ██████████ 100%
Security              ██████████ 100%
CLI                   ████████░░  80%
Documentation         ███████░░░  70%
Installer Experience  ██████░░░░  60%
Release Certification ████░░░░░░  40%
─────────────────────────────────────
Overall               ████████░░  86%
```

The dashboard should be regenerated from expedition/program statuses and linked from `docs/governance/README.md`.

### Historical Index

After closing the accepted/executing expeditions, generate a single searchable index:

```text
Era I — Foundation
  Programs: 001–019
  Key ADRs: ADR-001 … ADR-020

Era II — Governance & Runtime
  Programs: 020–030
  Key ADRs: ADR-021 … ADR-040

Era III — Validation & Release
  Programs: 031–042
  Key ADRs: ADR-041 … ADR-050
```

This becomes the canonical reference for "what happened when" and prevents future expeditions from re-discovering settled decisions.

---

## 7. Recommended Immediate Actions

1. **Approve this portfolio pruning and the Release Candidate framing.**
2. **Update Program 038** to reflect Release Candidate scope: CLI, Documentation, Installer Experience.
3. **Rename/refocus Program 042** as **Release Certification** and activate it immediately to collect evidence in parallel.
4. **Charter EXP-INSTALLER-001** — validate `install → doctor → init → discover → first mission` end-to-end.
5. **Close the listed accepted/executing expeditions** that are already operational and generate the Historical Index.
6. **Create the Release Dashboard** and regenerate it as statuses change.
7. **Proceed with EXP-CLI-001, EXP-DOC-002, and EXP-INSTALLER-001** with the single acceptance rule: *does this move the Release Candidate to 100%?*
8. **Run clean-clone validation** as soon as the three implementation expeditions close, then finalize Release Certification.

---

## Conclusion

SYNTH is no longer an architecture-in-progress. The remaining v1.0 work is **release engineering**: a stable CLI, reliable documentation projections, a polished first-run experience, and formal release certification. After those close, the platform can be tagged v1.0. Everything else—distribution, adoption, orchestration, optimization, richer governance semantics—belongs to Era IV and should be planned against the frozen v1.0 baseline.
