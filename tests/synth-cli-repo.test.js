// ============================================================
// SYNTH CLI Repository Governance Tests
// ============================================================
// EXP-PROGRAM-028
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

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

async function withTempDir(fn) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-repo-test-"))
  try {
    return await fn(tmpDir)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testRepoHelp() {
  const { stdout, status } = runSynth(["repo", "--help"])
  assert(status === 0, "repo --help should exit 0")
  const output = parseJson(stdout)
  assert(output.status === "ok", "repo help status should be ok")
  assert(output.namespace === "repo", "repo help namespace should be repo")
  assert(Array.isArray(output.subcommands), "repo help should list subcommands")
  assert(output.subcommands.some((s) => s.name.includes("init")), "repo help should include init")
  assert(output.subcommands.some((s) => s.name.includes("branch create")), "repo help should include branch create")
  assert(output.subcommands.some((s) => s.name.includes("pr open")), "repo help should include pr open")
  assert(output.subcommands.some((s) => s.name.includes("release create")), "repo help should include release create")
  console.log("[PASS] synth repo --help lists repository governance subcommands")
}

async function testRepoInit() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    const { stdout, status } = runSynth(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"], tmpDir)
    assert(status === 0, "repo init should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "repo init status should be ok")
    assert(output.kind === "RepositoryInitialized", "repo init kind should be RepositoryInitialized")
    assert(output.forgeProvider === "github", "forge provider should be github")
    assert(output.versionStrategy === "semver", "version strategy should be semver")
    assert(output.defaultBranch === "main", "default branch should be main")

    const statusOutput = parseJson(runSynth(["repo", "status"], tmpDir).stdout)
    assert(statusOutput.initialized === true, "repo status should report initialized")
    assert(statusOutput.lifecycle === "initialized", "repo status lifecycle should be initialized")
    console.log("[PASS] synth repo init initializes repository governance")
  })
}

async function testRepoBranchCreate() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    runSynth(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"], tmpDir)

    const { stdout, status } = runSynth(
      ["repo", "branch", "create", "--type", "expedition", "--mission-id", "mission-1", "--expedition-id", "expedition-1"],
      tmpDir,
    )
    assert(status === 0, "repo branch create should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "branch create status should be ok")
    assert(output.branchName === "expedition/mission-1/expedition-1", `expected expedition/mission-1/expedition-1, got ${output.branchName}`)
    assert(output.branchType === "expedition", "branch type should be expedition")

    const statusOutput = parseJson(runSynth(["repo", "status"], tmpDir).stdout)
    assert(statusOutput.branchCount === 1, "repo status should report one branch")
    console.log("[PASS] synth repo branch create records a governed branch")
  })
}

async function testRepoBranchCreateRequiresInit() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    const { stdout, status } = runSynth(
      ["repo", "branch", "create", "--type", "expedition", "--mission-id", "mission-1", "--expedition-id", "expedition-1"],
      tmpDir,
    )
    assert(status === 1, "repo branch create without init should exit 1")
    const output = parseJson(stdout)
    assert(output.status === "error", "output status should be error")
    assert(output.error.includes("not initialized"), "error should mention repository not initialized")
    console.log("[PASS] synth repo branch create requires repository initialization")
  })
}

async function testRepoPrOpen() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    runSynth(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"], tmpDir)

    const bodyFile = path.join(tmpDir, "pr-body.md")
    await fs.writeFile(bodyFile, "This is a test promotion proposal.", "utf-8")

    const { stdout, status } = runSynth(
      ["repo", "pr", "open", "--head", "feature/test", "--base", "main", "--title", "Test PR", "--body-file", bodyFile],
      tmpDir,
    )
    assert(status === 0, "repo pr open should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "pr open status should be ok")
    assert(output.kind === "PullRequestOpened", "pr open kind should be PullRequestOpened")
    assert(output.headBranch === "feature/test", "head branch should match")
    assert(output.baseBranch === "main", "base branch should be main")
    assert(output.title === "Test PR", "title should match")

    const statusOutput = parseJson(runSynth(["repo", "status"], tmpDir).stdout)
    assert(statusOutput.pullRequestCount === 1, "repo status should report one pull request")
    console.log("[PASS] synth repo pr open records a promotion pull request")
  })
}

async function testRepoPrApproveAndMerge() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    runSynth(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"], tmpDir)

    const bodyFile = path.join(tmpDir, "pr-body.md")
    await fs.writeFile(bodyFile, "Promotion proposal.", "utf-8")

    const openOutput = parseJson(
      runSynth(["repo", "pr", "open", "--head", "feature/test", "--base", "main", "--title", "Test PR", "--body-file", bodyFile], tmpDir).stdout,
    )
    const prId = openOutput.pullRequestId

    const approveResult = runSynth(["repo", "pr", "approve", "--id", prId], tmpDir)
    assert(approveResult.status === 0, "repo pr approve should exit 0")
    const approveOutput = parseJson(approveResult.stdout)
    assert(approveOutput.kind === "PromotionApproved", "pr approve kind should be PromotionApproved")

    const mergeResult = runSynth(["repo", "pr", "merge", "--id", prId, "--commit", "abc1234"], tmpDir)
    assert(mergeResult.status === 0, "repo pr merge should exit 0")
    const mergeOutput = parseJson(mergeResult.stdout)
    assert(mergeOutput.kind === "PullRequestMerged", "pr merge kind should be PullRequestMerged")

    const statusOutput = parseJson(runSynth(["repo", "status"], tmpDir).stdout)
    assert(statusOutput.lifecycle === "merged", `repo status lifecycle should be merged, got ${statusOutput.lifecycle}`)
    console.log("[PASS] synth repo pr approve and merge advance repository lifecycle")
  })
}

async function testRepoReleaseCreate() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    runSynth(["repo", "init", "--forge-provider", "github", "--version-strategy", "semver"], tmpDir)

    const { stdout, status } = runSynth(["repo", "release", "create", "--tag", "v2.4.0", "--commit", "abc1234"], tmpDir)
    assert(status === 0, "repo release create should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "release create status should be ok")
    assert(output.kind === "ReleaseCreated", "release create kind should be ReleaseCreated")
    assert(output.tag === "v2.4.0", "release tag should match")
    assert(output.targetCommit === "abc1234", "release target commit should match")

    const statusOutput = parseJson(runSynth(["repo", "status"], tmpDir).stdout)
    assert(statusOutput.releaseCount === 1, "repo status should report one release")
    assert(statusOutput.lifecycle === "released", "repo status lifecycle should be released")
    console.log("[PASS] synth repo release create records a governed release")
  })
}

async function testRepoStatusBeforeInit() {
  await withTempDir(async (tmpDir) => {
    runSynth(["init", "--name", "Repo Test"], tmpDir)
    const { stdout, status } = runSynth(["repo", "status"], tmpDir)
    assert(status === 0, "repo status should exit 0")
    const output = parseJson(stdout)
    assert(output.initialized === false, "repo status should report not initialized")
    assert(output.lifecycle === "uninitialized", "repo status lifecycle should be uninitialized")
    console.log("[PASS] synth repo status reports uninitialized state")
  })
}

async function main() {
  await testRepoHelp()
  await testRepoInit()
  await testRepoBranchCreate()
  await testRepoBranchCreateRequiresInit()
  await testRepoPrOpen()
  await testRepoPrApproveAndMerge()
  await testRepoReleaseCreate()
  await testRepoStatusBeforeInit()
  console.log("\nAll repository governance CLI tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
