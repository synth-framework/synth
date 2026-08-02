# EXP-APPROVAL-001 — Two-Party Approval for Destructive Operations

> Require two independent authorizations before destructive governance operations can mutate state, and record the authorization evidence in the event log.

**Status:** Draft — pending ADR-039 Convergence Review  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** EXP-PROGRAM-043 Workstream F, EXP-REVIEW-003 required actions, TaskPRO agent-action retrospective  
**Depends On:** EXP-IDENTITY-001, EXP-SIGN-001, ADR-039 Convergence Review outcome  
**Blocks:** None

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

Some governance operations are destructive or irreversible: re-bootstrapping a project, deleting an expedition, editing the event log, or importing legacy state. Today these operations can be authorized by a single actor (`--approve` or an SDK call). This expedition introduces a two-party approval flow so that:

- No single compromised agent or operator can destroy governance state.
- Every approval is attributable to a real identity (via EXP-IDENTITY-001).
- Approval evidence is durable and replayable.
- The CLI surface makes the required second authorization explicit.

Because approvals are recorded as new governance events, the `SynthEvent` envelope is unchanged and replay semantics are unaffected. The charter still routes through ADR-039 because the new event types and policy integration affect the architectural baseline.

---

## Scope

### In scope

1. Define the set of destructive operations that require two-party approval.
2. Define the approval event types and lifecycle (`APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`, `APPROVAL_EXPIRED`).
3. Integrate with the policy engine so approval rules are configurable per project.
4. Define required evidence: identities of both parties, timestamps, reasons, and operation fingerprint.
5. Add CLI commands and flags to request, grant, deny, and inspect approvals.
6. Block destructive mutations until the second approval is recorded.
7. Obtain an ADR-039 Convergence Review outcome before writing implementation code.

### Out of scope

- Identity capture (see EXP-IDENTITY-001).
- Cryptographic signing of events (see EXP-SIGN-001).
- Git state snapshots (see EXP-GIT-001).
- General multi-party workflows beyond the defined destructive operations.

---

## Destructive Operations Requiring Two-Party Approval

| Operation | Command | Why destructive |
|---|---|---|
| Re-bootstrap project | `synth bootstrap --approve` | Replaces project identity and genesis state. |
| Delete expedition | `synth expedition delete <id> --approve` | Removes committed work and attached evidence. |
| Edit event log | `synth log edit`, `synth log revert` | Breaks append-only invariant and replay integrity. |
| Import legacy state | `synth migrate import --approve` | Overwrites current governance state with external data. |
| Rotate signing key | `synth signing rotate-key --approve` | Changes the trust anchor for event-log signatures. |
| Force complete expedition | `synth expedition complete --force --approve` | Bypasses verification gates. |

New destructive capabilities can opt into the policy by declaring `requiresTwoPartyApproval: true` in their capability manifest.

---

## Approval Flow

### 1. Request

The first actor initiates the operation with `--request-approval` or the operation is blocked immediately with:

```text
Operation <name> requires two-party approval.
Run: synth approval request --operation <id> --reason "..."
```

This appends an `APPROVAL_REQUESTED` event containing:

- `requestId`
- `operation` — capability/operation identifier
- `operationFingerprint` — hash of the intended mutation parameters
- `requestedBy` — identity of the first actor
- `requestedAt`
- `reason`
- `expiresAt` — default 24 hours

### 2. Grant

The second actor reviews and grants approval:

```text
synth approval grant --request-id <request-id> --reason "..."
```

This appends an `APPROVAL_GRANTED` event containing:

- `requestId`
- `grantedBy` — identity of the second actor
- `grantedAt`
- `reason`

The second actor must be a different identity from the requester (`grantedBy.agentId !== requestedBy.agentId`).

### 3. Execute

Once both approvals are recorded, the original operation can proceed. The ExecutionGate checks:

1. Does the operation fingerprint match the approved request?
2. Are both approvals present and unexpired?
3. Are the two identities distinct?

If yes, the mutation is applied and an `APPROVAL_EXECUTED` event is appended.

### 4. Deny / Expire

- `synth approval deny --request-id <id> --reason "..."` appends `APPROVAL_DENIED`.
- An expired request appends `APPROVAL_EXPIRED` on the next access attempt.

---

## Policy Engine Integration

Approval rules are loaded from `.synth/policy/approval-policy.yaml` (or derived from the constitutional baseline if absent):

```yaml
twoPartyApproval:
  defaultExpiryHours: 24
  operations:
    - operation: bootstrap
      required: true
    - operation: expedition-delete
      required: true
    - operation: log-edit
      required: true
    - operation: migrate-import
      required: true
    - operation: signing-rotate-key
      required: true
    - operation: expedition-complete-force
      required: true
```

