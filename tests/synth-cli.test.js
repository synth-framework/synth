// ============================================================
// SYNTH CLI Tests
// ============================================================
// Verifies the AI-native operator CLI.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const PACKAGE_PATH = path.resolve(process.cwd(), "package.json")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
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
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testVersion() {
  const packageJson = JSON.parse(await fs.readFile(PACKAGE_PATH, "utf-8"))
  const expectedVersion = packageJson.version

  const { stdout, status } = runSynth(["--version"])
  assert(status === 0, "version command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "version status should be ok")
  assert(output.name === "synth", "version name should be synth")
  assert(output.version === expectedVersion, `version should be ${expectedVersion}, got ${output.version}`)
  assert(output.schema === "synth-cli-v1", "version schema should be synth-cli-v1")
  console.log("[PASS] synth --version returns structured version")
}

async function testHelp() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "help command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "help status should be ok")
  assert(Array.isArray(output.commands), "help should list commands")
  assert(output.commands.some((c) => c.name === "init"), "help should include init command")
  assert(output.commands.some((c) => c.name === "doctor"), "help should include doctor command")
  assert(output.commands.some((c) => c.name === "govern"), "help should include govern command")
  assert(output.commands.some((c) => c.name === "validate"), "help should include validate command")
  assert(Array.isArray(output.vocabulary), "help should list public vocabulary")
  assert(output.vocabulary.includes("Mission"), "vocabulary should include Mission")
  console.log("[PASS] synth --help returns commands and vocabulary")
}

async function testDoctor() {
  const { stdout, status } = runSynth(["doctor"])
  assert(status === 0, "doctor command should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok" || output.status === "warning", "doctor status should be ok or warning")
  assert(output.healthy !== undefined, "doctor should report healthy flag")
  assert(output.runtimeHealth && output.runtimeHealth.node, "doctor should include runtime node check")
  assert(output.runtimeHealth && output.runtimeHealth.version, "doctor should include runtime version check")
  assert(output.runtimeHealth && output.runtimeHealth.binary, "doctor should include runtime binary check")
  assert(output.runtimeHealth && output.runtimeHealth.distIntegrity, "doctor should include runtime distIntegrity check")
  assert(output.projectHealth && output.projectHealth.manifest, "doctor should include project manifest check")
  assert(output.projectHealth && output.projectHealth.replay, "doctor should include project replay check")
  assert(output.projectHealth && output.projectHealth.eventChain, "doctor should include project eventChain check")
  assert(output.projectHealth && output.projectHealth.discoveryBaseline, "doctor should include project discoveryBaseline check")
  console.log("[PASS] synth doctor reports Runtime Health and Project Health")
}

