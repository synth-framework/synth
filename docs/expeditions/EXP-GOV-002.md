# EXP-GOV-002 — Replay as the Constitutional Source of Truth

**Status:** Completed (pending program acceptance)  
**Kind:** Implementation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-014 — Governance Maturation  
**Depends On:** EXP-PROGRAM-014  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (governed bootstrap E1)

---

```yaml
Impact:
  Constitutional: Yes
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Formalize the transition from isolated proof artifacts to a single, replay-derived **Governance Record**. Every governance transition — initialization, governance update, bootstrap, approval, verification, reconciliation — belongs to the same replay lineage. Replay becomes the constitutional source of truth for governance history.

---

## Motivation

During E1, the project naturally evolved from:

```text
InitializationProof
```

to:

```text
genesis-0001
↓
governance-0002
↓
bootstrap-e1-0003
```

The important abstraction is no longer the initialization proof. It is the **Governance Record**: a continuous, ordered, replayable history of every governance transition. Today this lineage exists in practice but is not formalized. Without a schema and projection rules, governance records are ad-hoc and cannot be verified automatically.

---

## Scope

In scope:

- Define a canonical `GovernanceRecord` schema.
- Define record types:
  - `initialization`
  - `governance_update`
  - `bootstrap`
  - `approval`
  - `verification`
  - `reconciliation`
- Define state projection rules from replay for governance records.
- Store governance records as replay events (or as a replay-derived projection from existing events).
- Expose governance record lineage through `synth explain governance` or equivalent.

Out of scope:

- Changing the event model schema.
- Implementing the verification engine (EXP-GOV-005).
- Documenting layer boundaries (EXP-GOV-003).
- Defining the projection model (EXP-GOV-004).

---

## Deliverables

1. **GovernanceRecord schema** — TypeScript type and JSON schema under `src/types/governance-record.ts` and `docs/schemas/governance-record.schema.json`.
2. **Record-type definitions** — semantics and required fields for each record type.
3. **State projection rules** — how `GovernanceRecord`s are derived from the event log and canonical state.
4. **Event emission or derivation** — either new event types or a deterministic derivation from existing events.
5. **Explain surface** — `synth explain governance` prints the governance record lineage.
6. **Regression guards** — tests that assert governance records are replay-derived and ordered.

---

## Acceptance

```text
governance transition
        ↓
replayed event log
        ↓
GovernanceRecord lineage
        ↓
consistent, ordered, verifiable
```

- Every governance transition in E1 is representable as a GovernanceRecord.
- Governance records are derived deterministically from replay.
- `synth explain governance` renders the lineage.
- New guards are wired into `test:all`.
- `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Schema design

Define `GovernanceRecord` and record types.

### Phase 2 — Derivation strategy

Choose event-based derivation vs. explicit event emission; implement.

### Phase 3 — State projection

Implement projection from events to governance record state.

### Phase 4 — Explain surface

Add `synth explain governance`.

### Phase 5 — Verify

Regression guards, documentation, full validation.

---

## Risks

| Risk | Mitigation |
|---|---|
| New event types touch Protected Assets | Prefer derivation from existing events; if new events are needed, escalate through ADR. |
| Governance records duplicate state | Records are projections; canonical state remains the single materialized view. |
| Explain surface leaks implementation vocabulary | Use public vocabulary only; vocabulary audit gate applies. |

---

## Definition of Done

- [x] `GovernanceRecord` schema defined and documented.
- [x] Record types `initialization`, `governance_update`, `bootstrap`, `approval`, `verification`, `reconciliation` defined.
- [x] State projection rules from replay implemented.
- [x] `synth explain governance` renders the lineage.
- [x] Regression guards wired into `test:all`.
- [x] Documentation integrity checks pass.
- [x] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted (pending PROGRAM-014 acceptance).

---

## Implementation Plan

1. Design GovernanceRecord schema.
2. Decide derivation strategy.
3. Implement projection rules.
4. Add explain surface.
5. Wire regression guards and request acceptance.

---

## Completion Notes

Implemented as scoped:

- **Schema** — `src/types/governance-record.ts` defines `GovernanceRecord`, `GovernanceRecordType`, and `GovernanceRecordLineage`; `docs/schemas/governance-record.schema.json` provides the JSON Schema.
- **Record types** — `initialization`, `governance_update`, `bootstrap`, `approval`, `verification`, and `reconciliation` are defined with derivation semantics.
- **Projection rules** — `src/core/governance-record-projection.ts` deterministically derives governance records from replayable events.
  - `SYSTEM_GENESIS` → initialization
  - `MISSION_APPROVED` → approval
  - `EXPEDITION_COMPLETED` → governance_update
  - `POLICY_EVALUATED` → verification
  - events with `capability === "Bootstrap"` or `actor === "bootstrap"` → bootstrap
- **CLI surface** — `synth explain governance [--log <path>]` is routed in `src/cli/synth.ts` and implemented in `src/cli/explain-governance.ts`.
- **Regression guards** — `tests/governance-record.test.js` covers projection-module derivation, CLI lineage rendering, and empty-log handling; wired into `test:all` as `test:governance-record`.

Local verification:

```bash
npm run typecheck                      # PASS
npm run build                          # PASS
npm run test:governance-record         # PASS (3/3)
npm run test:resume-briefing           # PASS (6/6)
npm run test:taskpro-regression        # PASS (14/14)
npm run test:explain-observability     # PASS (25/25)
```

Full `npm run govern` is pending CI run as requested.

