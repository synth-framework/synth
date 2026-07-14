# EXP-VAL-012 — CI/Local Validation Integration

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-005 — Adaptive Validation Program  
**Depends On:** EXP-VAL-009, EXP-VAL-010, EXP-VAL-011  
**Blocks:** none

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

Integrate adaptive validation into the CLI and CI without bypassing `npm run govern`.

---

## Motivation

Adaptive validation is only useful if developers and AI agents can invoke it easily. It must also preserve the guarantee that every merge passes the full constitutional proof.

---

## Deliverables

1. **CLI command**
   - `synth validate` runs the impact analyzer and validation planner, then executes the planned checks.
   - `synth validate --full` runs the complete `npm run govern`.
   - `synth validate --dry-run` prints the plan without executing.

2. **Exit codes**
   - `0` — all planned validations passed.
   - `1` — a planned validation failed.

3. **CI integration**
   - GitHub Actions continues to run `npm run govern` on PRs and merges.
   - A separate optional workflow may run `synth validate` to report the optimized plan for information.

4. **Agent integration**
   - Update `AGENTS.md` to recommend `synth validate` for local work and `npm run govern` before requesting merge.

5. **Documentation**
   - Add an operator guide section explaining local vs CI validation.

---

## Acceptance

- `synth validate` completes faster than `npm run govern` for documentation changes.
- `synth validate` runs the full plan when Protected Assets are touched.
- CI still requires `npm run govern` to pass.
- `AGENTS.md` describes the local/CI validation distinction.

---

## Definition of Done

- [x] `synth validate` command implemented.
- [x] `--full` and `--dry-run` flags implemented.
- [x] CI workflows preserve `npm run govern` gate.
- [x] `AGENTS.md` updated.
- [x] Operator guide updated.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Completion Notes

- Implemented `cmdValidate` in `src/cli/synth.ts` to analyze the working tree diff, build a validation plan, and execute it.
- Added `--dry-run` to preview plans and `--full` to run the canonical `npm run govern` pipeline.
- Added `test:synth-cli` npm script and wired it into `test:all` and the CLI capability map.
- Updated `tests/synth-cli.test.js` to assert `ValidationPlan` output and the new flags.
- Updated `AGENTS.md` to recommend `synth validate` for local iteration and `npm run govern` before merge.
- Added `docs/operator/14-local-vs-ci-validation.md` and updated `docs/operator/README.md`.
- Updated `docs/guides/operator/continuous-publication.md` to document the non-blocking adaptive-validation role in CI.
- No Protected Assets were modified.
