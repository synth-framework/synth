---
Title: Operator Journey
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: The complete end-to-end operator journey through Synth
Depends On: 01-getting-started.md
Builds Toward: certification of the Synth product before v2 freeze
Version: 2.0.0
Status: stable
---

# Operator Journey

## Purpose

This document defines the canonical end-to-end operator journey. It is the script used for Operator Journey Certification (`EXP-PROD-003`).

If an unfamiliar operator cannot complete every step without architectural coaching, the product is not ready to freeze.

## The Journey

```text
Idea
↓
Mission
↓
Planning
↓
Approval
↓
Commit
↓
Execution
↓
Replay
↓
Documentation
↓
Done
```

## Step-by-Step Script

### Step 1 — Idea

**What the operator does:** Describe what they want to build.

**Example input:**
```text
Build a customer support portal that lets users submit tickets and track status.
```

**Success check:** The idea is concrete enough to become a mission.

---

### Step 2 — Mission

**What the operator does:** Articulate the idea as a mission observation.

**Expected input:**
```javascript
const missionObservation = {
  type: "mission",
  payload: { subject: "Support Portal", purpose: "Customer self-service ticket tracking" }
}
```

**Success check:** The mission has a clear name and purpose.

---

### Step 3 — Planning

**What the operator does:** Feed the mission observation plus expeditions and objectives into the planning environment so Synth can build a plan.

**Expected input:**
```javascript
const session = await api.missionStudioOperation({
  operation: "startSession",
  params: {
    observations: [
      missionObservation,
      { type: "expedition", payload: { subject: "Auth Flow", goal: "Secure login and session management", missionSubject: "Support Portal" } },
      { type: "objective", payload: { subject: "Login Page", title: "Implement login page", expeditionSubject: "Auth Flow" } }
    ]
  }
})
```

**Expected output:**
```javascript
{ status: "ok", session: { worldModel: { /* missions, expeditions, objectives */ }, questions: [...] } }
```

**Success check:** The planning environment produces a plan with at least one mission, expedition, and objective.

---

### Step 4 — Approval

**What the operator does:** Review the proposed plan and approve it.

**Expected input:**
```javascript
const approved = await api.missionStudioOperation({
  operation: "approveModel",
  params: { session: session.session }
})
```

**Expected output:**
```javascript
{ status: "ok", result: { success: true, data: { id: "plan-...", signature: "...", proposals: [...] } } }
```

**Success check:** An immutable, signed approved plan is produced.

---

### Step 5 — Commit

**What the operator does:** Commit the approved plan to execution.

**Expected input:**
```javascript
const genesis = await api.genesisFromSnapshot({ snapshot: approved.data })
```

**Expected output:**
```javascript
{ status: "ok", result: { systemId: "plan-...", projectName: "...", seededEvents: 3 } }
```

**Success check:** Seed events are written to the event log and state contains the mission artifacts.

---

### Step 6 — Execution

**What the operator does:** Drive the work by requesting actions.

**Expected input sequence:**
```javascript
const missionId = missionProposal.id
const expeditionId = expeditionProposal.id
const objectiveId = objectiveProposal.id

await api.handleIntent({ actor: "operator", capability: "ApproveMission", payload: { id: missionId } })
await api.handleIntent({ actor: "operator", capability: "ApproveExpedition", payload: { id: expeditionId } })
await api.handleIntent({ actor: "operator", capability: "StartExpedition", payload: { id: expeditionId } })
await api.handleIntent({ actor: "operator", capability: "CompleteObjective", payload: { id: objectiveId } })
await api.handleIntent({ actor: "operator", capability: "CompleteExpedition", payload: { id: expeditionId } })
await api.handleIntent({ actor: "operator", capability: "CompleteMission", payload: { id: missionId } })
```

**Success check:** Each request returns `status: "ok"` and the final mission status is `completed`.

---

### Step 7 — Replay

**What the operator does:** Verify that the event log can reconstruct the same state.

**Expected input:**
```javascript
const verifier = createReplayVerifier(eventStore, stateStore)
const result = await verifier.verify()
```

**Expected output:**
```javascript
{ consistent: true, eventCount: N, stateHash: "..." }
```

**Success check:** Replay is consistent and the state hash matches expectations.

---

### Step 8 — Documentation

**What the operator does:** Regenerate project documentation from the knowledge base.

**Expected input:**
```javascript
await api.documentationOperation({
  operation: "generateDocs",
  params: { knowledgeBaseDir: "./docs", outDir: "./docs/generated" }
})
```

**Expected output:**
```javascript
{ status: "ok", projections: [
  { filename: "README.md", title: "README" },
  { filename: "ARCHITECTURE.md", title: "Architecture" },
  { filename: "API.md", title: "API Reference" },
  { filename: "OPERATOR_GUIDE.md", title: "Operator Guide" },
  { filename: "DEVELOPER_GUIDE.md", title: "Developer Guide" },
  { filename: "ARCHITECT_GUIDE.md", title: "Architect Guide" },
  { filename: "AI_CONTEXT.md", title: "AI Context" }
] }
```

**Success check:** All seven documents are generated and non-empty.

---

### Step 9 — Done

**What the operator does:** Confirm that the mission is complete and the system is consistent.

**Success check:**
- Mission status is `completed`.
- Replay verification is consistent.
- Documentation has been regenerated.

## Observer Protocol

When running certification sessions with human operators, observers must:

1. **Do not coach.** Only intervene if the operator is genuinely blocked for more than five minutes.
2. **Record time per step.** Use a simple stopwatch or timestamp log.
3. **Record confusion points.** Note any step where the operator hesitates, misreads, or asks a clarifying question.
4. **Record errors.** Capture exact error messages and the step where they occurred.
5. **Save artifacts.** Keep the approved plan, event log, replay result, and generated docs.

## Acceptance Rubric

| Criterion | Threshold | Measurement |
|---|---|---|
| Journey completion | 100% | All 9 steps complete without architectural coaching |
| Operator independence | ≥2 operators | Each operator completes the journey alone |
| Mission artifact | Present | Approved plan with at least one mission, expedition, and objective |
| Commit artifact | Present | Seed events committed and state contains mission artifacts |
| Execution artifact | Present | At least one objective completed through requested actions |
| Replay artifact | Consistent | `verifier.verify().consistent === true` |
| Documentation artifact | Present | All 7 generated documents are non-empty |
| Friction resolution | 100% | All blockers are resolved or explicitly deferred with rationale |

## Certification Report

After sessions complete, publish a report with:

- Operator profiles (technical background, prior Synth exposure).
- Per-operator step times and confusion points.
- Artifact hashes and replay results.
- Blockers and mitigations.
- Final certification decision: **Certified** or **Blockers Remain**.

## Related Documents

- [Getting Started](01-getting-started.md) — First interaction with Synth
- [Your First Expedition](02-your-first-expedition.md) — Planning and executing work
- [Understanding Genesis](03-understanding-genesis.md) — How systems are initialized
- [Replay](09-replay.md) — State verification through history
- [Public Vocabulary](../reference/public-vocabulary.md) — The seven public concepts
- [EXP-PROD-003](../expeditions/EXP-PROD-003.md) — Operator Journey Certification Expedition

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-12 | Rewrote using public vocabulary |
| 1.0.0 | 2026-07-12 | Initial stable release for EXP-PROD-003 |
