import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// EXP-DUP-001 — CLI duplicate-advisory regression test
// ============================================================
// Verifies that `synth mission create` and `synth expedition create`
// emit a `similar` advisory array in their JSON response, populated by
// the deterministic duplicate detector when existing entities overlap
// with the candidate's scope/intent.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { bootstrapProject, createAndApproveMission } from "./helpers/mission-lifecycle.js"

async function setupProject() {
  const tmpDir = await makeTempDir("synth-cli-duplicate-")
  return await bootstrapProject(tmpDir)
}

async function createAndApproveMissionLocal(projectDir) {
  return await createAndApproveMission(projectDir, {
    subject: "Test Mission",
    purpose: "Test purpose",
  })
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
    const missionId = await createAndApproveMissionLocal(projectDir)

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
