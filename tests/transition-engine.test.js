import { makeTempDir } from "./helpers/workspace.js"
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
import { seedEventLog } from "./helpers/seed-event-log.js"
import {
  assert,
  loadResolver,
  writeEventLog,
  writeManifest,
  genesisEvent,
  missionCreatedEvent,
  missionApprovedEvent,
  missionCompletedEvent,
  expeditionCreatedEvent,
  expeditionStartedEvent,
  workItemCreatedEvent,
} from "./helpers/state-fixtures.js"

const TRANSITION_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "transition-engine.js")

async function loadTransitionEngine() {
  return await import(TRANSITION_MODULE_PATH)
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
  const tmpDir = await makeTempDir("synth-transition-uninit-")
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
  const tmpDir = await makeTempDir("synth-transition-nodraft-")
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
  const tmpDir = await makeTempDir("synth-transition-lowconf-")
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
  const tmpDir = await makeTempDir("synth-transition-ready-")
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
  const tmpDir = await makeTempDir("synth-transition-approved-")
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-1"
    await writeEventLog(tmpDir, [
      genesisEvent(now, { projectName: "Approved", systemId: "trans-test" }),
      missionCreatedEvent(now, missionId, "Approved Mission"),
      missionApprovedEvent(now, missionId),
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
  const tmpDir = await makeTempDir("synth-transition-executing-")
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-2"
    const expeditionId = "E-TRANS-2"
    await writeEventLog(tmpDir, [
      genesisEvent(now, { projectName: "Executing", systemId: "trans-test" }),
      missionCreatedEvent(now, missionId, "Executing Mission"),
      missionApprovedEvent(now, missionId),
      expeditionCreatedEvent(now, expeditionId, missionId, "Executing Expedition"),
      expeditionStartedEvent(now, expeditionId),
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
  const tmpDir = await makeTempDir("synth-transition-blocked-")
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    await writeEventLog(tmpDir, [
      genesisEvent(now, { projectName: "Blocked", systemId: "trans-test" }),
      workItemCreatedEvent(now, "W-BLOCKED", "blocked"),
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
  const tmpDir = await makeTempDir("synth-transition-complete-")
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    const missionId = "M-TRANS-3"
    await writeEventLog(tmpDir, [
      genesisEvent(now, { projectName: "Complete", systemId: "trans-test" }),
      missionCreatedEvent(now, missionId, "Completed Mission"),
      missionApprovedEvent(now, missionId),
      missionCompletedEvent(now, missionId),
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
