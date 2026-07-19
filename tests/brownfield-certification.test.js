// ============================================================
// SYNTH Brownfield Certification Test Suite
// ============================================================
// Exercises the canonical brownfield onboarding workflow on a clean
// temporary repository, verifying mutation guarantees, the Agent Context
// Contract, source history classification, and the bootstrap proposals.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const PROJECT_ROOT = process.cwd()
const CLI_PATH = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")

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

async function getDirectoryMtime(dir) {
  const stats = await fs.stat(dir)
  return stats.mtimeMs
}

async function setupTempRepo() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-brownfield-cert-"))
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "brownfield-cert", version: "1.0.0" }, null, 2),
    "utf-8",
  )
  await fs.writeFile(path.join(tmpDir, "README.md"), "# Brownfield Certification Test\n", "utf-8")
  await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "src", "index.js"), "console.log('hello')\n", "utf-8")
  return tmpDir
}

async function testDiscoverDoesNotMutate(repoDir) {
  const beforeMtime = await getDirectoryMtime(repoDir)
  const result = runSynth(["discover", repoDir], PROJECT_ROOT)
  assert(result.status === 0, `synth discover must exit 0:\n${result.stderr}`)
  const afterMtime = await getDirectoryMtime(repoDir)
  assert(beforeMtime === afterMtime, `discover must not mutate the repository (mtime changed)`)
  const output = parseJson(result.stdout)
  assert(output.kind === "DiscoveryResult", `discover should return DiscoveryResult, got ${output.kind}`)
  assert(output.sourceHistory, "discover should report sourceHistory classification")
  console.log("[PASS] synth discover does not mutate the repository")
}

async function testBootstrapDryRunDoesNotMutate(repoDir) {
  const beforeMtime = await getDirectoryMtime(repoDir)
  const result = runSynth(["bootstrap", repoDir, "--dry-run"], PROJECT_ROOT)
  assert(result.status === 0, `synth bootstrap --dry-run must exit 0:\n${result.stderr}`)
  const afterMtime = await getDirectoryMtime(repoDir)
  assert(beforeMtime === afterMtime, `bootstrap --dry-run must not mutate the repository (mtime changed)`)
  const output = parseJson(result.stdout)
  assert(output.status === "pending-approval", `bootstrap --dry-run should return pending-approval, got ${output.status}`)
  assert(output.sourceHistory, "bootstrap --dry-run should report sourceHistory")
  assert(output.agentContext, "bootstrap --dry-run should include agentContext")
  console.log("[PASS] synth bootstrap --dry-run does not mutate the repository")
}

async function testBootstrapApproveCreatesContext(repoDir) {
  const result = runSynth(["bootstrap", repoDir, "--approve"], PROJECT_ROOT)
  assert(result.status === 0, `synth bootstrap --approve must exit 0:\n${result.stderr}`)
  const contextPath = path.join(repoDir, ".synth", "context.json")
  let context
  try {
    context = JSON.parse(await fs.readFile(contextPath, "utf-8"))
  } catch {
    throw new Error(`Agent Context Contract not found at ${contextPath}`)
  }
  assert(context.schema === "synth-agent-context-v1", `context.json schema should be synth-agent-context-v1, got ${context.schema}`)
  assert(context.repositoryType, "context.json should include repositoryType")
  assert(context.phase, "context.json should include phase")
  assert(["complete", "partial", "missing"].includes(context.implementationState), "context.json should include valid implementationState")
  assert(context.intent, "context.json should include intent")
  assert(["AVAILABLE", "MISSING", "EXTERNAL", "UNKNOWN"].includes(context.sourceHistory), "context.json should include valid sourceHistory")
  assert(context.derivedFrom.discoverySessionId, "context.json should include derivedFrom.discoverySessionId")
  assert(context.derivedFrom.discoverySessionHash, "context.json should include derivedFrom.discoverySessionHash")
  console.log("[PASS] synth bootstrap --approve creates a valid .synth/context.json")
}

