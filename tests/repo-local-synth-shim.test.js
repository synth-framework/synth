// ============================================================
// Repo-local synth shim tests
// ============================================================
// Verifies scripts/synth runs THIS repo's build of the CLI, is
// executable, honors SYNTH_SHIM_NO_BUILD, and stays repo-only (its
// directory is excluded from the published npm `files`).
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { strict as assert } from "assert"

const REPO_ROOT = process.cwd()
const SHIM_PATH = path.join(REPO_ROOT, "scripts", "synth")
const CLI_ENTRY = path.join(REPO_ROOT, "dist", "cli", "synth.js")

function runShim(args, env = {}) {
  const result = spawnSync(SHIM_PATH, args, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    timeout: 60000,
    env: { ...process.env, ...env },
  })
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status }
}

function extractJson(stdout) {
  // The CLI may emit bootstrap log lines before the JSON payload; take from
  // the first "{" to the end and parse.
  const start = stdout.indexOf("{")
  assert.notEqual(start, -1, `no JSON object found in shim output:\n${stdout}`)
  return JSON.parse(stdout.slice(start))
}

function testShimExists() {
  assert.ok(fs.existsSync(SHIM_PATH), "scripts/synth must exist")
  const mode = fs.statSync(SHIM_PATH).mode
  assert.ok(mode & 0o111, "scripts/synth must be executable")
  console.log("  [PASS] scripts/synth exists and is executable")
}

function testShimRunsLocalBuild() {
  assert.ok(fs.existsSync(CLI_ENTRY), "dist/cli/synth.js must be built before this test")
  const { status, stdout } = runShim(["--version"], { SYNTH_SHIM_NO_BUILD: "1" })
  assert.equal(status, 0, `shim --version must exit 0:\n${stdout}`)
  const parsed = extractJson(stdout)
  assert.equal(parsed.name, "synth", "shim must run the synth CLI")
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"))
  assert.equal(parsed.version, pkg.version, "shim version must match the repo package.json version")
  console.log("  [PASS] scripts/synth runs the repo-local build and reports the repo version")
}

function testShimNoBuildSkipsRebuild() {
  // With a present dist and SYNTH_SHIM_NO_BUILD=1, the shim must not emit the
  // auto-build notice.
  const { stderr } = runShim(["--version"], { SYNTH_SHIM_NO_BUILD: "1" })
  assert.ok(!stderr.includes("running 'npm run build'"), "SYNTH_SHIM_NO_BUILD=1 must skip the auto-build step")
  console.log("  [PASS] SYNTH_SHIM_NO_BUILD=1 skips the auto-build step")
}

function testShimIsRepoOnly() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"))
  const files = pkg.files || []
  assert.ok(
    !files.some((entry) => entry === "scripts" || entry === "scripts/" || entry.startsWith("scripts/")),
    "scripts/ must be excluded from the published npm files so the shim stays repo-only",
  )
  console.log("  [PASS] scripts/ is excluded from the published npm package (shim is repo-only)")
}

console.log("\n=== Repo-Local synth Shim Tests ===\n")

testShimExists()
testShimRunsLocalBuild()
testShimNoBuildSkipsRebuild()
testShimIsRepoOnly()

console.log("\n=== All repo-local shim tests passed ===\n")
