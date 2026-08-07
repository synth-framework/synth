// ============================================================
// EXP-CLI-006 — Mission List and Show Commands
// ============================================================
// Verifies `synth mission list` and `synth mission show --id`
// return structured, filterable views derived from runtime state.
// ============================================================

import { runSynth, parseJson } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testMissionList() {
  const { stdout, status } = runSynth(["mission", "list"])
  assert(status === 0, `mission list should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", `status should be ok, got ${output.status}`)
  assert(output.kind === "MissionList", `kind should be MissionList, got ${output.kind}`)
  assert(typeof output.count === "number", "count should be a number")
  assert(Array.isArray(output.missions), "missions should be an array")
  assert(output.missions.length > 0, "missions should not be empty")

  const mission = output.missions.find((m) => m.id === "74c3a70571facb87")
  assert(mission, "completed mission 74c3a70571facb87 should be listed")
  assert(mission.name === "Human-Readable Governance Reports", `name should match, got ${mission.name}`)
  assert(mission.status === "completed", `status should be completed, got ${mission.status}`)
  console.log("[PASS] synth mission list returns MissionList")
}

async function testMissionListFilterStatus() {
  const { stdout, status } = runSynth(["mission", "list", "--status", "active"])
  assert(status === 0, `mission list --status should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.missions.every((m) => m.status === "active"), "all missions should have status active")
  assert(output.missions.length > 0, "active missions should not be empty")
  console.log("[PASS] synth mission list --status filters correctly")
}

async function testMissionListFilterProgram() {
  const { stdout, status } = runSynth(["mission", "list", "--program", "EXP-PROGRAM-043"])
  assert(status === 0, `mission list --program should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", "status should be ok")
  assert(output.missions.every((m) => m.program?.id === "EXP-PROGRAM-043"), "all missions should belong to EXP-PROGRAM-043")
  assert(output.missions.length > 0, "filtered missions should not be empty")
  console.log("[PASS] synth mission list --program filters correctly")
}

async function testMissionShow() {
  const { stdout, status } = runSynth(["mission", "show", "--id", "74c3a70571facb87"])
  assert(status === 0, `mission show should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", `status should be ok, got ${output.status}`)
  assert(output.kind === "MissionShow", `kind should be MissionShow, got ${output.kind}`)
  assert(output.mission.id === "74c3a70571facb87", "mission id should match")
  assert(output.mission.name === "Human-Readable Governance Reports", `name should match, got ${output.mission.name}`)
  assert(Array.isArray(output.expeditions), "expeditions should be an array")
  console.log("[PASS] synth mission show returns MissionShow")
}

async function testMissionShowMissingId() {
  const { stdout, status } = runSynth(["mission", "show"])
  assert(status !== 0, "mission show without --id should fail")
  const output = parseJson(stdout)
  assert(output.status === "error", "status should be error")
  console.log("[PASS] synth mission show without --id errors")
}

async function testMissionHelp() {
  const { stdout, status } = runSynth(["mission", "--help"])
  assert(status === 0, "mission --help should exit 0")
  const output = parseJson(stdout)
  assert(output.namespace === "mission", "help namespace should be mission")
  assert(output.subcommands.some((s) => s.name.includes("mission list")), "mission help should list list subcommand")
  assert(output.subcommands.some((s) => s.name.includes("mission show")), "mission help should list show subcommand")
  console.log("[PASS] synth mission --help lists list and show subcommands")
}

async function main() {
  await testMissionList()
  await testMissionListFilterStatus()
  await testMissionListFilterProgram()
  await testMissionShow()
  await testMissionShowMissingId()
  await testMissionHelp()
  console.log("\n[GOVERNANCE MISSION CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
