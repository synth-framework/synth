> **Canonical Recorded Journey — Raw Recording**
>
> This document is a narrative transcript of the canonical First Contact execution. It combines the human prompt, representative AI-agent reasoning, the actual SYNTH CLI invocations, and the actual event output produced by running `examples/first-contact/scripts/run.js`.
>
> Generated: 2026-07-15T01:43:26.469Z
> Events: 32
> Replay: consistent
> Proof: `evidence-archive/proof.json`

# Canonical Recorded Journey: Space Mission Tracking Application

## Episode 1 — The Spark

**Human prompt:**

> Build me a Space Mission Tracking application.

**AI agent response:**

> Absolutely. Before I write any code, I'm going to inspect your project, understand its architecture, and propose a plan for your approval.

**CLI output (representative):**

```text
Analyzing repository...
Reading package.json...
Inspecting architecture...
Checking tests...
Discovering capabilities...
```

**Actual execution step:** The example runner bootstraps a fresh SYNTH project and prepares Mission Studio with observations about the requested Mission and its Expeditions.

---

## Episode 2 — The Idea

**AI reasoning:**

> The user wants a Space Mission Tracking Application. I should capture this as a Mission — a strategic objective that describes what we want to achieve, not how to implement it.

**Actual CLI invocation:**

```bash
synth mission create \
  --subject "Space Mission Tracking Application" \
  --purpose "Track space missions, crew assignments, and launch windows with a simple, realistic implementation."
```

**Actual output (Mission Studio):**

```json
{
  "status": "ok",
  "kind": "MissionDraft",
  "subject": "Space Mission Tracking Application",
  "purpose": "Track space missions, crew assignments, and launch windows with a simple, realistic implementation.",
  "nextStep": "synth mission approve --draft-id <draft-id>"
}
```

**Actual event emitted:**

```json
{
  "type": "MISSION_CREATED",
  "payload": {
    "mission": {
      "name": "Space Mission Tracking Application",
      "purpose": "Track space missions, crew assignments, and launch windows with a simple, realistic implementation.",
      "status": "draft"
    }
  }
}
```

---

## Episode 3 — The Plan

**AI reasoning:**

> A Mission this broad needs to be broken into bounded Expeditions. I'll propose five: data model, scaffolding, mission views, crew workflow, and validation. Each needs evidence and acceptance criteria before approval.

**Actual CLI invocations:**

```bash
synth expedition create \
  --mission "Space Mission Tracking Application" \
  --subject "Design Data Model" \
  --goal "Design the data model for missions, crew, and launch windows."

synth expedition create \
  --mission "Space Mission Tracking Application" \
  --subject "Scaffold Application" \
  --goal "Scaffold the application structure and core modules."

synth expedition create \
  --mission "Space Mission Tracking Application" \
  --subject "Implement Mission Views" \
  --goal "Implement mission listing and detail views."

synth expedition create \
  --mission "Space Mission Tracking Application" \
  --subject "Implement Crew Workflow" \
  --goal "Add crew assignment workflow."

synth expedition create \
  --mission "Space Mission Tracking Application" \
  --subject "Validate Implementation" \
  --goal "Validate the implementation with the operator and generate documentation."
```

**Actual events emitted (selection):**

```json
{ "type": "PLAN_CREATED", "payload": { "plan": { "name": "Design Data Model" } } }
{ "type": "EXPEDITION_CREATED", "payload": { "expedition": { "name": "Design Data Model", "goal": "Design the data model for missions, crew, and launch windows." } } }
{ "type": "PLAN_CREATED", "payload": { "plan": { "name": "Scaffold Application" } } }
{ "type": "EXPEDITION_CREATED", "payload": { "expedition": { "name": "Scaffold Application", "goal": "Scaffold the application structure and core modules." } } }
```

**Human approval:**

> The proposed plan looks good. Approve it.

**Actual CLI invocation:**

```bash
synth mission approve --draft-id <draft-id>
```

**Actual output:**

```json
{
  "status": "ok",
  "kind": "MissionApprovalDecision",
  "decision": { "approved": true }
}
```

---

## Episode 4 — The AI Works

**AI reasoning:**

> The Plan is approved. I'll now execute each Expedition through SYNTH's CLI surface, starting with approving the Mission, then each Expedition, completing objectives, and finishing the Mission.

**Actual execution intents (CLI surface):**

```text
ApproveMission        → Mission approved
ApproveExpedition     → Expedition approved
StartExpedition       → Expedition started
CompleteObjective     → Objective completed
CompleteExpedition    → Expedition completed
CompleteMission       → Mission completed
```

**Actual CLI invocation:**

```bash
npm run govern
```

This runs the full governance pipeline: Mission Studio, Genesis intake, execution, Replay verification, and documentation projection.

---

## Episode 5 — Nothing Was Forgotten

**AI reasoning:**

> Every action I took was recorded as an immutable Event. Nothing was forgotten.

**Actual event log:** `../data/event-log.jsonl` (32 events)

**Selection of event types:**

```text
SYSTEM_GENESIS
MISSION_CREATED
PLAN_CREATED
EXPEDITION_CREATED
WORK_ITEM_CREATED
OBJECTIVE_ADDED
MISSION_APPROVED
EXPEDITION_APPROVED
EXPEDITION_STARTED
OBJECTIVE_COMPLETED
EXPEDITION_COMPLETED
MISSION_COMPLETED
```

---

## Episode 6 — State

**AI reasoning:**

> The current State of the project is derived from those 32 Events. It includes the completed Mission, all five Expeditions, seven Objectives, and their final statuses.

**Actual final state (from Replay):**

- Mission: `Space Mission Tracking Application` — completed
- Expeditions: 5 — all completed
- Objectives: 7 — all completed
- Event count: 32

---

## Episode 7 — Replay

**Actual CLI invocation:**

```bash
synth explain replay
```

**Actual output:**

```json
{
  "status": "ok",
  "consistent": true,
  "eventCount": 32,
  "replayHash": "707567213",
  "chainValid": true,
  "explanation": "Operational state is bit-for-bit identical to replayed state."
}
```

**AI reasoning:**

> Replay proves that the current State matches the event history. If the history is correct, the State is correct.

---

## Episode 8 — Your Turn

**AI agent guidance:**

> You've seen SYNTH execute a complete Mission. Now try it yourself.

**Actual CLI invocations for a new user:**

```bash
curl -fsSL https://synth.dev/install.sh | sh
synth doctor
synth init
synth mission create \
  --subject "Space Mission Tracker" \
  --purpose "Track missions, crew, and launch windows."
```

**Actual proof artifact:** `evidence-archive/proof.json`

```json
{
  "schema": "synth-example-proof-v1",
  "example": "first-contact",
  "overall": { "passed": true },
  "artifacts": {
    "snapshotId": "8e5f7856c475f6e8",
    "seededEvents": 25,
    "executionIntents": 6,
    "replayConsistent": true,
    "eventCount": 32
  }
}
```

---

## Continue Exploring

For visitors who want to understand the architecture:

```text
Human Intent
    ↓
Mission
    ↓
Expeditions + Evidence
    ↓
Approved Plan
    ↓
ExecutionGate
    ↓
Events
    ↓
State
    ↓
Replay
```

Protected Assets ensure this execution model remains invariant across every Mission.
