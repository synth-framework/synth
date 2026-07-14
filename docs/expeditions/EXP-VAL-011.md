# EXP-VAL-011 — Protected Asset Escalation

**Status:** Active  
**Kind:** Validation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-005 — Adaptive Validation Program  
**Depends On:** EXP-VAL-008  
**Blocks:** EXP-VAL-012

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Ensure changes to Protected Assets always trigger the full governance run.

---

## Motivation

Protected Assets are frozen for a reason. Any change to them has unknown blast radius, so no optimization is allowed.

---

## Deliverables

1. **Protected Asset catalog**
   - Canonical list derived from ADR-004:
     - Mission Studio
     - Genesis
     - Replay
     - ExecutionGate
     - Event Model
     - Capability Model
     - Constitutional Baseline

2. **Path detector**
   - Map file paths to Protected Assets (e.g., `src/mission-studio/` → Mission Studio).

3. **Escalation rule**
   - If any Protected Asset is touched, `synth validate` returns the full `npm run govern` plan.
   - Print a clear reason: "Protected Asset Mission Studio modified; full validation required."

4. **Enforcement test**
   - Add a test that simulates a diff touching each Protected Asset and verifies escalation.

---

## Acceptance

- A change to `src/mission-studio/` escalates to full validation.
- A change to `src/core/bootstrap.ts` escalates to full validation.
- A change to `docs/architecture/constitution.md` escalates to full validation.
- A change to `README.md` does not escalate.

---

## Definition of Done

- [ ] Protected Asset catalog implemented.
- [ ] Path detector implemented.
- [ ] Escalation rule implemented.
- [ ] Enforcement tests pass.
- [ ] Expedition is accepted.