The policy engine evaluates `POLICY_EVALUATED` events with result `require_verification` when an operation needs approval. The ExecutionGate uses the policy result to decide whether to block, allow, or require approval.

---

## Required Evidence

Every approval event must carry:

1. `requestId` — stable correlation identifier.
2. `operationFingerprint` — deterministic hash of the intended mutation so the approval cannot be replayed against a different operation.
3. Both actor identities (`AgentIdentity` from EXP-IDENTITY-001).
4. Timestamps and reasons.
5. Policy result reference (`policyId`, `policyEvaluationId`).

---

## CLI Surface

```text
synth approval request --operation <op> [--params <json>] --reason "..."
synth approval grant --request-id <id> --reason "..."
synth approval deny --request-id <id> --reason "..."
synth approval list [--operation <op>] [--status pending|granted|denied|expired]
synth approval show --request-id <id>
```

Destructive commands gain an `--approval-request-id <id>` flag so a previously granted approval can be supplied at execution time.

---

## Deliverables

### 1. Approval event schema

- Add `APPROVAL_REQUESTED`, `APPROVAL_GRANTED`, `APPROVAL_DENIED`, `APPROVAL_EXPIRED`, and `APPROVAL_EXECUTED` to the state-event union.
- Events carry `AgentIdentity` from EXP-IDENTITY-001.

### 2. Policy integration

- `src/policy/approval-policy.ts` — load and evaluate approval policy.
- `src/control/execution-gate.ts` — gate destructive mutations until approvals are satisfied.

### 3. CLI commands

- `src/cli/approval.ts` — `request`, `grant`, `deny`, `list`, `show`.
- Update destructive commands to require `--approval-request-id` or `--request-approval`.

### 4. Operation fingerprinting

- `src/approval/fingerprint.ts` — deterministic hash of capability + parameters + target aggregate.

### 5. Tests

- `tests/two-party-approval.test.js`:
  - Destructive operation blocked without two approvals.
  - Same actor cannot grant their own request.
  - Expired request is rejected.
  - Mismatched operation fingerprint is rejected.
  - Approved operation executes and emits `APPROVAL_EXECUTED`.

---

## Acceptance Criteria

1. ADR-039 Convergence Review is completed with a **CONVERGED** outcome before implementation merges.
2. The defined destructive operations cannot execute without two distinct approvals.
3. Approval events are replayable and appear in `synth log`.
4. `synth approval request` emits an `APPROVAL_REQUESTED` event with a valid operation fingerprint.
5. `synth approval grant` rejects self-approval and expired requests.
6. Policy configuration can enable/disable two-party approval per operation.
7. Existing tests pass without changes to event hashes or replay behavior for non-destructive operations.
8. `npm run govern` passes.

---

## Convergence Review

Per `EXP-REVIEW-003` required action 3, this charter **must** pass an ADR-039 Convergence Review before implementation begins. The review must decide:

1. Whether the proposed approval event types are consistent with the event model and replay semantics.
2. Whether the policy engine integration boundary is correct.
3. Whether the list of destructive operations is complete and aligned with the constitutional baseline.
4. Whether the CLI surface duplicates any existing lifecycle commands.

**Review outcome is a prerequisite.** If the review returns **REWRITE REQUIRED** or **SUPERSEDED**, this charter is updated before any code is written.

---

## Governance

### Protected

- Event Model (`SynthEvent` envelope schema and replay semantics).
- ExecutionGate mutation authority.
- Public Vocabulary.

### Not included

- Changes to the `SynthEvent` envelope.
- Cryptographic signatures.
- Git repository operations.

---

## Risks

| Risk | Mitigation |
|---|---|
| Approval policy drift | Default policy is derived from the constitutional baseline; project overrides are versioned in `.synth/policy/`. |
| Same actor bypasses two-party rule | ExecutionGate enforces `grantedBy.agentId !== requestedBy.agentId`. |
| Approved operation is replayed against different parameters | Operation fingerprint binds approval to exact mutation parameters. |
| CLI friction for legitimate operations | Provide `--request-approval`/`--approval-request-id` and a 24-hour expiry; non-destructive ops are unaffected. |

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-IDENTITY-001 — Agent/Session Identity in Events](EXP-IDENTITY-001.md)
- [EXP-SIGN-001 — Event-Log Signing / Merkle Root](EXP-SIGN-001.md)
- [EXP-GIT-001 — Git Integration for Governance State Snapshots](EXP-GIT-001.md) (future)
- [docs/architecture/09-event-model.md](../architecture/09-event-model.md)
- [docs/adr/ADR-039-architectural-convergence-review.md](../adr/ADR-039-architectural-convergence-review.md)
