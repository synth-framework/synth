// ============================================================
// CLI: mission-scoped expedition listing & ranking
// ============================================================
// Verifies `synth expedition list --mission <id>` filters to a single
// mission and `--ranked` orders the mission's open expeditions by the
// canonical weighted score (executing above committed), excluding
// completed expeditions.
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
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-mission-rank-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  assert(bootstrapResult.status === 0, `bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  return tmpDir
}

async function createAndApproveMission(projectDir) {
  const createResult = runSynth(
    ["mission", "create", "--subject", "Ranking Mission", "--purpose", "Host expeditions for ranking"],
    projectDir,
  )
  assert(createResult.status === 0, `mission create must exit 0:\n${createResult.stderr}`)
  let draftId = parseJson(createResult.stdout).draftId

  const evidenceResult = runSynth(
    [
      "mission", "evidence", "add",
      "--draft-id", draftId,
      "--subject", "Supporting evidence",
      "--purpose", "Raises confidence above approval threshold",
      "--confidence", "certain",
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
  const missionId = parseJson(approveResult.stdout).runtime?.missionId
  assert(missionId, "mission approve should return a runtime missionId")
  return missionId
}

// Create an expedition and advance it to a target lifecycle status.
function createExpeditionAtStatus(projectDir, missionId, subject, targetStatus) {
  const create = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", subject, "--goal", `Goal for ${subject}`],
    projectDir,
  )
  assert(create.status === 0, `expedition create must exit 0:\n${create.stderr}`)
  const draftId = parseJson(create.stdout).draftId

  const approve = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert(approve.status === 0, `expedition approve must exit 0:\n${approve.stderr}`)
  if (targetStatus === "approved") return draftId

  const commit = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert(commit.status === 0, `expedition commit must exit 0:\n${commit.stderr}`)
  if (targetStatus === "committed") return draftId

  const start = runSynth(["expedition", "start", "--id", draftId, "--no-auto-commit"], projectDir)
  assert(start.status === 0, `expedition start must exit 0:\n${start.stderr}`)
  return draftId
}

async function main() {
  console.log("\n=== CLI Mission-Scoped Expedition Ranking Tests ===\n")
  const projectDir = await setupProject()
  try {
    const missionId = await createAndApproveMission(projectDir)

    const executingId = createExpeditionAtStatus(projectDir, missionId, "Executing work", "executing")
    const committedId = createExpeditionAtStatus(projectDir, missionId, "Committed work", "committed")

    // --mission filter returns only this mission's expeditions.
    const listed = parseJson(runSynth(["expedition", "list", "--mission", missionId], projectDir).stdout)
    assert(listed.kind === "ExpeditionList", `expected ExpeditionList, got ${listed.kind}`)
    assert(listed.missionId === missionId, "list must echo the missionId filter")
    const listedIds = listed.expeditions.map((e) => e.id)
    assert(listedIds.includes(executingId), "mission list must include the executing expedition")
    assert(listedIds.includes(committedId), "mission list must include the committed expedition")
    console.log("  [PASS] expedition list --mission filters to the mission's expeditions")

    // --ranked orders executing above committed.
    const ranked = parseJson(runSynth(["expedition", "list", "--mission", missionId, "--ranked"], projectDir).stdout)
    assert(ranked.kind === "ExpeditionRank", `expected ExpeditionRank, got ${ranked.kind}`)
    assert(ranked.missionId === missionId, "ranked list must echo the missionId filter")
    const rankedIds = ranked.expeditions.map((e) => e.id)
    const execIdx = rankedIds.indexOf(executingId)
    const commitIdx = rankedIds.indexOf(committedId)
    assert(execIdx !== -1 && commitIdx !== -1, "ranked list must include both open expeditions")
    assert(execIdx < commitIdx, "executing expedition must rank above committed expedition")
    assert(ranked.next === rankedIds[0], "ranked list must expose the top-ranked expedition as next")
    assert(
      ranked.expeditions[execIdx].score > ranked.expeditions[commitIdx].score,
      "executing expedition must score higher than committed",
    )
    console.log("  [PASS] expedition list --mission --ranked orders open work by score")

    console.log("\n=== All CLI mission-scoped ranking tests passed ===\n")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

await main()
