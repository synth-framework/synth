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
import { spawnSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
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

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON:\n${stdout}`)
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

// ------------------------------------------------------------
// Fixture: snapshot-approved mission later completed (no conflict)
// ------------------------------------------------------------
async function testSnapshotApprovedMissionCompletedNoConflict() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-completed-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-SNAPSHOT-COMPLETED"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Completed Snapshot Test", systemId: "stale-test", partitions: 1 },
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
            name: "Completed Snapshot Mission",
            purpose: "Test",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
      {
        id: "E-COMPLETE",
        type: "MISSION_COMPLETED",
        timestamp: now + 3,
        transactionId: "tx-3",
        capability: "CompleteMission",
        actor: "system",
        payload: { id: missionId, status: "completed" },
      },
    ])

    // Snapshot records the mission as approved before the completion event.
    await writeCertifiedSnapshot(tmpDir, missionId, "Completed Snapshot Mission")

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "completed mission should not conflict with approval snapshot")
    assert(result.derived.divergences.every((d) => d.kind !== "snapshot-state-conflict"), "should not report snapshot-state-conflict")
    assert(result.authoritative.replayedState.missions[missionId].status === "completed", "replayed state should keep completed status")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] snapshot-approved mission later completed is not a conflict")
}

// ------------------------------------------------------------
// Fixture: snapshot-approved mission later archived (conflict)
// ------------------------------------------------------------
async function testSnapshotApprovedMissionArchivedConflict() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-stale-archived-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-SNAPSHOT-ARCHIVED"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Archived Snapshot Test", systemId: "stale-test", partitions: 1 },
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
            name: "Archived Snapshot Mission",
            purpose: "Test",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
      {
        id: "E-ARCHIVE",
        type: "MISSION_ARCHIVED",
        timestamp: now + 3,
        transactionId: "tx-3",
        capability: "ArchiveMission",
        actor: "system",
        payload: { id: missionId, status: "archived" },
      },
    ])

    await writeCertifiedSnapshot(tmpDir, missionId, "Archived Snapshot Mission")

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(isGovernanceResolutionFailure(result), "archived mission should conflict with approval snapshot")
    assert(
      result.conflicts.some((c) => c.issue.includes("Archived Snapshot Mission") || c.issue.includes("archived")),
      "failure should reference the archived mission conflict",
    )
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] snapshot-approved mission later archived is still a conflict")
}

async function testExpeditionCompletionDoesNotLagState() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-state-lag-regression-"))
  try {
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")

    const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
    assert(bootstrapResult.status === 0, `bootstrap must exit 0:\n${bootstrapResult.stderr}`)

    const missionResult = runSynth(["mission", "create", "--subject", "Lag Test", "--purpose", "Test state lag fix"], tmpDir)
    assert(missionResult.status === 0, `mission create must exit 0:\n${missionResult.stderr}`)
    const missionDraft = parseJson(missionResult.stdout)
    const missionDraftId = missionDraft.draftId

    // Add evidence to raise mission confidence; evidence add returns a successor draft.
    let currentDraftId = missionDraftId
    for (let i = 0; i < 3; i++) {
      const evidenceResult = runSynth(
        ["mission", "evidence", "add", "--draft-id", currentDraftId, "--subject", `Contract evidence ${i + 1}`, "--purpose", "Governance contract certification", "--confidence", "high"],
        tmpDir,
      )
      assert(evidenceResult.status === 0, `mission evidence add must exit 0:\n${evidenceResult.stderr}`)
      const evidenceOutput = parseJson(evidenceResult.stdout)
      currentDraftId = evidenceOutput.draftId || currentDraftId
      if (evidenceOutput.confidence?.overall >= 0.7) break
    }
    const approvedMissionDraftId = currentDraftId

    // Create an alignment contract so mission approval can proceed.
    const dataDir = path.join(tmpDir, ".synth", "data")
    const gateCtx = await bootstrap({
      skipGenesis: true,
      infra: {
        eventLogPath: path.join(dataDir, "event-log.jsonl"),
        statePath: path.join(dataDir, "canonical-state.json"),
      },
    })
    const { contractId } = await createAlignedContract(gateCtx)

    const approveResult = runSynth(["mission", "approve", "--draft-id", approvedMissionDraftId, "--alignment-contract-id", contractId], tmpDir)
    assert(approveResult.status === 0, `mission approve must exit 0:\n${approveResult.stdout}\n${approveResult.stderr}`)
    const approveOutput = parseJson(approveResult.stdout)
    assert(approveOutput.decision?.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput)}`)
    const missionId = approveOutput.runtime?.missionId
    assert(missionId, `mission approve should return a runtime missionId`)

    const expeditionResult = runSynth(
      ["expedition", "create", "--mission", missionId, "--subject", "State Lag Regression", "--goal", "Verify state does not lag after completion"],
      tmpDir,
    )
    assert(expeditionResult.status === 0, `expedition create must exit 0:\n${expeditionResult.stderr}`)
    const expeditionDraft = parseJson(expeditionResult.stdout)
    const expeditionDraftId = expeditionDraft.draftId

    const expApproveResult = runSynth(["expedition", "approve", "--draft-id", expeditionDraftId], tmpDir)
    assert(expApproveResult.status === 0, `expedition approve must exit 0:\n${expApproveResult.stderr}`)

    const expCommitResult = runSynth(["expedition", "commit", "--proposal-id", expeditionDraftId], tmpDir)
    assert(expCommitResult.status === 0, `expedition commit must exit 0:\n${expCommitResult.stderr}`)

    const expStartResult = runSynth(["expedition", "start", "--id", expeditionDraftId], tmpDir)
    assert(expStartResult.status === 0, `expedition start must exit 0:\n${expStartResult.stderr}`)

    // Dirty the working tree so the governance snapshot phase produces a
    // GOVERNANCE_SNAPSHOT_FAILED event. This is the condition that previously
    // caused canonical state to lag the event log.
    await fs.writeFile(path.join(tmpDir, "dirty-file.txt"), "dirty", "utf-8")

    const expEvidenceResult = runSynth(
      ["expedition", "evidence", "--id", expeditionDraftId, "--attach", "dirty-file.txt", "--note", "regression evidence"],
      tmpDir,
    )
    assert(expEvidenceResult.status === 0, `expedition evidence must exit 0:\n${expEvidenceResult.stderr}`)

    // Force completion to bypass verification; state persistence is what matters.
    const completeResult = runSynth(
      ["expedition", "complete", "--id", expeditionDraftId, "--force", "--reason", "regression test bypass"],
      tmpDir,
    )
    assert(completeResult.status === 0, `expedition complete must exit 0:\n${completeResult.stdout}\n${completeResult.stderr}`)

    // Verify replay consistency WITHOUT running repair.
    const replayResult = runSynth(["explain", "replay"], tmpDir)
    assert(replayResult.status === 0, `explain replay must exit 0:\n${replayResult.stderr}`)
    const replayOutput = parseJson(replayResult.stdout)
    assert(replayOutput.consistent === true, `replay must be consistent after completion, got ${JSON.stringify(replayOutput)}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] expedition completion in dirty working tree does not lag canonical state")
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
  await testSnapshotApprovedMissionCompletedNoConflict()
  await testSnapshotApprovedMissionArchivedConflict()
  await testExpeditionCompletionDoesNotLagState()

  console.log("\n[STALE STATE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
