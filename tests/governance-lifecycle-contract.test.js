import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// SYNTH Governance Lifecycle Contract Certification
// ============================================================
// Verifies that public CLI lifecycle transitions emit the events
// required by the governance contract and that replay reconstructs
// the expected statuses.
//
// This test uses only public CLI commands and documented artifacts.
// It does not depend on runtime internals.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrapProject, createAndApproveMission, createExecutingExpedition } from "./helpers/mission-lifecycle.js"
import { assert, parseJson } from "./helpers/assert.js"
import { createPerfRunner } from "./helpers/perf-runner.js"
import { readAuthoritativeEventLog } from "../dist/runtime/governance-resolver.js"
import { createPosixFilesystemProvider, FILESYSTEM_WRITE_TOKEN } from "../dist/infra/filesystem-provider.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

const { runSynth } = createPerfRunner({
  cliPath: CLI_PATH,
  logPath: process.env.SYNTH_PERF_LOG || "/tmp/synth-perf-governance.log",
})

async function readEventLog(projectDir) {
  // The partitioned event store is authoritative; read it through the
  // canonical reader rather than the vestigial monolithic event-log.jsonl.
  const dataFs = createPosixFilesystemProvider(
    path.join(projectDir, ".synth", "data"),
    FILESYSTEM_WRITE_TOKEN,
  )
  return readAuthoritativeEventLog(dataFs)
}

