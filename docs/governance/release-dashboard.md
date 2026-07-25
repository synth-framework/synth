# SYNTH Release Candidate Dashboard

**Last updated:** 2026-07-25  
**Authority:** Platform Readiness Report 2026-07-25, EXP-PROGRAM-038 — Release Candidate, EXP-PROGRAM-042 — Release Certification

> **Rule:** Every remaining change must answer "Does this move the Release Candidate to 100%?" If no, it belongs to Era IV.

---

## Overall Progress

```text
Release Candidate Completion
██████████████████████░░░░░░░░░░░░░░░░ 58%
```

---

## Dimension Breakdown

| Dimension | Progress | Status | Evidence / Owner |
|-----------|----------|--------|------------------|
| **Architecture** | `██████████ 100%` | ✅ Complete | Repository simplification, platform canonicalization, identity governance clean |
| **Governance** | `██████████ 100%` | ✅ Complete | Lifecycle certified, H2/H4 resolved, GOV-015 closed |
| **Replay** | `██████████ 100%` | ✅ Complete | Deterministic replay certified, graph integrity clean |
| **Security** | `██████████ 100%` | ✅ Complete | Bypass audit clean, condition/convergence enforcement in place |
| **CLI** | `██████████ 100%` | ✅ Complete | EXP-CLI-001 — structured JSON, unified error model, discovery safety, contract tests |
| **Documentation** | `███████░░░ 70%` | 🟡 In progress | EXP-DOC-002 — ADR/expedition metadata, freshness verification |
| **Installer Experience** | `██████░░░░ 60%` | 🔴 Not started | EXP-INSTALL-012 — first-run journey validation |
| **Release Certification** | `████░░░░░░ 40%` | 🟡 In progress | Program 042 active; certificates chartered, evidence collection begins |

---

## Critical Path

```text
┌─────────────────────────────────────────────────────────────┐
│  EXP-CLI-001        CLI Consistency          [100%] ✅      │
│  EXP-DOC-002        Documentation Sync       [70%] 🟡       │
│  EXP-INSTALL-012    Installer Experience     [60%] 🔴       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  EXP-PROGRAM-042  Release Certification      [40%] 🟡       │
│  (collects evidence in parallel)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  SYNTH Platform v1.0 GA                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Blockers to GA

| Blocker | Expedition | Status |
|---------|------------|--------|
| CLI structured JSON output | EXP-CLI-001 | ✅ |
| Unified error model with `kind` | EXP-CLI-001 | ✅ |
| Discovery safety model complete | EXP-CLI-001 | ✅ |
| ADR/expedition metadata projections | EXP-DOC-002 | 🟡 |
| Projection freshness verification | EXP-DOC-002 | 🟡 |
| End-to-end first-run validation | EXP-INSTALL-012 | 🔴 |
| Clean-clone `npm run govern` | Release Certification | 🔴 |
| Reproducible build evidence | Release Certification | 🔴 |
| Published release certificates | Release Certification | 🔴 |

---

## Deferred to Era IV

- **EXP-PROGRAM-029** — AI Ecosystem Distribution
- **EXP-PROGRAM-031** — Architectural Convergence
- **EXP-PROGRAM-032** — Operator Optimization Pipeline
- **EXP-PROGRAM-034** — Task Orchestration Engine
- **EXP-PROGRAM-037** — Ecosystem Adoption & Community Growth
- Numeric quorum, rich review decisions, score defaults

---

## How to Update This Dashboard

1. Run `node scripts/verify-expedition-governance.js` to confirm identity/ownership baseline.
2. Update progress percentages as expeditions close.
3. Move dimensions to ✅ when their acceptance criteria are met and evidence is recorded.
4. Regenerate after each Program 038 / Program 042 milestone.
