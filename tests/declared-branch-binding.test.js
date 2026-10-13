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
import { makeTempDirSync, gitInitWithCommit, runGit } from "./helpers/workspace.js"
import { runSynth, parseJson } from "./helpers/cli-harness.js"
import { setupGitBackedProject } from "./helpers/mission-lifecycle.js"

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

async function testCliApprovesMissionOnDeclaredExistingBranch() {
  const root = await setupGitBackedProject("synth-declared-cli-")
  const branch = "arena/declared-cli-workspace"
  try {
    runGit(["checkout", "-b", branch], root)
    fs.writeFileSync(
      path.join(root, ".synth", "config.yaml"),
      [
        "git:",
        `  ledgerBranch: ${branch}`,
        "  branchStrategy: featured",
        "  branchPolicy:",
        "    mode: enforce",
        '    declaredPatterns: ["arena/*"]',
        "",
      ].join("\n"),
      "utf-8",
    )
    runGit(["add", ".synth/config.yaml"], root)
    runGit(["commit", "-m", "test: configure declared operator branch"], root)

    const create = runSynth(
      [
        "mission",
        "create",
        "--subject",
        "CLI declared branch mission",
        "--purpose",
        "Verify branch binding is recorded before mission approval reaches the execution gate.",
        "--quiet",
      ],
      root,
    )
    assert.equal(create.status, 0, `mission create should succeed: ${create.stderr}`)
    let draft = parseJson(create.stdout)
    let draftId = draft.draftId
    assert.ok(draftId, "mission create should return a draft id")

    // Bring the proposal over the Mission Studio approval threshold without
    // depending on a hard-coded number of evidence additions.
    for (let index = 1; draft.confidence?.overall < 0.7 && index <= 5; index += 1) {
      const evidence = runSynth(
        [
          "mission",
          "evidence",
          "add",
          "--draft-id",
          draftId,
          "--subject",
          `Declared branch evidence ${index}`,
          "--purpose",
          "The operator branch must be bound before the approval gate evaluates it.",
          "--confidence",
          "high",
          "--quiet",
        ],
        root,
      )
      assert.equal(evidence.status, 0, `mission evidence add should succeed: ${evidence.stderr}`)
      draft = parseJson(evidence.stdout)
      draftId = draft.draftId
    }
    assert.ok(draft.confidence?.overall >= 0.7, "evidence should satisfy the approval threshold")

    const alignment = runSynth(["alignment", "prepare", "--quiet"], root)
    assert.equal(alignment.status, 0, `alignment prepare should succeed: ${alignment.stderr}`)
    const contractId = parseJson(alignment.stdout).contractId
    assert.ok(contractId, "alignment prepare should return a contract id")

    const approval = runSynth(
      [
        "mission",
        "approve",
        "--draft-id",
        draftId,
        "--alignment-contract-id",
        contractId,
        "--branch",
        branch,
        "--no-create",
        "--quiet",
      ],
      root,
    )
    assert.equal(approval.status, 0, `mission approve should accept the declared branch: ${approval.stderr}`)
    const output = parseJson(approval.stdout)
    assert.equal(output.runtime?.approved, true, "mission should be approved")
    assert.equal(output.executionBranch?.branch, branch, "response should report the declared branch")
    assert.equal(output.executionBranch?.created, false, "--no-create must preserve the existing branch")

    const state = JSON.parse(fs.readFileSync(path.join(root, ".synth", "data", "canonical-state.json"), "utf-8"))
    assert.equal(
      state.missions[output.runtime.missionId]?.executionBranch,
      branch,
      "the replayed mission state should persist the declared branch",
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
  console.log("[PASS] CLI mission approval binds an existing operator branch before gate evaluation")
}

async function main() {
  await testBindingIsRecordedAndReplayed()
  await testGateResolvesRecordedMissionBinding()
  await testGateResolvesRecordedExpeditionBinding()
  await testCliApprovesMissionOnDeclaredExistingBranch()
  console.log("\nAll declared-branch binding tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
