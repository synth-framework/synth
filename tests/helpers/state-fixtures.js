// ============================================================
// TEST HELPERS — State fixtures & canonical event builders
// ============================================================
// Shared infrastructure for tests that seed a synthetic governance
// state directory (transition-engine, stale-state). Replaces the
// per-file copies of `assert`, `loadResolver`, `loadComputeEventHash`,
// `writeEventLog`, `writeManifest` and the repeated inline canonical
// event objects (GENESIS / MISSION_CREATED / MISSION_APPROVED / ...).
//
// Usage:
//   import {
//     assert, loadResolver, loadComputeEventHash, writeEventLog, writeManifest,
//     genesisEvent, missionCreatedEvent, missionApprovedEvent, missionCompletedEvent,
//     missionArchivedEvent, expeditionCreatedEvent, expeditionStartedEvent, workItemCreatedEvent,
//   } from "./helpers/state-fixtures.js"
// ============================================================

import fs from "fs/promises"
import path from "path"
import { seedEventLog } from "./seed-event-log.js"

const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")
const RESOLVER_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "governance-resolver.js")

/** Minimal assertion helper matching the per-file copies. */
export function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

/** Load the governance resolver module (built dist). */
export async function loadResolver() {
  return await import(RESOLVER_MODULE_PATH)
}

/** Load computeEventHash from the built dist. */
export async function loadComputeEventHash() {
  const mod = await import(HASH_MODULE_PATH)
  return mod.computeEventHash
}

/**
 * Hash-link the provided raw events and write both the event log and
 * canonical state (seeded from those events) into `<dir>/.synth/data`.
 */
export async function writeEventLog(dir, rawEvents) {
  const computeEventHash = await loadComputeEventHash()
  const events = []
  let previousHash = "genesis"
  for (const raw of rawEvents) {
    const event = { ...raw, eventHash: "", previousHash }
    event.eventHash = computeEventHash(event)
    previousHash = event.eventHash
    events.push(event)
  }
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await seedEventLog(dataDir, events)
  return events
}

/** Write a minimal bootstrap manifest into `<dir>/.synth`. */
export async function writeManifest(dir, projectName = "State Fixture") {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "status", description: "Report state" }],
    capabilities: [],
    layout: { data: ".synth/data/" },
    publicVocabulary: ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2))
}

// ============================================================
// Canonical event builders
// Time is expressed relative to a base `now` (unix seconds) so that
// chains of events keep a deterministic, monotonic timeline.
// ============================================================

export function genesisEvent(now, { projectName = "State Fixture", systemId = "state-test" } = {}) {
  return {
    id: "GENESIS",
    type: "SYSTEM_GENESIS",
    timestamp: now,
    transactionId: "genesis-tx",
    capability: "Genesis",
    actor: "system",
    payload: { projectName, systemId, partitions: 1 },
  }
}

export function missionCreatedEvent(now, missionId, name) {
  return {
    id: "E-MISSION",
    type: "MISSION_CREATED",
    timestamp: now + 1,
    transactionId: "tx-1",
    capability: "CreateMission",
    actor: "system",
    payload: {
      mission: {
        id: missionId,
        name,
        purpose: "Test",
        status: "draft",
        expeditions: [],
        metadata: {},
        createdAt: now + 1,
        updatedAt: now + 1,
      },
    },
  }
}

export function missionApprovedEvent(now, missionId) {
  return {
    id: "E-APPROVE",
    type: "MISSION_APPROVED",
    timestamp: now + 2,
    transactionId: "tx-2",
    capability: "ApproveMission",
    actor: "system",
    payload: { id: missionId, status: "active" },
  }
}

export function missionCompletedEvent(now, missionId) {
  return {
    id: "E-COMPLETE",
    type: "MISSION_COMPLETED",
    timestamp: now + 3,
    transactionId: "tx-3",
    capability: "CompleteMission",
    actor: "system",
    payload: { id: missionId, status: "completed" },
  }
}

export function missionArchivedEvent(now, missionId) {
  return {
    id: "E-ARCHIVE",
    type: "MISSION_ARCHIVED",
    timestamp: now + 3,
    transactionId: "tx-3",
    capability: "ArchiveMission",
    actor: "system",
    payload: { id: missionId, status: "archived" },
  }
}

export function expeditionCreatedEvent(now, expeditionId, missionId, name) {
  return {
    id: "E-EXP",
    type: "EXPEDITION_CREATED",
    timestamp: now + 3,
    transactionId: "tx-3",
    capability: "CreateExpedition",
    actor: "system",
    payload: {
      expedition: {
        id: expeditionId,
        missionId,
        name,
        goal: "Test",
        status: "approved",
        objectives: [],
        discoveries: [],
        decisions: [],
        metadata: {},
        createdAt: now + 3,
        updatedAt: now + 3,
      },
    },
  }
}

export function expeditionStartedEvent(now, expeditionId) {
  return {
    id: "E-START",
    type: "EXPEDITION_STARTED",
    timestamp: now + 4,
    transactionId: "tx-4",
    capability: "StartExpedition",
    actor: "system",
    payload: { id: expeditionId, status: "executing" },
  }
}

export function workItemCreatedEvent(now, workItemId = "W-BLOCKED", status = "blocked") {
  return {
    id: "E-WI",
    type: "WORK_ITEM_CREATED",
    timestamp: now + 1,
    transactionId: "tx-1",
    capability: "CreateWorkItem",
    actor: "system",
    payload: { workItem: { id: workItemId, status, dependencies: [], metadata: {}, createdAt: now + 1, updatedAt: now + 1 } },
  }
}
