// ============================================================
// EXP-CLI-005 — Governance Entity Show Commands
// ============================================================
// Verifies `synth program show <id>` and `synth expedition show <id>`
// return structured entity metadata with upstream/downstream context.
// ============================================================

import { runSynth, parseJson } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testProgramShowExisting() {
  const { stdout, status } = runSynth(["program", "show", "--id", "EXP-PROGRAM-044"])
  assert(status === 0, `program show should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", `status should be ok, got ${output.status}`)
  assert(output.kind === "ProgramShow", `kind should be ProgramShow, got ${output.kind}`)
  assert(output.program.id === "EXP-PROGRAM-044", `program id should match, got ${output.program.id}`)
  assert(output.program.name === "Operational Readiness & Self-Hosting", `program name should match, got ${output.program.name}`)
  assert(Array.isArray(output.expeditions), "expeditions should be an array")
  assert(output.expeditions.some((e) => e.id === "EXP-CAPTRANS-003"), "program should include EXP-CAPTRANS-003")
  assert(output.expeditions.some((e) => e.id === "EXP-CLI-005"), "program should include EXP-CLI-005")
  console.log("[PASS] synth program show returns ProgramShow with expeditions")
}

async function testProgramShowMissing() {
  const { stdout, status } = runSynth(["program", "show", "--id", "EXP-PROGRAM-99999"])
  assert(status !== 0, "program show for missing id should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.kind === "ProgramNotFound", `error kind should be ProgramNotFound, got ${output.kind}`)
  console.log("[PASS] synth program show returns ProgramNotFound for missing id")
}

async function testProgramShowMissingId() {
  const { stdout, status } = runSynth(["program", "show"])
  assert(status !== 0, "program show without --id should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.kind === "MissingProgramId", `error kind should be MissingProgramId, got ${output.kind}`)
  console.log("[PASS] synth program show returns MissingProgramId without --id")
}

async function testProgramShowHuman() {
  const { stdout, status } = runSynth(["program", "show", "--id", "EXP-PROGRAM-044", "--human"])
  assert(status === 0, `program show --human should exit 0, got ${status}\n${stdout}`)
  assert(stdout.includes("Program: EXP-PROGRAM-044"), "human output should include program header")
  assert(stdout.includes("Expeditions:"), "human output should include expeditions section")
  assert(stdout.includes("EXP-CAPTRANS-003"), "human output should include expedition id")
  // Human mode must not emit JSON on stdout.
  assert(!stdout.trim().startsWith("{"), "human output should not start with JSON")
  console.log("[PASS] synth program show --human returns prose")
}

async function testExpeditionShowExisting() {
  const { stdout, status } = runSynth(["expedition", "show", "--id", "EXP-CLI-005"])
  assert(status === 0, `expedition show should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", `status should be ok, got ${output.status}`)
  assert(output.kind === "ExpeditionShow", `kind should be ExpeditionShow, got ${output.kind}`)
  assert(output.expedition.id === "EXP-CLI-005", `expedition id should match, got ${output.expedition.id}`)
  assert(output.expedition.program === "EXP-PROGRAM-044", `expedition program should match, got ${output.expedition.program}`)
  assert(output.program.id === "EXP-PROGRAM-044", `program id should match, got ${output.program.id}`)
  assert(Array.isArray(output.upstream), "upstream should be an array")
  assert(Array.isArray(output.downstream), "downstream should be an array")
  console.log("[PASS] synth expedition show returns ExpeditionShow with context")
}

async function testExpeditionShowMissing() {
  const { stdout, status } = runSynth(["expedition", "show", "--id", "EXP-CLI-99999"])
  assert(status !== 0, "expedition show for missing id should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.kind === "ExpeditionNotFound", `error kind should be ExpeditionNotFound, got ${output.kind}`)
  console.log("[PASS] synth expedition show returns ExpeditionNotFound for missing id")
}

async function testExpeditionShowMissingId() {
  const { stdout, status } = runSynth(["expedition", "show"])
  assert(status !== 0, "expedition show without --id should exit non-zero")
  const output = parseJson(stdout)
  assert(output.status === "error", `status should be error, got ${output.status}`)
  assert(output.kind === "MissingExpeditionId", `error kind should be MissingExpeditionId, got ${output.kind}`)
  console.log("[PASS] synth expedition show returns MissingExpeditionId without --id")
}

async function testExpeditionShowHuman() {
  const { stdout, status } = runSynth(["expedition", "show", "--id", "EXP-CLI-005", "--human"])
  assert(status === 0, `expedition show --human should exit 0, got ${status}\n${stdout}`)
  assert(stdout.includes("Expedition: EXP-CLI-005"), "human output should include expedition header")
  assert(stdout.includes("Program: EXP-PROGRAM-044"), "human output should include program")
  assert(!stdout.trim().startsWith("{"), "human output should not start with JSON")
  console.log("[PASS] synth expedition show --human returns prose")
}

async function testProgramHelpIncludesShow() {
  const { stdout, status } = runSynth(["program", "--help"])
  assert(status === 0, "program --help should exit 0")
  const output = parseJson(stdout)
  assert(output.subcommands.some((s) => s.name.includes("program show")), "program help should list show subcommand")
  console.log("[PASS] synth program --help lists show subcommand")
}

async function testExpeditionHelpIncludesShow() {
  const { stdout, status } = runSynth(["expedition", "--help"])
  assert(status === 0, "expedition --help should exit 0")
  const output = parseJson(stdout)
  assert(output.subcommands.some((s) => s.name.includes("expedition show")), "expedition help should list show subcommand")
  console.log("[PASS] synth expedition --help lists show subcommand")
}

async function testShowCommandsAreDiscoverySafe() {
  const { stdout: programStdout, status: programStatus } = runSynth(["program", "show", "--id", "EXP-PROGRAM-044", "--discovery-mode"])
  assert(programStatus === 0, `program show should be discovery-safe, got ${programStatus}\n${programStdout}`)
  const programOutput = parseJson(programStdout)
  assert(programOutput.status === "ok", "program show in discovery mode should return ok")

  const { stdout: expeditionStdout, status: expeditionStatus } = runSynth(["expedition", "show", "--id", "EXP-CLI-005", "--discovery-mode"])
  assert(expeditionStatus === 0, `expedition show should be discovery-safe, got ${expeditionStatus}\n${expeditionStdout}`)
  const expeditionOutput = parseJson(expeditionStdout)
  assert(expeditionOutput.status === "ok", "expedition show in discovery mode should return ok")
  console.log("[PASS] show commands are discovery-safe")
}

async function main() {
  await testProgramShowExisting()
  await testProgramShowMissing()
  await testProgramShowMissingId()
  await testProgramShowHuman()
  await testExpeditionShowExisting()
  await testExpeditionShowMissing()
  await testExpeditionShowMissingId()
  await testExpeditionShowHuman()
  await testProgramHelpIncludesShow()
  await testExpeditionHelpIncludesShow()
  await testShowCommandsAreDiscoverySafe()
  console.log("\n[GOVERNANCE SHOW CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
