// ============================================================
// Agent Guide CLI Tests
// ============================================================
// Verifies synth explain agents produces a structured,
// machine-readable guide for AI agents.
// ============================================================

import { spawnSync } from "child_process"
import path from "path"
import { runSynth, CLI_PATH } from "./helpers/cli-harness.js"
import { assert, findJsonObject } from "./helpers/assert.js"

async function testAgentGuideJson() {
  const { stdout, status, stderr } = runSynth(["explain", "agents"])
  assert(status === 0, `explain agents should exit 0: ${stderr}`)

  const output = findJsonObject(stdout)
  assert(output.status === "ok", `expected status ok, got ${output.status}`)
  assert(output.kind === "AgentGuide", `expected kind AgentGuide, got ${output.kind}`)
  assert(output.schema === "synth-agent-guide-v1", `unexpected schema: ${output.schema}`)
  assert(typeof output.projectName === "string" && output.projectName.length > 0, "projectName should be present")
  assert(output.publicVocabulary && typeof output.publicVocabulary.Mission === "string", "publicVocabulary should include Mission")
  assert(Array.isArray(output.agentContract.hardConstraints) && output.agentContract.hardConstraints.length > 0, "hardConstraints should be present")
  assert(Array.isArray(output.commandReference) && output.commandReference.length > 0, "commandReference should be present")
  assert(output.lifecycle && Array.isArray(output.lifecycle.expedition), "expedition lifecycle should be present")
  console.log("[PASS] explain agents returns structured AgentGuide JSON")
}

async function testAgentGuideState() {
  const { stdout, status, stderr } = runSynth(["explain", "agents", "--state"])
  assert(status === 0, `explain agents --state should exit 0: ${stderr}`)

  const output = findJsonObject(stdout)
  assert(output.kind === "AgentGuide", `expected kind AgentGuide, got ${output.kind}`)
  assert(output.currentState, "currentState should be present with --state")
  assert(Array.isArray(output.currentState.missions), "currentState.missions should be an array")
  assert(Array.isArray(output.currentState.expeditions), "currentState.expeditions should be an array")
  console.log("[PASS] explain agents --state includes current missions and expeditions")
}

async function testAgentGuideMarkdown() {
  const { stdout, status, stderr } = runSynth(["explain", "agents", "--markdown"])
  assert(status === 0, `explain agents --markdown should exit 0: ${stderr}`)

  assert(stdout.includes("# SYNTH Agent Guide"), "markdown output should include title")
  assert(stdout.includes("## Public Vocabulary"), "markdown output should include public vocabulary section")
  assert(stdout.includes("## Agent Contract"), "markdown output should include agent contract section")
  assert(stdout.includes("## Command Reference"), "markdown output should include command reference section")
  console.log("[PASS] explain agents --markdown returns markdown guide")
}

async function main() {
  await testAgentGuideJson()
  await testAgentGuideState()
  await testAgentGuideMarkdown()
  console.log("\n[AGENT GUIDE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
