// ============================================================
// Stale State Tests
// ============================================================
// Regression guards for EXP-GOV-007: the Governance Resolver detects
// inconsistencies between the event log, canonical state, snapshots,
// and decisions. Replay is authoritative; stale or divergent artifacts
// are surfaced as warnings or resolution failures.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"

const RESOLVER_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "governance-resolver.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")
const SNAPSHOT_STORE_MODULE_PATH = path.resolve(process.cwd(), "dist", "mission-studio", "snapshot-store.js")
const SNAPSHOT_INTEGRITY_MODULE_PATH = path.resolve(process.cwd(), "dist", "mission-studio", "snapshot-integrity.js")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function loadResolver() {
  return await import(RESOLVER_MODULE_PATH)
}

async function loadComputeEventHash() {
  const mod = await import(HASH_MODULE_PATH)
  return mod.computeEventHash
}

async function writeEventLog(dir, rawEvents) {
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
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return events
}

async function writeManifest(dir, projectName = "Stale State Test") {
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

async function writeCanonicalState(dir, state) {
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "canonical-state.json"), JSON.stringify(state, null, 2))
}

function baseConfidence() {
  return {
    overall: 1,
    observationCoverage: 1,
    evidenceQuality: 1,
    consistency: 1,
  }
}

function emptyEvidence() {
  return {
    evidence: [],
    byObservationId: new Map(),
  }
}

async function writeCertifiedSnapshot(dir, missionId, missionName) {
  const { createFileSystemSnapshotStore } = await import(SNAPSHOT_STORE_MODULE_PATH)
  const { signSnapshot } = await import(SNAPSHOT_INTEGRITY_MODULE_PATH)
  const now = Date.now()
  const sessionId = `session-${missionId}`
  const snapshotId = `snapshot-${missionId}`
  const snapshotsDir = path.join(dir, ".synth", "data", "snapshots")

  const worldModel = {
    version: 1,
    nodes: new Map([
      [
        missionId,
        {
          id: missionId,
          kind: "mission",
          name: missionName,
          purpose: "Test",
          expeditionIds: [],
          observationIds: [],
          evidenceRefs: [],
          confidence: 1,
        },
      ],
    ]),
    edges: [],
    evidence: emptyEvidence(),
    unknowns: [],
    confidence: baseConfidence(),
    planningDecisions: [],
  }

  const session = {
    id: sessionId,
    createdAt: now,
    observations: [],
    evidence: emptyEvidence(),
    questions: [],
    unknowns: [],
    confidence: baseConfidence(),
    worldModel,
    planningDecisions: [],
    approvalState: "approved",
  }

  const snapshot = {
    id: snapshotId,
    version: "1.0.0",
    signature: "0".repeat(64),
    sessionId,
    worldModel,
    proposals: [],
    timestamp: now,
  }

  snapshot.signature = signSnapshot(snapshot)

  const store = createFileSystemSnapshotStore(snapshotsDir)
  await store.save({ snapshot, session })
}

function baseState() {
  return {
    version: 1,
    stateHash: "0",
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    missions: {},
    expeditions: {},
    objectives: {},
    discoveries: {},
    decisions: {},
    generatedWorkItems: {},
    executions: {},
    executionIntents: {},
    executionGraphs: {},
    lastEventOffset: 0,
  }
}

// ------------------------------------------------------------
// Fixture: persisted state lags event log (warning)
// ------------------------------------------------------------
async function testStateLagsEventsWarning() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-lag-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STALE-LAG"
    const events = await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Lag Test", systemId: "stale-test", partitions: 1 },
      },
      {
        id: "E-MISSION",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Lag Mission",
            purpose: "Test",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
    ])

    // Persisted state only knows about genesis.
    await writeCanonicalState(tmpDir, { ...baseState(), lastEventOffset: 1 })

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "state lag should be a warning, not a failure")
    const warning = result.derived.divergences.find((d) => d.kind === "state-lags-events")
    assert(warning, "should report state-lags-events divergence")
    assert(warning.severity === "warning", "state lag should be severity warning")
    assert(result.authoritative.events.length === events.length, "event count should match log")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] persisted state lagging event log is reported as a warning")
}

// ------------------------------------------------------------
// Fixture: persisted state hash differs from replay (failure)
// ------------------------------------------------------------
async function testReplayedStateMismatchFailure() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-mismatch-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-STALE-MISMATCH"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Mismatch Test", systemId: "stale-test", partitions: 1 },
      },
      {
        id: "E-MISSION",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Mismatch Mission",
            purpose: "Test",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
    ])

    await writeCanonicalState(tmpDir, { ...baseState(), stateHash: "stale-hash", lastEventOffset: 2 })

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(isGovernanceResolutionFailure(result), "replay mismatch should be a resolution failure")
    assert(result.conflicts.some((c) => c.issue.includes("hash")), "failure should report hash mismatch")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] persisted state hash mismatch is reported as a resolution failure")
}

// ------------------------------------------------------------
// Fixture: persisted state references missing events (failure)
// ------------------------------------------------------------
async function testMissingEventsFailure() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-missing-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Missing Test", systemId: "stale-test", partitions: 1 },
      },
    ])

    // Persisted state claims it was rebuilt from 5 events but only 1 exists.
    await writeCanonicalState(tmpDir, { ...baseState(), lastEventOffset: 5 })

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(isGovernanceResolutionFailure(result), "missing events should be a resolution failure")
    assert(result.conflicts.some((c) => c.issue.includes("event")), "failure should reference missing events")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] persisted state referencing missing events is a resolution failure")
}

// ------------------------------------------------------------
// Fixture: divergent replay (failure)
// ------------------------------------------------------------
async function testDivergentReplayFailure() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-divergent-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Divergent Test", systemId: "stale-test", partitions: 1 },
      },
    ])

    // Persisted state contains a mission that never appeared in the event log.
    await writeCanonicalState(tmpDir, {
      ...baseState(),
      missions: {
        "M-PHANTOM": {
          id: "M-PHANTOM",
          name: "Phantom Mission",
          purpose: "Test",
          status: "active",
          expeditions: [],
          metadata: {},
          createdAt: now,
          updatedAt: now,
        },
      },
      lastEventOffset: 1,
    })

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(isGovernanceResolutionFailure(result), "divergent replay should be a resolution failure")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] divergent replay is a resolution failure")
}

// ------------------------------------------------------------
// Fixture: snapshot conflicts with replayed state (failure)
// ------------------------------------------------------------
async function testSnapshotStateConflictFailure() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-snapshot-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-SNAPSHOT"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Snapshot Test", systemId: "stale-test", partitions: 1 },
      },
      {
        id: "E-MISSION",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Snapshot Mission",
            purpose: "Test",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
    ])

    // Snapshot claims the mission is approved while the event log says draft.
    await writeCertifiedSnapshot(tmpDir, missionId, "Snapshot Mission")

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(isGovernanceResolutionFailure(result), "snapshot conflict should be a resolution failure")
    assert(
      result.conflicts.some((c) => c.issue.includes("Snapshot Mission") || c.issue.includes("snapshot")),
      "failure should reference the snapshot conflict",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] snapshot contradicting event log is a resolution failure")
}

async function main() {
  try {
    await fs.access(RESOLVER_MODULE_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testStateLagsEventsWarning()
  await testReplayedStateMismatchFailure()
  await testMissingEventsFailure()
  await testDivergentReplayFailure()
  await testSnapshotStateConflictFailure()

  console.log("\n[STALE STATE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
