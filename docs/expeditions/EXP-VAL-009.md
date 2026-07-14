# EXP-VAL-009 — Validation Planner

**Status:** Completed  
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

- [x] Plan generator implemented.
- [x] Ordering rules defined and tested.
- [x] Protected Asset escalation implemented.
- [x] CLI output implemented.
- [x] Unit tests pass.
- [x] Expedition is accepted.

---

## Completion Notes

Validation Planner delivered:

- Planner implemented in `src/validation/planner.ts`:
  - Consumes `ImpactReport` and `docs/reference/capability-validation-map.json`.
  - Produces deterministic `ValidationPlan` with `run`, `skip`, `confidence`, `protectedAssetsTouched`, `risk`, and `reason`.
  - Escalates to full `npm run govern` when Protected Assets are touched.
  - Orders validations: typecheck first, then unit tests, integration tests, benchmarks, proofs.
  - Handles unknown capabilities gracefully with reduced confidence.
- `synth validate` updated in `src/cli/synth.ts` to emit a `ValidationPlan` (JSON). Supports `--dry-run`.
- `typecheck` script added to `package.json` (`tsc --noEmit`). Lint slot reserved for future expedition.
- Capability map extended with missing capabilities detected by the impact analyzer (`Scripts`, `GitHubActions`, `GitHooks`, `RepositoryConfig`, `Constitution`, `ArchitectureDecisionRecords`) and the new `ValidationPlanner` capability.
- Tests added in `tests/validation-planner.test.js` and wired into `test:all` via `test:validation-planner`.

**Acceptance:** Expedition accepted as part of EXP-PROGRAM-005 closure.
