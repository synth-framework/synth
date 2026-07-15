# EXP-DOCS-005 — Example Synchronization

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Depends On:** EXP-DOCS-001  
**Blocks:** EXP-DOCS-006

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

Bring every example in `examples/` in line with the post-PROGRAM-007 architecture so that the examples operators actually run reflect the Environment Layer and Capability Graph.

---

## Motivation

The examples (`blog`, `crm`, `todo`, `monolith`, `polyglot`, `legacy-node`, `first-contact`, `_shared`) predate EXP-PROGRAM-007. Their READMEs and walkthroughs describe architecture and behavior from before the Environment Layer existed. Examples are executable documentation: when they diverge from the architecture, operators learn a system that no longer exists.

---

## Deliverables

1. **Example audit**
   - Review each example's documentation for stale architecture references (capabilities, environment assumptions, planning behavior).
   - Record a per-example verdict.

2. **Documentation synchronization**
   - Update example READMEs and walkthroughs that reference superseded architecture.

3. **Execution verification**
   - Verify the examples still execute or validate under the current build.

---

## Acceptance

- Every example has an audit verdict.
- No example documentation describes pre-Environment-Layer behavior as current.
- Examples that are executable pass under the current build.
- `npm run docs:check-links` passes.

---

## Phases

### Phase 1 — Audit

Review each example and record verdicts.

### Phase 2 — Synchronize

Update stale example documentation.

### Phase 3 — Verify execution

Run the executable examples under the current build.

### Phase 4 — Verify

Run documentation integrity checks and the full validation plan.

---

## Risks

| Risk | Mitigation |
|---|---|
| Examples encode deliberate historical journeys | Do not rewrite recorded evidence; synchronize only descriptive documentation |
| Execution verification is slow | Run only the examples the repository already treats as executable |
| Scope creep into example redesign | Synchronize, do not redesign |

---

## Definition of Done

- [ ] Per-example audit verdicts recorded.
- [ ] Stale example documentation updated.
- [ ] Executable examples pass under the current build.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit every example under `examples/`.
2. Update stale documentation.
3. Verify executable examples.
4. Run documentation integrity checks and validation.
5. Request acceptance.

---

## Completion Notes

Pending.