async function testValidateDryRun() {
  const { stdout, status } = runSynth(["validate", "--dry-run"])
  assert(status === 0, "validate --dry-run should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "validate status should be ok")
  assert(output.kind === "ValidationPlan", "validate --dry-run should return ValidationPlan")
  assert(Array.isArray(output.files), "validate should list files")
  assert(Array.isArray(output.affectedCapabilities), "validate should list affected capabilities")
  assert(Array.isArray(output.protectedAssets), "validate should list protected assets")
  assert(Array.isArray(output.run), "validate should list run scripts")
  assert(Array.isArray(output.skip), "validate should list skip scripts")
  assert(["low", "medium", "high"].includes(output.risk), "validate should report risk")
  assert(output.note && output.note.includes("Dry-run"), "validate --dry-run note should indicate dry run")
  console.log("[PASS] synth validate --dry-run returns ValidationPlan")
}

async function testValidateNoChanges() {
  const { stdout, status } = runSynth(["validate", "--diff", ""])
  assert(status === 0, "validate with empty diff should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "validate status should be ok")
  assert(output.kind === "ValidationPlan", "validate should return ValidationPlan")
  assert(Array.isArray(output.files) && output.files.length === 0, "empty diff should produce no files")
  assert(Array.isArray(output.run) && output.run.length === 0, "empty diff should produce no run scripts")
  assert(output.reason && output.reason.includes("No changed files"), "empty diff should explain no changes")
  console.log("[PASS] synth validate with empty diff returns empty plan")
}

async function testValidateFullDryRun() {
  const { stdout, status } = runSynth(["validate", "--full", "--dry-run"])
  assert(status === 0, "validate --full --dry-run should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "validate status should be ok")
  assert(output.kind === "ValidationPlan", "validate --full --dry-run should return ValidationPlan")
  assert(output.run.includes("govern"), "full plan should run govern")
  assert(output.protectedAssetsTouched === true, "full plan should flag protected assets touched")
  assert(output.risk === "high", "full plan should report high risk")
  assert(output.note && output.note.includes("Dry-run"), "validate --full --dry-run note should indicate dry run")
  console.log("[PASS] synth validate --full --dry-run returns full governance plan")
}

async function testInit() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-test-"))
  try {
    const { stdout, status } = runSynth(["init", "--name", "CLI Test Project"], tmpDir)
    assert(status === 0, "init command should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "init status should be ok")
    assert(output.projectName === "CLI Test Project", "init should use provided project name")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
    assert(manifest.schema === "synth-bootstrap-manifest-v1", "manifest schema should be v1")
    assert(manifest.projectName === "CLI Test Project", "manifest projectName should match")
    assert(Array.isArray(manifest.commands), "manifest should list commands")
    assert(Array.isArray(manifest.capabilities), "manifest should list capabilities")
    assert(Array.isArray(manifest.publicVocabulary), "manifest should list public vocabulary")
    assert(manifest.publicVocabulary.includes("Replay"), "vocabulary should include Replay")
    assert(manifest.layout && manifest.layout.data === ".synth/data/", `manifest layout.data should be .synth/data/, got ${manifest.layout?.data}`)
    console.log("[PASS] synth init creates a valid bootstrap manifest")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testAdapterDelegation() {
  const { stdout, status } = runSynth(["adapter", "list"])
  assert(status === 0, "adapter list should exit 0")
  assert(stdout.includes("repository"), "adapter list should include repository adapter")
  console.log("[PASS] synth adapter list delegates to adapter CLI")
}

function countJsonObjects(stdout) {
  const objects = []
  const lines = stdout.split("\n")
  let buffer = ""
  for (const line of lines) {
    buffer += line
    try {
      const obj = JSON.parse(buffer)
      objects.push(obj)
      buffer = ""
    } catch {
      // continue accumulating
    }
  }
  return objects.length
}

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-test-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testGovernDelegationDiagnostics() {
  await withTempDir(async (tmpDir) => {
    // Project without package.json should report missing-package-json.
    const { stdout, status } = runSynth(["validate", "--full", "--dry-run"], tmpDir)
    assert(status === 0, "validate --full --dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.govern && output.govern.delegated === false, "should not delegate without package.json")
    assert(output.govern.condition === "missing-package-json", `expected missing-package-json, got ${output.govern.condition}`)
  })

  await withTempDir(async (tmpDir) => {
    // Project with package.json but no govern script should report missing-govern-script.
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
    const { stdout, status } = runSynth(["validate", "--full", "--dry-run"], tmpDir)
    assert(status === 0, "validate --full --dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.govern && output.govern.delegated === false, "should not delegate without govern script")
    assert(output.govern.condition === "missing-govern-script", `expected missing-govern-script, got ${output.govern.condition}`)
  })

  await withTempDir(async (tmpDir) => {
    // Project with cyclic govern script should report cyclic-script.
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0", scripts: { govern: "synth govern" } }),
      "utf-8",
    )
    const { stdout, status } = runSynth(["validate", "--full", "--dry-run"], tmpDir)
    assert(status === 0, "validate --full --dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.govern && output.govern.delegated === false, "should not delegate with cyclic script")
    assert(output.govern.condition === "cyclic-script", `expected cyclic-script, got ${output.govern.condition}`)
  })

  console.log("[PASS] synth validate --full --dry-run reports accurate govern delegation conditions")
}

async function testSingleChannelStdout() {
  const commands = [
    ["--version"],
    ["--help"],
    ["doctor"],
    ["validate", "--dry-run"],
    ["validate", "--full", "--dry-run"],
  ]
  for (const args of commands) {
    const { stdout } = runSynth(args)
    const count = countJsonObjects(stdout)
    assert(count === 1, `command 'synth ${args.join(" ")}' should emit exactly one JSON object to stdout, got ${count}`)
  }
  console.log("[PASS] CLI commands emit exactly one JSON object to stdout")
}

async function testDoctorLayerSeparation() {
  const { stdout, status } = runSynth(["doctor"])
  assert(status === 0, "doctor command should exit 0")
  const output = parseJson(stdout)
  assert(output.runtimeHealth && output.runtimeHealth.distIntegrity, "doctor should include runtime distIntegrity check")
  assert(output.projectHealth && output.projectHealth.discoveryBaseline, "doctor should include project discoveryBaseline check")
  assert(output.nextSteps && Array.isArray(output.nextSteps), "doctor should provide nextSteps")
  console.log("[PASS] synth doctor separates Runtime Health and Project Health with remediation steps")
}

async function testDocsGenerateCapabilities() {
  await withTempDir(async (tmpDir) => {
    const docsDir = path.join(tmpDir, "docs")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(
      path.join(docsDir, "README.md"),
      "# Test Project\n\nA test project for documentation generation.",
      "utf-8",
    )
    const { stdout, status } = runSynth(["docs", "generate", "--out-dir", path.join(tmpDir, "docs", "generated")], tmpDir)
    assert(status === 0, "docs generate should exit 0")
    const output = parseJson(stdout)
    assert(Array.isArray(output.capabilities), "docs generate should list capabilities")
    assert(Array.isArray(output.produced), "docs generate should list produced files")
    assert(Array.isArray(output.skipped), "docs generate should list skipped capabilities")
    assert(output.capabilities.length > 0, "docs generate should have at least one capability")
    assert(output.produced.length > 0, "docs generate should produce at least one file")
  })
  console.log("[PASS] synth docs generate distinguishes capabilities, produced, and skipped")
}

async function testDiscoverExportContract() {
  await withTempDir(async (tmpDir) => {
    // Default discover should not write files.
    const { stdout, status } = runSynth(["discover", tmpDir], tmpDir)
    assert(status === 0, "discover should exit 0")
    const output = parseJson(stdout)
    assert(output.exported === false, "default discover should not export")
    const discoveryDir = path.join(tmpDir, ".synth", "discovery")
    let hasDiscoveryDir = false
    try {
      await fs.access(discoveryDir)
      hasDiscoveryDir = true
    } catch {
      hasDiscoveryDir = false
    }
    assert(!hasDiscoveryDir, "default discover should not create .synth/discovery/")
  })

  await withTempDir(async (tmpDir) => {
    // Export mode should write a baseline.
    const { stdout, status } = runSynth(["discover", tmpDir, "--export"], tmpDir)
    assert(status === 0, "discover --export should exit 0")
    const output = parseJson(stdout)
    assert(output.exported === true, "discover --export should report exported")
    assert(typeof output.baselinePath === "string", "discover --export should report baselinePath")
    const baseline = JSON.parse(await fs.readFile(output.baselinePath, "utf-8"))
    assert(baseline.schema === "synth-discovery-baseline-v1", "baseline should use correct schema")
    assert(typeof baseline.signature === "string" && baseline.signature.length > 0, "baseline should be signed")
  })

  console.log("[PASS] synth discover respects read-only contract and --export writes a signed baseline")
}

async function testNoShellDeprecationWarning() {
  await withTempDir(async (tmpDir) => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0", scripts: { govern: "node -e 'console.log(\"ok\")'" } }),
      "utf-8",
    )
    const { stderr, status } = runSynth(["govern"], tmpDir)
    assert(status === 0, "govern should exit 0 for a valid script")
    assert(!stderr.includes("shell"), `stderr should not contain shell deprecation warning: ${stderr}`)
    assert(!stderr.includes("deprecat"), `stderr should not contain deprecation warning: ${stderr}`)
  })
  console.log("[PASS] synth govern does not emit shell deprecation warnings")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testVersion()
  await testHelp()
  await testDoctor()
  await testValidateDryRun()
  await testValidateNoChanges()
  await testValidateFullDryRun()
  await testInit()
  await testAdapterDelegation()
  await testGovernDelegationDiagnostics()
  await testSingleChannelStdout()
  await testDoctorLayerSeparation()
  await testDocsGenerateCapabilities()
  await testDiscoverExportContract()
  await testNoShellDeprecationWarning()

  console.log("\n[SYNTH CLI] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
