# EXP-VAL-010 — Capability ↔ Test Mapping

**Status:** Completed  
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

- [x] Capability registry extended with validation metadata.
- [x] Default mappings defined for all existing capabilities.
- [x] Validation manifest file created.
- [x] Mapping validator added to governance.
- [x] Unit tests pass.
- [x] Expedition is accepted.

---

## Completion Notes

Capability-to-test mapping delivered:

- Manifest created at `docs/reference/capability-validation-map.json` with schema `synth-capability-validation-map-v1`.
- 40 capabilities mapped to unit tests, integration tests, benchmarks, proofs, lint scope, and typecheck scope.
- Protected Assets (`Mission Studio`, `Genesis`, `Replay`, `Runtime`) explicitly flagged and required to have integration tests or proofs.
- Validator implemented in `scripts/verify-capability-validation-map.js`:
  - Validates schema version.
  - Ensures every capability declares at least one validation activity.
  - Ensures every referenced npm script exists in `package.json`.
  - Enforces stronger validation rules for Protected Assets.
- Tests added in `tests/validation-mapping.test.js` covering valid map, script references, Protected Asset rules, and failure modes.
- Wired into governance via `test:validation-mapping` and included in `npm run test:all`.

**Acceptance:** Expedition accepted as part of EXP-PROGRAM-005 closure.
