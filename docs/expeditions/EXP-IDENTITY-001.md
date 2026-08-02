# EXP-IDENTITY-001 — Agent/Session Identity in Events

> Make every governance event attributable to an agent, session, and approval mode without changing the core event model.

**Status:** Draft  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** EXP-PROGRAM-043 Workstream F, TaskPRO agent-action retrospective  
**Depends On:** EXP-ONBOARD-002, EXP-EVENTLOG-001, EXP-GUARD-001  
**Blocks:** EXP-SIGN-001, EXP-APPROVAL-001, EXP-GIT-001

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

Today every event carries `actor: string` (e.g. `synth-first-contact`, `synth-bootstrap`), but there is no structured way to answer:

- Which agent process emitted this event?
- What user/operator session was it part of?
- Was the action autonomous or explicitly human-approved?
- Which expedition or mission was the agent working on?

This expedition adds an optional, structured identity layer that flows through `IntentRequest.context` and is preserved in event payloads and mutation context. It intentionally does **not** change the `SynthEvent` schema or replay semantics, both of which are Protected Assets.

---

## Scope

### In scope

1. Define a canonical `AgentIdentity` schema.
2. Capture identity at CLI entry points:
   - Environment variables (`SYNTH_AGENT_ID`, `SYNTH_SESSION_ID`, `SYNTH_PARENT_EXPEDITION_ID`, `SYNTH_APPROVAL_MODE`).
   - Generated defaults when variables are absent.
3. Thread identity through `IntentRequest.context` → `CapabilityInvocation.context` → mutation context → event payload metadata.
4. Update `synth log` to filter by `agentId`, `sessionId`, `parentExpeditionId`, and `approvalMode`.
5. Add contract and end-to-end tests proving identity survives the ExecutionGate.

### Out of scope

- Changing `SynthEvent` schema, `actor` field semantics, or replay logic.
- Cryptographic signing of events (see EXP-SIGN-001).
- Two-party approval workflows (see EXP-APPROVAL-001).
- Git state snapshots (see EXP-GIT-001).

---

## Agent Identity Schema

```typescript
interface AgentIdentity {
  /** Stable identifier for the agent process or tool. */
  agentId: string
  /** Correlation id for a single operator/agent session. */
  sessionId: string
  /** Expedition this action was performed on behalf of, if any. */
  parentExpeditionId?: string
  /** Mission this action was performed on behalf of, if any. */
  parentMissionId?: string
  /** Whether the action ran autonomously or with explicit human approval. */
  approvalMode: "autonomous" | "human-approved" | "delegated"
  /** Identity provider or source of trust (e.g. "synth-cli", "mcp-client", "github-actions"). */
  identityProvider?: string
  /** ISO timestamp when this identity was issued/observed. */
  issuedAt?: string
}
```

Identity travels inside `IntentRequest.context.identity` and `CapabilityInvocation.context.identity` so that the ExecutionGate does not need a new top-level field.

---

## Design Decisions

### Keep `actor` unchanged

The existing `actor: string` remains the human-readable capability caller. Identity metadata is additive context. This preserves event-schema compatibility and keeps replay untouched.

### Capture at the CLI boundary

The CLI is the natural trust boundary. It reads identity from the environment and attaches it to every `handleIntent` call. Subcommands that delegate to tasks (e.g. `first-contact onboard:*`) propagate `SYNTH_*` variables through task subprocesses.

### Default identity

When no environment variables are set, the CLI generates:

- `agentId`: `synth-cli-<pid>`
- `sessionId`: a UUID
- `approvalMode`: `autonomous` for non-interactive commands; commands that require `--approve` set `human-approved` only when the flag is present.

### Storage in events

Capabilities that emit state events include identity in `payload.metadata.identity` where a `metadata` field already exists, or in a new `identity` sibling field for events that lack metadata. The exact field is a convention documented in this expedition, not a schema change.

---

## Deliverables

### 1. Identity schema and capture utility

- Add `src/identity/types.ts` with `AgentIdentity`.
- Add `src/identity/capture.ts` to read environment variables and build the identity object.
- Export helpers from `src/sdk/index.ts` so CLI and adapters can use them.

### 2. CLI integration

- Update `src/cli/synth.ts` main dispatch to capture identity once per invocation and pass it into every `handleIntent` and task subprocess.
- Ensure `runTask` in `src/cli/first-contact.ts` forwards `SYNTH_AGENT_ID`, `SYNTH_SESSION_ID`, `SYNTH_PARENT_EXPEDITION_ID`, `SYNTH_APPROVAL_MODE` to child processes.

### 3. ExecutionGate propagation

- Verify that `CapabilityInvocation.context` is already preserved into mutations and event payloads.
- If gaps exist, patch the gate to merge invocation context into mutation context before authorization and event creation.

### 4. Event payload conventions

- Update capabilities that create missions, expeditions, and projects to include `identity` in payload metadata.
- Examples: `CreateMission`, `InitializeProject`, `CreateExpedition`.

### 5. `synth log` filters

- Extend `synth log` command to accept `--agent-id`, `--session-id`, `--expedition-id`, and `--approval-mode` filters.
- Display identity fields in detailed log output.

### 6. Tests

- Add `tests/identity-in-events.test.js`:
  - Identity is captured from environment variables.
  - Identity flows through a `handleIntent` call and appears in the event log.
  - Task subprocesses inherit identity.
  - `synth log --agent-id <id>` returns only matching events.

---

## Acceptance Criteria

1. `AgentIdentity` type is defined and exported from the SDK.
2. CLI commands set `context.identity` on every `handleIntent` invocation.
3. Setting `SYNTH_AGENT_ID=test-agent` causes events from that process to include the identity.
4. `synth first-contact --approve` propagates identity to `onboarding:init` and `onboarding:mission` subprocesses.
5. `synth log --agent-id <id>` filters the event log correctly.
6. Existing tests pass without changes to event hashes or replay behavior.
7. `npm run govern` passes.

---

## Governance

### Protected

- Event Model (`SynthEvent` schema and replay semantics).
- ExecutionGate mutation authority.
- Public Vocabulary.

### Not included

- New event types.
- Cryptographic signatures.
- Changes to mission/expedition lifecycle.

---

## Risks

| Risk | Mitigation |
|---|---|
| Identity context is dropped by a capability | Add end-to-end tests and document the convention; patch capabilities that ignore context. |
| Operator privacy concerns | Identity is scoped to agent/session; no PII required. |
| Event hashes change unexpectedly | Keep identity out of `SynthEvent` top-level fields; only add to payloads. |
| CLI sprawl from env variables | Provide sensible defaults and one helper function; do not require operators to set variables. |

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-EVENTLOG-001 — Event-log query CLI](EXP-EVENTLOG-001.md)
- [EXP-GUARD-001 — Derived-State Protection](EXP-GUARD-001.md)
- [EXP-SIGN-001 — Event-log signing / Merkle root](EXP-SIGN-001.md) (future)
- [EXP-APPROVAL-001 — Two-party approval for destructive operations](EXP-APPROVAL-001.md) (future)
