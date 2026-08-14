// ============================================================
// Release CLI Tests
// ============================================================
// Verifies synth release proposes semver bumps from conventional
// commits and, on --approve, updates package.json/CHANGELOG.md and
// creates an annotated git tag.
// ============================================================

import { spawnSync } from "child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const PROJECT_ROOT = process.cwd()
const CLI_PATH = path.resolve(PROJECT_ROOT, "dist", "cli", "synth.js")

function runSynth(args, cwd = PROJECT_ROOT) {
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

function runGit(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function findJsonObject(stdout) {
  const trimmed = stdout.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const lines = trimmed.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("{")) {
        try {
          return JSON.parse(lines.slice(i).join("\n"))
        } catch {
          // continue scanning
        }
      }
    }
  }
  throw new Error(`No JSON object found in stdout:\n${stdout}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function createTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-release-test-"))
  runGit(["init"], dir)
  runGit(["config", "user.email", "test@synth.local"], dir)
  runGit(["config", "user.name", "Synth Test"], dir)

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "test-release", version: "1.0.0" }, null, 2) + "\n",
  )
  fs.writeFileSync(
    path.join(dir, "CHANGELOG.md"),
    "# Changelog\n\n## [Unreleased]\n\n",
  )
  runGit(["add", "."], dir)
  runGit(["commit", "-m", "chore: initial commit"], dir)
  runGit(["tag", "-a", "v1.0.0", "-m", "Release v1.0.0"], dir)

  return dir
}

function addCommit(dir, message, fileContent = "") {
  fs.writeFileSync(path.join(dir, "feature.txt"), fileContent + Date.now())
  runGit(["add", "."], dir)
  runGit(["commit", "-m", message], dir)
}

async function testDryRunProposesBump() {
  const dir = createTempRepo()
  addCommit(dir, "fix: correct off-by-one error")
  addCommit(dir, "feat: add release command")

  try {
    const { stdout, status, stderr } = runSynth(["release", "--dry-run"], dir)
    assert(status === 0, `release --dry-run should exit 0: ${stderr}`)

    const output = findJsonObject(stdout)
    assert(output.status === "ok", `expected status ok, got ${output.status}`)
    assert(output.kind === "ReleasePlan", `expected kind ReleasePlan, got ${output.kind}`)
    assert(output.currentVersion === "1.0.0", `expected currentVersion 1.0.0, got ${output.currentVersion}`)
    assert(output.latestTag === "v1.0.0", `expected latestTag v1.0.0, got ${output.latestTag}`)
    assert(output.nextVersion === "1.1.0", `expected nextVersion 1.1.0 (minor), got ${output.nextVersion}`)
    assert(output.bump === "minor", `expected bump minor, got ${output.bump}`)
    assert(output.commitsSinceTag.length === 2, `expected 2 commits, got ${output.commitsSinceTag.length}`)
    assert(output.actions.length > 0, "expected non-empty actions list")
    assert(output.approved === false, "dry-run should not mark approved")
    console.log("[PASS] release --dry-run proposes correct minor bump")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function testDryRunNoCommits() {
  const dir = createTempRepo()

  try {
    const { stdout, status, stderr } = runSynth(["release", "--dry-run"], dir)
    assert(status === 0, `release --dry-run should exit 0 when no commits: ${stderr}`)

    const output = findJsonObject(stdout)
    assert(output.kind === "ReleasePlan", `expected kind ReleasePlan, got ${output.kind}`)
    assert(output.nextVersion === "1.0.0", `expected no version change, got ${output.nextVersion}`)
    assert(output.commitsSinceTag.length === 0, "expected no commits since tag")
    console.log("[PASS] release --dry-run reports nothing to release")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function testApproveCreatesTagAndUpdatesFiles() {
  const dir = createTempRepo()
  addCommit(dir, "feat: add widget support")

  try {
    const { stdout, status, stderr } = runSynth(["release", "--approve"], dir)
    assert(status === 0, `release --approve should exit 0: ${stderr}`)

    const output = findJsonObject(stdout)
    assert(output.status === "ok", `expected status ok, got ${output.status}`)
    assert(output.approved === true, "approve should mark approved")
    assert(output.tagName === "v1.1.0", `expected tag v1.1.0, got ${output.tagName}`)

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"))
    assert(pkg.version === "1.1.0", `expected package version 1.1.0, got ${pkg.version}`)

    const changelog = fs.readFileSync(path.join(dir, "CHANGELOG.md"), "utf-8")
    assert(changelog.includes("## [1.1.0]"), "CHANGELOG should include new version entry")
    assert(changelog.includes("### Added"), "CHANGELOG should include Added section")

    const tags = runGit(["tag", "--list"], dir).stdout.trim().split("\n")
    assert(tags.includes("v1.1.0"), "annotated tag v1.1.0 should exist")

    console.log("[PASS] release --approve updates package.json, CHANGELOG, and tag")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function testBumpOverride() {
  const dir = createTempRepo()
  addCommit(dir, "fix: small fix")

  try {
    const { stdout, status, stderr } = runSynth(["release", "--dry-run", "--bump", "major"], dir)
    assert(status === 0, `release --dry-run --bump major should exit 0: ${stderr}`)

    const output = findJsonObject(stdout)
    assert(output.bump === "major", `expected bump major, got ${output.bump}`)
    assert(output.nextVersion === "2.0.0", `expected nextVersion 2.0.0, got ${output.nextVersion}`)
    console.log("[PASS] release --bump major overrides conventional commit inference")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function testIgnoresNonSemverTags() {
  const dir = createTempRepo()
  // Add a non-semver tag after the release tag.
  fs.writeFileSync(path.join(dir, "snapshot.txt"), "snapshot")
  runGit(["add", "."], dir)
  runGit(["commit", "-m", "chore: snapshot"], dir)
  runGit(["tag", "-a", "synth-expedition/abc123", "-m", "Snapshot"], dir)
  addCommit(dir, "fix: patch fix")

  try {
    const { stdout, status, stderr } = runSynth(["release", "--dry-run"], dir)
    assert(status === 0, `release --dry-run should ignore non-semver tags: ${stderr}`)

    const output = findJsonObject(stdout)
    assert(output.latestTag === "v1.0.0", `expected latest semver tag v1.0.0, got ${output.latestTag}`)
    assert(output.nextVersion === "1.0.1", `expected patch bump, got ${output.nextVersion}`)
    console.log("[PASS] release ignores non-semver tags when selecting latest tag")
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  await testDryRunProposesBump()
  await testDryRunNoCommits()
  await testApproveCreatesTagAndUpdatesFiles()
  await testBumpOverride()
  await testIgnoresNonSemverTags()
  console.log("\nAll release CLI tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
