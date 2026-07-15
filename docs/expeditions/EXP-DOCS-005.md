# EXP-DOCS-005 — Example Synchronization

**Status:** Completed  
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

- [x] Per-example audit verdicts recorded.
- [x] Stale example documentation updated.
- [x] Executable examples pass under the current build.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI proof check).
- [x] Expedition is accepted.

---

## Implementation Plan

1. Audit every example under `examples/`.
2. Update stale documentation.
3. Verify executable examples.
4. Run documentation integrity checks and validation.
5. Request acceptance.

---

## Audit Verdicts

| Example | Verdict |
|---|---|
| `examples/README.md` | **Stale** — omitted `first-contact/` and `_shared/`; implied generated artifacts are tracked. Updated |
| `todo/` | Current — accurate; passes |
| `blog/` | Current — accurate; passes |
| `crm/` | Current — "adapter-style integration" refers to domain integration patterns, not superseded architecture; passes |
| `legacy-node/` | Current — migration mission accurate; passes |
| `polyglot/` | Current — language-agnostic analysis accurate; passes |
| `monolith/` | Current — scale example accurate; passes |
| `first-contact/` | Current — canonical recorded journey, already post-PROGRAM-009; passes (32 events, matching the canonical journey) |
| `_shared/` | Runner code, no documentation. Recorded observation below |

---

## Completion Notes

- All seven executable examples pass `npm run govern` under the current build (exit 0; events and proof artifacts produced; `first-contact` reproduces the canonical 32-event journey).
- `examples/README.md` updated: `first-contact/` and `_shared/` added; expected outputs clarified as local build artifacts.
- **Projection Rule alignment:** `examples/*/docs-generated/` contained 49 tracked projection outputs, stale relative to the current knowledge base — regenerating them produced whole-knowledge-base dumps (installer flags, validation rules) into every example's README. Per the Projection Rule (EXP-PROGRAM-008 / EXP-DOCS-001), projection outputs are build artifacts, not authoritative state. The 49 files were untracked and `examples/*/docs-generated/` was added to `.gitignore`. No test, script, workflow, or package script consumes these files; `tests/brownfield-validation.test.js` passes (6/6 examples).
- **Recorded observation (deferred, not a docs issue):** the shared example runner (`examples/_shared/run-example.js`) creates events outside the Genesis lineage — the ID-linking defect class already identified for the Constitutional Hardening Program. Out of scope here.
- Documentation integrity checks pass: `docs:check-links`, `docs:verify-projection`, `docs:verify-website-sync`.
