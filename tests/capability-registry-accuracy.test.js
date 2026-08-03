// ============================================================
// EXP-CAPTRANS-003 — Capability Registry Accuracy
// ============================================================
// Verifies that command-surface capabilities implemented in the CLI
// (documentation generation, event-log query) are reported as available
// by `synth capabilities`, and guards against future drift.
// ============================================================

import { runSynth, parseJson } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testDocumentationGenerationAvailable() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const docs = output.capabilities.find((c) => c.id === "documentation-generation")
  assert(docs, "documentation-generation capability should be listed")
  assert(docs.status === "available", `documentation-generation should be available, got ${docs.status}`)
  assert(docs.commands.includes("synth docs generate"), "documentation-generation should list docs generate command")
  console.log("[PASS] documentation-generation is reported as available")
}

async function testEventLogQueryAvailable() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const logQuery = output.capabilities.find((c) => c.id === "event-log-query")
  assert(logQuery, "event-log-query capability should be listed")
  assert(logQuery.status === "available", `event-log-query should be available, got ${logQuery.status}`)
  assert(logQuery.commands.includes("synth log --expedition <id>"), "event-log-query should list log command")
  console.log("[PASS] event-log-query is reported as available")
}

async function testNoFalsePositivesForMissingCommands() {
  // This test guards against the case where a capability is marked available
  // but its required command surface is not actually wired in the dispatcher.
  // We verify that every available capability either has a runtime backing or
  // lists commands that exist in the CLI help surface.
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)

  const { stdout: helpStdout, status: helpStatus } = runSynth(["--help"])
  assert(helpStatus === 0, "--help should exit 0")
  const helpOutput = parseJson(helpStdout)
  const topLevelCommands = new Set(helpOutput.commands.map((c) => c.name))

  for (const cap of output.capabilities) {
    if (cap.status !== "available") continue
    if (cap.runtimeCapability || cap.provider) continue

    // Command-surface capabilities must reference a top-level namespace that
    // appears in generic help.
    for (const cmd of cap.commands) {
      const namespace = cmd.replace(/^synth /, "").split(" ")[0]
      assert(topLevelCommands.has(namespace), `available capability ${cap.id} references unknown namespace ${namespace}`)
    }
  }
  console.log("[PASS] available command-surface capabilities reference implemented namespaces")
}

async function testUnavailableCapabilityHasReason() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const unavailable = output.capabilities.filter((c) => c.status === "unavailable")
  for (const cap of unavailable) {
    assert(typeof cap.reason === "string" && cap.reason.length > 0, `unavailable capability ${cap.id} should have a reason`)
  }
  console.log("[PASS] unavailable capabilities include reasons")
}

async function main() {
  await testDocumentationGenerationAvailable()
  await testEventLogQueryAvailable()
  await testNoFalsePositivesForMissingCommands()
  await testUnavailableCapabilityHasReason()
  console.log("\n[CAPABILITY REGISTRY ACCURACY] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
