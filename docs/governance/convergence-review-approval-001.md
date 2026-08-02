# Convergence Review Record — EXP-APPROVAL-001

**Review ID:** EXP-REVIEW-006  
**Authority:** [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)  
**Date:** 2026-08-02  
**Reviewer:** Synth architectural baseline + Program 031 gating function  
**Expedition reviewed:** [EXP-APPROVAL-001 — Two-Party Approval for Destructive Operations](../expeditions/EXP-APPROVAL-001.md)  
**Owning program:** [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](../expeditions/EXP-PROGRAM-043.md)  
**Outcome:** **PENDING REVIEW** — introduces new governance event types and policy gate integration

---

## Expedition summary

`EXP-APPROVAL-001` proposes a two-party approval flow for destructive governance operations (re-bootstrap, expedition deletion, event-log edits, legacy-state imports, signing-key rotation, forced expedition completion). The charter introduces new event types (`APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`, `APPROVAL_EXPIRED`, `APPROVAL_EXECUTED`) and integrates with the policy engine and `ExecutionGate` so that destructive mutations are blocked until two distinct identities approve.

The goal is to prevent a single compromised agent or operator from destroying governance state, while keeping approvals durable, attributable (via `EXP-IDENTITY-001`), and verifiable (via `EXP-SIGN-001`).

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

**Yes.** The TaskPRO retrospective identified "two-party approval for destructive operations" as a bulletproofing requirement. `EXP-PROGRAM-043` Workstream F is chartered to deliver agent identity, event signing, two-party approval, and git integration. Approval is the operational control layer that makes identity and signing meaningful.

### 2. Are the acceptance criteria still correct?

**Yes, with one emphasis.** Criterion 7 ("Existing tests pass without changes to event hashes or replay behavior for non-destructive operations") is the gating condition. Two-party approval must only affect the defined destructive operations; non-destructive lifecycle commands must remain unchanged.

### 3. Has newer work superseded any objectives?

**No.** `EXP-IDENTITY-001` and `EXP-SIGN-001` are now complete and provide the attribution and trust anchors required by this charter. `EXP-GIT-001` is a future consumer, not a replacement.

### 4. Does the proposed implementation still represent the preferred path?

**Yes.** Recording approvals as new governance events preserves the append-only event log, keeps replay semantics unchanged, and makes approval history queryable through `synth log`. Integrating the gate through the existing `ExecutionGate` and policy engine reuses existing mutation authority rather than inventing a parallel gate.

### 5. Should the expedition be rewritten?

**TBD by this review.** If the review rejects the new event types or the policy-engine integration boundary, the charter should be rewritten to use a sidecar approval ledger or a different enforcement point.

### 6. Should the expedition move to another program?

**No.** Two-party approval is a Workstream F deliverable of `EXP-PROGRAM-043` (Agent Onboarding & Operator Experience). `EXP-PROGRAM-031` (convergence) reviews it; it does not own it.

### 7. Should the expedition be archived?

**No.** The objective is valid and the approach is sound pending the event-type and policy-boundary decisions.

---

## Protected Asset analysis

The central question is whether the proposed approval event types and policy integration touch the **Protected Event Model** or redistribute **ExecutionGate mutation authority**.

### Finding: new event types are additive governance events

The frozen `SynthEvent` envelope is unchanged. The charter proposes adding new event **types** that use the existing envelope:

| Event type | State transition | Protected Asset impact |
|---|---|---|
| `APPROVAL_REQUESTED` | Records a pending approval request | None — append-only governance event. |
| `APPROVAL_GRANTED` | Records second-party authorization | None — append-only governance event. |
| `APPROVAL_DENIED` | Records rejection | None — append-only governance event. |
| `APPROVAL_EXPIRED` | Records expiry | None — append-only governance event. |
| `APPROVAL_EXECUTED` | Records that the approved operation executed | None — append-only governance event. |

These are payload-level event types, not envelope changes. They are analogous to existing lifecycle events such as `REVIEW_GATE_OPENED` or `ACCEPTANCE_GATE_RESOLVED`.

### Finding: policy engine integration does not bypass ExecutionGate

