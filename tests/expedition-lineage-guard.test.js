// ============================================================
// Event-Log Lineage Guard — CLI Integration Tests (expedition e617ccd0ac6d60b8)
// ============================================================
// Proves the pre-flight guard blocks a lifecycle mutation when the current
// branch's derived event log has diverged from a sibling ref (each side
// carries an exclusive event), and that a strict-prefix branch is accepted.
// ============================================================

import { spawnSync, execFileSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], { cwd, encoding: "utf-8", timeout: 60000 })
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status }
}
function parseJson(stdout) {
  try { return JSON.parse(stdout.trim()) } catch (err) { throw new Error(`Failed to parse CLI output:\n${stdout}`) }
}
function git(args, cwd) { return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }) }
function assert(cond, msg) { if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`) }

async function setupProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-lineage-guard-"))
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "t", version: "1.0.0" }), "utf-8")
  const b = runSynth(["bootstrap", dir, "--approve"], process.cwd())
  assert(b.status === 0, `bootstrap must exit 0:\n${b.stderr}`)
  try { git(["rev-parse", "--is-inside-work-tree"], dir) } catch { git(["init", "-b", "main"], dir) }
  git(["config", "user.email", "t@t.dev"], dir)
  git(["commit", "--allow-empty", "-m", "init"], dir)
  git(["config", "user.name", "test"], dir)
  return dir
}
function commitState(dir, msg) {
  git(["add", ".synth/data"], dir)
  // Allow empty commits when nothing new (idempotent safe point).
  try { git(["commit", "-m", msg], dir) } catch { git(["commit", "--allow-empty", "-m", msg], dir) }
}
// Create + approve a mission. The Mission Studio confidence gate is stochastic,
// so we follow the documented flow: each `evidence add` mints a successor draft
// that is then approved; loop until approval clears the threshold.
async function createAndApproveMission(dir) {
  const c = runSynth(["mission", "create", "--subject", "M", "--purpose", "p"], dir)
  assert(c.status === 0, `mission create:\n${c.stderr}`)
  const dataDir = path.join(dir, ".synth", "data")
  let draftId = parseJson(c.stdout).draftId
  let approved = false
  let missionId
  const { bootstrap } = await import("../dist/core/bootstrap.js")
  const { createAlignedContract } = await import("./helpers/alignment-fixture.js")
  const ctx = await bootstrap({ skipGenesis: true, infra: { eventLogPath: path.join(dataDir, "event-log.jsonl"), statePath: path.join(dataDir, "canonical-state.json") } })
  const { contractId } = await createAlignedContract(ctx)
  for (let i = 0; i < 4 && !approved; i++) {
    const e = runSynth(["mission", "evidence", "add", "--draft-id", draftId, "--subject", `e${i}`, "--purpose", "p", "--confidence", "certain"], dir)
    assert(e.status === 0, `mission evidence add:\n${e.stderr}`)
    const nextDraft = parseJson(e.stdout).draftId
    const a = runSynth(["mission", "approve", "--draft-id", nextDraft, "--alignment-contract-id", contractId], dir)
    assert(a.status === 0, `mission approve:\n${a.stderr}`)
    const ao = parseJson(a.stdout)
    if (ao.decision?.approved) {
      approved = true
      const state = JSON.parse(await fs.readFile(path.join(dataDir, "canonical-state.json"), "utf-8"))
      missionId = Object.keys(state.missions || {})[0]
    } else {
      draftId = nextDraft
    }
  }
  assert(approved, "mission approval could not clear the confidence threshold")
  return missionId
}
function createExpedition(dir, missionId) {
  const c = runSynth(["expedition", "create", "--mission", missionId, "--subject", "E", "--goal", "g"], dir)
  assert(c.status === 0, `expedition create:\n${c.stderr}`)
  return parseJson(c.stdout).draftId
}

async function testDivergedMutationIsBlocked() {
  const dir = await setupProject()
  const missionId = await createAndApproveMission(dir)
  // Base lineage on main: expedition E1 create + approve.
  const e1 = createExpedition(dir, missionId)
  runSynth(["expedition", "approve", "--draft-id", e1], dir)
  commitState(dir, "base")

  // Feature branch gains an exclusive event (E2 approve) and commits it.
  git(["checkout", "-b", "feature"], dir)
  const e2 = createExpedition(dir, missionId)
  runSynth(["expedition", "approve", "--draft-id", e2], dir)
  commitState(dir, "feature-exclusive")

  // Back on main, add a different exclusive event (E3 approve) and commit.
  git(["checkout", "main"], dir)
  const e3 = createExpedition(dir, missionId)
  runSynth(["expedition", "approve", "--draft-id", e3], dir)
  commitState(dir, "main-exclusive")

  // A guarded mutation on main must be blocked: feature's E2 is exclusive.
  const e4 = createExpedition(dir, missionId)
  const blocked = runSynth(["expedition", "approve", "--draft-id", e4], dir)
  assert(blocked.status !== 0, `guarded mutation must be blocked on a diverged branch, got status ${blocked.status}`)
  const out = blocked.stdout + blocked.stderr
  assert(out.includes("EVENT_LOG_DIVERGENCE"), `block must cite EVENT_LOG_DIVERGENCE, got:\n${out}`)
  git(["checkout", "main"], dir)
  await fs.rm(dir, { recursive: true, force: true })
  console.log("[PASS] diverged mutation is blocked with EVENT_LOG_DIVERGENCE")
}

async function testPrefixBranchIsAccepted() {
  const dir = await setupProject()
  const missionId = await createAndApproveMission(dir)
  // Build base lineage on main, then commit so the working tree is a clean L1.
  const e1 = createExpedition(dir, missionId)
  runSynth(["expedition", "approve", "--draft-id", e1], dir)
  commitState(dir, "base")
  // Feature is ahead (adds an exclusive E2) and commits it.
  git(["checkout", "-b", "feature"], dir)
  const e2 = createExpedition(dir, missionId)
  runSynth(["expedition", "approve", "--draft-id", e2], dir)
  commitState(dir, "feature-ahead")
  // Restore main's committed log into the working tree: current = L1, a strict
  // prefix of feature's L1,E2. A guarded mutation must be accepted (stale-safe).
  git(["checkout", "main", "--", ".synth/data"], dir)
  // e1 is already committed, so `start` is a valid guarded mutation that does
  // not first append a new event to the pre-command log.
  const ok = runSynth(["expedition", "start", "--id", e1], dir)
  assert(ok.status === 0, `strict-prefix branch must be accepted:\nSTDOUT=${ok.stdout}\nSTDERR=${ok.stderr}`)
  await fs.rm(dir, { recursive: true, force: true })
  console.log("[PASS] strict-prefix branch is accepted")
}

async function main() {
  await testDivergedMutationIsBlocked()
  await testPrefixBranchIsAccepted()
  console.log("\nAll event-log lineage guard CLI tests passed.")
}
main().catch((err) => { console.error(err); process.exit(1) })
