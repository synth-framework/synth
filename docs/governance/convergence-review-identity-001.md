# Convergence Review Record — EXP-IDENTITY-001

**Review ID:** EXP-REVIEW-004  
**Authority:** [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)  
**Date:** 2026-08-02  
**Reviewer:** Synth architectural baseline + Program 031 gating function  
**Expedition reviewed:** [EXP-IDENTITY-001 — Agent/Session Identity in Events](../expeditions/EXP-IDENTITY-001.md)  
**Owning program:** [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](../expeditions/EXP-PROGRAM-043.md)  
**Outcome:** **CONVERGED** — payload-only identity, no Protected Asset change  

---

## Expedition summary

`EXP-IDENTITY-001` proposes an optional, structured `AgentIdentity` layer that flows through `IntentRequest.context` and `CapabilityInvocation.context` and is stored inside event **payloads** (e.g., `payload.metadata.identity` or an equivalent payload field). The charter explicitly states that it does **not** add, remove, or rename any top-level `SynthEvent` envelope field and does **not** change replay semantics.

The goal is to make every governance event attributable to an agent process, operator session, parent expedition/mission, and approval mode, without altering the frozen event model.

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

**Yes.** The TaskPRO retrospective and `EXP-PROGRAM-043` Workstream F both require agent/session identity in events. The problem — "which agent, session, expedition, and approval mode produced this event?" — is unresolved by Workstreams A–E.

### 2. Are the acceptance criteria still correct?

**Yes, with one emphasis.** Criterion 7 ("Existing tests pass without changes to event hashes or replay behavior") and criterion 9 ("No `SynthEvent` envelope field is added, removed, or renamed") are the gating conditions. Implementation must keep identity inside payloads.

### 3. Has newer work superseded any objectives?

**No.** `EXP-SIGN-001` (event signing) and `EXP-APPROVAL-001` (two-party approval) are future workstreams that will consume identity metadata, but they do not supersede this charter.

### 4. Does the proposed implementation still represent the preferred path?

**Yes.** Capturing identity at the CLI trust boundary, threading it through invocation context, and storing it in payload metadata is the lowest-risk path. It reuses the existing `actor` field and `context` propagation rather than inventing a new envelope concept.

### 5. Should the expedition be rewritten?

**No.** The charter already scopes identity to payloads and explicitly excludes envelope/replay changes. If implementation later discovers that identity must move to the envelope, that would become a separate Architecture Expedition requiring an event-model ADR.

### 6. Should the expedition move to another program?

**No.** Agent identity is a Workstream F deliverable of `EXP-PROGRAM-043` (Agent Onboarding & Operator Experience). `EXP-PROGRAM-034` (task engine) and `EXP-PROGRAM-031` (convergence) are consumers or reviewers, not owners.

### 7. Should the expedition be archived?

**No.** The objective is valid and the approach is sound.

---

## Protected Asset analysis

The central question is whether adding identity to event payloads touches the **Protected Event Model**.

### Finding: identity stays inside `payload`, outside the frozen envelope

The frozen `SynthEvent` envelope is defined in `docs/architecture/constitutional-baseline.md` and `src/types/event.ts`:

| Envelope field | Frozen? | Impact from `EXP-IDENTITY-001` |
|---|---|---|
| `id` | Yes | None. |
| `type` | Yes | None. |
| `timestamp` | Yes | None. |
| `transactionId` | Yes | None. |
| `capability` | Yes | None. |
| `actor` | Yes | **Unchanged.** Identity is additive metadata; `actor` remains the human-readable capability caller. |
| `payload` | Yes, typed `unknown` | Identity is added **inside** this field, not beside it. This is a payload-content convention, not an envelope change. |
| `eventHash` / `previousHash` | Yes | None. Hashes continue to cover the canonical envelope + payload as before. Optional payload content will change hashes of new events exactly as any other payload change would. |
| Partition fields | Optional | None. |