The charter scopes policy integration so that:

1. The policy engine evaluates whether an operation requires two-party approval.
2. The `ExecutionGate` uses the policy result to decide whether to block, allow, or require approval.
3. The actual mutation still flows through `ExecutionGate.execute()` and the guarded `EventStore`.

Mutation authority remains centralized in the `ExecutionGate`. The policy engine only provides a `require_verification` recommendation; it cannot authorize a mutation on its own.

### Finding: operation fingerprint binds approval to exact parameters

The charter requires an `operationFingerprint` hash over capability + parameters + target aggregate. This prevents an approved request from being replayed against a different operation. The fingerprint is stored in the approval event payload; it does not change the event envelope or replay semantics.

### Replay semantics

Replay reconstructs state by folding events. Approval events are observational governance state; they do not directly mutate missions, expeditions, or projects unless a projection explicitly consumes them. The `ExecutionGate` enforces approval at mutation time, not replay time, so replay behavior is unchanged.

### Public Vocabulary

No new public vocabulary terms are introduced. "Approval" is a domain concept, not a new public term. The seven canonical terms (Mission, Expedition, Evidence, Plan, Event, State, Replay) remain unchanged.

---

## Outcomes

| Expedition | Outcome | Rationale | Required actions |
|---|---|---|---|
| `EXP-APPROVAL-001` | **PENDING REVIEW** | Charter is valid but introduces new governance event types and policy-gate integration that require an explicit ADR-039 decision. | 1. This review must approve the event types and policy-engine boundary.<br>2. Update `EXP-APPROVAL-001.md` with the review outcome.<br>3. If **CONVERGED**, begin implementation.<br>4. Run `synth validate` before merging implementation. |

---

## Required decisions before implementation begins

1. **Event types.** Are the five proposed approval event types (`APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`, `APPROVAL_EXPIRED`, `APPROVAL_EXECUTED`) acceptable as new governance event payloads?
2. **Policy-engine boundary.** Is it correct for the policy engine to evaluate approval rules and return `require_verification`, with the `ExecutionGate` enforcing the block?
3. **Destructive operations list.** Is the charter's list of destructive operations complete and aligned with the constitutional baseline?
4. **Self-approval prevention.** Is enforcing `grantedBy.agentId !== requestedBy.agentId` in the `ExecutionGate` sufficient?
5. **Operation fingerprint scope.** Is hashing `capability + parameters + target aggregate` sufficient to bind an approval to an exact mutation?
6. **CLI surface.** Are the proposed `synth approval *` subcommands and `--approval-request-id` flag acceptable?

---

## Recommended outcome

**CONVERGED — approval events as additive governance events, policy engine provides recommendation, ExecutionGate enforces.**

Rationale:
- New event types use the existing envelope and preserve append-only semantics.
- ExecutionGate retains sole mutation authority.
- Operation fingerprinting prevents replay attacks without changing event hashes for non-destructive operations.
- The CLI surface is additive and does not duplicate existing lifecycle commands.

If the reviewer disagrees with the event-type approach, the fallback outcome is **REWRITE REQUIRED — approval ledger as sidecar or derived state**.

---

## Evidence

- `docs/expeditions/EXP-APPROVAL-001.md` — expedition charter.
- `docs/expeditions/EXP-PROGRAM-043.md` — program tracker, Workstream F.
- `docs/adr/ADR-039-architectural-convergence-review.md` — review authority.
- `docs/architecture/09-event-model.md` — event structure and replay semantics.
- `docs/architecture/constitutional-baseline.md` — frozen `SynthEvent` envelope and mutation authority.
- `docs/governance/convergence-review-identity-001.md` — completed identity review.
- `docs/governance/convergence-review-sign-001.md` — completed signing review.

---

## Next steps

1. Obtain an explicit **CONVERGED** or **REWRITE REQUIRED** outcome for this review.
2. Update `EXP-APPROVAL-001.md` status and scope based on the outcome.
3. If **CONVERGED**, begin implementation of approval events, policy integration, CLI commands, and ExecutionGate gating.
4. Run `synth validate` after implementation changes and attach validation output as expedition evidence.