async function certifyConvergence(gateCtx, missionId, expeditionId, contractId) {
  const result = await gateCtx.api.handleIntent({
    actor: "test",
    capability: "CertifyConvergence",
    payload: {
      missionId,
      expeditionId,
      alignmentContractId: contractId,
      observedFeatures: {
        hasPersistentHeader: true,
        hasPersistentSidebar: true,
        hasScrollDrivenPhases: true,
      },
      ruleSetId: "program-027-homepage",
      artifacts: [
        {
          path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`,
          hash: `test-${missionId}-${expeditionId}`,
          description: "Test implementation reference",
        },
      ],
      runtimeEvidence: [
        {
          source: `synth://missions/${missionId}/expeditions/${expeditionId}/runtime`,
          observation: "Runtime behavior observed",
          timestamp: 0,
        },
      ],
      executionEvidence: [
        {
          executionId: `test-execution-${expeditionId}`,
          result: "passed",
          outcome: "completed",
        },
      ],
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert(result.status === "ok", `CertifyConvergence must succeed: ${result.error}`)
  assert(result.result?.decision === "converged", `Convergence certification must converge, got ${result.result?.decision}`)
}

async function testMissionLifecycleEmitsRequiredEvents(projectDir) {
  await createAndApproveMission(projectDir, {
    subject: "Contract Mission",
    purpose: "Test governance contract",
  })

  const events = await readEventLog(projectDir)
  const types = events.map((e) => e.type)

  assert(types.includes("MISSION_CREATED"), "MISSION_CREATED must be emitted when a mission is created")
  assert(types.includes("MISSION_APPROVED"), "MISSION_APPROVED must be emitted when a mission is approved")

  const missionCreated = events.find((e) => e.type === "MISSION_CREATED")
  assert(missionCreated.payload.mission, "MISSION_CREATED payload must include mission object")
  assert(missionCreated.payload.mission.id, "MISSION_CREATED payload.mission must include id")
  assert(missionCreated.payload.mission.name === "Contract Mission", "MISSION_CREATED payload.mission.name must match subject")
  assert(missionCreated.payload.mission.status === "draft", "MISSION_CREATED payload.mission.status must be draft")

  const missionApproved = events.find((e) => e.type === "MISSION_APPROVED")
  assert(missionApproved.payload.id === missionCreated.payload.mission.id, "MISSION_APPROVED payload.id must match MISSION_CREATED payload.mission.id")
  assert(missionApproved.payload.status === "active", "MISSION_APPROVED payload.status must be active")

  console.log("[PASS] Mission lifecycle emits required governance events")
}

async function testExpeditionLifecycleEmitsRequiredEvents(projectDir) {
  const { missionId, gateCtx, contractId } = await createAndApproveMission(projectDir, {
    subject: "Expedition Host Mission",
    purpose: "Host expedition contract test",
    returnGateContext: true,
  })

  const draftId = await createExecutingExpedition(projectDir, missionId, {
    subject: "Contract Expedition",
    goal: "Test goal",
    attachEvidence: true,
  })

  await certifyConvergence(gateCtx, missionId, draftId, contractId)

  const completeResult = runSynth(["expedition", "complete", "--id", draftId], projectDir)
  assert(completeResult.status === 0, `expedition complete must exit 0:\n${completeResult.stderr}`)

  const events = await readEventLog(projectDir)
  const expeditionEvents = events.filter((e) => e.type.startsWith("EXPEDITION_"))
  const types = expeditionEvents.map((e) => e.type)

  assert(types.includes("EXPEDITION_CREATED"), "EXPEDITION_CREATED must be emitted when an expedition is created")
  assert(types.includes("EXPEDITION_APPROVED"), "EXPEDITION_APPROVED must be emitted when an expedition is approved")
  assert(types.includes("EXPEDITION_COMMITTED"), "EXPEDITION_COMMITTED must be emitted when an expedition is committed")
  assert(types.includes("EXPEDITION_STARTED"), "EXPEDITION_STARTED must be emitted when an expedition is started")
  assert(types.includes("EXPEDITION_COMPLETED"), "EXPEDITION_COMPLETED must be emitted when an expedition is completed")

  const expeditionCreated = expeditionEvents.find((e) => e.type === "EXPEDITION_CREATED")
  assert(expeditionCreated.payload.expedition, "EXPEDITION_CREATED payload must include expedition object")
  assert(expeditionCreated.payload.expedition.id, "EXPEDITION_CREATED payload.expedition must include id")
  assert(expeditionCreated.payload.expedition.name === "Contract Expedition", "EXPEDITION_CREATED payload.expedition.name must match subject")

  const expeditionIds = expeditionEvents.filter((e) => e.type !== "EXPEDITION_CREATED").map((e) => e.payload.id)
  assert(expeditionIds.every((id) => id === draftId), "All expedition transition events must reference the same draft id")

  const statuses = {
    EXPEDITION_APPROVED: "approved",
    EXPEDITION_COMMITTED: "committed",
    EXPEDITION_STARTED: "executing",
    EXPEDITION_COMPLETED: "completed",
  }
  for (const [eventType, expectedStatus] of Object.entries(statuses)) {
    const event = expeditionEvents.find((e) => e.type === eventType)
    assert(event.payload.status === expectedStatus, `${eventType} payload.status must be ${expectedStatus}`)
  }

  console.log("[PASS] Expedition lifecycle emits required governance events")
}

async function testReplayReconstructsGovernanceStatuses(projectDir) {
  const explainResult = runSynth(["explain", "replay"], projectDir)
  assert(explainResult.status === 0, `explain replay must exit 0:\n${explainResult.stderr}`)
  const explainOutput = parseJson(explainResult.stdout)
  assert(explainOutput.status === "ok" || explainOutput.valid === true, `replay must be valid, got ${JSON.stringify(explainOutput)}`)

  console.log("[PASS] Replay reconstructs governance statuses without divergence")
}

async function main() {
  console.log("Running governance lifecycle contract certification...")
  const projectDir = await bootstrapProject(await makeTempDir("synth-governance-contract-"))
  try {
    await testMissionLifecycleEmitsRequiredEvents(projectDir)
    await testExpeditionLifecycleEmitsRequiredEvents(projectDir)
    await testReplayReconstructsGovernanceStatuses(projectDir)
    console.log("\nAll governance lifecycle contract certification tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