async function testFirstMissionAndExpeditionProposals(repoDir) {
  const result = runSynth(["bootstrap", repoDir, "--dry-run"], PROJECT_ROOT)
  assert(result.status === 0, `bootstrap --dry-run must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.proposals.missionSubject.includes("deterministic governance baseline"), `first mission subject should mention deterministic governance baseline, got ${output.proposals.missionSubject}`)
  assert(output.proposals.firstExpeditionSubject.includes("Brownfield Baseline Discovery"), `first expedition subject should mention Brownfield Baseline Discovery, got ${output.proposals.firstExpeditionSubject}`)
  console.log("[PASS] First Mission and Expedition proposals match the specification")
}

async function testGovernPasses(repoDir) {
  const packagePath = path.join(repoDir, "package.json")
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  packageJson.scripts = { ...(packageJson.scripts || {}), govern: "node --version" }
  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), "utf-8")

  const result = runSynth(["bootstrap", repoDir, "--approve"], PROJECT_ROOT)
  assert(result.status === 0, `synth bootstrap --approve with govern script must exit 0:\n${result.stderr}`)
  const output = parseJson(result.stdout)
  assert(output.applied.govern === true, "bootstrap --approve should report govern as applied")
  console.log("[PASS] npm run govern equivalent passes after bootstrap initialization")
}

async function testMutatingCommandRejectedDuringDiscovery(repoDir) {
  const result = runSynth(["--discovery-mode", "docs", "generate"], repoDir)
  assert(result.status !== 0, "mutating command should be rejected during discovery")
  const output = parseJson(result.stdout)
  assert(output.status === "error", "rejection should report error status")
  assert(output.error.includes("MUTATING"), "rejection error should include MUTATING")
  assert(output.error.includes("cannot run during Discovery"), "rejection error should mention Discovery")
  console.log("[PASS] Mutating command is rejected during discovery")
}

async function testNamespaceHelpRouting() {
  const namespaces = ["bootstrap", "discover", "mission", "expedition", "doctor", "adapter"]
  for (const namespace of namespaces) {
    const result = runSynth([namespace, "--help"], PROJECT_ROOT)
    assert(result.status === 0, `synth ${namespace} --help must exit 0`)
    const output = parseJson(result.stdout)
    assert(output.status === "ok", `synth ${namespace} --help should return ok`)
    assert(output.namespace === namespace, `help should be for namespace ${namespace}, got ${output.namespace}`)
    assert(Array.isArray(output.subcommands), `synth ${namespace} --help should list subcommands`)
  }
  console.log("[PASS] Every command namespace provides its own --help")
}

async function testBaselineArtifactDeterminism(repoDir) {
  const firstResult = runSynth(["discover", repoDir, "--export"], PROJECT_ROOT)
  assert(firstResult.status === 0, `synth discover --export must exit 0:\n${firstResult.stderr}`)
  const firstOutput = parseJson(firstResult.stdout)
  assert(firstOutput.kind === "DiscoveryResult", `discover --export should return DiscoveryResult, got ${firstOutput.kind}`)
  assert(firstOutput.exported === true, `discover --export should report exported`)

  const discoveryDir = path.join(repoDir, ".synth", "discovery")
  const baselineFiles = (await fs.readdir(discoveryDir)).filter((f) => f.startsWith("baseline-") && f.endsWith(".json"))
  assert(baselineFiles.length > 0, "discover --export should produce at least one baseline file")

  const firstBaselinePath = path.join(discoveryDir, baselineFiles[baselineFiles.length - 1])
  const firstBaseline = JSON.parse(await fs.readFile(firstBaselinePath, "utf-8"))
  assert(firstBaseline.schema === "synth-discovery-baseline-v1", `baseline schema should be synth-discovery-baseline-v1, got ${firstBaseline.schema}`)
  assert(firstBaseline.signature, "baseline should include signature")
  assert(firstBaseline.discoverySessionHash, "baseline should include discoverySessionHash")

  // Remove the baseline and re-export to verify deterministic signature.
  await fs.rm(firstBaselinePath)
  const secondResult = runSynth(["discover", repoDir, "--export"], PROJECT_ROOT)
  assert(secondResult.status === 0, `second synth discover --export must exit 0:\n${secondResult.stderr}`)

  const secondBaselineFiles = (await fs.readdir(discoveryDir)).filter((f) => f.startsWith("baseline-") && f.endsWith(".json"))
  const secondBaselinePath = path.join(discoveryDir, secondBaselineFiles[secondBaselineFiles.length - 1])
  const secondBaseline = JSON.parse(await fs.readFile(secondBaselinePath, "utf-8"))

  assert(secondBaseline.signature === firstBaseline.signature, "baseline signature must be deterministic across exports")
  assert(secondBaseline.discoverySessionHash === firstBaseline.discoverySessionHash, "discoverySessionHash must be deterministic across exports")

  console.log("[PASS] Brownfield baseline artifact is deterministic")
}

async function main() {
  console.log("Running brownfield certification tests...")
  const repoDir = await setupTempRepo()
  try {
    await testDiscoverDoesNotMutate(repoDir)
    await testBootstrapDryRunDoesNotMutate(repoDir)
    await testBootstrapApproveCreatesContext(repoDir)
    await testFirstMissionAndExpeditionProposals(repoDir)
    await testGovernPasses(repoDir)
    await testMutatingCommandRejectedDuringDiscovery(repoDir)
    await testNamespaceHelpRouting()
    await testBaselineArtifactDeterminism(repoDir)
    console.log("\nAll brownfield certification tests passed.")
  } finally {
    await fs.rm(repoDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
