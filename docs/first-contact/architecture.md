> **Projection notice.** This document is a deterministic projection of the [canonical First Contact evidence archive](../../examples/first-contact/recorded-journey/evidence-archive-b/) (Archive B, hardened pipeline). Do not edit by hand; regenerate with `node scripts/generate-first-contact-projection.js`.

# First Contact — The Architecture, As Experienced

The journey exercises the architecture in the order a newcomer meets it. Each layer below is named only after the journey has shown it (Show → Explain → Name).

## 1. Genesis — the system bootstraps

Episode 1 shows SYNTH analyzing before acting. The `SYSTEM_GENESIS` event records the bootstrap: the system comes into existence through a governed gate, not through ad-hoc file writes.

## 2. Mission Studio — intent becomes an approved plan

Episodes 2 and 3 show a human sentence — _"Build me a Space Mission Tracking application."_ — becoming a Mission, then a plan of five Expeditions with Objectives and Work Items. Approval is explicit: `MISSION_APPROVED` and `EXPEDITION_APPROVED` are recorded before any execution.

## 3. Execution — the plan runs through the CLI

Episode 4 shows execution flowing through the command surface. Every mutation passes through the same governed pipeline that produced the plan.

## 4. Events — nothing is forgotten

Episode 5 reveals that every action became an immutable Event. The full distribution for this journey:

| Event type | Count |
|---|---|
| `SYSTEM_GENESIS` | 1 |
| `MISSION_CREATED` | 1 |
| `PLAN_CREATED` | 5 |
| `EXPEDITION_CREATED` | 5 |
| `WORK_ITEM_CREATED` | 7 |
| `OBJECTIVE_ADDED` | 7 |
| `MISSION_APPROVED` | 1 |
| `EXPEDITION_APPROVED` | 1 |
| `EXPEDITION_STARTED` | 1 |
| `OBJECTIVE_COMPLETED` | 1 |
| `EXPEDITION_COMPLETED` | 1 |
| `MISSION_COMPLETED` | 1 |

## 5. Replay — history is provable

Episodes 6 and 7 show the final State matching the 32-event history. Replay is not a log viewer; it is a proof that the state could only have come from these events.

## Evidence source

Event types and counts are computed from `events.jsonl`. Episode ordering comes from `timeline.json`.
