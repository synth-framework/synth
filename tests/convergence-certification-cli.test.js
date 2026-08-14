// ============================================================
// EXP-GOV-024 — Convergence Certification CLI
// ============================================================
// Verifies that `synth expedition certify` invokes the CertifyConvergence
// capability and unblocks `synth expedition complete`.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, withTempDir, writeEventLog, writeManifest } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function convergedEvaluation() {
  return {
    decision: "aligned",
    confidence: 1,
    matchedRules: [],
    violatedRules: [],
    matchedDriftClasses: [],
    evidence: {
      summary: "All convergence checks passed.",
      ruleResults: [],
      matchedDriftClasses: [],
      violatedContractFields: [],
      violatedIntentClauses: [],
    },
    reasoning: ["No violations detected in supplied evaluation."],
    deterministic: true,
  }
}

async function setupGovernedProject(tmpDir) {
  await writeManifest(tmpDir, "CLI Test Project", {
    publicVocabulary: ["Mission", "Expedition", "Evidence", "Plan", "Event", "State", "Replay"],
  })
  const contractId = "contract-1"
  await writeEventLog(tmpDir, [
    {
      id: "evt-mission",
      type: "MISSION_CREATED",
      timestamp: 1,
      transactionId: "tx-1",
      capability: "CreateMission",
      actor: "test",
      payload: {
        mission: {
          id: "mission-1",
          name: "Test Mission",
          purpose: "Test convergence certification CLI",
          status: "active",
          alignmentContractId: contractId,
          expeditions: [],
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
    {
      id: "evt-contract",
      type: "ALIGNMENT_CONTRACT_CREATED",
      timestamp: 2,
      transactionId: "tx-1",
      capability: "CreateAlignmentContract",
      actor: "test",
      payload: {
        contract: {
          id: contractId,
          intentModelId: "intent-1",
          intentSummary: "Test intent",
          expectedExperience: "Test experience",
          requiredProperties: [],
          forbiddenProperties: [],
          requiredBehaviors: [],
          visualReferences: [],
          behavioralReferences: [],
          functionalExpectations: [],
          technicalConstraints: [],
          successCriteria: [],
          explicitNonRequirements: [],
          allowedInterpretation: [],
          allowedVariation: [],
          forbiddenInterpretation: [],
          forbiddenDrift: [],
          referenceEvidenceIds: [],
          status: "approved",
          version: 1,
          createdAt: 2,
          updatedAt: 2,
        },
      },
    },
    {
      id: "evt-expedition",
      type: "EXPEDITION_CREATED",
      timestamp: 3,
      transactionId: "tx-1",
      capability: "CreateExpedition",
      actor: "test",
      payload: {
        expedition: {
          id: "expedition-1",
          missionId: "mission-1",
          name: "Test Expedition",
          goal: "Test goal",
          status: "executing",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: {},
          createdAt: 3,
          updatedAt: 3,
        },
      },
    },
  ])
}

async function testCertifyCommandEmitsEvent() {
  await withTempDir("synth-certify-cli-", async (tmpDir) => {
    await setupGovernedProject(tmpDir)
    const evalPath = path.join(tmpDir, "evaluation.json")
    await fs.writeFile(evalPath, JSON.stringify(convergedEvaluation()), "utf-8")

    const { stdout, status } = runSynth(["expedition", "certify", "--id", "expedition-1", "--evaluation", evalPath], tmpDir)
    assert(status === 0, `certify command should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "ok", `certify status should be ok, got ${output.status}`)
    assert(output.decision === "converged", `decision should be converged, got ${output.decision}`)

    const logPath = path.join(tmpDir, ".synth", "data", "event-log.jsonl")
    const logLines = (await fs.readFile(logPath, "utf-8")).trim().split("\n")
    const certificationEvent = logLines
      .map((line) => JSON.parse(line))
      .reverse()
      .find((e) => e.type === "CONVERGENCE_CERTIFIED" && e.payload?.expeditionId === "expedition-1")
    assert(certificationEvent, "event log should contain a CONVERGENCE_CERTIFIED event for expedition-1")

    console.log("[PASS] synth expedition certify emits CONVERGENCE_CERTIFIED")
  })
}

async function attachEvidence(tmpDir, expeditionId) {
  const evidenceFile = path.join(tmpDir, "evidence.txt")
  await fs.writeFile(evidenceFile, "convergence certification evidence", "utf-8")
  const result = runSynth(
    ["expedition", "evidence", "--id", expeditionId, "--attach", evidenceFile, "--note", "Certification evidence"],
    tmpDir,
  )
  assert(result.status === 0, `expedition evidence should succeed: ${result.stdout}`)
  const output = parseJson(result.stdout)
  assert(output.status === "ok", `evidence attach status should be ok, got ${output.status}`)
}

async function testCertifyUnblocksComplete() {
  await withTempDir("synth-certify-complete-", async (tmpDir) => {
    await setupGovernedProject(tmpDir)
    const evalPath = path.join(tmpDir, "evaluation.json")
    await fs.writeFile(evalPath, JSON.stringify(convergedEvaluation()), "utf-8")

    let result = runSynth(["expedition", "certify", "--id", "expedition-1", "--evaluation", evalPath], tmpDir)
    assert(result.status === 0, `certify should succeed: ${result.stdout}`)

    await attachEvidence(tmpDir, "expedition-1")

    result = runSynth(["expedition", "complete", "--id", "expedition-1"], tmpDir)
    assert(result.status === 0, `complete should succeed after certification: ${result.stdout}`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `complete status should be ok, got ${output.status}`)

    console.log("[PASS] synth expedition complete succeeds after certification")
  })
}

async function testCompleteSucceedsWithoutCertification() {
  await withTempDir("synth-complete-sans-cert-", async (tmpDir) => {
    await setupGovernedProject(tmpDir)
    await attachEvidence(tmpDir, "expedition-1")

    const { status, stdout } = runSynth(["expedition", "complete", "--id", "expedition-1"], tmpDir)
    assert(status === 0, `complete should succeed without certification:\n${stdout}`)

    console.log("[PASS] synth expedition complete succeeds without certification")
  })
}

async function testCertifyAfterCompletion() {
  await withTempDir("synth-certify-after-complete-", async (tmpDir) => {
    await setupGovernedProject(tmpDir)
    await attachEvidence(tmpDir, "expedition-1")

    let result = runSynth(["expedition", "complete", "--id", "expedition-1"], tmpDir)
    assert(result.status === 0, `complete should succeed:\n${result.stdout}`)

    result = runSynth(["expedition", "certify", "--id", "expedition-1"], tmpDir)
    assert(result.status === 0, `certify after completion with auto-evaluation should succeed:\n${result.stdout}`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `certify status should be ok, got ${output.status}`)
    assert(output.decision === "converged", `decision should be converged, got ${output.decision}`)

    console.log("[PASS] synth expedition certify succeeds after completion with auto-evaluation")
  })
}

async function main() {
  await testCertifyCommandEmitsEvent()
  await testCertifyUnblocksComplete()
  await testCompleteSucceedsWithoutCertification()
  await testCertifyAfterCompletion()
  console.log("\n[CONVERGENCE CERTIFICATION CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
