// ============================================================
// EXP-CLI-008 — Evaluation File Schema Validation
// ============================================================
// Verifies that `synth expedition certify --evaluation <path>`
// validates the JSON file schema and emits helpful, actionable errors.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-evaluation-schema-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function approveMission(projectDir) {
  let createResult = runSynth(["mission", "create", "--subject", "Evaluation Host", "--purpose", "Host evaluation schema test"], projectDir)
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  let createOutput = parseJson(createResult.stdout)
  assert(createOutput.kind === "MissionDraft", `mission create should return MissionDraft, got ${createOutput.kind}`)
  let draftId = createOutput.draftId

  let evidenceIndex = 0
  while (createOutput.confidence.overall < 0.72) {
    evidenceIndex += 1
    const evidenceResult = runSynth(
      ["mission", "evidence", "add", "--draft-id", draftId, "--subject", `Contract evidence ${evidenceIndex}`, "--purpose", "Governance contract certification", "--confidence", "high"],
      projectDir,
    )
    assert(evidenceResult.status === 0, `mission evidence add must exit 0:\n${evidenceResult.stdout}\n${evidenceResult.stderr}`)
    createOutput = parseJson(evidenceResult.stdout)
    draftId = createOutput.draftId
  }

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
    ["mission", "approve", "--draft-id", draftId, "--alignment-contract-id", contractId],
    projectDir,
  )
  assert(approveResult.status === 0, `mission approve must exit 0:\n${approveResult.stderr}`)
  const approveOutput = parseJson(approveResult.stdout)
  assert(approveOutput.kind === "MissionApprovalDecision", `mission approve should return MissionApprovalDecision, got ${approveOutput.kind}`)
  assert(approveOutput.decision.approved === true, `mission should be approved`)

  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId`)
  return { missionId, contractId }
}

async function createExecutingExpedition(projectDir, missionId) {
  const createResult = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Evaluation Schema Expedition", "--goal", "Test evaluation schema validation"],
    projectDir,
  )
  assert(createResult.status === 0, `expedition create must exit 0:\n${createResult.stderr}`)
  const createOutput = parseJson(createResult.stdout)
  const draftId = createOutput.draftId

  const approveResult = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approveResult.status === 0, `expedition approve must exit 0:\n${approveResult.stderr}`)

  const commitResult = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commitResult.status === 0, `expedition commit must exit 0:\n${commitResult.stderr}`)

  const startResult = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert(startResult.status === 0, `expedition start must exit 0:\n${startResult.stderr}`)

  return draftId
}

function baseEvaluation() {
  return {
    decision: "aligned",
    confidence: 1,
    matchedRules: [
      {
        ruleId: "rule-001",
        ruleName: "Example rule",
        outcome: "pass",
        severity: "blocking",
        contractClauses: [{ field: "example.field", requirement: "Example requirement" }],
      },
    ],
    violatedRules: [],
    matchedDriftClasses: [],
    evidence: {
      summary: "Example evidence",
      ruleResults: [],
      matchedDriftClasses: [],
      violatedContractFields: [],
      violatedIntentClauses: [],
    },
    reasoning: ["Example reasoning"],
    deterministic: true,
  }
}

async function testValidEvaluationSucceeds(projectDir, draftId) {
  const evalPath = path.join(projectDir, "valid-evaluation.json")
  await fs.writeFile(evalPath, JSON.stringify(baseEvaluation(), null, 2), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status === 0, `valid evaluation should certify:\n${certifyResult.stdout}\n${certifyResult.stderr}`)
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "ok", `status should be ok, got ${output.status}`)
  assert(output.kind === "ConvergenceCertified", `kind should be ConvergenceCertified, got ${output.kind}`)

  console.log("[PASS] valid evaluation file certifies successfully")
}

async function testInvalidJsonFails(projectDir, draftId) {
  const evalPath = path.join(projectDir, "invalid-json.json")
  await fs.writeFile(evalPath, "{ not valid json", "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "invalid JSON should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.code === "EvaluationFileParseFailed", `code should be EvaluationFileParseFailed, got ${output.code}`)
  assert(output.error.includes("valid JSON"), `error should mention valid JSON, got ${output.error}`)

  console.log("[PASS] invalid JSON evaluation file fails with helpful error")
}

async function testMissingDecisionFails(projectDir, draftId) {
  const evaluation = baseEvaluation()
  delete evaluation.decision
  const evalPath = path.join(projectDir, "missing-decision.json")
  await fs.writeFile(evalPath, JSON.stringify(evaluation), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "missing decision should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.code === "EvaluationSchemaValidationFailed", `code should be EvaluationSchemaValidationFailed, got ${output.code}`)
  assert(output.errors.some((e) => e.path === "decision"), `errors should include decision path`)

  console.log("[PASS] missing decision fails with schema error")
}

async function testInvalidDecisionFails(projectDir, draftId) {
  const evaluation = { ...baseEvaluation(), decision: "maybe" }
  const evalPath = path.join(projectDir, "invalid-decision.json")
  await fs.writeFile(evalPath, JSON.stringify(evaluation), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "invalid decision should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.errors.some((e) => e.path === "decision" && e.message.includes("aligned")), `error should mention valid decisions`)

  console.log("[PASS] invalid decision value fails with schema error")
}

async function testInvalidConfidenceFails(projectDir, draftId) {
  const evaluation = { ...baseEvaluation(), confidence: 1.5 }
  const evalPath = path.join(projectDir, "invalid-confidence.json")
  await fs.writeFile(evalPath, JSON.stringify(evaluation), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "invalid confidence should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.errors.some((e) => e.path === "confidence"), `errors should include confidence path`)

  console.log("[PASS] invalid confidence fails with schema error")
}

async function testMissingEvidenceSummaryFails(projectDir, draftId) {
  const evaluation = baseEvaluation()
  delete evaluation.evidence.summary
  const evalPath = path.join(projectDir, "missing-evidence-summary.json")
  await fs.writeFile(evalPath, JSON.stringify(evaluation), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "missing evidence summary should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.errors.some((e) => e.path === "evidence.summary"), `errors should include evidence.summary path`)

  console.log("[PASS] missing evidence summary fails with schema error")
}

async function testMissingDeterministicFails(projectDir, draftId) {
  const evaluation = baseEvaluation()
  delete evaluation.deterministic
  const evalPath = path.join(projectDir, "missing-deterministic.json")
  await fs.writeFile(evalPath, JSON.stringify(evaluation), "utf-8")

  const certifyResult = runSynth(["expedition", "certify", "--id", draftId, "--evaluation", evalPath], projectDir)
  assert(certifyResult.status !== 0, "missing deterministic should fail")
  const output = parseJson(certifyResult.stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.errors.some((e) => e.path === "deterministic"), `errors should include deterministic path`)

  console.log("[PASS] missing deterministic flag fails with schema error")
}

async function main() {
  console.log("Running evaluation schema validation tests...")
  const projectDir = await setupProject()
  try {
    const { missionId } = await approveMission(projectDir)
    const draftId = await createExecutingExpedition(projectDir, missionId)
    await testValidEvaluationSucceeds(projectDir, draftId)
    await testInvalidJsonFails(projectDir, draftId)
    await testMissingDecisionFails(projectDir, draftId)
    await testInvalidDecisionFails(projectDir, draftId)
    await testInvalidConfidenceFails(projectDir, draftId)
    await testMissingEvidenceSummaryFails(projectDir, draftId)
    await testMissingDeterministicFails(projectDir, draftId)
    console.log("\nAll evaluation schema validation tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
