# Convergence Review Record — EXP-SIGN-001

**Review ID:** EXP-REVIEW-005  
**Authority:** [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)  
**Date:** 2026-08-02  
**Reviewer:** Synth architectural baseline + Program 031 gating function  
**Expedition reviewed:** [EXP-SIGN-001 — Event-Log Signing / Merkle Root](../expeditions/EXP-SIGN-001.md)  
**Owning program:** [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](../expeditions/EXP-PROGRAM-043.md)  
**Outcome:** **PENDING REVIEW** — touches Protected Event Model; requires explicit ADR-039 decision

---

## Expedition summary

`EXP-SIGN-001` proposes adding cryptographic signatures to the governance event log and publishing periodic Merkle roots so that replay can prove log integrity without trusting the storage layer alone. The charter explicitly notes that this work touches the **Protected Event Model** because it proposes adding optional `signature` and `signingKeyFingerprint` fields to the `SynthEvent` envelope and introducing a new `MERKLE_ROOT_PUBLISHED` governance event type.

The goal is to make the append-only event log externally verifiable and attributable (via the identity layer shipped in `EXP-IDENTITY-001`), while keeping replay semantics unchanged and making signing opt-in.

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

**Yes.** The TaskPRO retrospective identified "immutable, verifiable event log" as a bulletproofing requirement. `EXP-PROGRAM-043` Workstream F is chartered to deliver agent identity, event signing, two-party approval, and git integration. Signing is the trust anchor for the other two Workstream F charters.

### 2. Are the acceptance criteria still correct?

**Yes, with one open question for the review.** Criterion 3 (`SynthEvent` envelope gains `signature` and `signingKeyFingerprint` fields without breaking existing replay) is the gating architectural decision. The review must decide whether envelope fields, sidecar files, or both are the preferred path.

### 3. Has newer work superseded any objectives?

**No.** `EXP-IDENTITY-001` has completed and provides the attribution layer signing needs. `EXP-APPROVAL-001` and `EXP-GIT-001` are future consumers, not replacements.

### 4. Does the proposed implementation still represent the preferred path?

**Partially.** The charter proposes envelope fields plus a new `MERKLE_ROOT_PUBLISHED` event type. The review must confirm this is acceptable, or mandate a sidecar-only design to keep the envelope frozen. The charter already scopes a sidecar-only alternative as a fallback.

### 5. Should the expedition be rewritten?

**TBD by this review.** If the review rejects envelope changes, the charter should be rewritten to:
- Remove envelope field changes.
- Mandate sidecar signatures and Merkle roots in `.synth/signatures/`.
- Split any future event-model evolution into a separate Architecture Expedition.

### 6. Should the expedition move to another program?

**No.** Event signing is a Workstream F deliverable of `EXP-PROGRAM-043` (Agent Onboarding & Operator Experience). `EXP-PROGRAM-031` (convergence) reviews it; it does not own it.

### 7. Should the expedition be archived?

**No.** The objective is valid and the approach is sound pending the envelope/sidecar decision.

---

## Protected Asset analysis

The central question is whether adding `signature`/`signingKeyFingerprint` to the `SynthEvent` envelope constitutes a change to the **Protected Event Model**.

### Finding: the charter proposes optional envelope fields

The frozen `SynthEvent` envelope is defined in `docs/architecture/constitutional-baseline.md` and `src/types/event.ts`:

| Envelope field | Frozen? | Impact from `EXP-SIGN-001` proposal |
|---|---|---|
| `id` | Yes | None. |
| `type` | Yes | New event type `MERKLE_ROOT_PUBLISHED` proposed. |
| `timestamp` | Yes | None. |
| `transactionId` | Yes | None. |
| `capability` | Yes | None. |
| `actor` | Yes | None. |
| `payload` | Yes, typed `unknown` | `MERKLE_ROOT_PUBLISHED` payload is new; no existing payload changes. |
| `eventHash` / `previousHash` | Yes | None. Hash chain continues as today. |
| `signature` | **Not present** | Proposed optional field. |
| `signingKeyFingerprint` | **Not present** | Proposed optional field. |

The charter argues that the new fields can be optional and that replay can ignore them, so existing replay behavior is unchanged. However, adding fields to the envelope is a schema evolution of the Protected Event Model and must be explicitly accepted or rejected by this review.

