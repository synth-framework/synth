# EXP-RUNTIME-001 — Runtime Correctness and Recovery

> **Runtime expedition.** Guarantee that every runtime lifecycle transition is atomic, replayable, and recoverable using supported public commands. Close the gap between certified planning snapshots and runtime event-backed state, and provide a governed reconciliation path instead of requiring manual event-log surgery.

**Status:** Completed  
**Kind:** Runtime Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-BROWNFIELD-001 (Brownfield Bootstrap Hardening), EXP-CLI-001 (CLI UX and Diagnostics Hardening)

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: Yes (recovery commands)
  Architecture Freeze: Safe
  Requires ADR: Yes (for recovery primitive contract)
```

---

## Objective

Make the SYNTH runtime the single source of truth for lifecycle state. A certified Mission Studio snapshot must never exist without the corresponding runtime events, and the runtime must never require an operator to reverse-engineer hashes or reconstruct events by hand.

This expedition delivers:

- **Atomicity:** every runtime lifecycle transition either completes fully or fails without leaving partial state.
- **Replayability:** replay reconstructs identical runtime state from the event log.
- **Recoverability:** drift is repairable through supported public commands, never by manual event-log surgery.

This expedition does not redesign the brownfield workflow, the Discovery compiler, or the CLI output surface.

---

## Origin Evidence

Findings from the large-repository brownfield certification:

- After `synth mission approve`, the certified snapshot existed but the event log contained no `MISSION_CREATED` or `MISSION_APPROVED` events. The agent had to manually bridge the planning layer to the runtime layer.
- When runtime state diverged from certified snapshots, the only recovery path was manual event-log reconstruction, including hash-chain repair. This is error-prone and not replayable.
- The agent could reconstruct the intended event log, which proves the runtime contract is comprehensible, but the product should uphold that contract itself.

---

## Finding 1 — Mission Approval Can Leave Runtime Out of Sync

### Observation

`synth mission approve` produces a certified `ApprovedMissionModelSnapshot` and records a decision, but it does not emit `MISSION_CREATED` and `MISSION_APPROVED` runtime events. As a result:

- `synth expedition create --mission <id>` can reference a mission that replay does not know about.
- `synth --json status` reports a `GovernanceResolutionFailure` due to an unresolved mission reference.
- The repository appears healthy from the snapshot layer but is inconsistent from the event layer.

### Required Change

Mission approval must be atomic across layers:

```text
Mission Studio approval
        ↓
Certified snapshot persisted
        ↓
MISSION_CREATED  (if not present)
MISSION_APPROVED
        ↓
