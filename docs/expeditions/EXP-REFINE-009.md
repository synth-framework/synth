# EXP-REFINE-009 — Certification

**Status:** Proposed  
**Kind:** Certification Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 4 — Integration and Certification  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-REFINE-015, EXP-REFINE-016, EXP-GOVERNABILITY-001, EXP-GOVERNABILITY-003, EXP-GOVERNABILITY-005, EXP-HOME-026, EXP-HOME-027, EXP-REFINE-008

---

## Goal

Certify the full Program 036 alignment governance model — Divergence Gate, Alignment Contract, Convergence Certification — against Program 027's actual intent and outcome, proving the remaining scenarios that EXP-GOVERNABILITY-001 could not certify.

---

## Background

EXP-GOVERNABILITY-001 (Governability Regression Certification) achieved **PARTIAL PASS**: 8/8 drift classes rejected, 4/4 valid branches admitted. However, it certified only the Divergence Gate evaluation step. The following remained unproven:

1. Full Genesis Layer pipeline: Raw Intent → Intent Model → Refinement → Alignment Contract → Divergence Gate → Mission
2. Convergence Certification integration with gate engine
3. End-to-end lifecycle under Program 027's actual alignment contract

Since EXP-GOVERNABILITY-001, the following mechanisms have been implemented and require certification:
- Convergence Certification (`src/governance/convergence-certification/`)
- Proposal Evaluation in Review Gate and Acceptance Gate (EXP-GOVERNABILITY-004)
- Governance Context Resolver

---

## Deliverables

1. **End-to-end certification test** covering the full Genesis → Synthesis → Governance lifecycle against Program 027's actual Intent Model and Alignment Contract.
2. **Convergence Certification scenarios** from EXP-PROGRAM-036:
   - Scenario 1 — Straight-through alignment
   - Scenario 4 — Changed Alignment Contract invalidates Mission
   - Scenario 5 — Convergence failure after implementation
3. **Integration tests** proving Convergence Certification consumes Proposal Evaluation results and gates Mission completion correctly.
4. **Program 027 pilot validation** — demonstrate that the homepage can be governed under the combined 035/036 model.
5. **Certification report** artifact updating the governability-regression-certification.json status from `partial_pass` to `pass`.

---

## Acceptance Criteria

- All five certification scenarios pass deterministically.
- The Divergence Gate blocks Mission creation when alignment is incomplete.
- Re-approval of an Alignment Contract invalidates downstream Missions.
- Convergence Certification correctly classifies divergence.
- Program 027 can be retrofitted without implementation changes.

---

## Out of Scope

- Performance benchmarks.
- Real-world operator studies.
- Automated visual comparison tooling.

---

## Related

- ADR-047 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-REFINE-008 — Program 027 Retrofit
