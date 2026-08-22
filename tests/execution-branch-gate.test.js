// ============================================================
// ECOSYSTEM-001 (R) — ExecutionGate Branch Enforcement Tests
// ============================================================
// Verifies the EXECUTION_BRANCH_CHECK phase:
//   - StartExpedition is blocked off the canonical expedition branch
//     when git.branchPolicy.mode is enforce.
//   - ApproveMission is blocked off the canonical mission branch.
//   - Canonical branches resolve to a candidate set: the preferred
//     slug form (expedition/<mission-slug>/<expedition-slug>-<id7>)
//     and the legacy raw-ID form. Enforcement accepts BOTH; denial
//     reasons cite every accepted form.
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
import { generateBranchName } from "../dist/repository/branch-taxonomy.js"

// Canonical names for the seeded fixtures: the preferred slug form and
// the legacy raw-ID form. Enforcement must accept BOTH; reporting cites
// the slug form.
function expeditionBranchNames(missionId, missionName, expeditionId, expeditionName) {
  const options = { missionId, missionName, expeditionId, expeditionName }
  return {
    slug: generateBranchName("expedition", options),
    legacy: generateBranchName("expedition", { missionId, expeditionId }),
  }
}

function missionBranchNames(missionId, missionName) {
  return {
    slug: generateBranchName("mission", { missionId, missionName }),
    legacy: generateBranchName("mission", { missionId }),
  }
}

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
  const names = expeditionBranchNames(missionId, `Mission ${missionId}`, expeditionId, `Expedition ${expeditionId}`)
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
      blocked.error.includes(names.slug) && blocked.error.includes(names.legacy),
      `denial must cite every canonical form (slug + legacy), got: ${blocked.error}`,
    )
  } catch (err) {
    assert.fail(`unexpected throw instead of error response: ${err.message}`)
  }

  // On the preferred slug-form canonical branch the same operation succeeds.
  checkout(root, names.slug)
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition should pass on slug-form canonical branch: ${result.error}`)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] enforce blocks StartExpedition off-branch and allows it on the slug-form branch")
}

async function testEnforceAcceptsLegacyCanonicalBranchForm() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-legacy-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-legacy-form"
  const expeditionId = "e-legacy-form-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  const names = expeditionBranchNames(missionId, `Mission ${missionId}`, expeditionId, `Expedition ${expeditionId}`)
  assert.notStrictEqual(names.slug, names.legacy, "fixture must produce distinct slug and legacy forms")

  // Branches created before human-readable naming use the raw-ID form; the
  // gate must keep accepting them.
  checkout(root, names.legacy)
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(result.status, "ok", `StartExpedition should pass on the legacy-form canonical branch: ${result.error}`)

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] enforce still accepts the legacy raw-ID canonical branch form")
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

  const mNames = missionBranchNames(missionId, `Mission ${missionId}`)
  // ApproveMission is branch-gated as a mission role.
  const { contractId } = await createAlignedContract(ctx)
  const blocked = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: missionId, alignmentContractId: contractId },
  })
  assert.equal(blocked.status, "error", "ApproveMission must be blocked on main under enforce")
  assert.ok(
    blocked.error.includes(mNames.slug) && blocked.error.includes(mNames.legacy),
    `denial must cite every canonical mission branch form, got: ${blocked.error}`,
  )

  // The legacy raw-ID mission branch remains accepted.
  checkout(root, mNames.legacy)
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
  const names = expeditionBranchNames(missionId, `Mission ${missionId}`, expeditionId, `Expedition ${expeditionId}`)
  checkout(root, names.slug)
  const start = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: expeditionId } })
  assert.equal(start.status, "ok", `StartExpedition should succeed on canonical branch: ${start.error}`)
  switchToMain(root)

  const proc = spawnSync("node", [CLI_PATH, "checkpoint"], { cwd: root, encoding: "utf-8", timeout: 60000 })
  const output = JSON.parse(proc.stdout.trim())
  assert.equal(proc.status, 1, "checkpoint should exit non-zero on the wrong branch under enforce")
  assert.equal(output.steps.executionBranch.ok, false, "executionBranch step should be blocked on main")
  assert.ok(
    output.steps.executionBranch.requiredBranch === names.slug,
    `required branch should cite the slug form ${names.slug}: ${JSON.stringify(output.steps.executionBranch)}`,
  )
  assert.strictEqual(output.currentBranch, "main", "checkpoint should report the current branch")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] checkpoint branch step blocks on main under enforce and names the required branch")
}

async function testCliAutoCreatesCanonicalBranchOnMainUnderEnforce() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-cli-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-cli"
  const expeditionId = "e-cli-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  switchToMain(root)

  // The CLI composes the preferred slug form from the mission/expedition
  // records; the gate must accept the branch it just created.
  const names = expeditionBranchNames(missionId, `Mission ${missionId}`, expeditionId, `Expedition ${expeditionId}`)
  const proc = spawnSync("node", [CLI_PATH, "expedition", "start", "--id", expeditionId], {
    cwd: root,
    encoding: "utf-8",
    timeout: 60000,
  })
  const output = JSON.parse(proc.stdout.trim())
  assert.equal(proc.status, 0, `expedition start should auto-create the branch on main under enforce: ${output.error || JSON.stringify(output)}`)
  assert.strictEqual(currentBranch(root), names.slug, "CLI should switch to the slug-form canonical expedition branch")
  assert.ok(
    output.executionBranch && output.executionBranch.branch === names.slug && output.executionBranch.created === true,
    `CLI should report the auto-created execution branch: ${JSON.stringify(output.executionBranch)}`,
  )

  const logPath = path.join(root, ".synth", "data", "event-log.jsonl")
  const log = fs.readFileSync(logPath, "utf-8").trim().split("\n").map((l) => JSON.parse(l))
  assert.ok(
    log.some((e) => e.type === "EXPEDITION_BRANCH_CREATED" && e.payload?.expeditionId === expeditionId && e.payload?.branch === names.slug),
    "EXPEDITION_BRANCH_CREATED should be recorded for the auto-created branch",
  )

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] CLI expedition start auto-creates the canonical branch under enforce")
}

async function testCliStartOnCanonicalBranchDoesNotRecreate() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "synth-bg-cli2-"))
  gitInit(root)
  readConfig(root)
  const ctx = await makeCtx(root)

  const missionId = "m-cli2"
  const expeditionId = "e-cli2-001"
  await seedMissionAndExpedition(ctx, root, missionId, expeditionId)
  checkout(root, `expedition/${missionId}/${expeditionId}`)

  const logPath = path.join(root, ".synth", "data", "event-log.jsonl")
  const before = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean).length

  const proc = spawnSync("node", [CLI_PATH, "expedition", "start", "--id", expeditionId], {
    cwd: root,
    encoding: "utf-8",
    timeout: 60000,
  })
  const output = JSON.parse(proc.stdout.trim())
  assert.equal(proc.status, 0, `expedition start should succeed on the canonical branch: ${output.error || JSON.stringify(output)}`)
  assert.ok(!output.executionBranch, "No executionBranch report when already on the canonical branch")

  const log = fs.readFileSync(logPath, "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  const createdCount = log.slice(before).filter((e) => e.type === "EXPEDITION_BRANCH_CREATED").length
  assert.strictEqual(createdCount, 0, "EXPEDITION_BRANCH_CREATED must not be emitted when already on the canonical branch")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] CLI expedition start on the canonical branch does not recreate it")
}

async function main() {
  await testEnforceStartExpeditionBlocksOnMain()
  await testEnforceAcceptsLegacyCanonicalBranchForm()
  await testEnforceApproveMissionBlocksOnMain()
  await testDefaultPolicyNeverBlocks()
  await testChoreLaneAllowsAllowlistedCapabilityOnMain()
  await testChoreLaneBlocksWhenAllowChoreOnMainDisabled()
  await testCheckpointBranchStepBlocksOnMainUnderEnforce()
  await testCliAutoCreatesCanonicalBranchOnMainUnderEnforce()
  await testCliStartOnCanonicalBranchDoesNotRecreate()
  console.log("\nAll execution-branch gate tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})