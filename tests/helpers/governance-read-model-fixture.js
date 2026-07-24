// ============================================================
// TEST HELPERS — Governance Read-Model Fixture
// ============================================================
// Shared state-seeding helpers for governance read-model tests.
//
// Replaces duplicated writeEventLog / writeManifest / loadComputeEventHash
// helpers across operator-briefing, resume-briefing, governance-resolver,
// stale-state, transition-engine, and verify-engine tests.
//
// Usage:
//   import {
//     seedGovernedState,
//     writeEventLog,
//     writeManifest,
//     loadComputeEventHash,
//   } from "./helpers/governance-read-model-fixture.js"
// ============================================================

import {
  writeEventLog as writeEventLogImpl,
  writeManifest as writeManifestImpl,
  loadComputeEventHash as loadComputeEventHashImpl,
} from "./cli-harness.js"

export { writeEventLogImpl as writeEventLog }
export { writeManifestImpl as writeManifest }
export { loadComputeEventHashImpl as loadComputeEventHash }

/**
 * Seed a governed project with a manifest and hash-chained event log.
 * Convenience wrapper for the most common read-model test setup.
 */
export async function seedGovernedState(dir, rawEvents, projectName = "Governance Read-Model Test") {
  await writeManifestImpl(dir, projectName)
  const events = await writeEventLogImpl(dir, rawEvents)
  return events
}

/** Minimal SYSTEM_GENESIS event template. */
export function systemGenesisEvent(payload = {}) {
  return {
    type: "SYSTEM_GENESIS",
    capability: "Genesis",
    actor: "system",
    payload,
  }
}

/** Minimal MISSION_APPROVED event template. */
export function missionApprovedEvent(missionId, overrides = {}) {
  return {
    type: "MISSION_APPROVED",
    capability: "ApproveMission",
    actor: "system",
    payload: { mission: { id: missionId, name: `Mission ${missionId}`, ...overrides } },
  }
}

/** Minimal EXPEDITION_APPROVED event template. */
export function expeditionApprovedEvent(expeditionId, overrides = {}) {
  return {
    type: "EXPEDITION_APPROVED",
    capability: "ApproveExpedition",
    actor: "system",
    payload: { expedition: { id: expeditionId, name: `Expedition ${expeditionId}`, ...overrides } },
  }
}

/** Minimal EXPEDITION_COMMITTED event template. */
export function expeditionCommittedEvent(expeditionId, overrides = {}) {
  return {
    type: "EXPEDITION_COMMITTED",
    capability: "CommitExpedition",
    actor: "system",
    payload: { expedition: { id: expeditionId, ...overrides } },
  }
}
