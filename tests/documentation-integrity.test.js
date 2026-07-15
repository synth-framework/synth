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
const VALIDATE_PROJECTIONS_PATH = path.resolve(PROJECT_ROOT, "scripts", "verify-documentation-projection.js")
const VERIFY_VERSION_PATH = path.resolve(PROJECT_ROOT, "scripts", "verify-version-sync.js")
const VERIFY_WEBSITE_SYNC_PATH = path.resolve(PROJECT_ROOT, "scripts", "verify-website-sync.js")

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

async function testProjectionValidationScriptExists() {
  const content = await fs.readFile(VALIDATE_PROJECTIONS_PATH, "utf-8")
  assert(content.includes('"docs", "generated"') || content.includes("docs/generated"), "Projection validator must reference docs/generated")
  assert(content.includes("docs generate"), "Projection validator must run synth docs generate")
  assert(content.includes("deterministic"), "Projection validator must verify determinism")
}

async function testWebsiteSyncScriptExists() {
  const content = await fs.readFile(VERIFY_WEBSITE_SYNC_PATH, "utf-8")
  assert(content.includes("README.md"), "Website sync verifier must reference README.md")
  assert(content.includes("website/index.html"), "Website sync verifier must reference website/index.html")
  assert(content.includes("synth validate"), "Website sync verifier must check for synth validate")
  assert(content.includes("https://github.com/synth-framework/synth"), "Website sync verifier must check GitHub URLs against the canonical repository")
}

async function testWebsiteSyncPasses() {
  const result = runScript(VERIFY_WEBSITE_SYNC_PATH)
  assert(result.status === 0, `verify-website-sync.js must pass on this project:\n${result.stdout}\n${result.stderr}`)
  assert(result.stdout.includes("Website content is synchronized"), "verify-website-sync.js should report success")
}

async function testWebsiteSyncDetectsNonCanonicalRepoUrl() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-site-"))
  try {
    await fs.mkdir(path.join(tmpDir, "website"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "README.md"), "> **Tagline**\n", "utf-8")
    await fs.writeFile(path.join(tmpDir, "website", "index.html"), "<html></html>", "utf-8")
    await fs.writeFile(path.join(tmpDir, "website", "quick-start.html"), "<html></html>", "utf-8")
    await fs.writeFile(
      path.join(tmpDir, "website", "docs.html"),
      '<a href="https://github.com/synth-dev/synth-v2">old org</a>',
      "utf-8",
    )
    const result = runScript(VERIFY_WEBSITE_SYNC_PATH, tmpDir)
    assert(result.status !== 0, "verify-website-sync.js must fail on non-canonical GitHub URL")
    assert(result.stdout.includes("non-canonical GitHub URL"), "Should report the non-canonical URL")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVersionVerificationScriptExists() {
  const content = await fs.readFile(VERIFY_VERSION_PATH, "utf-8")
  assert(content.includes("package.json"), "Version verifier must reference package.json")
  assert(content.includes("CHANGELOG.md"), "Version verifier must reference CHANGELOG.md")
}

async function testNpmScriptsExist() {
  const packageJson = JSON.parse(await fs.readFile(path.join(PROJECT_ROOT, "package.json"), "utf-8"))
  assert(typeof packageJson.scripts["docs:validate-projections"] === "string", "docs:validate-projections script must exist")
  assert(typeof packageJson.scripts["docs:verify-website-sync"] === "string", "docs:verify-website-sync script must exist")
  assert(typeof packageJson.scripts["version:verify"] === "string", "version:verify script must exist")
}

async function main() {
  console.log("Running documentation integrity tests...")

  await testCheckLinksAcceptsProject()
  console.log("✓ check-links.js passes on this project")

  await testCheckLinksDetectsBrokenInternalLink()
  console.log("✓ check-links.js detects broken internal website link")

  await testProjectionValidationScriptExists()
  console.log("✓ projection validation script exists and is configured")

  await testWebsiteSyncScriptExists()
  console.log("✓ website synchronization script exists and is configured")

  await testWebsiteSyncPasses()
  console.log("✓ website synchronization check passes on this project")

  await testWebsiteSyncDetectsNonCanonicalRepoUrl()
  console.log("✓ website synchronization check detects non-canonical GitHub URL")

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
