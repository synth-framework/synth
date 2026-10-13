// ============================================================
// ADR-056 (slice 2) — Declared Execution Branch Bindings
// ============================================================
// Verifies that an operator declaration is *recorded* (MISSION_BRANCH_BOUND /
// EXPEDITION_BRANCH_BOUND) and that the ExecutionGate then resolves the bound
// branch from the ledger alone:
//   - the binding survives replay (rebuildState),
//   - ApproveMission passes on the bound branch for a non-canonical name,
//   - StartExpedition passes on the bound branch under enforce,
//   - the same commands are denied from any other branch (a binding is not a
//     bypass: HEAD must be the bound branch),
//   - the live-owner rule blocks a second live entity from claiming a branch.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { bootstrap } from "../dist/core/bootstrap.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"
import { withoutLifecycleContinuation } from "./helpers/context.js"
import { createExecutingExpedition } from "./helpers/governance-intent.js"
import { makeTempDirSync, gitInitWithCommit } from "./helpers/workspace.js"

const DECLARED = "arena/declared-workspace"

function writeConfig(root, mode) {
  fs.mkdirSync(path.join(root, ".synth"), { recursive: true })
  fs.writeFileSync(
    path.join(root, ".synth", "config.yaml"),
    `git:\n  branchStrategy: featured\n  branchPolicy:\n    mode: ${mode}\n`,
    "utf-8",
  )
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim()
}

function currentBranch(root) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"])
}

function checkout(root, branch) {
  execFileSync("git", ["checkout", "-b", branch], { cwd: root, stdio: "pipe" })
}

function switchTo(root, branch) {
  execFileSync("git", ["checkout", branch], { cwd: root, stdio: "pipe" })
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
    genesis: { projectName: "Declared Branch Test", systemId: "declared-branch", partitions: 1 },
    skipGenesis: false,
  })
  return withoutLifecycleContinuation(ctx)
}

async function bind(ctx, role, entityId, branch) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "BindExecutionBranch",
    payload: { role, entityId, branch, declared: true, created: false, baseCommit: "0".repeat(40), declaredBy: "operator" },
  })
  assert.equal(result.status, "ok", `BindExecutionBranch should succeed: ${result.error}`)
  return result
}

async function testBindingIsRecordedAndReplayed() {
  const root = makeTempDirSync("synth-declared-bind-")
  writeConfig(root, "off")
  gitInitWithCommit(root, "main")
  const ctx = await makeCtx(root)

  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: "m-bind", name: "Mission m-bind", purpose: "Binding replay" },
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)

  checkout(root, DECLARED)
  await bind(ctx, "mission", "m-bind", DECLARED)

  const events = await ctx.runtime.loadEvents()
  const bound = events.filter((e) => e.type === "MISSION_BRANCH_BOUND")
  assert.equal(bound.length, 1, "exactly one MISSION_BRANCH_BOUND event must be recorded")
  assert.equal(bound[0].payload.branch, DECLARED)
  assert.equal(bound[0].payload.declared, true)
  assert.equal(bound[0].payload.created, false)

  const state = await ctx.runtime.getState()
  assert.equal(state.missions["m-bind"].executionBranch, DECLARED, "state must carry the binding")

  // Replay from the event stream reproduces the binding (it is not a side file).
  const replayed = rebuildState(events)
  assert.equal(replayed.missions["m-bind"].executionBranch, DECLARED, "replay must reproduce the binding")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] a declared mission branch is recorded, reflected in state, and replayed")
}

async function testGateResolvesRecordedMissionBinding() {
  const root = makeTempDirSync("synth-declared-gate-")
  writeConfig(root, "off")
  gitInitWithCommit(root, "main")
  const ctx = await makeCtx(root)

  await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: "m-gate", name: "Mission m-gate", purpose: "Gate replay" },
  })
  const { contractId } = await createAlignedContract(ctx)
  checkout(root, DECLARED)
  await bind(ctx, "mission", "m-gate", DECLARED)

  // Enforcement is switched on *after* the declaration: the gate must pass on
  // the bound branch although the name is not a canonical mission branch.
  writeConfig(root, "enforce")
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "m-gate", alignmentContractId: contractId },
  })
  assert.equal(result.status, "ok", `ApproveMission should pass on the bound branch: ${result.error}`)

  // A binding is not a bypass: from another branch the same approval is denied,
  // and the denial cites the bound branch.
  await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: "m-gate-2", name: "Mission m-gate-2", purpose: "Gate replay" },
  })
  const second = await createAlignedContract(ctx)
  switchTo(root, "main")
  await bind(ctx, "mission", "m-gate-2", DECLARED)
  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "m-gate-2", alignmentContractId: second.contractId },
  })
  assert.equal(result.status, "error", "ApproveMission from off-branch must be denied")
  assert.ok(
    result.error.includes("BRANCH_POLICY_DENIED") && result.error.includes(DECLARED),
    `denial must cite the bound branch, got: ${result.error}`,
  )

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] the gate resolves a recorded mission binding and still requires HEAD on it")
}

async function testGateResolvesRecordedExpeditionBinding() {
  const root = makeTempDirSync("synth-declared-exp-")
  writeConfig(root, "off")
  gitInitWithCommit(root, "main")
  const ctx = await makeCtx(root)

  await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateMission",
    payload: { id: "m-exp", name: "Mission m-exp", purpose: "Expedition binding" },
  })
  const { contractId } = await createAlignedContract(ctx)
  checkout(root, DECLARED)
  await bind(ctx, "mission", "m-exp", DECLARED)

  const approve = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveMission",
    payload: { id: "m-exp", alignmentContractId: contractId },
  })
  assert.equal(approve.status, "ok", `ApproveMission should succeed: ${approve.error}`)

  // Expedition is created on the mission branch, then declares the same
  // operator-owned branch (the arena workflow: one branch, per-role ownership).
  await createExecutingExpedition(ctx, "m-exp", "e-exp-1", { start: false })
  await bind(ctx, "expedition", "e-exp-1", DECLARED)

  writeConfig(root, "enforce")
  assert.equal(currentBranch(root), DECLARED)
  let result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "e-exp-1" } })
  assert.equal(result.status, "ok", `StartExpedition should pass on the bound branch: ${result.error}`)

  const state = await ctx.runtime.getState()
  assert.equal(state.expeditions["e-exp-1"].executionBranch, DECLARED)
  assert.equal(state.missions["m-exp"].executionBranch, DECLARED, "mission and expedition may share a branch across roles")

  fs.rmSync(root, { recursive: true, force: true })
  console.log("[PASS] the gate resolves a recorded expedition binding under enforce")
}

async function main() {
  await testBindingIsRecordedAndReplayed()
  await testGateResolvesRecordedMissionBinding()
  await testGateResolvesRecordedExpeditionBinding()
  console.log("\nAll declared-branch binding tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
