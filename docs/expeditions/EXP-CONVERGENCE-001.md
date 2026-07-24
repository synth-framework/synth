# EXP-CONVERGENCE-001 — Convergence: Program 020 Website Experience into Program 027 Mission Studio Homepage

> **Architectural convergence review.** This expedition records the decision to subsume EXP-PROGRAM-020 and its chartered expedition EXP-WEB-001 into EXP-PROGRAM-027, eliminating duplicate program tracking for the SYNTH public homepage.

**Status:** Accepted  
**Started:** 2026-07-20  
**Kind:** Architectural Convergence  
**Priority:** High  
**Programs:** EXP-PROGRAM-020, EXP-PROGRAM-027  
**Depends On:** EXP-PROGRAM-004, EXP-PROGRAM-009  
**Blocks:** EXP-PROGRAM-027 implementation

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Resolve the overlap between EXP-PROGRAM-020 (Website Experience) and EXP-PROGRAM-027 (Mission Studio Homepage) before implementation begins. Both programs chartered work against the same surface—the SYNTH public homepage—using different framings.

---

## Findings

### Program scopes overlap

| Aspect | EXP-PROGRAM-020 | EXP-PROGRAM-027 |
|---|---|---|
| Status | Accepted | Proposed |
| Surface | SYNTH public website | SYNTH public homepage |
| Framing | Marketing page + scenario demos | Interactive Mission Studio workspace |
| Design system | EXP-WEB-003 (not chartered) | EXP-HOME-001 (chartered) |
| Hero experience | EXP-WEB-001 (chartered) | EXP-HOME-003 (chartered) |
| Scenario demos | Yes | Yes (Genesis Experience) |
| Public vocabulary audit | Yes | Yes |

### Direct expedition overlaps

- **EXP-WEB-001 — Homepage Hero** duplicates the intent of **EXP-HOME-003 — Genesis Experience**. Both define the homepage hero as an interactive, scenario-driven demonstration of SYNTH workflows.
- **EXP-WEB-003 — Design System** (unchartered) duplicates the intent of **EXP-HOME-001 — Mission Studio Design Language**.

### Semantic difference

EXP-PROGRAM-020 treats the homepage as a *website* that explains SYNTH. EXP-PROGRAM-027 treats the homepage as the *first projection of SYNTH itself*—an interactive workspace where visitors experience Genesis, Discovery, Mission, Expedition, Governance, and Replay directly. The latter framing is stronger and more consistent with the SYNTH architecture.

---

## Decision

1. **Close EXP-PROGRAM-020.** Its objectives are subsumed by EXP-PROGRAM-027.
2. **Supersede EXP-WEB-001.** Its design brief, copy, and scenario scripts become reference input for EXP-HOME-003.
3. **Advance EXP-PROGRAM-027** as the single authoritative program for the SYNTH public homepage.
4. **Preserve protections.** All public-vocabulary, deterministic-projection, and First Contact constraints from EXP-PROGRAM-020 are carried forward into EXP-PROGRAM-027.

---

## Actions

- [x] Identify overlap between EXP-PROGRAM-020 and EXP-PROGRAM-027.
- [x] Record convergence decision in EXP-CONVERGENCE-001.
- [x] Update EXP-PROGRAM-020 status to `Closed — Superseded by EXP-PROGRAM-027`.
- [x] Update EXP-WEB-001 status to `Superseded` and reference EXP-HOME-003.
- [x] Update EXP-PROGRAM-027 to note absorption of EXP-PROGRAM-020.
- [x] Migrate unique acceptance criteria from EXP-WEB-001 into EXP-HOME-003.

---

## Acceptance Criteria

- EXP-PROGRAM-020 is closed with a clear superseding reference.
- EXP-WEB-001 no longer appears as active work.
- EXP-PROGRAM-027 explicitly owns all former 020 scope.
- No active homepage work exists outside EXP-PROGRAM-027.

---

## Governance

### Protected

- Public vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Deterministic projection model.
- First Contact semantics and trajectory patterns.

### Not included

- Changes to SYNTH architecture, CLI, or governance model.
- New runtime concepts.

---

## Related documents

- [EXP-PROGRAM-020 — Website Experience](EXP-PROGRAM-020.md)
- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-WEB-001 — Homepage Hero: Intent to Deterministic Result](EXP-WEB-001.md)
- [EXP-HOME-001 — Mission Studio Design Language](EXP-HOME-001.md)
- [EXP-HOME-003 — Genesis Experience](EXP-HOME-003.md)
