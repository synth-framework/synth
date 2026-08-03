// ============================================================
// EXP-CAPTRANS-001 — Capability Transparency CLI
// ============================================================
// Verifies that `synth capabilities` reports installed capabilities,
// registered adapters, and known missing capabilities.
// ============================================================

import { runSynth, parseJson, withTempDir, writeManifest } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testCapabilitiesCommandExists() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities command should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", `capabilities status should be ok, got ${output.status}`)
  assert(output.kind === "CapabilityReport", `kind should be CapabilityReport, got ${output.kind}`)
  assert(Array.isArray(output.capabilities), "capabilities should be an array")
  assert(Array.isArray(output.adapters), "adapters should be an array")
  console.log("[PASS] synth capabilities returns CapabilityReport")
}

async function testConvergenceCertificationAvailable() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities command should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const convergence = output.capabilities.find((c) => c.id === "convergence-certification")
  assert(convergence, "convergence-certification capability should be listed")
  assert(convergence.status === "available", `convergence-certification should be available, got ${convergence.status}`)
  assert(convergence.runtimeCapability === "CertifyConvergence", "convergence-certification should reference CertifyConvergence")
  assert(convergence.commands.includes("synth expedition certify"), "convergence-certification should list certify command")
  console.log("[PASS] convergence-certification is reported as available")
}

async function testRepositoryAdapterAvailable() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities command should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const repositoryAdapter = output.capabilities.find((c) => c.id === "repository-adapter")
  assert(repositoryAdapter, "repository-adapter capability should be listed")
  assert(repositoryAdapter.status === "available", `repository-adapter should be available, got ${repositoryAdapter.status}`)
  assert(repositoryAdapter.provider === "repository", "repository-adapter should report provider")
  assert(output.adapters.includes("repository"), "adapters list should include repository")
  console.log("[PASS] repository-adapter is reported as available")
}

async function testUnavailableCapabilitiesHaveReasons() {
  const { stdout, status } = runSynth(["capabilities"])
  assert(status === 0, `capabilities command should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  const unavailable = output.capabilities.filter((c) => c.status === "unavailable")
  for (const cap of unavailable) {
    assert(typeof cap.reason === "string" && cap.reason.length > 0, `unavailable capability ${cap.id} should have a reason`)
  }
  console.log(`[PASS] ${unavailable.length} unavailable capabilities all have reasons`)
}

async function testCapabilitiesHelp() {
  const { stdout, status } = runSynth(["capabilities", "--help"])
  assert(status === 0, `capabilities --help should exit 0, got ${status}\n${stdout}`)
  const output = parseJson(stdout)
  assert(output.status === "ok", "help status should be ok")
  assert(output.namespace === "capabilities", "help namespace should be capabilities")
  assert(Array.isArray(output.subcommands), "help should list subcommands")
  console.log("[PASS] synth capabilities --help returns namespace help")
}

async function testCapabilitiesInGenericHelp() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "--help should exit 0")
  const output = parseJson(stdout)
  assert(Array.isArray(output.commands), "help should list commands")
  assert(output.commands.some((c) => c.name === "capabilities"), "generic help should include capabilities command")
  console.log("[PASS] synth --help includes capabilities command")
}

async function testCapabilitiesReadOnlyInDiscoveryMode() {
  await withTempDir("synth-capabilities-discovery-", async (tmpDir) => {
    await writeManifest(tmpDir, "Discovery Test Project")
    const { stdout, status } = runSynth(["capabilities", "--discovery-mode"], tmpDir)
    assert(status === 0, `capabilities should be allowed in discovery mode, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.status === "ok", "capabilities in discovery mode should return ok")
  })
  console.log("[PASS] synth capabilities is discovery-safe")
}

async function main() {
  await testCapabilitiesCommandExists()
  await testConvergenceCertificationAvailable()
  await testRepositoryAdapterAvailable()
  await testUnavailableCapabilitiesHaveReasons()
  await testCapabilitiesHelp()
  await testCapabilitiesInGenericHelp()
  await testCapabilitiesReadOnlyInDiscoveryMode()
  console.log("\n[CAPABILITY TRANSPARENCY CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
