# EXP-TRUST-004 — Decision Events

**Status:** Draft  
**Kind:** Implementation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-011 — Operator Trust & CLI Integrity  
**Depends On:** EXP-TRUST-003  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (finding N9)

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

Make trust-relevant decisions durable. Today an approval decision exists only in CLI output: once the scrollback is gone, the rejection never happened. Every decision Mission Studio reaches about a draft — approved, rejected, or rejected on integrity grounds — must be persisted as an immutable, chained record, and the draft's approval state must derive from that record rather than from anything editable.

---

## Motivation

The TaskPRO field experiment exposed decision amnesia (annex, finding N9): the approval rejection existed only in CLI output. The event log records state transitions, not decisions about artifacts — so the most trust-relevant moment of the Mission lifecycle left no trace.

**Constitutional reading (flagged for review).** The canonical event log is execution state; every write flows through ExecutionGate, and a CLI-originated planning event would require a registered capability, validator, policy, and a file-backed bootstrap — the seam EXP-TRUST-002's amendment already resolved for planning artifacts. Decisions *about planning artifacts* are planning state. This expedition therefore persists them in a **planning-layer decision record** — append-only, hash-chained, certified at read — following the `FileSystemSnapshotStore` / draft-integrity precedent. The guarantee the finding asks for (decisions are durable, tamper-evident, and inspectable) is delivered without touching the ExecutionGate / Event Model boundary. The canonical event log remains execution-state-only.

---

## Scope

```text
synth mission approve --draft-id …
        │
        ├──► integrity rejection ──► MISSION_DRAFT_INTEGRITY_REJECTED ┐
        ├──► below-threshold /       MISSION_APPROVAL_REJECTED        │ append-only,
        │    blocking-unknowns                                        │ hash-chained
        │                          ──► decision record                │ data/decisions.jsonl
        └──► approved ─────────────► MISSION_APPROVAL_APPROVED        ┘
        │
        ▼
draft approval state = latest decision in the record
(never the editable approvalState field)
```

In scope: the chained decision record, decision persistence at every approval outcome, approval-state derivation from the record (idempotent re-approval), a read surface (`synth mission decisions`), regression guards.

Out of scope: the canonical event log and ExecutionGate; surfacing decisions in `synth explain` (EXP-PROGRAM-012 discoverability); Expedition-level decisions (this expedition covers Mission draft decisions, the N9 surface); decision retention/migration tooling.

---

## Deliverables

1. **Planning-layer decision record** — `data/decisions.jsonl`, append-only, one chained record per decision: `{ schema, id, type, draftId, reason?, confidence, previousHash, timestamp }`. Chain semantics as in draft integrity: one genesis, one successor per record, all reachable; tampering or deletion invalidates successors and is detected at read and before any append. Persisted through the Environment Layer filesystem provider (core-boundary clean).

2. **Decision persistence at every outcome** — approval approved, approval rejected (below threshold / blocking unknowns), and integrity rejection each append their record with the *computed* confidence and the rejection reason. The approve output reports `decisionRecorded: true`.

3. **Approval-state synchronization** — the record is the authority for a draft's approval state. Re-approving an already-approved draft is idempotent and prescriptive ("already approved on <timestamp>", naming the snapshot id), never a duplicate snapshot; the editable `approvalState` field in the draft JSON is never consulted.

4. **Read surface** — `synth mission decisions [--draft-id <id>]` lists the record (chain-verified, warning loudly on a broken chain), so a rejection can never again vanish into scrollback.

5. **Regression guards** — permanent tests in `test:all`: rejection persisted with computed confidence; approval persisted; integrity rejection persisted; re-approval idempotent; chain deletion detected.

---

## Acceptance

```text
synth mission approve --draft-id …   →   rejected (below threshold)
        ↓
scrollback lost, shell closed
        ↓
synth mission decisions --draft-id …
        ↓
the rejection is there: type, reason, computed confidence, timestamp
        ↓
re-run approve after evidence add → new decision appended, chain intact
```

- The TaskPRO amnesia cannot recur: every approval outcome is durable and inspectable.
- Approval state derives from the record; re-approval is idempotent, never duplicated.
- The record is hash-chained; deletion or tampering is detected prescriptively.
- All new guards are wired into `test:all`; `npm run govern` passes in CI.

---

## Phases

### Phase 1 — Failing fixtures

Codify the amnesia: rejection leaves no durable trace; re-approval duplicates; chain deletion undetected.

### Phase 2 — Decision record

Implement the chained append-only store with certification.

### Phase 3 — Persistence and synchronization

Append at every approval outcome; derive approval state from the record; idempotent re-approval.

### Phase 4 — Read surface

Implement `synth mission decisions` with chain verification.

### Phase 5 — Verify

Regression guards wired into `test:all`; fixture suite green; full validation via CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Constitutional misread: planning decisions pushed into the canonical event log | Explicitly out of scope; the planning-layer record follows the precedent the TRUST-002 amendment set; the constitutional note above is the review surface |
| Approval state now has two sources (draft field vs record) | The record is authoritative; the draft field is ignored for decisions; a fixture asserts editing `approvalState` in the draft changes nothing |
| Decision append fails mid-approval (partial durability) | Append before reporting: the CLI records the decision first, then prints; a failed append fails the command loudly rather than silently omitting the record |
| Chain grows unboundedly in long-lived repos | Append-only JSONL with O(1) append; reads verify the chain linearly — acceptable at planning scale; compaction tooling is deferred |
| New vocabulary in output leaks implementation terms | Public vocabulary only (decision, record, approval); vocabulary audit gate applies |

---

## Definition of Done

- [ ] Approval rejection persisted with reason and computed confidence.
- [ ] Approval persisted; integrity rejection persisted.
- [ ] Draft approval state derives from the record; re-approval idempotent and prescriptive.
- [ ] Editing the draft's `approvalState` field changes nothing.
- [ ] `synth mission decisions` lists the record with chain verification.
- [ ] Chain deletion or tampering detected prescriptively.
- [ ] Regression guards wired into `test:all`.
- [ ] Documentation integrity checks pass.
- [ ] `npm run govern` passes (via CI `proof` check).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Codify the amnesia fixtures as failing tests.
2. Implement the chained decision record.
3. Persist at every approval outcome; synchronize approval state.
4. Implement the decisions read surface.
5. Wire regression guards; request acceptance.

---

## Completion Notes

*(pending)*
