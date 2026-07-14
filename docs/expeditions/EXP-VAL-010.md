# EXP-VAL-010 — Capability ↔ Test Mapping

**Status:** Active  
**Kind:** Validation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-005 — Adaptive Validation Program  
**Depends On:** EXP-VAL-008  
**Blocks:** EXP-VAL-009, EXP-VAL-012

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

Declare which tests, benchmarks, and proofs each capability requires.

---

## Motivation

The Validation Planner cannot guess which tests validate which capabilities. Each capability must explicitly declare its validation dependencies.

---

## Deliverables

1. **Capability registry extension**
   - Each registered capability declares:
     - `unitTests`
     - `integrationTests`
     - `benchmarks`
     - `proofs`
     - `lintScope`
     - `typecheckScope`

2. **Default mappings**
   - `TddAdapter` → `test:adapter-tdd`, `test:adapter-registry`
   - `MissionStudio` → `test:mission-studio`, `test:mission-studio-snapshot-lineage`, `test:freeze-certification`
   - `Runtime` → `test:replay`, `test:determinism`, `test:adversarial`
   - `DocumentationProjection` → `test:documentation-expedition`, `test:documentation-integrity`

3. **Validation manifest file**
   - A machine-readable file that records these mappings, e.g. `docs/reference/capability-validation-map.json`.

---

## Acceptance

- Every adapter capability maps to at least one test.
- Core capabilities map to replay, determinism, and adversarial checks.
- The mapping file is validated by `npm run govern`.

---

## Definition of Done

- [ ] Capability registry extended with validation metadata.
- [ ] Default mappings defined for all existing capabilities.
- [ ] Validation manifest file created.
- [ ] Mapping validator added to governance.
- [ ] Unit tests pass.
- [ ] Expedition is accepted.
