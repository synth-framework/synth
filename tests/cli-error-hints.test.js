// ============================================================
// EXP-CLI-HINTS — Contextual CLI error hints
// ============================================================
// Verifies that common agent mistakes produce errors with a clear
// `suggestion` / `nextStep` pointing to the correct command.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-hints-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createMissionDraft(projectDir) {
  const result = runSynth(
    ["mission", "create", "--subject", "Hint Test", "--purpose", "Test CLI hints"],
    projectDir,
  )
  assert(result.status === 0, `mission create must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.kind === "MissionDraft", `expected MissionDraft, got ${output.kind}`)
  assert(output.draftId, "mission create should return a draftId")
  return output.draftId
}

async function testMissionApproveRequiresAlignmentContract(projectDir) {
  const draftId = await createMissionDraft(projectDir)
  const result = runSynth(["mission", "approve", "--draft-id", draftId], projectDir)
  assert(result.status !== 0, "mission approve should fail without --alignment-contract-id")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "error should report error status")
  assert(output.code === "MissingAlignmentContractId", `expected MissingAlignmentContractId, got ${output.code}`)
  assert(
    output.suggestion && output.suggestion.includes("synth alignment prepare"),
    `suggestion should mention synth alignment prepare, got ${JSON.stringify(output.suggestion)}`,
  )
  console.log("[PASS] mission approve hints to create alignment contract")
}

async function testMissionEvidenceRejectsNumericConfidence(projectDir) {
  const draftId = await createMissionDraft(projectDir)
  const result = runSynth(
    ["mission", "evidence", "add", "--draft-id", draftId, "--subject", "Evidence", "--confidence", "0.9"],
    projectDir,
  )
  assert(result.status !== 0, "mission evidence add should reject numeric confidence")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "error should report error status")
  assert(output.code === "InvalidConfidenceLevel", `expected InvalidConfidenceLevel, got ${output.code}`)
  assert(
    output.suggestion && output.suggestion.includes("0.9"),
    `suggestion should explain numeric values, got ${JSON.stringify(output.suggestion)}`,
  )
  console.log("[PASS] mission evidence add rejects numeric confidence with hint")
}

async function testMissionCertifySuggestsComplete(projectDir) {
  const result = runSynth(["mission", "certify", "--id", "some-mission"], projectDir)
  assert(result.status !== 0, "mission certify should fail")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "error should report error status")
  assert(output.code === "UnknownMissionSubcommand", `expected UnknownMissionSubcommand, got ${output.code}`)
  assert(
    output.suggestion && output.suggestion.includes("synth mission complete"),
    `suggestion should mention synth mission complete, got ${JSON.stringify(output.suggestion)}`,
  )
  console.log("[PASS] mission certify suggests mission complete")
}

async function main() {
  console.log("Running CLI error hint tests...")
  const projectDir = await setupProject()
  try {
    await testMissionApproveRequiresAlignmentContract(projectDir)
    await testMissionEvidenceRejectsNumericConfidence(projectDir)
    await testMissionCertifySuggestsComplete(projectDir)
    console.log("\n[EXP-CLI-HINTS] All tests passed")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.stack || err.message)
  process.exit(1)
})
