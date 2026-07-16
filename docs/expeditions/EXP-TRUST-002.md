# EXP-TRUST-002 — Draft Integrity & Computed Confidence

**Status:** Draft  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-011 — Operator Trust & CLI Integrity  
**Depends On:** EXP-TRUST-001  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N2)

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

Make Mission Draft integrity verifiable and confidence computed. A draft whose content has been altered after creation must be detected and rejected at approval time, and the confidence that gates approval must be **recomputed from the draft's own evidence** — never read from the editable artifact it grades. Tampering produces a prescriptive rejection, never approval.

---

## Motivation

The TaskPRO field experiment demonstrated draft forgery end-to-end (annex, finding N2):

1. `synth mission create` writes the draft as plain mutable JSON to `data/drafts/<id>.json`.
2. The agent edited the draft's confidence `overall` from `0.67` to `0.85`.
3. `synth mission approve --draft-id …` accepted the forged values, because approval reads `session.confidence.overall` from the deserialized draft (`src/mission-studio/engine.ts:484`) and reports it back (`src/cli/synth.ts:629,664`).

The same artifact-reading pattern exposes a second, quieter forgery vector: blocking unknowns gate approval at `engine.ts:479-482`, so deleting a blocking unknown from the draft JSON also converts rejection into approval — without touching the confidence number at all.

The constitutional invariant (EXP-PROGRAM-011): **no artifact that influences interpretation may be manually authoritative.** Today both the score and the gates are read from an editable file. This expedition makes them computed and verified instead.

---

## Scope

```text
synth mission create
        │
        ├──► draft written (data/drafts/<id>.json)
        └──► draft fingerprint anchored in the event log  (MISSION_DRAFT_CREATED)
        │
synth mission approve --draft-id …
        │
        ├──► re-fingerprint on-disk draft, compare with anchor
        ├──► recompute confidence from the draft's evidence (engine.computeConfidence)
        ├──► compare recomputed vs stored confidence
        │
        ▼
match + above threshold  →  approval proceeds (unchanged path)
any divergence           →  prescriptive rejection, never approval
```

In scope: draft fingerprinting with event-log anchoring, confidence recompute at approval, tamper rejection with a paved road, regression guards.

Out of scope: confidence threshold values (drift is guarded, not lowered); persisting the *rejection* as an Event (EXP-TRUST-004); the `synth mission evidence add` command (EXP-TRUST-003 — the rejection message references the intended remediation path by name); the Event Model structure itself.

---

## Deliverables

1. **Canonical draft fingerprint** — a deterministic fingerprint over the draft's decision-relevant content (observations, evidence, unknowns, questions, world model, confidence), serialized with the same exclusion discipline as `snapshot-integrity.ts` (volatile wall-clock metadata excluded). Anchored at creation in a `MISSION_DRAFT_CREATED` event appended to `data/event-log.jsonl` through the existing event-append infrastructure — forgery then requires breaking the replay hash chain, not editing one file.

2. **Recomputed confidence at approval** — `MissionStudioEngine.approve()` recomputes confidence from the draft's own observations, evidence, and unknowns using the existing pure `computeConfidence` (`engine.ts:328`), and the recomputed value — not the stored field — gates the threshold decision and is what gets reported.

3. **Prescriptive tamper rejection** — a fingerprint mismatch or a stored/recomputed divergence rejects approval, naming the draft, the divergence, and the paved road (gather evidence and create a new Mission Draft; the evidence path lands in EXP-TRUST-003).

4. **Regression guards** — permanent tests in `test:all`: the TaskPRO forgery (edited `overall`) rejected; blocking-unknown deletion rejected; an untouched draft approves exactly as before; recomputed confidence is reported, not the stored value.

---

## Acceptance

```text
draft confidence edited 0.67 → 0.85  (TaskPRO chronology)
        ↓
synth mission approve --draft-id …
        ↓
REJECT prescriptively:
  - name the draft
  - name the divergence (stored vs computed)
  - give the safe remediation
never: approve, never: silently use forged values
```

- The TaskPRO forgery fails; the same forgery by blocking-unknown deletion fails.
- A legitimate draft approves identically to rc.2 behavior (same threshold, same decision).
- Stored confidence is never authoritative: approval decisions and output use recomputed values only.
- All new guards are wired into `test:all`; `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Fixture and failing tests

Codify the TaskPRO forgery and the blocking-unknown deletion as failing fixtures against the real CLI.

### Phase 2 — Fingerprint anchor

Implement canonical draft fingerprinting and the `MISSION_DRAFT_CREATED` event-log anchor at `synth mission create`.

### Phase 3 — Recompute at approval

Recompute confidence in `approve()` from the draft's evidence; verify and gate on computed values.

### Phase 4 — Prescriptive rejection

Implement the tamper rejection message with the paved road.

### Phase 5 — Verify

Regression guards wired into `test:all`; fixture suite green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Recompute diverges from create-time values for legitimate drafts (normalization non-idempotent, float serialization) | `computeConfidence` is pure (verified: no clock, no randomness); recompute uses exactly the inputs the draft carries; fixture asserts an untouched draft recomputes to its stored value |
| Replay rejects an unknown event type | Verify replay tolerates `MISSION_DRAFT_CREATED` without changing replay semantics; add a replay-tolerance fixture before wiring creation |
| Fresh project without an event log | `mission create` already scaffolds `data/`; the anchor initializes the event log on first use, same pattern as `ensureDraftsDir` |
| Fingerprint canonicalization instability (key order, formatting) | Canonical serialization with sorted keys and the exclusion rules from `snapshot-integrity.ts`; round-trip fixture (create → approve unmodified) must pass |
| Rejection message leaks implementation vocabulary | Public vocabulary only; vocabulary audit gate applies |

---

## Definition of Done

- [ ] TaskPRO forgery fixture (edited `overall`) rejected prescriptively.
- [ ] Blocking-unknown deletion fixture rejected prescriptively.
- [ ] Untouched draft approves identically to rc.2 behavior.
- [ ] Approval decisions and output use recomputed confidence only.
- [ ] Draft fingerprint anchored in the event log at creation; replay tolerates the event.
- [ ] Regression guards wired into `test:all`.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Codify the forgery fixtures as failing tests.
2. Implement the fingerprint + `MISSION_DRAFT_CREATED` anchor at creation.
3. Implement recompute-at-approval and stored/computed verification.
4. Implement the prescriptive tamper rejection.
5. Wire regression guards; request acceptance.

---

## Completion Notes

*(pending)*
