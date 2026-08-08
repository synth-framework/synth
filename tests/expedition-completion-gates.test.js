// ============================================================
// EXP-GATE-014 — Verification Gates Before Completion
// ============================================================
// Verifies that `synth expedition complete` cannot succeed while:
//   - verification is failing,
//   - no evidence is attached.
// Convergence Certification is a separate, post-completion gate and
// no longer blocks expedition completion.
// Also verifies the operator --force override path.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-gate-014-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Gate Mission", "--purpose", "Test completion gates"],
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
  assert(approveOutput.decision?.approved === true, `mission should be approved`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId`)
  return { missionId, gateCtx, contractId }
}

async function createExecutingExpedition(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Gate Expedition", "--goal", "Test gates"],
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
      artifacts: [{ path: `synth://missions/${missionId}/expeditions/${expeditionId}/implementation`, hash: "test", description: "Test" }],
      runtimeEvidence: [{ source: "test", observation: "ok", timestamp: 0 }],
      executionEvidence: [{ executionId: "test", result: "passed", outcome: "completed" }],
      certifier: { kind: "engine", id: "convergence-certification" },
    },
  })
  assert(result.status === "ok", `CertifyConvergence must succeed: ${result.error}`)
  assert(result.result?.decision === "converged", `Convergence must converge, got ${result.result?.decision}`)
}

async function attachEvidence(projectDir, expeditionId) {
  const evidenceFile = path.join(projectDir, "evidence.txt")
  await fs.writeFile(evidenceFile, "test evidence", "utf-8")
  const evidenceResult = runSynth(
    ["expedition", "evidence", "--id", expeditionId, "--attach", evidenceFile, "--note", "test evidence"],
    projectDir,
  )
  assert(evidenceResult.status === 0, `expedition evidence must exit 0:\n${evidenceResult.stderr}`)
  const evidenceOutput = parseJson(evidenceResult.stdout)
  assert(evidenceOutput.kind === "EvidenceAttached", `evidence should attach, got ${evidenceOutput.kind}`)
}

async function testBlocksWithoutEvidence(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await certifyConvergence(gateCtx, missionId, expeditionId, contractId)
  const result = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(result.status !== 0, "complete should fail without evidence")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "missing-evidence failure should report error status")
  assert(output.error?.code === "MissingEvidenceBlocksCompletion" || output.code === "MissingEvidenceBlocksCompletion", `expected MissingEvidenceBlocksCompletion, got ${JSON.stringify(output.error || output)}`)
  console.log("[PASS] Completion blocked without attached evidence")
}

async function testBlocksWhenVerifyFails(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await certifyConvergence(gateCtx, missionId, expeditionId, contractId)
  await attachEvidence(projectDir, expeditionId)

  // Introduce a replay divergence by corrupting canonical-state.json.
  const statePath = path.join(projectDir, ".synth", "data", "canonical-state.json")
  const state = JSON.parse(await fs.readFile(statePath, "utf-8"))
  state.expeditions = state.expeditions || {}
  state.expeditions["ghost-expedition"] = {
    id: "ghost-expedition",
    missionId,
    name: "Ghost",
    status: "executing",
  }
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8")

  const result = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(result.status !== 0, "complete should fail when verification fails")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "verification failure should report error status")
  assert(output.error?.code === "VerificationFailedBlocksCompletion" || output.code === "VerificationFailedBlocksCompletion", `expected VerificationFailedBlocksCompletion, got ${JSON.stringify(output.error || output)}`)
  console.log("[PASS] Completion blocked when verification fails")
}

