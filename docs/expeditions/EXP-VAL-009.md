# EXP-VAL-009 — Validation Planner

**Status:** Active  
**Kind:** Validation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-005 — Adaptive Validation Program  
**Depends On:** EXP-VAL-008, EXP-VAL-010  
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

Produce a deterministic, ordered validation plan from an impact report.

---

## Motivation

Knowing which capabilities are affected is not enough. SYNTH must decide which tests to run, in what order, and which tests can be safely skipped.

---

## Deliverables

1. **Plan generator**
   - Accept an impact report and produce a validation plan.

2. **Ordering rules**
   - Lint and typecheck first.
   - Unit tests for affected capabilities next.
   - Integration tests that include affected capabilities after that.
   - Skip tests unrelated to the change.

3. **Protected Asset escalation**
   - If `protectedAssetsTouched` is true, the plan becomes the full `npm run govern`.

4. **Machine-readable plan**

   ```json
   {
     "run": [
       "lint",
       "typecheck",
       "test:adapter-tdd",
       "test:adapter-registry"
     ],
     "skip": [
       "test:replay",
       "test:determinism",
       "test:operator-journey"
     ],
     "confidence": 0.98,
     "protectedAssetsTouched": false
   }
   ```

5. **Human/AI output**
   - `synth validate` prints the plan with clear run/skip reasoning.

---

## Acceptance

- A README change produces a plan with only documentation checks.
- A TDD adapter change runs adapter tests and registry tests but skips replay.
- A runtime change produces the full governance plan.
- A Protected Asset change always produces the full governance plan.

---

## Definition of Done

- [ ] Plan generator implemented.
- [ ] Ordering rules defined and tested.
- [ ] Protected Asset escalation implemented.
- [ ] CLI output implemented.
- [ ] Unit tests pass.
- [ ] Expedition is accepted.
