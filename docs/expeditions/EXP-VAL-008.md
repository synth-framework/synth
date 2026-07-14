# EXP-VAL-008 — Impact Analysis

**Status:** Active  
**Kind:** Validation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-005 — Adaptive Validation Program  
**Depends On:** EXP-PROGRAM-005  
**Blocks:** EXP-VAL-009, EXP-VAL-010, EXP-VAL-011

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

Given a git diff, determine which SYNTH capabilities, subsystems, and Protected Assets are affected.

---

## Motivation

`npm run govern` proves the entire system every time. That is correct for CI, but wasteful for local development. Before a validation plan can be minimized, SYNTH must understand the blast radius of a change.

---

## Deliverables

1. **Diff parser**
   - Read added, modified, and deleted files from `git diff` or a provided diff.

2. **File-to-capability classifier**
   - Map files under `src/adapters/<name>/` to adapter capabilities.
   - Map files under `src/core/` to core runtime capabilities.
   - Map files under `src/mission-studio/` to Mission Studio capabilities.
   - Map files under `src/cli/` to CLI capabilities.
   - Map documentation and website files to documentation capabilities.

3. **Protected Asset detector**
   - Flag any change that touches Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, or Constitutional Baseline.

4. **Risk classifier**
   - `low` — docs, tests, scripts, examples, website.
   - `medium` — adapters, CLI, documentation generation.
   - `high` — runtime, domain, policy, replay, bootstrap.

5. **Machine-readable impact report**

   ```json
   {
     "files": ["src/adapters/tdd/adapter.ts"],
     "affectedCapabilities": ["TddAdapter"],
     "protectedAssets": [],
     "risk": "low"
   }
   ```

---

## Acceptance

- A documentation-only change reports zero affected capabilities and `low` risk.
- A TDD adapter change reports `TddAdapter` and `AdapterRegistry` as affected.
- A runtime change reports `Runtime` and `Replay` as affected with `high` risk.
- Any Protected Asset change sets `protectedAssetsTouched: true`.

---

## Definition of Done

- [ ] Diff parser implemented.
- [ ] File-to-capability classifier implemented.
- [ ] Protected Asset detector implemented.
- [ ] Risk classifier implemented.
- [ ] Impact report schema documented.
- [ ] Unit tests pass.
- [ ] Expedition is accepted.