### Sidecar-only alternative

If the review rejects envelope changes, the same objectives can be met with:
- Per-event signatures stored in `.synth/signatures/<event-id>.sig`.
- Periodic Merkle roots stored in `.synth/signatures/merkle-<offset>.json`.
- `synth verify signatures` reads sidecar files instead of envelope fields.

This keeps the `SynthEvent` envelope frozen but introduces a secondary derived artifact that must be protected from hand-edits (see `EXP-GUARD-001`).

### Replay semantics

Replay reconstructs state by folding `applyEvent(state, event)` over the log. The charter correctly scopes signature verification as an additive integrity check, not a replay input. A signature failure does not change replay output; it adds an integrity warning to the replay/verify report.

### Public Vocabulary

No new public vocabulary terms are introduced. `synth verify signatures` is a CLI command, not a new concept.

### ExecutionGate mutation authority

The ExecutionGate remains the sole mutation authority. Signing happens after the gate authorizes and hashes the event. The gate's mutation authority is not bypassed or redistributed.

---

## Outcomes

| Expedition | Outcome | Rationale | Required actions |
|---|---|---|---|
| `EXP-SIGN-001` | **PENDING REVIEW** | Charter is valid but proposes changes to the Protected Event Model that require an explicit ADR-039 decision. | 1. This review must decide envelope fields vs. sidecar-only vs. both.<br>2. Update `EXP-SIGN-001.md` with the review outcome and any rewritten scope.<br>3. If **CONVERGED**, begin implementation; if **REWRITE REQUIRED**, rewrite the charter before code.<br>4. Run `synth validate` before merging implementation. |

---

## Required decisions before implementation begins

1. **Envelope vs. sidecar.** May `signature` and `signingKeyFingerprint` be added to the `SynthEvent` envelope as optional fields, or must they live in sidecar files to keep the envelope frozen?
2. **Merkle root representation.** May `MERKLE_ROOT_PUBLISHED` be a governance event in the log, or must it be a sidecar/derived artifact?
3. **Key-management boundary.** Is the proposed operator-owned key model (`~/.synth/keys/event-signing.key`, public key committed in `.synth/keys/`) consistent with the architectural baseline?
4. **Default behavior.** When no key is configured, events remain unsigned and `synth verify signatures` reports `UNSIGNED`. Is this opt-in model acceptable?
5. **Protected Asset impact.** Does this review accept that optional envelope fields are a bounded, backward-compatible evolution of the Event Model, or does it classify any envelope change as a constitutional event-model ADR?

---

## Recommended outcome

**CONVERGED — with envelope fields permitted as optional, backward-compatible additions.**

Rationale:
- Optional envelope fields do not break existing replay or event hashes for unsigned events.
- Envelope fields make verification simpler and harder to misplace than sidecar files.
- The charter already provides a sidecar fallback if the review rejects envelope changes.
- `MERKLE_ROOT_PUBLISHED` as a governance event preserves the append-only invariant and replayability.

If the reviewer disagrees, the fallback outcome is **REWRITE REQUIRED — sidecar-only design**.

---

## Evidence

- `docs/expeditions/EXP-SIGN-001.md` — expedition charter.
- `docs/expeditions/EXP-PROGRAM-043.md` — program tracker, Workstream F.
- `docs/adr/ADR-039-architectural-convergence-review.md` — review authority.
- `docs/adr/ADR-004-synth-eras-and-protected-assets.md` — Protected Assets definition.
- `docs/architecture/09-event-model.md` — event structure and replay semantics.
- `docs/architecture/11-replay.md` — replay engine semantics.
- `docs/architecture/constitutional-baseline.md` — frozen `SynthEvent` envelope.
- `src/types/event.ts` — `SynthEvent` type definition.
- `docs/governance/convergence-review-identity-001.md` — completed identity review that enables signing.

---

## Next steps

1. Obtain an explicit **CONVERGED** or **REWRITE REQUIRED** outcome for this review.
2. Update `EXP-SIGN-001.md` status and scope based on the outcome.
3. If **CONVERGED**, begin implementation of signing utilities, envelope extension, and `synth verify signatures`.
4. If **REWRITE REQUIRED**, produce a sidecar-only revision of the charter and re-review.
5. Run `synth validate` after implementation changes and attach validation output as expedition evidence.
