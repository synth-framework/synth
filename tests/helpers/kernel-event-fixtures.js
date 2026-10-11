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
 * Return the shared two-event prefix used by replay scenario tests: an
 * active mission plus an executing expedition with byte-identical payloads.
 * App status-specific third events (e.g. EXPEDITION_ARCHIVED) at call sites.
 */
export function missionWithExecutingExpeditionEvents(missionId = "m1", expeditionId = "e1") {
  return [
    {
      id: "evt-MISSION_CREATED",
      type: "MISSION_CREATED",
      timestamp: 1,
      transactionId: "tx-test",
      capability: "test",
      actor: "test",
      payload: {
        mission: {
          id: missionId,
          name: "Mission 1",
          purpose: "purpose",
          status: "active",
          expeditions: [],
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
    {
      id: "evt-EXPEDITION_CREATED",
      type: "EXPEDITION_CREATED",
      timestamp: 1,
      transactionId: "tx-test",
      capability: "test",
      actor: "test",
      payload: {
        expedition: {
          id: expeditionId,
          missionId,
          name: "Expedition 1",
          goal: "goal",
          status: "executing",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
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

/**
 * Build a seed event with the tx-N/timestamp-N envelope convention.
 * Capability/actor default to test/test; genesis seeds pass
 * `{ capability: "genesis", actor: "genesis" }`. Scenario payloads stay
 * at call sites.
 */
export function seedEvent(id, type, timestamp, payload, { capability = "test", actor = "test" } = {}) {
  return {
    id,
    type,
    timestamp,
    transactionId: `tx-${timestamp}`,
    capability,
    actor,
    payload,
  }
}

/**
 * Build a hash-chained test event with an explicit id (identity/reference
 * resolver shape: wall-clock timestamp, Genesis/system actor, canned
 * hashes). For seq-id synthetic events, use makeEvent instead.
 */
export function makeIdentityEvent(id, type, payload) {
  return {
    id,
    type,
    timestamp: Date.now(),
    transactionId: "tx-1",
    capability: "Genesis",
    actor: "system",
    payload,
    eventHash: "hash",
    previousHash: "prev",
  }
}

/** Shared creation-event pair for identity/reference resolver tests. */
export function identityCreationEvents(missionId = "m1", expeditionId = "ex1", { expeditionMissionId } = {}) {
  return [
    makeIdentityEvent("e1", "MISSION_CREATED", {
      mission: { id: missionId, name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeIdentityEvent("e2", "EXPEDITION_CREATED", {
      expedition: { id: expeditionId, missionId: expeditionMissionId ?? missionId, name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]
}

/** Single MISSION_CREATED event for the canonical M/m1 mission. */
export function missionMEvent(id = "e1", name = "M", timestamp = 1) {
  return makeIdentityEvent(id, "MISSION_CREATED", {
    mission: { id: "m1", name, status: "draft", expeditions: [], metadata: {}, createdAt: timestamp, updatedAt: timestamp },
  })
}

/** Single EXPEDITION_CREATED event for the canonical E/ex1 expedition. */
export function expeditionEEvent(id = "e2", missionId) {
  return makeIdentityEvent(id, "EXPEDITION_CREATED", {
    expedition: { id: "ex1", ...(missionId !== undefined ? { missionId } : {}), name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
  })
}

/** Genesis + project seed pair shared by file-seeded CLI tests. */
export function seedGenesisEvents(projectName, systemId) {
  return [
    seedEvent("evt-1", "SYSTEM_GENESIS", 1,
      { projectName, systemId, partitions: 1 },
      { capability: "genesis", actor: "genesis" }),
    seedEvent("evt-2", "PROJECT_CREATED", 2,
      { project: { id: "project-1", name: projectName, status: "active", metadata: {}, createdAt: 2, updatedAt: 2 } },
      { capability: "genesis", actor: "genesis" }),
  ]
}
