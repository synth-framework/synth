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
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { createAndApproveMission, createExecutingExpedition as createExecutingExpeditionIntent, setupBasicProject } from "./helpers/mission-lifecycle.js"
import { assert } from "./helpers/assert.js"

async function setupProject() {
  return setupBasicProject("synth-evaluation-schema-")
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
        contractClauses: [{ field: "example.field", requirement: "Example requirement", values: ["example value"] }],
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
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Evaluation Host",
      purpose: "Host evaluation schema test",
      returnGateContext: true,
    })
    const draftId = await createExecutingExpeditionIntent(projectDir, missionId, {
      subject: "Evaluation Schema Expedition",
      goal: "Test evaluation schema validation",
    })
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
