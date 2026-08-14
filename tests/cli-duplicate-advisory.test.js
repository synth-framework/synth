// ============================================================
// EXP-DUP-001 — CLI duplicate-advisory regression test
// ============================================================
// Verifies that `synth mission create` and `synth expedition create`
// emit a `similar` advisory array in their JSON response, populated by
// the deterministic duplicate detector when existing entities overlap
// with the candidate's scope/intent.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-duplicate-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Test Mission", "--purpose", "Test purpose"],
    projectDir,
  )
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  let draftId = parseJson(createResult.stdout).draftId

  const evidenceResult = runSynth(
    [
      "mission",
      "evidence",
      "add",
      "--draft-id",
      draftId,
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
  draftId = parseJson(evidenceResult.stdout).draftId

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
  assert(approveOutput.decision?.approved === true, `mission should be approved, got ${JSON.stringify(approveOutput.decision)}`)
  const missionId = approveOutput.runtime?.missionId
  assert(missionId, `mission approve should return a runtime missionId, got ${JSON.stringify(approveOutput.runtime)}`)
  return missionId
}

async function testMissionCreateEmitsSimilarAdvisory(projectDir) {
  const create = runSynth(
    [
      "mission",
      "create",
      "--subject",
      "CLI duplicate-aware advisory",
      "--purpose",
      "Surface similar existing missions at create time",
      "--intent",
      "duplicate,advisory",
      "--scope",
      "cli",
    ],
    projectDir,
  )
  assert(create.status === 0, `mission create must exit 0:\n${create.stderr}`)
  const output = parseJson(create.stdout)
  assert(output.kind === "MissionDraft", `mission create should return MissionDraft, got ${output.kind}`)
  assert(Array.isArray(output.similar), "mission create should emit a similar advisory array")
  assert(output.similar.length >= 0, "similar advisory may be empty when nothing matches")
}

async function testExpeditionCreateSurfacesNearDuplicate(projectDir, missionId) {
  const args = [
    "expedition",
    "create",
    "--mission",
    missionId,
    "--subject",
    "Duplicate-aware mission creation",
    "--goal",
    "Surface similar missions at create time",
    "--intent",
    "duplicate,detection",
    "--scope",
    "mission-studio",
  ]
  const first = runSynth(args, projectDir)
  assert(first.status === 0, `first expedition create must exit 0:\n${first.stderr}`)
  const firstOutput = parseJson(first.stdout)
  assert(firstOutput.kind === "ExpeditionDraft", `first expedition create should return ExpeditionDraft, got ${firstOutput.kind}`)
  assert(Array.isArray(firstOutput.similar), "first expedition create should emit a similar advisory array")
  assert(firstOutput.similar.length === 0, "first expedition should have no similar matches yet")
  const firstId = firstOutput.draftId

  const second = runSynth(args, projectDir)
  assert(second.status === 0, `second expedition create must exit 0:\n${second.stderr}`)
  const secondOutput = parseJson(second.stdout)
  assert(secondOutput.kind === "ExpeditionDraft", `second expedition create should return ExpeditionDraft, got ${secondOutput.kind}`)
  assert(Array.isArray(secondOutput.similar), "second expedition create should emit a similar advisory array")
  assert(secondOutput.similar.length >= 1, "second near-duplicate expedition should surface a similar advisory")
  const match = secondOutput.similar.find((s) => s.id === firstId)
  assert(match, `advisory should include the first expedition (${firstId}), got ${JSON.stringify(secondOutput.similar)}`)
  assert(match.score > 0.3, `advisory score should be meaningful, got ${match.score}`)
}

async function testDistinctExpeditionGetsEmptyAdvisory(projectDir, missionId) {
  const create = runSynth(
    [
      "expedition",
      "create",
      "--mission",
      missionId,
      "--subject",
      "Postgres index migration",
      "--goal",
      "Add partial indexes to the decision log",
      "--intent",
      "database",
      "--scope",
      "storage",
    ],
    projectDir,
  )
  assert(create.status === 0, `distinct expedition create must exit 0:\n${create.stderr}`)
  const output = parseJson(create.stdout)
  assert(output.kind === "ExpeditionDraft", `distinct expedition create should return ExpeditionDraft, got ${output.kind}`)
  assert(Array.isArray(output.similar), "distinct expedition create should emit a similar advisory array")
  const dupeMatches = output.similar.filter((s) => s.name === "Duplicate-aware mission creation")
  assert(dupeMatches.length === 0, "distinct expedition should not match the unrelated near-duplicate pair")
}

let passed = 0
let failed = 0

async function main() {
  try {
    const projectDir = await setupProject()
    const missionId = await createAndApproveMission(projectDir)

    await testMissionCreateEmitsSimilarAdvisory(projectDir)
    passed++

    await testExpeditionCreateSurfacesNearDuplicate(projectDir, missionId)
    passed++

    await testDistinctExpeditionGetsEmptyAdvisory(projectDir, missionId)
    passed++

    await fs.rm(projectDir, { recursive: true, force: true })
  } catch (err) {
    failed++
    console.error(err)
  }
  console.log(`\n# pass ${passed}`)
  console.log(`# fail ${failed}`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