Decision recorded
```

If any runtime event cannot be emitted, the approval must fail and the snapshot must not be certified.

---

## Finding 2 — No Governed Recovery Path for Runtime Drift

### Observation

When runtime state and certified snapshots diverge, operators have no supported command to reconcile them. The certification agent resorted to manual event-log reconstruction, including recomputing hashes.

### Required Change

Introduce a recovery primitive with a replayable, governed contract:

```text
synth repair replay
```

or

```text
synth reconcile
```

Responsibilities:

- Detect drift between certified snapshots and runtime event log.
- Propose a deterministic set of repair events that bring the event log into sync.
- Require explicit operator approval before mutating the event log.
- Emit repair events through the ExecutionGate so the recovery itself is replayable.
- Never silently overwrite or delete existing events; only append compensating events.

**Definition of recoverable:** recovery must not require editing `.jsonl` files, editing `.json` state, recomputing hashes, running internal scripts, or directly calling internal APIs. If any of those are required, the runtime contract is incomplete.

This is an ADR-worthy design because it touches the event model, hash chain, and governance boundaries.

---

## Finding 3 — Event Guarantees Are Not Explicitly Tested

### Observation

There is no certification test that asserts: "For every approved lifecycle transition, the required runtime events exist." The existing tests verify individual capabilities but do not verify end-to-end lifecycle event completeness.

### Required Change

Add runtime event-guarantee certification tests:

- After `mission approve`: `MISSION_CREATED` and `MISSION_APPROVED` events exist.
- After `expedition create`: `EXPEDITION_CREATED` event exists and references an active mission.
- After `expedition approve`: `EXPEDITION_APPROVED` event exists.
- After `expedition start`: `EXPEDITION_STARTED` event exists.
- After `expedition complete`: `EXPEDITION_COMPLETED` event exists.
- No approved transition leaves a dangling reference.

---

## Deliverables

### 1. Atomic Mission Approval Bridge

Modify `synth mission approve` so that a certified snapshot is always accompanied by the required runtime events:

- Extract the mission node from the approved snapshot.
- Emit `CreateMission` if no mission with that id exists in runtime state.
- Emit `ApproveMission` to transition the mission to `active`.
- If any intent fails, do not record the approval decision and do not certify the snapshot.

### 2. Atomic Expedition Creation Bridge

Ensure `synth expedition create` validates the mission reference against runtime state (not just the snapshot-derived governance context) and that the created expedition is backed by an `EXPEDITION_CREATED` event. If the referenced mission does not exist in runtime state, the command must fail with a clear diagnostic.

### 3. Runtime Event Guarantee Certification

Add `tests/runtime-event-guarantees.test.js` asserting that every approved lifecycle transition emits the required events and leaves no unresolved references.

### 4. Recovery Primitive ADR

Produce `docs/adr/ADR-0XX-replay-recovery.md` covering:

- Drift detection algorithm
- Repair event taxonomy
- Approval boundary
- Hash-chain semantics
- Safety invariants (append-only, no silent deletion)

### 5. `synth repair replay` / `synth reconcile` Prototype

Implement the approved recovery primitive:

- Read certified snapshots and the event log.
- Compute missing runtime events.
- Present a proposed repair plan.
- Upon approval, append repair events through the ExecutionGate.
- Emit a `REPAIR_ACCEPTED` or `RECONCILED` event for auditability.

### 6. Runtime Drift Detection Engine

Implement a runtime drift detection engine that compares certified snapshots with the replayed event log and reports inconsistencies:

- Missing runtime events for a certified snapshot.
- Dangling references from runtime events.
- Hash-chain or replay divergence.

The engine exposes its findings through a stable interface. The CLI surface (`synth status`, `synth explain replay`) presents the findings as warnings or blockers; that presentation work belongs to EXP-CLI-001.

---

## Goals

This expedition shall:

- Ensure every approved lifecycle transition emits the required runtime events or fails atomically.
- Eliminate manual event-log reconstruction as a recovery path.
- Provide a governed, replayable recovery primitive for runtime/snapshot drift.
- Add certification tests for runtime event guarantees.
- Ensure `npm run build` and `npm run govern` pass.

---

## Non-Goals

This expedition shall not:

- Redesign the brownfield bootstrap workflow.
- Modify the Discovery compiler architecture.
- Change the CLI output surface (see EXP-CLI-001).
- Introduce new public concepts beyond the seven (Mission, Expedition, Evidence, Plan, Event, State, Replay).
- Allow silent modification or deletion of existing events.
- Build IDE, MCP, or Web client integrations.

---

## Execution Constraints

1. **Atomicity.** A certified snapshot without corresponding runtime events must be impossible.
2. **Append-only recovery.** Repair commands append compensating events; they never rewrite history.
3. **Governed mutation.** Recovery events pass through the ExecutionGate and require operator approval.
4. **Backward compatibility.** Existing event logs must continue to replay correctly.
5. **Every fix requires a test.** Each event-guarantee fix must be covered by a certification test.

---

## Acceptance Criteria

A successful expedition:

> **Every runtime lifecycle transition is atomic, replayable, and recoverable using supported public commands.**

- [x] `synth mission approve` emits `MISSION_CREATED` and `MISSION_APPROVED` events atomically with the certified snapshot.
- [x] `synth expedition create` fails if the referenced mission does not exist in runtime state.
- [x] No approved lifecycle transition leaves an unresolved reference in the event log.
- [x] Runtime event-guarantee certification tests pass.
- [x] A recovery primitive ADR is published and accepted (`docs/adr/ADR-034-replay-recovery.md`).
- [x] `synth repair replay` detects and proposes repairs for snapshot/runtime drift using only public commands.
- [x] The runtime drift detection engine reports inconsistencies; CLI surfacing is owned by EXP-CLI-001.
- [x] `npm run build` passes.
- [x] `npm run govern` passes (verified by CI).

---

## Architectural Principles

> **A certified snapshot without runtime events is a broken invariant.**

> **Recovery must be replayable, not archaeological.**

> **The event log is append-only; drift is repaired by adding truth, not erasing error.**

> **Every runtime lifecycle transition is atomic, replayable, and recoverable using supported public commands.**

---

## Expected Outcome

After completion:

- Mission and expedition approvals always produce a consistent runtime state.
- Operators never need to manually reconstruct events or hashes.
- Drift is detected, reported, and repairable through a governed CLI command.
- The runtime event model is protected by certification tests.
- Future lifecycle changes must satisfy the event-guarantee contract.

---

## Governance

### Protected

- Runtime Event Guarantee Contract
- Recovery Primitive Contract
- Append-Only Event Log Invariant
- Atomic Lifecycle Transition Invariant

### Not Included

- Brownfield bootstrap workflow redesign
- Discovery compiler changes
- CLI diagnostics and messaging (see EXP-CLI-001)
- New client integrations

---

## Related Documents

- [EXP-BROWNFIELD-001 — Brownfield Bootstrap Hardening](EXP-BROWNFIELD-001.md)
- [EXP-CLI-001 — CLI UX and Diagnostics Hardening](EXP-CLI-001.md)
- [EXP-CONT-001 — Resume Briefing](EXP-CONT-001.md)
- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
