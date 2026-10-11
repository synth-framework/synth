import { setupGitBackedProject } from "./helpers/mission-lifecycle.js"
// ============================================================
// EXP-REUSE-001 — Alignment Contract Reuse and Expedition Templates
// ============================================================
// Verifies that:
//   - mission approve without --alignment-contract-id lists approved
//     contracts available for reuse
//   - expedition create accepts --template and pre-fills goal/scope
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { strict as assert } from "assert"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"

process.env.SYNTH_STRICT_CONTEXT = "1"



function assertOk(result, message) {
  if (result.status !== 0) {
    throw new Error(`${message}: ${result.stderr || result.stdout}`)
  }
}

async function setupProject() {
  return setupGitBackedProject("synth-reuse-templates-")
}

async function makeApiContext(projectDir) {
  return bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(projectDir, ".synth", "data", "event-log.jsonl"),
      statePath: path.join(projectDir, ".synth", "data", "canonical-state.json"),
      checkpointPath: path.join(projectDir, ".synth", "data", "checkpoint.json"),
    },
  })
}

async function main() {
  console.log("Running alignment contract reuse and expedition template tests...")
  const projectDir = await setupProject()
  try {
    // 1. Prepare and approve an alignment contract via CLI.
    const prepareResult = parseJson(runSynth(["alignment", "prepare"], projectDir).stdout)
    assert.equal(prepareResult.status, "ok", "alignment prepare must succeed")
    const contractId = prepareResult.contractId
    assert.ok(typeof contractId === "string" && contractId.length > 0, "contractId must be a non-empty string")

    const approveResult = runSynth(["alignment", "approve", "--contract-id", contractId], projectDir)
    assertOk(approveResult, "alignment approve must exit 0")

    // 2. Create a mission draft via CLI.
    const missionCreateResult = parseJson(runSynth(["mission", "create", "--subject", "Reuse Test Mission", "--purpose", "Test contract reuse"], projectDir).stdout)
    assert.equal(missionCreateResult.status, "ok", "mission create must succeed")
    const draftId = missionCreateResult.draftId

    // 3. mission approve without --alignment-contract-id should list the approved contract.
    const missingContractResult = runSynth(["mission", "approve", "--draft-id", draftId], projectDir)
    assert.notEqual(missingContractResult.status, 0, "mission approve must fail without contract id")
    const missingContractJson = parseJson(missingContractResult.stdout)
    assert.equal(missingContractJson.code, "MissingAlignmentContractId", "error code should be MissingAlignmentContractId")
    assert.ok(missingContractJson.suggestion.includes(contractId), "suggestion should include approved contract id")
    assert.ok(missingContractJson.suggestion.includes("Approved alignment contracts available for reuse"), "suggestion should mention reuse")

    // 4. Create and approve a runtime mission via API so the CLI can reference it for expedition creation.
    //    Mission Studio confidence gating makes pure-CLI mission approval fragile in tests.
    const ctx = await makeApiContext(projectDir)
    const missionId = "M-REUSE-TEMPLATE"
    let result = await ctx.api.handleIntent({
      actor: "test",
      capability: "CreateMission",
      payload: { id: missionId, name: "Reuse Test Mission", purpose: "Test contract reuse" },
    })
    assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)

    const { contractId: apiContractId } = await createAlignedContract(ctx)
    result = await ctx.api.handleIntent({
      actor: "test",
      capability: "ApproveMission",
      payload: { id: missionId, alignmentContractId: apiContractId },
    })
    assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)

    // 5. Create an expedition from the CI template.
    const expeditionResult = parseJson(runSynth(["expedition", "create", "--mission", missionId, "--template", "ci"], projectDir).stdout)
    assert.equal(expeditionResult.status, "ok", "expedition create with template must succeed")
    assert.equal(expeditionResult.expeditionSubject, "Continuous Integration", "template should set default subject")
    assert.ok(typeof expeditionResult.goal === "string" && expeditionResult.goal.length > 0, "template should set goal")

    // 6. Unknown template should fail with helpful suggestion.
    const unknownTemplateResult = runSynth(["expedition", "create", "--mission", missionId, "--template", "nonexistent"], projectDir)
    assert.notEqual(unknownTemplateResult.status, 0, "unknown template must fail")
    const unknownTemplateJson = parseJson(unknownTemplateResult.stdout)
    assert.equal(unknownTemplateJson.code, "UnknownExpeditionTemplate", "error code should be UnknownExpeditionTemplate")
    assert.ok(unknownTemplateJson.suggestion.includes("ci"), "suggestion should list available templates")

    console.log("[PASS] alignment contract reuse suggestion lists approved contracts")
    console.log("[PASS] expedition create applies template defaults")
    console.log("[PASS] unknown template fails with available template list")
    console.log("\nAll reuse and template tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
