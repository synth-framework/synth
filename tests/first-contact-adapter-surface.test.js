// ============================================================
// EXP-ADP-001 — Repository Adapter Surface During Onboarding
// ============================================================
// Verifies that `synth first-contact` exposes a read-only snapshot
// of the repository adapter in both plan and completion output.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { spawnSync } from "child_process"
import { runSynth, parseJson, withTempDir, writeManifest } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" })
  assert(result.status === 0, `git ${args.join(" ")} failed: ${result.stderr}`)
  return result.stdout.trim()
}

async function initGitRepo(cwd) {
  runGit(cwd, ["init"])
  runGit(cwd, ["config", "user.email", "test@example.com"])
  runGit(cwd, ["config", "user.name", "Test User"])
  runGit(cwd, ["commit", "--allow-empty", "-m", "initial"])
}

async function testGitRepoDetectedInPlan() {
  await withTempDir("synth-adapter-git-", async (tmpDir) => {
    await initGitRepo(tmpDir)
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "git-project", version: "1.0.0" }), "utf-8")

    const { stdout, status } = runSynth(["first-contact", "--dry-run"], tmpDir)
    assert(status === 0, `dry-run should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardPlan", `kind should be FirstContactOnboardPlan, got ${output.kind}`)
    assert(output.repositoryAdapter, "plan should include repositoryAdapter")
    assert(output.repositoryAdapter.detected === "git", `detected should be git, got ${output.repositoryAdapter.detected}`)
    assert(output.repositoryAdapter.initialized === true, "initialized should be true")
    assert(typeof output.repositoryAdapter.branch === "string", "branch should be a string")
    assert(output.repositoryAdapter.remoteConfigured === false, "remoteConfigured should be false")
    assert(output.repositoryAdapter.hooksInstalled === false, "hooksInstalled should be false")
    assert(["healthy", "unhealthy", "unknown"].includes(output.repositoryAdapter.health), `unexpected health ${output.repositoryAdapter.health}`)
    assert(typeof output.repositoryAdapter.nextStep === "string" && output.repositoryAdapter.nextStep.length > 0, "nextStep should be present")
  })
  console.log("[PASS] synth first-contact --dry-run surfaces git repository adapter")
}

async function testNonGitBrownfieldDetected() {
  await withTempDir("synth-adapter-nogit-", async (tmpDir) => {
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "nogit", version: "1.0.0" }), "utf-8")

    const { stdout, status } = runSynth(["first-contact"], tmpDir)
    assert(status === 0, `plan should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardPlan", `kind should be FirstContactOnboardPlan, got ${output.kind}`)
    assert(output.repositoryAdapter, "plan should include repositoryAdapter")
    assert(output.repositoryAdapter.detected === "none", `detected should be none, got ${output.repositoryAdapter.detected}`)
    assert(output.repositoryAdapter.initialized === false, "initialized should be false")
    assert(output.repositoryAdapter.nextStep.toLowerCase().includes("git") || output.repositoryAdapter.nextStep.toLowerCase().includes("adapter"), `nextStep should mention git or adapter, got ${output.repositoryAdapter.nextStep}`)
  })
  console.log("[PASS] synth first-contact on non-git brownfield surfaces missing adapter")
}

async function testEmptyDirectoryDetected() {
  await withTempDir("synth-adapter-empty-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--dry-run"], tmpDir)
    assert(status === 0, `dry-run should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardPlan", `kind should be FirstContactOnboardPlan, got ${output.kind}`)
    assert(output.repositoryAdapter, "plan should include repositoryAdapter")
    assert(output.repositoryAdapter.detected === "none", `detected should be none, got ${output.repositoryAdapter.detected}`)
    assert(output.repositoryAdapter.initialized === false, "initialized should be false")
  })
  console.log("[PASS] synth first-contact --dry-run on empty directory surfaces no adapter")
}

async function testExternalGitDetected() {
  await withTempDir("synth-adapter-external-", async (tmpDir) => {
    const childDir = path.join(tmpDir, "child")
    await fs.mkdir(childDir, { recursive: true })
    await initGitRepo(tmpDir)
    await fs.writeFile(path.join(childDir, "package.json"), JSON.stringify({ name: "child", version: "1.0.0" }), "utf-8")

    const { stdout, status } = runSynth(["first-contact"], childDir)
    assert(status === 0, `plan should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.repositoryAdapter, "plan should include repositoryAdapter")
    assert(output.repositoryAdapter.detected === "external", `detected should be external, got ${output.repositoryAdapter.detected}`)
    assert(output.repositoryAdapter.initialized === false, "initialized should be false for external git")
  })
  console.log("[PASS] synth first-contact detects external git repository")
}

async function testApproveCarriesSnapshot() {
  await withTempDir("synth-adapter-approve-", async (tmpDir) => {
    const { stdout, status } = runSynth(["first-contact", "--approve", "--name", "Adapter Test Project"], tmpDir)
    assert(status === 0, `approve should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardCompleted", `kind should be FirstContactOnboardCompleted, got ${output.kind}`)
    assert(output.repositoryAdapter, "completed output should include repositoryAdapter")
    assert(output.repositoryAdapter.detected === "none", `detected should be none after empty init, got ${output.repositoryAdapter.detected}`)
  })
  console.log("[PASS] synth first-contact --approve carries repository adapter snapshot")
}

async function testAlreadyInitializedSurfacesAdapter() {
  await withTempDir("synth-adapter-v2-", async (tmpDir) => {
    await writeManifest(tmpDir, "Already Initialized")
    const { stdout, status } = runSynth(["first-contact", "--approve"], tmpDir)
    assert(status === 0, `v2 already-initialized should exit 0, got ${status}\n${stdout}`)
    const output = parseJson(stdout)
    assert(output.kind === "FirstContactOnboardAlreadyInitialized", `kind should be FirstContactOnboardAlreadyInitialized, got ${output.kind}`)
    assert(output.repositoryAdapter, "already-initialized output should include repositoryAdapter")
  })
  console.log("[PASS] synth first-contact --approve on v2 project surfaces repository adapter snapshot")
}

async function main() {
  await testGitRepoDetectedInPlan()
  await testNonGitBrownfieldDetected()
  await testEmptyDirectoryDetected()
  await testExternalGitDetected()
  await testApproveCarriesSnapshot()
  await testAlreadyInitializedSurfacesAdapter()
  console.log("\n[REPOSITORY ADAPTER SURFACE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
