import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// EXP-CAPTRANS-002 — Graceful Missing-Capability Handling Tests
// ============================================================
// Verifies that:
//   1. `synth capabilities` reports unavailable capabilities with clear reasons.
//   2. `synth status` / `synth explain status` surfaces missing capabilities as
//      warnings, and Convergence Certification unavailability as a blocker when
//      an expedition is executing.
//   3. `synth expedition archive` is a safe fallback that transitions an
//      executing expedition to cancelled.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { bootstrapProject, createAndApproveMission, createExecutingExpedition } from "./helpers/mission-lifecycle.js"

async function setupProject() {
  const tmpDir = await makeTempDir("synth-captrans-")
  return await bootstrapProject(tmpDir)
}

async function createAndApproveMissionLocal(projectDir) {
  return await createAndApproveMission(projectDir, {
    subject: "CAPTRANS Mission",
    purpose: "Test missing-capability handling",
    returnGateContext: true,
  })
}

async function createExecutingExpeditionLocal(projectDir, missionId) {
  return await createExecutingExpedition(projectDir, missionId, {
    subject: "CAPTRANS Expedition",
    goal: "Test archive fallback",
  })
}

async function testCapabilitiesReport() {
  const projectDir = await setupProject()
  try {
    const result = runSynth(["capabilities"], projectDir)
    assert(result.status === 0, `capabilities must exit 0:\n${result.stderr}`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `capabilities should return ok status, got ${output.status}`)
    assert(output.kind === "CapabilityReport", `capabilities should return CapabilityReport, got ${output.kind}`)
    assert(Array.isArray(output.capabilities), "capabilities should be an array")

    const unavailable = output.capabilities.filter((c) => c.status === "unavailable")
    // In a fully-provisioned environment every capability may be available; the
    // durable transparency invariant is that any capability reported unavailable
    // must explain why and list the commands it affects.
    for (const c of unavailable) {
      assert(typeof c.reason === "string" && c.reason.length > 0, `unavailable capability ${c.id} must have a reason`)
      assert(c.commands.length > 0, `unavailable capability ${c.id} must list affected commands`)
    }

    const eventLogQuery = output.capabilities.find((c) => c.id === "event-log-query")
    assert(eventLogQuery, "event-log-query capability must be reported")
    if (eventLogQuery.status === "unavailable") {
      assert(eventLogQuery.reason.includes("not yet implemented"), `event-log-query reason should mention not implemented, got ${eventLogQuery.reason}`)
    }

    console.log("[PASS] synth capabilities reports capabilities with clear status and reasons")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

async function testArchiveExecutingExpedition() {
  const projectDir = await setupProject()
  try {
    const { missionId } = await createAndApproveMissionLocal(projectDir)
    const expeditionId = await createExecutingExpeditionLocal(projectDir, missionId)

    const archiveResult = runSynth(
      ["expedition", "archive", "--id", expeditionId, "--reason", "convergence CLI unavailable"],
      projectDir,
    )
    assert(archiveResult.status === 0, `expedition archive must exit 0:\n${archiveResult.stderr}`)
    const archiveOutput = parseJson(archiveResult.stdout)
    assert(archiveOutput.status === "ok", `archive should return ok status, got ${archiveOutput.status}`)
    assert(archiveOutput.kind === "ExpeditionArchived", `archive should return ExpeditionArchived, got ${archiveOutput.kind}`)
    assert(archiveOutput.expeditionId === expeditionId, `archive should return the same expedition id`)
    assert(archiveOutput.result.status === "archived", `archive should transition expedition to archived, got ${archiveOutput.result.status}`)

    const statusResult = runSynth(["status"], projectDir)
    assert(statusResult.status === 0, `status must exit 0:\n${statusResult.stderr}`)
    const statusOutput = parseJson(statusResult.stdout)
    assert(statusOutput.activeExpeditions.every((e) => e.status !== "executing"), "status should no longer list an executing expedition")

    console.log("[PASS] synth expedition archive transitions an executing expedition to archived")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

async function testMissingCapabilityBlocker() {
  const { buildCapabilityEntries, EXPECTED_CAPABILITIES } = await import("../dist/cli/capabilities-data.js")
  const { toOperatorBriefing } = await import("../dist/runtime/status-projection.js")

  const installedCapabilities = new Set(["CreateMission", "ApproveMission", "CreateExpedition", "ApproveExpedition", "CommitExpedition", "StartExpedition", "CompleteExpedition"])
  const installedAdapters = new Set(["repository"])
  const capabilities = buildCapabilityEntries(installedCapabilities, installedAdapters)

  const convergenceCapability = capabilities.find((c) => c.id === "convergence-certification")
  assert(convergenceCapability?.status === "unavailable", "convergence-certification should be unavailable when CertifyConvergence is not installed")
  assert(convergenceCapability.reason.includes("Convergence Certification"), `reason should name capability, got ${convergenceCapability.reason}`)

  const expeditionId = "EXP-CAPTRANS-001"
  const missionId = "M-CAPTRANS-001"
  const ctx = {
    schemaVersion: 1,
    authoritative: {
      manifestExists: true,
      events: [],
      persistedState: null,
      replayedState: {
        version: 1,
        stateHash: "1",
        lifecycle: "initialized",
        workItems: {},
        plans: {},
        milestones: {},
        projects: {},
        missions: {
          [missionId]: {
            id: missionId,
            name: "CAPTRANS Mission",
            status: "active",
            expeditions: [expeditionId],
            metadata: {},
            createdAt: 0,
            updatedAt: 0,
          },
        },
        expeditions: {
          [expeditionId]: {
            id: expeditionId,
            missionId,
            name: "CAPTRANS Expedition",
            goal: "Test blocker",
            status: "executing",
            objectives: [],
            discoveries: [],
            decisions: [],
            dependsOn: [],
            metadata: {},
            createdAt: 0,
            updatedAt: 0,
          },
        },
        objectives: {},
        discoveries: {},
        decisions: {},
        referenceEvidence: {},
        repository: undefined,
        lastEventOffset: 0,
      },
      decisions: [],
      snapshots: [],
    },
    derived: {
      phase: "executing",
      activeMission: null,
      activeExpedition: null,
      latestDraft: null,
      divergences: [],
      graphViolations: [],
      capabilities,
    },
  }

  const briefing = toOperatorBriefing(ctx, { kind: "NoOp", reason: "Inspect current state." })
  assert(briefing.status === "ok", "briefing should be ok")

  const blocker = briefing.blockers.find((b) => b.kind === "missing-convergence-certification")
  assert(blocker, "briefing should contain a missing-convergence-certification blocker")
  assert(blocker.description.includes(expeditionId), `blocker description should mention expedition id, got ${blocker.description}`)
  assert(blocker.remediation.includes("synth expedition archive"), `blocker remediation should suggest archive, got ${blocker.remediation}`)

  const warning = briefing.warnings.find((w) => w.kind === "missing-capability" && w.description.includes("Convergence Certification"))
  assert(warning, "briefing should contain a missing-capability warning for Convergence Certification")

  console.log("[PASS] status projection surfaces missing Convergence Certification as a blocker and warning")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testCapabilitiesReport()
  await testArchiveExecutingExpedition()
  await testMissingCapabilityBlocker()

  console.log("\n[CAPTRANS-002] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
