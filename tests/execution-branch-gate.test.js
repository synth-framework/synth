// ============================================================
// ECOSYSTEM-001 (R) — ExecutionGate Branch Enforcement Tests
// ============================================================
// Verifies the EXECUTION_BRANCH_CHECK phase:
//   - StartExpedition is blocked off the canonical expedition branch
//     when git.branchPolicy.mode is enforce.
//   - ApproveMission is blocked off the canonical mission branch.
//   - Moving onto the canonical branch unblocks the same operation.
//   - Default policy (off) never blocks.
//   - The chore lane (chore:true) lets allowlisted capabilities run on main
//     under enforce, and blocks non-allowlisted ones.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync, spawnSync } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.resolve(__dirname, "..", "dist", "cli", "synth.js")

function gitInit(root, branch = "main") {
  execFileSync("git", ["init", "-b", branch], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.email", "test@synth.dev"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["config", "user.name", "synth-test"], { cwd: root, stdio: "pipe" })
  execFileSync("git", ["commit", "--allow-empty", "-m", "initial"], { cwd: root, stdio: "pipe" })
}

function currentBranch(root) {
  return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf-8" }).trim()
}

function checkout(root, branch) {
  execFileSync("git", ["checkout", "-b", branch], { cwd: root, stdio: "pipe" })
}

function switchToMain(root) {
  execFileSync("git", ["checkout", "main"], { cwd: root, stdio: "pipe" })
}

async function makeCtx(root) {
  fs.mkdirSync(path.join(root, ".synth", "data"), { recursive: true })
  const dataDir = path.join(root, ".synth", "data")
  const ctx = await bootstrap({
    infra: {
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    genesis: { projectName: "Branch Gate Test", systemId: "branch-gate", partitions: 1 },
    skipGenesis: false,
  })
  const originalHandleIntent = ctx.api.handleIntent.bind(ctx.api)
  ctx.api.handleIntent = (req) =>
    originalHandleIntent({
      ...req,
      context: { ...(req.context || {}), disableLifecycleContinuation: true },
    })
  return ctx
}

async function seedMissionAndExpedition(ctx, root, missionId, expeditionId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: `Mission ${missionId}`, purpose: "Branch gate test" },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)

  // Under enforce, ApproveMission requires the canonical mission branch.
  checkout(root, `mission/${missionId}`)
  const { contractId } = await createAlignedContract(ctx)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId, name: `Expedition ${expeditionId}` },
  })
  assert.equal(result.status, "ok", `CreateExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `ApproveExpedition should succeed: ${result.error}`)

  result = await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `CommitExpedition should succeed: ${result.error}`)
}

function readConfig(root) {
  fs.mkdirSync(path.join(root, ".synth"), { recursive: true })
  const p = path.join(root, ".synth", "config.yaml")
  if (!fs.existsSync(p)) {
    fs.writeFileSync(
      p,
      `git:
  branchPolicy:
    mode: enforce
`,
      "utf-8",
    )
  }
  return p
}

function writeConfig(root, yaml) {
  fs.mkdirSync(path.join(root, ".synth"), { recursive: true })
  const p = path.join(root, ".synth", "config.yaml")
  fs.writeFileSync(p, yaml, "utf-8")
  return p
}

async function testEnforceStartExpeditionBlocksOnMain() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-enforce-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-branch-gate"
  const expeditionId = "e-branch-gate-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  // Seed leaves us on the mission branch; prove the block from main.
  switchToMain(root)

  try {
    const blocked = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
    assert.equal(blocked.status, "error", "StartExpedition must be blocked on main under enforce")
    assert.ok(
      blocked.error.includes("BRANCH_POLICY_DENIED") || blocked.error.includes("BRANCH_POLICY"),
      `expected branch denial, got: ${blocked.error}`,
    )
    assert.ok(
      blocked.error.includes(`expedition/${missionId}/${expeditionId}`),
      `denial must cite canonical branch: ${blocked.error}`,
    )
  } catch (err) {
    assert.fail(`unexpected throw instead of error response: ${err.message}`)
  }

  // On the canonical expedition branch the same operation succeeds.
  checkout(root, `expedition/${missionId}/${expeditionId}`)
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition should pass on canonical branch: ${result.error}`)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] enforce blocks StartExpedition off-branch and allows it on-branch")
}

async function testEnforceApproveMissionBlocksOnMain() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-mission-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-mission-branch"
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: missionId, name: `Mission ${missionId}`, purpose: "Branch gate test" },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)
  assert.strictEqual(currentBranch(root), "main", "precondition: on main")

  // ApproveMission is branch-gated as a mission role.
  const { contractId } = await createAlignedContract(ctx)
  const blocked = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(blocked.status, "error", "ApproveMission must be blocked on main under enforce")
  assert.ok(
    blocked.error.includes(`mission/${missionId}`),
    `denial must cite canonical mission branch: ${blocked.error}`,
  )

  checkout(root, `mission/${missionId}`)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should pass on canonical mission branch: ${result.error}`)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] enforce blocks ApproveMission off-branch and allows it on-branch")
}

async function testDefaultPolicyNeverBlocks() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-default-"))
  gitInit(root)
  const ctx = await makeCtx(root)

  const missionId = "m-default"
  const expeditionId = "e-default-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  switchToMain(root)
  assert.strictEqual(currentBranch(root), "main", "precondition: on main")

  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `default policy must not block on main: ${result.error}`)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] default policy (off) never blocks expedition start")
}

async function testChoreLaneAllowsAllowlistedCapabilityOnMain() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-chore-"))
  gitInit(root)
  writeConfig(
    root,
    `git:
  branchPolicy:
    mode: enforce
    allowChoreOnMain: true
    choreCapabilities:
      - "StartExpedition"
