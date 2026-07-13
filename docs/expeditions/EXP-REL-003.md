# EXP-REL-003 — Example Certification

**Status:** Completed  
**Kind:** Release Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-REL-001  
**Blocks:** EXP-REL-002, EXP-REL-004

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

Produce canonical example repositories that demonstrate real Synth usage.

---

## Deliverables

1. **Todo example**
   - A minimal task-tracking project.
   - Demonstrates Mission → Expedition → Plan.

2. **Blog example**
   - A content publishing project.
   - Demonstrates documentation generation.

3. **CRM example**
   - A small business-object project.
   - Demonstrates adapter integration patterns.

4. **Legacy Node example**
   - A brownfield Node.js project.
   - Demonstrates migration-style missions.

5. **Polyglot example**
   - A project with multiple languages.
   - Demonstrates language-agnostic repository analysis.

6. **Monolith example**
   - A realistic monolithic project.
   - Demonstrates scale behavior.

Each example includes:

- A declared Mission.
- A recorded Expedition.
- Replay evidence.
- Generated documentation.
- Expected results documented.

---

## Acceptance

Every example passes `npm run govern`.

Specifically:

- Each example has a `synth/` or equivalent configuration.
- Each example produces a valid event log.
- Each example can be replayed deterministically.
- Each example's generated documentation matches expected output.

---

## Phases

### Phase 1 — Select

Choose example domains that cover common project types.

### Phase 2 — Build

Create each example repository under `examples/`.

### Phase 3 — Certify

Run `npm run govern` in each example. Fix issues.

### Phase 4 — Publish

Link examples from Public Documentation and website.

---

## Risks

| Risk | Mitigation |
|---|---|
| Examples require new capabilities | Keep examples within frozen v2 |
| Maintenance burden | Automate example certification in CI |
| Examples are trivial | Include one large, realistic example |

---

## Definition of Done

- [x] Todo example exists and passes `npm run govern`.
- [x] Blog example exists and passes `npm run govern`.
- [x] CRM example exists and passes `npm run govern`.
- [x] Legacy Node example exists and passes `npm run govern`.
- [x] Polyglot example exists and passes `npm run govern`.
- [x] Monolith example exists and passes `npm run govern`.
- [x] Examples are linked from docs and website.
- [x] Expedition is accepted.

---

## Completion Notes

Created six certified example projects under `examples/`:

- `examples/todo/` — Task tracking, Mission → Expedition → Plan.
- `examples/blog/` — Content publishing and documentation generation.
- `examples/crm/` — Business objects and adapter integration patterns.
- `examples/legacy-node/` — Brownfield Node.js migration mission.
- `examples/polyglot/` — Language-agnostic service contracts.
- `examples/monolith/` — Monolithic repository scale behavior (renamed from `large-repository` in EXP-REL-001 to match the public-release layout).

Each example contains:

- `README.md` with mission, expedition, objectives, and expected results.
- `scripts/run.js` that executes the operator journey.
- `package.json` with `govern` script.
- Generated `data/event-log.jsonl`, `proof/proof-*.json`, and `docs-generated/` after running.

Shared runner: `examples/_shared/run-example.js`.

Post-reorganization verification:

- Renamed example directory and all internal references from `large-repository` to `monolith`.
- Updated `examples/monolith/package.json` name to `synth-example-monolith`.
- Updated `examples/monolith/scripts/run.js` example name to `monolith`.
- Re-ran `npm run govern` in all six examples; all certified successfully.
- `docs/operator/examples-guide.md` links to `examples/monolith/` and all examples are marked as certified.

Verification:

- All six examples pass `npm run govern`.
- `docs/operator/examples-guide.md` updated to mark examples as certified.
- Fixed generated documentation links in examples so source references resolve correctly after the `examples/_shared/run-example.js` temporary-directory move.
- `npm run test:freeze-certification` passes.
- `npm run docs:check-links` passes (no broken internal links).