async function testSucceedsWithoutConvergenceCertification(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await attachEvidence(projectDir, expeditionId)

  const result = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(result.status === 0, `complete must succeed without convergence certification:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionCompleted", `complete should return ExpeditionCompleted, got ${output.kind}`)
  assert(output.result.status === "completed", `expedition should be completed, got ${output.result.status}`)
  console.log("[PASS] Completion succeeds without convergence certification")
}

async function testCertifyAfterCompletion(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await attachEvidence(projectDir, expeditionId)

  const completeResult = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(completeResult.status === 0, `complete must succeed before certification:\n${completeResult.stderr}`)

  const certifyResult = runSynth(["expedition", "certify", "--id", expeditionId, "--evaluation", "nonexistent.json"], projectDir)
  assert(certifyResult.status !== 0, "certify with bad evaluation path should fail")

  // Auto-generated evaluation should succeed on the completed expedition.
  const autoCertifyResult = runSynth(["expedition", "certify", "--id", expeditionId], projectDir)
  assert(autoCertifyResult.status === 0, `certify after completion with auto-evaluation must succeed:\n${autoCertifyResult.stderr}`)
  const output = parseJson(autoCertifyResult.stdout)
  assert(output.kind === "ConvergenceCertified", `certify should return ConvergenceCertified, got ${output.kind}`)
  assert(output.decision === "converged", `certify decision should be converged, got ${output.decision}`)
  console.log("[PASS] Certification succeeds after completion with auto-generated evaluation")
}

async function testCustomEvaluationStillWorks(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await attachEvidence(projectDir, expeditionId)

  const completeResult = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(completeResult.status === 0, `complete must succeed:\n${completeResult.stderr}`)

  const evalPath = path.join(projectDir, "convergence-evaluation.json")
  await fs.writeFile(
    evalPath,
    JSON.stringify({
      decision: "aligned",
      confidence: 1,
      matchedRules: [],
      violatedRules: [],
      matchedDriftClasses: [],
      evidence: {
        summary: "Custom evaluation.",
        ruleResults: [],
        matchedDriftClasses: [],
        violatedContractFields: [],
        violatedIntentClauses: [],
      },
      reasoning: ["Custom evaluation supplied by operator."],
      deterministic: true,
    }, null, 2),
    "utf-8",
  )

  const certifyResult = runSynth(["expedition", "certify", "--id", expeditionId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status === 0, `certify with custom evaluation must succeed:\n${certifyResult.stderr}`)
  const output = parseJson(certifyResult.stdout)
  assert(output.kind === "ConvergenceCertified", `certify should return ConvergenceCertified, got ${output.kind}`)
  console.log("[PASS] Certification succeeds after completion with custom evaluation")
}

async function testSucceedsWithAllGates(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await certifyConvergence(gateCtx, missionId, expeditionId, contractId)
  await attachEvidence(projectDir, expeditionId)

  const result = runSynth(["expedition", "complete", "--id", expeditionId], projectDir)
  assert(result.status === 0, `complete must succeed with all gates passing:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionCompleted", `complete should return ExpeditionCompleted, got ${output.kind}`)
  assert(output.result.status === "completed", `expedition should be completed, got ${output.result.status}`)
  console.log("[PASS] Completion succeeds when all gates pass")
}

async function testForceBypassesEvidenceAndVerify(projectDir, missionId, gateCtx, contractId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  await certifyConvergence(gateCtx, missionId, expeditionId, contractId)
  // No evidence and no forced verification failure; force should still complete.

  const result = runSynth(
    ["expedition", "complete", "--id", expeditionId, "--force", "--reason", "operator override for hotfix"],
    projectDir,
  )
  assert(result.status === 0, `force complete must succeed:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "ExpeditionCompleted", `force complete should return ExpeditionCompleted, got ${output.kind}`)
  assert(output.force === true, "output should record that force was used")
  assert(output.forceReason === "operator override for hotfix", "output should record the force reason")
  console.log("[PASS] --force --reason bypasses evidence and verification gates")
}

async function testForceRequiresReason(projectDir, missionId) {
  const expeditionId = await createExecutingExpedition(projectDir, missionId)
  const result = runSynth(["expedition", "complete", "--id", expeditionId, "--force"], projectDir)
  assert(result.status !== 0, "force without reason should fail")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "missing reason should report error status")
  console.log("[PASS] --force requires --reason")
}

async function withProject(testFn) {
  const projectDir = await setupProject()
  try {
    const ctx = await createAndApproveMission(projectDir)
    await testFn(projectDir, ctx.missionId, ctx.gateCtx, ctx.contractId)
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] Runtime not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await withProject(testBlocksWithoutEvidence)
  await withProject(testBlocksWhenVerifyFails)
  await withProject(testSucceedsWithoutConvergenceCertification)
  await withProject(testCertifyAfterCompletion)
  await withProject(testCustomEvaluationStillWorks)
  await withProject(testSucceedsWithAllGates)
  await withProject(testForceBypassesEvidenceAndVerify)
  await withProject(testForceRequiresReason)

  console.log("\n[EXP-GATE-014] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
