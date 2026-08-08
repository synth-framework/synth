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

    const mapPath = path.join(tmpDir, "docs", "reference", "capability-validation-map.json")
    const map = JSON.parse(await fs.readFile(mapPath, "utf-8"))
    assert(map.schema === "synth-capability-validation-map-v1", "capability validation map schema should be v1")

    const validateResult = runSynth(["validate", "--dry-run"], tmpDir)
    assert(validateResult.status === 0, `validate --dry-run should exit 0 on fresh bootstrap: ${validateResult.stdout}`)
    const validateOutput = parseJson(validateResult.stdout)
    assert(validateOutput.status === "ok", `validate --dry-run should return ok, got ${validateOutput.status}`)

    console.log("[PASS] bootstrap --approve on empty directory creates manifest and capability validation map")
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

async function testBootstrapWritesGovernScriptFromExistingScripts() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-govern-"))
  try {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "govern-test",
        version: "1.0.0",
        scripts: {
          build: "echo building",
          test: "echo testing",
        },
      }, null, 2),
      "utf-8",
    )
    await fs.mkdir(path.join(tmpDir, "src"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "src", "index.js"), "console.log('hello')\n", "utf-8")

    const { status, stderr } = runSynth(["bootstrap", "--approve", "--name", "Govern Test"], tmpDir)
    assert(status === 0, `bootstrap --approve should exit 0: ${stderr}`)

    const packageJson = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf-8"))
    assert(packageJson.scripts.govern === "npm run build && npm test", `expected meaningful govern script, got: ${packageJson.scripts.govern}`)

    const map = JSON.parse(await fs.readFile(path.join(tmpDir, "docs", "reference", "capability-validation-map.json"), "utf-8"))
    assert(JSON.stringify(map.capabilities.ProjectConfig.proofs) === JSON.stringify(["govern"]), `validation map proofs should point to govern, got: ${JSON.stringify(map.capabilities.ProjectConfig.proofs)}`)

    console.log("[PASS] bootstrap writes a govern script from existing npm scripts")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapGovernScriptIsInformativeWhenNoScriptsExist() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-govern-empty-"))
  try {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "govern-empty-test", version: "1.0.0", scripts: {} }, null, 2),
      "utf-8",
    )

    const { status, stderr } = runSynth(["bootstrap", "--approve", "--name", "Govern Empty Test"], tmpDir)
    assert(status === 0, `bootstrap --approve should exit 0: ${stderr}`)

    const packageJson = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf-8"))
    assert(packageJson.scripts.govern && packageJson.scripts.govern.includes("not configured"), `expected informative govern script, got: ${packageJson.scripts.govern}`)

    console.log("[PASS] bootstrap writes an informative govern script when no validation scripts exist")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testBootstrapGeneratesRichBrownfieldMap() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-bootstrap-brownfield-map-"))
  try {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "next-app", version: "1.0.0", scripts: { test: "echo test", build: "echo build" } }, null, 2),
      "utf-8",
    )
    await fs.writeFile(path.join(tmpDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }, null, 2), "utf-8")
    await fs.writeFile(path.join(tmpDir, ".env.example"), "# env\n", "utf-8")
    await fs.mkdir(path.join(tmpDir, "src", "app"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "src", "app", "page.tsx"), "export default function Page() {}\n", "utf-8")
    await fs.mkdir(path.join(tmpDir, "src", "components"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "src", "components", "Button.tsx"), "export function Button() {}\n", "utf-8")

    const { status, stderr } = runSynth(["bootstrap", "--approve", "--name", "Next App"], tmpDir)
    assert(status === 0, `bootstrap --approve should exit 0: ${stderr}`)

    const map = JSON.parse(await fs.readFile(path.join(tmpDir, "docs", "reference", "capability-validation-map.json"), "utf-8"))
    assert(map.capabilities.ProjectConfig, "map should include ProjectConfig")
    assert(map.capabilities.TypeScriptConfig, "map should include TypeScriptConfig")
    assert(map.capabilities.EnvironmentConfig, "map should include EnvironmentConfig")
    assert(map.capabilities.NextJsAppRouter, "map should include NextJsAppRouter")
    assert(map.capabilities.ReactComponents, "map should include ReactComponents")
    assert(JSON.stringify(map.capabilities.NextJsAppRouter.proofs) === JSON.stringify(["govern"]), "NextJsAppRouter should map to govern")

    console.log("[PASS] bootstrap generates a rich capability-validation-map for brownfield web projects")
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
  await testBootstrapWritesGovernScriptFromExistingScripts()
  await testBootstrapGovernScriptIsInformativeWhenNoScriptsExist()
  await testBootstrapGeneratesRichBrownfieldMap()

  console.log("\n[SYNTH BOOTSTRAP] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
