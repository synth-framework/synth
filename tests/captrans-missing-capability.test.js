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

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

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

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function setupProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-captrans-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "CAPTRANS Mission", "--purpose", "Test missing-capability handling"],
    projectDir,
  )
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  const draftId1 = parseJson(createResult.stdout).draftId

  const evidenceResult = runSynth(
    [
      "mission",
      "evidence",
      "add",
      "--draft-id",
      draftId1,
      "--subject",
      "Supporting evidence",
      "--purpose",
      "Raises confidence above approval threshold",
      "--confidence",
      "certain",
    ],
    projectDir,
  )
  assert(evidenceResult.status === 0, `mission evidence add must exit 0:\n${evidenceResult.stderr}`)
  const draftId2 = parseJson(evidenceResult.stdout).draftId

  const dataDir = path.join(projectDir, ".synth", "data")
  const gateCtx = await bootstrap({
    skipGenesis: true,
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
    },
  })
  const { contractId } = await createAlignedContract(gateCtx)

  const approveResult = runSynth(
    ["mission", "approve", "--draft-id", draftId2, "--alignment-contract-id", contractId],
    projectDir,
  )
  assert(approveResult.status === 0, `mission approve must exit 0:\n${approveResult.stderr}`)
  const approveOutput = parseJson(approveResult.stdout)
  assert(approveOutput.kind === "MissionApprovalDecision", `mission approve should return MissionApprovalDecision, got ${approveOutput.kind}`)
  assert(approveOutput.decision?.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput.decision)}`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId, got ${JSON.stringify(approveOutput.runtime)}`)
  return { missionId, gateCtx, contractId }
}

async function createExecutingExpedition(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "CAPTRANS Expedition", "--goal", "Test archive fallback"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const draftId = parseJson(createResult.stdout).draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)
  const startOutput = parseJson(startResult.stdout)
  assert(startOutput.result.status === "executing", `expedition should be executing, got ${startOutput.result.status}`)

  return draftId
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
    assert(unavailable.length > 0, "at least one capability should be reported as unavailable")

    for (const c of unavailable) {
      assert(typeof c.reason === "string" && c.reason.length > 0, `unavailable capability ${c.id} must have a reason`)
      assert(c.commands.length > 0, `unavailable capability ${c.id} must list affected commands`)
    }

    const eventLogQuery = output.capabilities.find((c) => c.id === "event-log-query")
    assert(eventLogQuery?.status === "unavailable", "event-log-query should be unavailable")
    assert(eventLogQuery.reason.includes("not yet implemented"), `event-log-query reason should mention not implemented, got ${eventLogQuery.reason}`)

    console.log("[PASS] synth capabilities reports unavailable capabilities with clear reasons")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

async function testArchiveExecutingExpedition() {
  const projectDir = await setupProject()
  try {
    const { missionId } = await createAndApproveMission(projectDir)
    const expeditionId = await createExecutingExpedition(projectDir, missionId)

    const archiveResult = runSynth(
      ["expedition", "archive", "--id", expeditionId, "--reason", "convergence CLI unavailable"],
      projectDir,
    )
    assert(archiveResult.status === 0, `expedition archive must exit 0:\n${archiveResult.stderr}`)
    const archiveOutput = parseJson(archiveResult.stdout)
    assert(archiveOutput.status === "ok", `archive should return ok status, got ${archiveOutput.status}`)
    assert(archiveOutput.kind === "ExpeditionArchived", `archive should return ExpeditionArchived, got ${archiveOutput.kind}`)
    assert(archiveOutput.expeditionId === expeditionId, `archive should return the same expedition id`)
    assert(archiveOutput.result.status === "cancelled", `archive should transition expedition to cancelled, got ${archiveOutput.result.status}`)

    const statusResult = runSynth(["status"], projectDir)
    assert(statusResult.status === 0, `status must exit 0:\n${statusResult.stderr}`)
    const statusOutput = parseJson(statusResult.stdout)
    assert(statusOutput.activeExpeditions.every((e) => e.status !== "executing"), "status should no longer list an executing expedition")

    console.log("[PASS] synth expedition archive transitions an executing expedition to cancelled")
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
