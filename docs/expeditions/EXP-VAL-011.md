# EXP-VAL-011 — Protected Asset Escalation

**Status:** Completed  
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
   - Canonical list derived from ADR-004 plus execution-critical paths:
     - Mission Studio
     - Genesis
     - Replay
     - Runtime
     - ExecutionGate
     - Event Model
     - Capability Model
     - Constitutional Baseline (includes `src/core/bootstrap.ts`)
     - Public Vocabulary

2. **Path detector**
   - Map file paths to Protected Assets (e.g., `src/mission-studio/` → Mission Studio).

3. **Escalation rule**
   - If any Protected Asset is touched, `synth validate` returns the full `npm run govern` plan.
   - Print a clear reason: "Mission Studio modified; full constitutional validation required."

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

- [x] Protected Asset catalog implemented.
- [x] Path detector implemented.
- [x] Escalation rule implemented.
- [x] Enforcement tests pass.
- [x] Expedition is accepted.

---

## Completion Notes

Protected Asset Escalation delivered:

- Canonical catalog created in `src/governance/protected-assets.ts`:
  - Lists all ADR-004 Protected Assets (Mission Studio, Genesis, Replay, ExecutionGate, Capability Model, Constitutional Baseline, Public Vocabulary).
  - Adds Runtime and Event Model because they materially affect the deterministic execution contract.
  - Adds `src/core/bootstrap.ts` to Constitutional Baseline because it encodes the architectural initialization order.
- Path detector `detectProtectedAssets(files)` and helper `isProtectedAssetPath(filePath)` exported.
- Impact analyzer refactored to use the canonical catalog instead of duplicating Protected Asset detection rules.
- Validation planner updated to name the specific touched asset(s) in the escalation reason.
- Enforcement tests added in `tests/protected-asset-escalation.test.js` covering every Protected Asset path, non-protected changes, mixed changes, and multiple asset naming.
- `test:protected-asset-escalation` added to `package.json` and `test:all`; capability map extended with `ProtectedAssets` capability.

**Acceptance:** Expedition accepted as part of EXP-PROGRAM-005 closure.
