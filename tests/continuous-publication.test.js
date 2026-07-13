// ============================================================
// SYNTH Continuous Publication Tests
// ============================================================
// Verifies that documentation regeneration and the publication
// pipeline scripts are present and functional.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const PROJECT_ROOT = process.cwd()
const CLI_PATH = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")
const PACKAGE_PATH = path.resolve(PROJECT_ROOT, "package.json")

function runNpm(script, cwd) {
  const result = spawnSync("npm", ["run", script], {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
    shell: true,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

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

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testDocsGenerateScriptExists() {
  const packageJson = JSON.parse(await fs.readFile(PACKAGE_PATH, "utf-8"))
  assert(typeof packageJson.scripts["docs:generate"] === "string", "docs:generate npm script must exist")
  assert(
    packageJson.scripts["docs:generate"].includes("docs generate"),
    "docs:generate script must invoke synth docs generate",
  )
}

async function testDocsGenerateProducesProjections() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-gen-"))
  try {
    const docsDir = path.join(tmpDir, "docs")
    const generatedDir = path.join(tmpDir, "docs", "generated")
    await fs.mkdir(docsDir, { recursive: true })
    await fs.writeFile(
      path.join(docsDir, "README.md"),
      "# Test Project\n\nThis is a test knowledge base.\n",
      "utf-8",
    )

    const result = runSynth(["docs", "generate", "--out-dir", generatedDir, "--knowledge-base", docsDir], tmpDir)
    assert(result.status === 0, `docs generate must exit 0, got ${result.status}\n${result.stderr}`)

    const expectedFiles = [
      "README.md",
      "ARCHITECTURE.md",
      "API.md",
      "OPERATOR_GUIDE.md",
      "DEVELOPER_GUIDE.md",
      "ARCHITECT_GUIDE.md",
      "AI_CONTEXT.md",
    ]

    for (const filename of expectedFiles) {
      const filePath = path.join(generatedDir, filename)
      const stats = await fs.stat(filePath).catch(() => null)
      assert(stats && stats.isFile(), `Expected generated documentation file ${filename}`)
      const content = await fs.readFile(filePath, "utf-8")
      assert(content.length > 0, `Generated file ${filename} must not be empty`)
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testWorkflowFilesExist() {
  const workflowsDir = path.resolve(PROJECT_ROOT, ".github", "workflows")
  const proofYml = path.join(workflowsDir, "proof.yml")
  const publishYml = path.join(workflowsDir, "publish.yml")
  const releaseYml = path.join(workflowsDir, "release.yml")

  for (const file of [proofYml, publishYml, releaseYml]) {
    const stats = await fs.stat(file).catch(() => null)
    assert(stats && stats.isFile(), `Expected workflow file ${path.basename(file)}`)
  }

  const publishContent = await fs.readFile(publishYml, "utf-8")
  assert(publishContent.includes("npm run docs:generate"), "publish.yml must run docs:generate")
  assert(publishContent.includes("actions/deploy-pages"), "publish.yml must deploy to GitHub Pages")
  assert(publishContent.includes("[skip ci]"), "publish.yml must skip ci on doc commits to avoid loops")
}

async function main() {
  console.log("Running continuous publication tests...")

  await testDocsGenerateScriptExists()
  console.log("✓ docs:generate script exists")

  await testDocsGenerateProducesProjections()
  console.log("✓ docs generate produces all seven projections")

  await testWorkflowFilesExist()
  console.log("✓ publication workflow files exist and are configured")

  console.log("\nAll continuous publication tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
