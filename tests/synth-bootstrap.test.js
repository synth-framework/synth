// ============================================================
// SYNTH Bootstrap Tests
// ============================================================
// Verifies repository bootstrap for empty, existing, brownfield,
// and polyglot repositories.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

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
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function setupEmptyDir(tmpDir) {
  // nothing to create
}

async function setupNodeDir(tmpDir) {
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "test-node-project", version: "1.0.0", scripts: {} }),
    "utf-8",
  )
  await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "src", "index.js"), "console.log('hello')\n", "utf-8")
}

async function setupBrownfieldDir(tmpDir) {
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "legacy-app", version: "1.0.0", scripts: {} }),
    "utf-8",
  )
  await fs.mkdir(path.join(tmpDir, "lib"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "lib", "main.js"), "module.exports = {}\n", "utf-8")
  await fs.writeFile(path.join(tmpDir, "README.md"), "# Legacy App\n", "utf-8")
}

async function setupPolyglotDir(tmpDir) {
  await fs.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "polyglot-project", version: "1.0.0", scripts: {} }),
    "utf-8",
  )
  await fs.writeFile(path.join(tmpDir, "requirements.txt"), "fastapi\n", "utf-8")
  await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "src", "app.ts"), "console.log('ts')\n", "utf-8")
  await fs.mkdir(path.join(tmpDir, "api"), { recursive: true })
  await fs.writeFile(path.join(tmpDir, "api", "main.py"), "print('python')\n", "utf-8")
}

async function testBootstrapEmptyDryRun() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-empty-"))
  try {
    const { stdout, status } = runSynth(["bootstrap", "--dry-run"], tmpDir)
    assert(status === 0, "empty dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "pending-approval", "dry-run should return pending-approval")
    assert(output.repositoryType === "empty", `empty repo should be empty, got ${output.repositoryType}`)
    assert(output.proposals.missionSubject, "dry-run should include mission subject")
    console.log("[PASS] bootstrap --dry-run on empty directory")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapEmptyApprove() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-empty-approve-"))
  try {
    const { stdout, status } = runSynth(["bootstrap", "--approve", "--name", "Empty Test"], tmpDir)
    assert(status === 0, "empty approve should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `approve should return ok, got ${output.status}`)
    assert(output.applied.manifest === true, "manifest should be applied")

    const manifestPath = path.join(tmpDir, ".synth", "manifest.json")
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
    assert(manifest.schema === "synth-bootstrap-manifest-v1", "manifest schema should be v1")
    assert(manifest.projectName === "Empty Test", "manifest projectName should match")
    console.log("[PASS] bootstrap --approve on empty directory creates manifest")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapNode() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-node-"))
  try {
    await setupNodeDir(tmpDir)
    const { stdout, status } = runSynth(["bootstrap", "--dry-run"], tmpDir)
    assert(status === 0, "node dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.repositoryType === "node", `node repo should be node, got ${output.repositoryType}`)
    assert(output.analysis.languages.includes("JavaScript/TypeScript"), "node repo should detect JS/TS")
    console.log("[PASS] bootstrap detects node repository")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapBrownfield() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-brownfield-"))
  try {
    await setupBrownfieldDir(tmpDir)
    const { stdout, status } = runSynth(["bootstrap", "--dry-run"], tmpDir)
    assert(status === 0, "brownfield dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.repositoryType === "brownfield" || output.repositoryType === "node", `brownfield repo type unexpected: ${output.repositoryType}`)
    console.log("[PASS] bootstrap analyzes brownfield repository")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapPolyglot() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-polyglot-"))
  try {
    await setupPolyglotDir(tmpDir)
    const { stdout, status } = runSynth(["bootstrap", "--dry-run"], tmpDir)
    assert(status === 0, "polyglot dry-run should exit 0")
    const output = parseJson(stdout)
    assert(output.repositoryType === "polyglot", `polyglot repo should be polyglot, got ${output.repositoryType}`)
    assert(output.analysis.languages.includes("JavaScript/TypeScript"), "polyglot should detect JS/TS")
    assert(output.analysis.languages.includes("Python"), "polyglot should detect Python")
    console.log("[PASS] bootstrap detects polyglot repository")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapDoesNotMutateWithoutApprove() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-no-mutate-"))
  try {
    await setupNodeDir(tmpDir)
    runSynth(["bootstrap"], tmpDir) // no --approve, no --dry-run
    try {
      await fs.access(path.join(tmpDir, ".synth"))
      assert(false, "bootstrap without approve should not create .synth/")
    } catch {
      // expected
    }
    console.log("[PASS] bootstrap without --approve does not mutate repository")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error(`[SKIP] CLI not built. Run 'npm run build' first.`)
    process.exit(0)
  }

  await testBootstrapEmptyDryRun()
  await testBootstrapEmptyApprove()
  await testBootstrapNode()
  await testBootstrapBrownfield()
  await testBootstrapPolyglot()
  await testBootstrapDoesNotMutateWithoutApprove()

  console.log("\n[SYNTH BOOTSTRAP] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