`docs/architecture/09-event-model.md` treats `payload` as "event-specific data" and the envelope as the structure that guarantees determinism, replay, and chain integrity. Because identity is stored inside `payload.metadata.identity` (or an equivalent payload field), the envelope contract is unchanged.

### Replay semantics

`docs/architecture/11-replay.md` and `src/runtime/replay.js` reconstruct state by folding `applyEvent(state, event)` over the log. Identity metadata is optional and observational; it does not participate in state transitions unless a projection explicitly consumes it. Replay semantics are therefore untouched.

### Public Vocabulary

The seven public terms (Mission, Expedition, Evidence, Plan, Event, State, Replay) are not modified or extended by `AgentIdentity`. The identity fields (`agentId`, `sessionId`, `parentExpeditionId`, `parentMissionId`, `approvalMode`, `identityProvider`, `issuedAt`) are domain metadata, not new public vocabulary.

### ExecutionGate mutation authority

The ExecutionGate remains the sole mutation authority. Identity arrives through `CapabilityInvocation.context`, which the gate already preserves into mutations. The charter only verifies or patches that propagation; it does not bypass or redistribute mutation authority.

---

## Outcomes

| Expedition | Outcome | Rationale | Required actions |
|---|---|---|---|
| `EXP-IDENTITY-001` | **CONVERGED** | Identity is scoped to payload metadata; no `SynthEvent` envelope field, `actor` semantics, or replay behavior is changed. | 1. Implement identity capture, context propagation, and payload conventions as chartered.<br>2. Add contract and end-to-end tests proving identity survives the ExecutionGate and does not alter replay.<br>3. Keep identity payload-only; any envelope change triggers a new Architecture Expedition and ADR.<br>4. Run `synth validate` before merging implementation. |

---

## Required actions before implementation merges

1. **Payload-only enforcement.** Every emitted identity field must live inside an existing payload `metadata` object or an equivalent payload field. No top-level event field may be added.
2. **Replay safety.** Existing event logs and replay tests must pass unchanged. New events may include identity, but that must not break deterministic replay.
3. **Default identity determinism.** Generated defaults (`agentId`, `sessionId`) must not introduce nondeterminism into existing replay/state tests. Consider tests that compare event payloads directly.
4. **CLI propagation.** `synth first-contact --approve` must forward identity environment variables to `onboarding:*` subprocesses.
5. **Log filter tests.** `synth log --agent-id`, `--session-id`, `--expedition-id`, and `--approval-mode` must be covered.
6. **Convergence evidence.** Attach this review record and passing validation output to the expedition evidence package.

---

## Caveats

- This review approves the **charter as written**. If implementation discovers that identity must move to the `SynthEvent` envelope to satisfy signing, two-party approval, or audit requirements, the work must stop and a new event-model Architecture Expedition must be chartered.
- Default identity values that include process-specific or random data will change the content of newly emitted events. This is expected, but tests that assert exact payload equality on future events must account for it.
- `EXP-SIGN-001` and `EXP-APPROVAL-001` are still draft and may impose additional constraints on identity. They must undergo their own Convergence Reviews before implementation.

---

## Evidence

- `docs/expeditions/EXP-IDENTITY-001.md` — expedition charter.
- `docs/expeditions/EXP-PROGRAM-043.md` — program tracker, Workstream F.
- `docs/adr/ADR-039-architectural-convergence-review.md` — review authority.
- `docs/architecture/09-event-model.md` — event structure and replay semantics.
- `docs/architecture/constitutional-baseline.md` — frozen `SynthEvent` envelope.
- `src/types/event.ts` — `SynthEvent` type definition (`payload: unknown`).
- `docs/governance/convergence-review-043-003.md` — parent program review requiring this expedition-level review.

---

## Next steps

1. Update `EXP-IDENTITY-001.md` status to **"Draft — ADR-039 Converged"** and reference this review record.
2. Begin implementation of identity capture, CLI propagation, and `synth log` filters.
3. Run `synth validate` after implementation changes.
4. Attach validation output and this record as expedition evidence before marking `EXP-IDENTITY-001` complete.
