// ============================================================
// Transition Engine Tests
// ============================================================
// Regression guards for EXP-GOV-007: the Transition Engine derives a
// single ValidTransition from the governance model, not from CLI
// commands. These tests verify that transitions come from the
// Governance Model rules rather than hardcoded command strings.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"

const RESOLVER_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "governance-resolver.js")
const TRANSITION_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "transition-engine.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function loadTransitionEngine() {
  return await import(TRANSITION_MODULE_PATH)
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

async function writeManifest(dir, projectName = "Transition Engine Test") {
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

async function writeDraft(dir, draft) {
  const draftsDir = path.join(dir, ".synth", "data", "drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  await fs.writeFile(path.join(draftsDir, `${draft.id}.json`), JSON.stringify(draft, null, 2))
}

async function resolve(dir) {
  const { resolveGovernanceContext } = await loadResolver()
  return await resolveGovernanceContext(dir)
}

async function transition(dir) {
  const { deriveValidTransition } = await loadTransitionEngine()
  const ctx = await resolve(dir)
  return { transition: deriveValidTransition(ctx), ctx }
}

// ------------------------------------------------------------
// Fixture: uninitialized -> InitializeProject
// ------------------------------------------------------------
async function testUninitialized() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-uninit-"))
  try {
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "InitializeProject", `expected InitializeProject, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] uninitialized resolves to InitializeProject")
}

// ------------------------------------------------------------
// Fixture: planning + no draft -> CreateMission
// ------------------------------------------------------------
async function testPlanningNoDraft() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-nodraft-"))
  try {
    await writeManifest(tmpDir)
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "CreateMission", `expected CreateMission, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] planning with no draft resolves to CreateMission")
}

// ------------------------------------------------------------
// Fixture: planning + draft below threshold -> AddMissionEvidence
// ------------------------------------------------------------
async function testPlanningDraftBelowThreshold() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-lowconf-"))
  try {
    await writeManifest(tmpDir)
    await writeDraft(tmpDir, {
      id: "DRAFT-LOW",
      confidence: { overall: 0.3 },
      unknowns: [],
      approvalState: "draft",
      createdAt: Date.now(),
    })
    const { transition: t, ctx } = await transition(tmpDir)
    assert(t.kind === "AddMissionEvidence", `expected AddMissionEvidence, got ${t.kind}`)
    assert(t.targetId === undefined || t.targetId === "DRAFT-LOW", "transition should reference the draft")
    assert(ctx.derived.latestDraft?.id === "DRAFT-LOW", "latest draft should be loaded")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] planning with low-confidence draft resolves to AddMissionEvidence")
}

// ------------------------------------------------------------
// Fixture: planning + draft ready -> ApproveMission
// ------------------------------------------------------------
async function testPlanningDraftReady() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-ready-"))
  try {
    await writeManifest(tmpDir)
    await writeDraft(tmpDir, {
      id: "DRAFT-READY",
      confidence: { overall: 0.85 },
      unknowns: [],
      approvalState: "draft",
      createdAt: Date.now(),
    })
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "ApproveMission", `expected ApproveMission, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] planning with ready draft resolves to ApproveMission")
}

// ------------------------------------------------------------
// Fixture: approved + no expedition -> CreateExpedition
// ------------------------------------------------------------
async function testApprovedNoExpedition() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-approved-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-1"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Approved", systemId: "trans-test", partitions: 1 },
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
            name: "Approved Mission",
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
    ])
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "CreateExpedition", `expected CreateExpedition, got ${t.kind}`)
    assert(t.targetId === missionId, "transition should reference the active mission")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] approved mission with no expedition resolves to CreateExpedition")
}

// ------------------------------------------------------------
// Fixture: executing -> InspectExecution
// ------------------------------------------------------------
async function testExecuting() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-executing-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-2"
    const expeditionId = "E-TRANS-2"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Executing", systemId: "trans-test", partitions: 1 },
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
            name: "Executing Mission",
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
            name: "Executing Expedition",
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
      },
      {
        id: "E-START",
        type: "EXPEDITION_STARTED",
        timestamp: now + 4,
        transactionId: "tx-4",
        capability: "StartExpedition",
        actor: "system",
        payload: { id: expeditionId, status: "executing" },
      },
    ])
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "InspectExecution", `expected InspectExecution, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] executing expedition resolves to InspectExecution")
}

// ------------------------------------------------------------
// Fixture: blocked work item -> DiagnoseBlocker
// ------------------------------------------------------------
async function testBlocked() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-blocked-"))
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
        payload: { projectName: "Blocked", systemId: "trans-test", partitions: 1 },
      },
      {
        id: "E-WI",
        type: "WORK_ITEM_CREATED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "CreateWorkItem",
        actor: "system",
        payload: {
          workItem: {
            id: "W-BLOCKED",
            status: "blocked",
            dependencies: [],
            metadata: {},
            createdAt: now + 1,
            updatedAt: now + 1,
          },
        },
      },
    ])
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "DiagnoseBlocker", `expected DiagnoseBlocker, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] blocked work item resolves to DiagnoseBlocker")
}

// ------------------------------------------------------------
// Fixture: complete -> ArchiveMission
// ------------------------------------------------------------
async function testComplete() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-transition-complete-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-3"
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Complete", systemId: "trans-test", partitions: 1 },
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
            name: "Completed Mission",
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
    const { transition: t } = await transition(tmpDir)
    assert(t.kind === "ArchiveMission", `expected ArchiveMission, got ${t.kind}`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] complete mission resolves to ArchiveMission")
}

async function main() {
  try {
    await fs.access(TRANSITION_MODULE_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testUninitialized()
  await testPlanningNoDraft()
  await testPlanningDraftBelowThreshold()
  await testPlanningDraftReady()
  await testApprovedNoExpedition()
  await testExecuting()
  await testBlocked()
  await testComplete()

  console.log("\n[TRANSITION ENGINE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
