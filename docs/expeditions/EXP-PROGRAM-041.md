# EXP-PROGRAM-041 — Platform Canonicalization

> Every infrastructure capability in SYNTH has exactly one canonical owner through the Internal Platform SDK.

**Status:** Completed  
**Kind:** Program  
**Closed:** 2026-07-24  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution, ADR-004, ADR-044  
**Scope:** Canonical infrastructure contracts and construction patterns  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** Low  
**Public Impact:** Medium  
**Execution Impact:** High

---

## Purpose

Replace duplicated infrastructure implementations with canonical SDK modules. The SDK is not a utilities folder; it is the authoritative ownership surface for paths, workspace discovery, filesystem I/O, JSON, hashing, identity, temporary resources, process execution, event access, and state access.

---

## Program Composition

```text
EXP-PROGRAM-041
Platform Canonicalization
│
├── Stage 1 — Canonical Infrastructure Audit
│   └── EXP-PLATFORM-001                 Canonical Infrastructure Audit
│
├── Stage 2 — Internal Platform SDK
│   └── EXP-PLATFORM-002                 Internal Platform SDK
│       (formerly referenced as EXP-SIMPLIFICATION-003A)
│
├── Stage 3 — Construction Consistency
│   └── EXP-PLATFORM-003                 Construction Canonicalization
│
└── Stage 4 — Utility Extraction
    └── EXP-PLATFORM-004                 Utility Extraction (completed)
```

---

## Protected Assets

- Event Store API
- State Store API
- Replay semantics
- ExecutionGate
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

---

## Success Criteria

- Every major infrastructure concern has one canonical owner.
- Application code imports infrastructure operations from `src/sdk/` instead of inlining them.
- Construction patterns accept explicit canonical inputs rather than hidden environment values.
- The SDK exposes stateless functions, not service locators.
- No SDK module is added without deleting or deprecating an existing duplicate.

---

## Closure Evidence

All four stages of EXP-PROGRAM-041 are complete:

| Stage | Expedition | Status |
|---|---|---|
| Canonical Infrastructure Audit | EXP-PLATFORM-001 | Completed |
| Internal Platform SDK | EXP-PLATFORM-002 | Completed |
| Construction Consistency | EXP-PLATFORM-003 | Completed |
| Utility Extraction | EXP-PLATFORM-004 | Completed and accepted |

Verification:

- `npm run build` passes.
- `npm test` passes.
- `node scripts/verify-expedition-governance.js` reports **0 errors, 0 warnings**.
- `sortKeys` / `stableStringify` now have a single canonical owner in `src/sdk/json/index.ts`.

## Relationship to Other Work

- **EXP-PROGRAM-040 — Repository Simplification** provides the structural simplification that makes the SDK surface stable.
- **EXP-PROGRAM-034 — Task Orchestration Engine** will consume the canonical task model and SDK paths.
- **docs/strategy/simplification-program.md** is the strategic roadmap that chartered this program.
