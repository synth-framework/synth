// ============================================================
// Branch Policy & Execution Branch Checks (ECOSYSTEM-001 R)
// ============================================================
// Covers the pure branch-policy resolver, the .synth/config.yaml
// loader, and the RepositoryAdapter.validateExecutionBranch()
// reference implementation (git).
// ============================================================

import assert from "node:assert"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  defaultBranchPolicy,
  loadBranchPolicyConfig,
  resolveExecutionBranch,
} from "../dist/repository/branch-policy.js"
import { createGitRepositoryAdapter } from "../dist/adapters/repository/git.js"

function makeProject(withConfig = false, configYaml = "") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bp-"))
  fs.mkdirSync(path.join(root, ".synth"), { recursive: true })
  if (withConfig) {
    fs.writeFileSync(path.join(root, ".synth", "config.yaml"), configYaml, "utf-8")
  }
  return root
}

function gitInitWithCommit(root, branch = "main") {
  execFileSync("git", ["init", "-b", branch], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.email", "test@synth.dev"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.name", "synth-test"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: root, stdio: "pipe" })
}

function makePolicy(overrides = {}) {
  return {
    mode: "off",
    strategy: "featured",
    allowChoreOnMain: false,
    choreCapabilities: [],
    ...overrides,
  }
}

test("defaultBranchPolicy: enforcement defaults to off, strategy featured", () => {
  const p = defaultBranchPolicy()
  assert.strictEqual(p.mode, "off")
  assert.strictEqual(p.strategy, "featured")
  assert.strictEqual(p.allowChoreOnMain, false)
  assert.deepStrictEqual(p.choreCapabilities, [])
})

test("loadBranchPolicyConfig: missing config file returns defaults", () => {
  const root = makeProject(false)
  const p = loadBranchPolicyConfig(root)
  assert.strictEqual(p.mode, "off")
  assert.strictEqual(p.strategy, "featured")
})

test("loadBranchPolicyConfig: parses git.branchPolicy and git.branchStrategy", () => {
  const root = makeProject(true, `
git:
  branchStrategy: featured
  branchPolicy:
    mode: enforce
    allowChoreOnMain: true
    choreCapabilities: ["AutoCommitSnapshot", "EvidenceCapture"]
`)
  const p = loadBranchPolicyConfig(root)
  assert.strictEqual(p.mode, "enforce")
  assert.strictEqual(p.strategy, "featured")
  assert.strictEqual(p.allowChoreOnMain, true)
  assert.deepStrictEqual(p.choreCapabilities, ["AutoCommitSnapshot", "EvidenceCapture"])
})

test("loadBranchPolicyConfig: trunk strategy and unknown keys are tolerated", () => {
  const root = makeProject(true, `
git:
  branchStrategy: trunk
  branchPolicy:
    mode: enforce
    unrelated: true
`)
  const p = loadBranchPolicyConfig(root)
  assert.strictEqual(p.strategy, "trunk")
  assert.strictEqual(p.mode, "enforce")
})

test("resolveExecutionBranch: mode off never blocks", () => {
  const policy = makePolicy()
  const result = resolveExecutionBranch("expedition", "main", policy, {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(result.ok, true)
  assert.match(result.reason, /off/)
})

test("resolveExecutionBranch: enforce requires canonical expedition branch", () => {
  const policy = makePolicy({ mode: "enforce" })
  const onMain = resolveExecutionBranch("expedition", "main", policy, {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(onMain.ok, false)
  assert.strictEqual(onMain.requiredBranch, "expedition/m-1/e-1")
  assert.match(onMain.reason, /expedition\/m-1\/e-1/)

  const onBranch = resolveExecutionBranch("expedition", "expedition/m-1/e-1", policy, {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(onBranch.ok, true)
})

test("resolveExecutionBranch: enforce requires canonical mission branch", () => {
  const policy = makePolicy({ mode: "enforce" })
  const onMain = resolveExecutionBranch("mission", "main", policy, { missionId: "m-1" })
  assert.strictEqual(onMain.ok, false)
  assert.strictEqual(onMain.requiredBranch, "mission/m-1")

  const onBranch = resolveExecutionBranch("mission", "mission/m-1", policy, { missionId: "m-1" })
  assert.strictEqual(onBranch.ok, true)
})

test("resolveExecutionBranch: chore lane allows main when allowChoreOnMain", () => {
  const onMain = makePolicy({ mode: "enforce", allowChoreOnMain: true, choreCapabilities: ["AutoCommitSnapshot"] })
  assert.strictEqual(
    resolveExecutionBranch("chore", "main", onMain, { capability: "AutoCommitSnapshot" }).ok,
    true,
  )
  // Capability not in allowlist still blocks.
  assert.strictEqual(
    resolveExecutionBranch("chore", "main", onMain, { capability: "StartExpedition" }).ok,
    false,
  )
  // allowChoreOnMain false blocks even allowlisted capabilities.
  const noChore = makePolicy({ mode: "enforce", allowChoreOnMain: false, choreCapabilities: ["AutoCommitSnapshot"] })
  assert.strictEqual(
    resolveExecutionBranch("chore", "main", noChore, { capability: "AutoCommitSnapshot" }).ok,
    false,
  )
})

test("resolveExecutionBranch: trunk strategy permits main for expedition work", () => {
  const policy = makePolicy({ mode: "enforce", strategy: "trunk" })
  const result = resolveExecutionBranch("expedition", "main", policy, {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(result.ok, true)
})

test("resolveExecutionBranch: internal roles never block on canonical branches", () => {
  const policy = makePolicy({ mode: "enforce" })
  assert.strictEqual(resolveExecutionBranch("internal", "main", policy, {}).ok, true)
})

test("validateExecutionBranch: non-git project degrades to observation", async () => {
  const root = makeProject(false)
  const adapter = createGitRepositoryAdapter({ path: root })
  const result = await adapter.validateExecutionBranch("expedition", {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(result.ok, true)
  assert.strictEqual(result.strategy, "observed")
})

test("validateExecutionBranch: git project on main with enforce blocks", async () => {
  const root = makeProject(true, `
git:
  branchPolicy:
    mode: enforce
`)
  const adapter = createGitRepositoryAdapter({ path: root })
  gitInitWithCommit(root)
  const status = await adapter.status()
  assert.strictEqual(status.branch, "main")

  const result = await adapter.validateExecutionBranch("expedition", {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.requiredBranch, "expedition/m-1/e-1")
})

test("validateExecutionBranch: git project on canonical expedition branch passes", async () => {
  const root = makeProject(true, `
git:
  branchPolicy:
    mode: enforce
`)
  const adapter = createGitRepositoryAdapter({ path: root })
  gitInitWithCommit(root)
  await adapter.createBranch("expedition/m-1/e-1")

  const result = await adapter.validateExecutionBranch("expedition", {
    missionId: "m-1",
    expeditionId: "e-1",
  })
  assert.strictEqual(result.ok, true)
})