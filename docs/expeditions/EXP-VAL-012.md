# EXP-VAL-012 — CI/Local Validation Integration

**Status:** Active  
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

- [ ] `synth validate` command implemented.
- [ ] `--full` and `--dry-run` flags implemented.
- [ ] CI workflows preserve `npm run govern` gate.
- [ ] `AGENTS.md` updated.
- [ ] Operator guide updated.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.
