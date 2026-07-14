# EXP-PROGRAM-005 — Adaptive Validation Program

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Intelligent local validation without weakening constitutional guarantees  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** None  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** None

---

## Thesis

> **Local validation should be as fast as the change allows. CI must remain exhaustive.**

Today every developer pays the full cost of `npm run govern` for every change, even when the change cannot possibly affect most of what `govern` proves. That cost is appropriate for CI and merges, but it slows iteration and wastes energy.

The Adaptive Validation Program compiles a minimum sound validation plan from a git diff while preserving the absolute guarantee that every change merged to `main` still passes the full `npm run govern` gate.

---

## Purpose

Reduce local validation time without reducing constitutional guarantees.

This program introduces **no changes to governance semantics**. The constitutional proof remains unchanged. Only the path to that proof becomes intelligent.

> **Constitutional Rule:** `npm run govern` remains the final gate for merges and releases. Local adaptive validation is an optimization, never a replacement.

---

## Mission

Build a Validation Compiler that reads a change set, determines affected capabilities, maps capabilities to their required tests, escalates when Protected Assets are touched, and produces a deterministic validation plan for the developer or AI agent to execute.

---

## Program Composition

```
EXP-PROGRAM-005
Adaptive Validation Program
│
├── EXP-VAL-008  Impact Analysis
│       Validation Expedition
│       Given a git diff, determine affected capabilities, protected assets, and risk.
│
├── EXP-VAL-009  Validation Planner
│       Validation Expedition
│       Produce a deterministic, ordered validation plan from an impact report.
│
├── EXP-VAL-010  Capability ↔ Test Mapping
│       Validation Expedition
│       Declare which tests, benchmarks, and proofs each capability requires.
│
├── EXP-VAL-011  Protected Asset Escalation
│       Validation Expedition
│       Ensure changes to Protected Assets always trigger the full governance run.
│
└── EXP-VAL-012  CI/Local Validation Integration
│       Validation Expedition
│       Integrate adaptive validation into the CLI and CI without bypassing govern.
```

---

## Invariants

The following are non-negotiable for the entire program:

1. `npm run govern` remains the canonical final verification.
2. Protected Assets always trigger full validation.
3. Adaptive validation never skips a test that could be affected by the change.
4. The validation plan is deterministic for the same diff.
5. AI agents and humans receive the same plan for the same diff.

---

## Success Criteria

- A typo fix in documentation validates in seconds, not minutes.
- A change to `src/runtime/` triggers replay, determinism, adversarial, and governance checks.
- A change to a Protected Asset triggers the full `npm run govern` plan.
- `synth validate` produces a machine-readable plan that AI agents can execute.
- CI still runs `npm run govern` end-to-end on every merge.

---

## Definition of Done

- [x] EXP-VAL-008 completed.
- [x] EXP-VAL-009 completed.
- [x] EXP-VAL-010 completed.
- [x] EXP-VAL-011 completed.
- [x] EXP-VAL-012 completed.
- [x] Program accepted.

---

## Completion Notes

All five Validation Expeditions were implemented and merged without modifying any Protected Asset.

- Impact analysis, validation planning, capability mapping, protected-asset escalation, and CLI/CI integration are now operational.
- `synth validate` provides fast local feedback while `npm run govern` remains the canonical merge gate.
- The Validation Compiler is deterministic and produces the same plan for the same diff across human and AI use.

Program accepted. Execution state transitions to EXP-PROGRAM-004 — First Contact Program.
