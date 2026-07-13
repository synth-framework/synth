// ============================================================
// SYNTH Documentation Integrity Tests
// ============================================================
// Verifies that documentation integrity checks exist and behave
// correctly: link checking, projection verification, and version
// synchronization.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const PROJECT_ROOT = process.cwd()
const CHECK_LINKS_PATH = path.resolve(PROJECT_ROOT, "scripts", "check-links.js")
const VERIFY_PROJECTION_PATH = path.resolve(PROJECT_ROOT, "scripts", "verify-documentation-projection.js")
const VERIFY_VERSION_PATH = path.resolve(PROJECT_ROOT, "scripts", "verify-version-sync.js")

function runScript(scriptPath, cwd = PROJECT_ROOT) {
  const result = spawnSync("node", [scriptPath], {
    cwd,
    encoding: "utf-8",
    timeout: 120000,
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

async function testCheckLinksAcceptsProject() {
  const result = runScript(CHECK_LINKS_PATH)
  assert(result.status === 0, `check-links.js must pass on this project:\n${result.stdout}\n${result.stderr}`)
  assert(result.stdout.includes("All internal links resolve"), "check-links.js should report success")
}

async function testCheckLinksDetectsBrokenInternalLink() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-links-"))
  try {
    await fs.mkdir(path.join(tmpDir, "website"), { recursive: true })
    await fs.writeFile(
      path.join(tmpDir, "website", "index.html"),
      '<a href="missing.html">broken</a>',
      "utf-8",
    )
    const result = runScript(CHECK_LINKS_PATH, tmpDir)
    assert(result.status !== 0, "check-links.js must fail on broken internal website link")
    assert(result.stdout.includes("broken internal link"), "Should report broken internal link")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testProjectionVerificationScriptExists() {
  const content = await fs.readFile(VERIFY_PROJECTION_PATH, "utf-8")
  assert(content.includes("docs/generated"), "Projection verifier must reference docs/generated")
  assert(content.includes("docs generate"), "Projection verifier must run synth docs generate")
}

async function testVersionVerificationScriptExists() {
  const content = await fs.readFile(VERIFY_VERSION_PATH, "utf-8")
  assert(content.includes("package.json"), "Version verifier must reference package.json")
  assert(content.includes("CHANGELOG.md"), "Version verifier must reference CHANGELOG.md")
}

async function testNpmScriptsExist() {
  const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf-8"))
  assert(typeof packageJson.scripts["docs:verify-projection"] === "string", "docs:verify-projection script must exist")
  assert(typeof packageJson.scripts["version:verify"] === "string", "version:verify script must exist")
}

async function main() {
  console.log("Running documentation integrity tests...")

  await testCheckLinksAcceptsProject()
  console.log("✓ check-links.js passes on this project")

  await testCheckLinksDetectsBrokenInternalLink()
  console.log("✓ check-links.js detects broken internal website link")

  await testProjectionVerificationScriptExists()
  console.log("✓ projection verification script exists and is configured")

  await testVersionVerificationScriptExists()
  console.log("✓ version synchronization script exists and is configured")

  await testNpmScriptsExist()
  console.log("✓ npm scripts for documentation integrity exist")

  console.log("\nAll documentation integrity tests passed.")
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