`,
  )
  const ctx = await makeCtx(root)

  const missionId = "m-chore"
  const expeditionId = "e-chore-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  // Seed leaves us on the mission branch; prove the chore lane works from main.
  switchToMain(root)
  assert.strictEqual(currentBranch(root), "main", "precondition: on main")

  // Chore-flagged StartExpedition is allowlisted -> runs on main.
  const allowed = await ctx.api.handleIntent({
    actor: "test",
    capability: "StartExpedition",
    payload: { id: expeditionId, chore: true },
  })
  assert.equal(allowed.status, "ok", `allowlisted chore should pass on main: ${allowed.error}`)

  // A non-allowlisted capability flagged as a chore is still blocked.
  const blocked = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, chore: true },
  })
  assert.equal(blocked.status, "error", "non-allowlisted chore must be blocked on main")
  assert.ok(
    blocked.error.includes("BRANCH_POLICY_DENIED") || blocked.error.includes("not in the chore allowlist"),
    `expected chore allowlist denial, got: ${blocked.error}`,
  )

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] chore lane lets allowlisted capabilities run on main and blocks others")
}

async function testChoreLaneBlocksWhenAllowChoreOnMainDisabled() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-chore2-"))
  gitInit(root)
  writeConfig(
    root,
    `git:
  branchPolicy:
    mode: enforce
    allowChoreOnMain: false
    choreCapabilities:
      - "StartExpedition"
`,
  )
  const ctx = await makeCtx(root)

  const missionId = "m-chore2"
  const expeditionId = "e-chore2-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  switchToMain(root)

  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "StartExpedition",
    payload: { id: expeditionId, chore: true },
  })
  assert.equal(result.status, "error", "chore lane must block when allowChoreOnMain is disabled")
  assert.ok(
    result.error.includes("allowChoreOnMain"),
    `expected allowChoreOnMain denial reason, got: ${result.error}`,
  )

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] chore lane requires allowChoreOnMain to permit main")
}

async function testCheckpointBranchStepBlocksOnMainUnderEnforce() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-checkpoint-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-checkpoint"
  const expeditionId = "e-checkpoint-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  // Start the expedition on its canonical branch so it is executing.
  checkout(root, `expedition/${missionId}/${expeditionId}`)
  const start = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(start.status, "ok", `StartExpedition should succeed on canonical branch: ${start.error}`)
  switchToMain(root)

  const proc = spawnSync("node", [CLI_PATH, "checkpoint"], { cwd: root, encoding: "utf-8", timeout: 60000 })
  const output = JSON.parse(proc.stdout.trim())
  assert.equal(proc.status, 1, "checkpoint should exit non-zero on the wrong branch under enforce")
  assert.equal(output.steps.executionBranch.ok, false, "executionBranch step should be blocked on main")
  assert.ok(
    output.steps.executionBranch.requiredBranch === `expedition/${missionId}/${expeditionId}`,
    `required branch should be expedition/${missionId}/${expeditionId}: ${JSON.stringify(output.steps.executionBranch)}`,
  )
  assert.strictEqual(output.currentBranch, "main", "checkpoint should report the current branch")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] checkpoint branch step blocks on main under enforce and names the required branch")
}

async function testCliFailFastGuardBlocksOnMainUnderEnforce() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-cli-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-cli"
  const expeditionId = "e-cli-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  switchToMain(root)

  const proc = spawnSync("node", [CLI_PATH, "expedition", "start", "--id", expeditionId], {
    cwd: root,
    encoding: "utf-8",
    timeout: 60000,
  })
  const output = JSON.parse(proc.stdout.trim())
  assert.equal(proc.status, 1, "expedition start should fail fast on main under enforce")
  assert.ok(
    output.error.includes("BRANCH_POLICY_DENIED"),
    `expected branch denial in CLI error, got: ${output.error || JSON.stringify(output)}`,
  )
  assert.ok(
    output.error.includes(`expedition/${missionId}/${expeditionId}`),
    `CLI denial should name the canonical branch: ${output.error}`,
  )

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] CLI fail-fast guard blocks expedition start on main under enforce")
}

async function main() {
  await testEnforceStartExpeditionBlocksOnMain()
  await testEnforceApproveMissionBlocksOnMain()
  await testDefaultPolicyNeverBlocks()
  await testChoreLaneAllowsAllowlistedCapabilityOnMain()
  await testChoreLaneBlocksWhenAllowChoreOnMainDisabled()
  await testCheckpointBranchStepBlocksOnMainUnderEnforce()
  await testCliFailFastGuardBlocksOnMainUnderEnforce()
  console.log("\nAll execution-branch gate tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})