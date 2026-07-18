// ============================================================
// Governance Resolver Tests
// ============================================================
// Regression guards for EXP-GOV-007: the Governance Resolver is the
// sole reader of durable governance artifacts and produces a versioned,
// immutable ResolvedGovernanceContext.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"

const RESOLVER_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "governance-resolver.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")

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
}

async function writeManifest(dir, projectName = "Governance Resolver Test") {
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

async function writeBrokenDecisionLog(dir) {
  const dataDir = path.join(dir, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(
    path.join(dataDir, "decisions.jsonl"),
    JSON.stringify({
      schema: "synth-decision-v1",
      id: "d1",
      type: "MISSION_APPROVAL_APPROVED",
      draftId: "DRAFT-WARN-1",
      previousHash: "genesis",
      timestamp: Date.now(),
    }) +
      "\n" +
      JSON.stringify({
        schema: "synth-decision-v1",
        id: "d2",
        type: "MISSION_APPROVAL_REJECTED",
        draftId: "DRAFT-WARN-2",
        previousHash: "genesis",
        timestamp: Date.now() + 1,
      }) +
      "\n",
  )
}

// ------------------------------------------------------------
// Fixture: uninitialized directory
// ------------------------------------------------------------
async function testUninitialized() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gov-resolver-uninit-"))
  try {
    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for uninitialized dir")
    assert(result.schemaVersion === 1, "context should be versioned")
    assert(result.authoritative.manifestExists === false, "manifest should not exist")
    assert(result.authoritative.events.length === 0, "events should be empty")
    assert(result.derived.phase === "uninitialized", `phase should be uninitialized, got ${result.derived.phase}`)
    assert(result.derived.activeMission === null, "active mission should be null")
    assert(result.derived.activeExpedition === null, "active expedition should be null")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] uninitialized directory resolves to phase uninitialized")
}

// ------------------------------------------------------------
// Fixture: initialized, no mission yet
// ------------------------------------------------------------
async function testInitializedNoMission() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gov-resolver-init-"))
  try {
    await writeManifest(tmpDir)
    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for initialized project")
    assert(result.derived.phase === "planning", `phase should be planning, got ${result.derived.phase}`)
    assert(result.derived.latestDraft === null || result.derived.latestDraft === undefined, "should have no draft")
    assert(result.authoritative.events.length === 0, "events should be empty")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] initialized project without mission resolves to phase planning")
}

// ------------------------------------------------------------
// Fixture: approved mission, no expeditions
// ------------------------------------------------------------
async function testApprovedNoExpeditions() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gov-resolver-approved-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-GOV-1"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Approved Test", systemId: "gov-test", partitions: 1 },
      },
      {
        id: "E-MISSION-1",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Approved Mission",
            purpose: "Test approved phase",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE-1",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
    ])

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for approved mission")
    assert(result.derived.phase === "approved", `phase should be approved, got ${result.derived.phase}`)
    assert(result.derived.activeMission?.id === missionId, "active mission should match")
    assert(result.derived.activeExpedition === null, "active expedition should be null")
    assert(result.authoritative.events.length === 3, "should have three events")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] approved mission with no expeditions resolves to phase approved")
}

// ------------------------------------------------------------
// Fixture: executing expedition
// ------------------------------------------------------------
async function testExecuting() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gov-resolver-executing-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-GOV-2"
    const expeditionId = "E-GOV-2"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Executing Test", systemId: "gov-test", partitions: 1 },
      },
      {
        id: "E-MISSION-2",
        type: "MISSION_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: missionId,
            name: "Executing Mission",
            purpose: "Test executing phase",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
      {
        id: "E-APPROVE-2",
        type: "MISSION_APPROVED",
        timestamp: now + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: missionId, status: "active" },
      },
      {
        id: "E-EXP-2",
        type: "EXPEDITION_CREATED",
        timestamp: now + 3,
        transactionId: "tx-3",
        capability: "CreateExpedition",
        actor: "system",
        payload: {
          expedition: {
            id: expeditionId,
            missionId,
            name: "Executing Expedition",
            goal: "Test execution",
            status: "approved",
            objectives: [],
            discoveries: [],
            decisions: [],
            metadata: {},
            createdAt: now + 3,
            updatedAt: now + 3,
          },
        },
      },
      {
        id: "E-START-2",
        type: "EXPEDITION_STARTED",
        timestamp: now + 4,
        transactionId: "tx-4",
        capability: "StartExpedition",
        actor: "system",
        payload: { id: expeditionId, status: "executing" },
      },
    ])

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "should not fail for executing expedition")
    assert(result.derived.phase === "executing", `phase should be executing, got ${result.derived.phase}`)
    assert(result.derived.activeExpedition?.id === expeditionId, "active expedition should match")
    assert(result.derived.activeExpedition?.status === "executing", "expedition should be executing")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition resolves to phase executing")
}

// ------------------------------------------------------------
// Fixture: broken decision log surfaces as warning divergence
// ------------------------------------------------------------
async function testBrokenDecisionLogWarning() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gov-resolver-decision-"))
  try {
    await writeManifest(tmpDir)
    await writeBrokenDecisionLog(tmpDir)

    const { resolveGovernanceContext, isGovernanceResolutionFailure } = await loadResolver()
    const result = await resolveGovernanceContext(tmpDir)
    assert(!isGovernanceResolutionFailure(result), "broken decision chain should be a warning, not a failure")
    const warning = result.derived.divergences.find((d) => d.kind === "decision-chain-broken")
    assert(warning, "should report decision-chain-broken divergence")
    assert(warning.severity === "warning", "decision chain divergence should be a warning")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] broken decision log is surfaced as a warning divergence")
}

async function main() {
  try {
    await fs.access(RESOLVER_MODULE_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testUninitialized()
  await testInitializedNoMission()
  await testApprovedNoExpeditions()
  await testExecuting()
  await testBrokenDecisionLogWarning()

  console.log("\n[GOVERNANCE RESOLVER] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
