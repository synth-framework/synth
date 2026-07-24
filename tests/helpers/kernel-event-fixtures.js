// ============================================================
// TEST HELPERS — Kernel Event Fixtures
// ============================================================
// Shared event builders and replay fixtures for kernel tests.
//
// Replaces duplicated makeEvent/missionCreated/expeditionCreated/
// objectiveAdded/workItemCreated/workItemGenerated/validLog helpers
// across graph-integrity, replay-graph-integrity, validation-expansion,
// explain-observability, and historical resolver tests.
//
// Usage:
//   import {
//     makeEvent, missionCreated, expeditionCreated, objectiveAdded,
//     workItemCreated, workItemGenerated, validLog, writeTmpLog,
//   } from "./helpers/kernel-event-fixtures.js"
// ============================================================

import fs from "fs"
import os from "os"
import path from "path"

let seq = 0

/** Reset the internal sequence counter. Call at the start of a test if deterministic ids matter. */
export function resetSeq() {
  seq = 0
}

/** Build a minimal synthetic event. No hash-chain fields by default. */
export function makeEvent(type, payload) {
  seq += 1
  return {
    id: `evt-${seq}`,
    type,
    timestamp: seq,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

/** Build a MISSION_CREATED event. */
export function missionCreated(id, overrides = {}) {
  return makeEvent("MISSION_CREATED", {
    mission: {
      id,
      name: `Mission ${id}`,
      purpose: "purpose",
      status: "draft",
      expeditions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
    },
  })
}

/** Build an EXPEDITION_CREATED event. */
export function expeditionCreated(id, missionId, overrides = {}) {
  return makeEvent("EXPEDITION_CREATED", {
    expedition: {
      id,
      name: `Expedition ${id}`,
      goal: "goal",
      status: "draft",
      objectives: [],
      discoveries: [],
      decisions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(missionId === undefined ? {} : { missionId }),
    },
  })
}

/** Build an OBJECTIVE_ADDED event. */
export function objectiveAdded(id, expeditionId, overrides = {}) {
  return makeEvent("OBJECTIVE_ADDED", {
    objective: {
      id,
      title: `Objective ${id}`,
      purpose: "purpose",
      status: "draft",
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(expeditionId === undefined ? {} : { expeditionId }),
    },
  })
}

/** Build a WORK_ITEM_CREATED event. */
export function workItemCreated(id, overrides = {}) {
  return makeEvent("WORK_ITEM_CREATED", {
    workItem: {
      id,
      status: "idle",
      dependencies: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
    },
  })
}

/** Build a WORK_ITEM_GENERATED event.
 *
 * Supports two calling conventions:
 *   workItemGenerated(id, objectiveId, expeditionId, overrides)
 *   workItemGenerated(id, objectiveId, overrides) // overrides may include expeditionId
 */
export function workItemGenerated(id, objectiveId, expeditionOrOverrides, overridesMaybe = {}) {
  const expeditionId =
    typeof expeditionOrOverrides === "string" ? expeditionOrOverrides : expeditionOrOverrides?.expeditionId
  const overrides = typeof expeditionOrOverrides === "object" && expeditionOrOverrides !== null
    ? expeditionOrOverrides
    : overridesMaybe
  return makeEvent("WORK_ITEM_GENERATED", {
    workItem: {
      id,
      title: `Work Item ${id}`,
      status: "generated",
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(objectiveId === undefined ? {} : { objectiveId }),
      ...(expeditionId === undefined ? {} : { expeditionId }),
    },
  })
}

/** Return a minimal valid event log: mission → expedition → objective. */
export function validLog() {
  return [
    missionCreated("m1"),
    expeditionCreated("e1", "m1"),
    objectiveAdded("o1", "e1"),
  ]
}

/**
 * Write events to a temporary event-log.jsonl file.
 * Returns { dir, logPath, events }.
 */
export function writeTmpLog(events) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kernel-event-fixtures-"))
  const logPath = path.join(dir, "event-log.jsonl")
  fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return { dir, logPath, events }
}
