// ============================================================
// Event-Log Lineage Guard — CLI Integration Tests (expedition e617ccd0ac6d60b8)
// ============================================================
// Proves the pre-flight guard blocks a lifecycle mutation when the current
// branch's derived event log has diverged from a sibling ref of the SAME
// expedition (each side carries an exclusive event), and that a strict-prefix
// branch is accepted.
//
// The guard only engages for branches whose name embeds the expedition short-id
// (naming: expedition/<mission-slug>-<missionId>/<subject-slug>-<expeditionId>);
// it then compares only against local sibling branches carrying that id. To
// exercise it deterministically we synthesise sibling branches with embedded
// hex ids and divergent committed event logs — no live mission/expedition needed.
// ============================================================

import { spawnSync, execFileSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const EID = "e1a2b3c" // hex expedition short-id embedded in branch names

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], { cwd, encoding: "utf-8", timeout: 60000 })
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status }
}
function git(args, cwd) { return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }) }
function assert(cond, msg) { if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`) }

function branchName(suffix = "") {
  return `expedition/framework-maturation-v2-4ab7e9d/verify-x-${EID}${suffix}`
}
function eventLine(n) { return JSON.stringify({ type: "task", n }) }

async function setupProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-lineage-guard-"))
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "t", version: "1.0.0" }), "utf-8")
  const b = runSynth(["bootstrap", dir, "--approve"], process.cwd())
  assert(b.status === 0, `bootstrap must exit 0:\n${b.stderr}`)
  try { git(["rev-parse", "--is-inside-work-tree"], dir) } catch { git(["init", "-b", "main"], dir) }
  git(["config", "user.email", "t@t.dev"], dir)
  git(["config", "user.name", "test"], dir)
  git(["commit", "--allow-empty", "-m", "init"], dir)
  return dir
}
function writeLog(dir, lines) {
  return fs.writeFile(path.join(dir, ".synth", "data", "event-log.jsonl"), lines.join("\n") + "\n", "utf-8")
}
function commitLog(dir, msg) {
  // Force-add: the project may carry a gitignore for .synth/data.
  git(["add", "-f", ".synth/data"], dir)
  try { git(["commit", "-m", msg], dir) } catch { git(["commit", "--allow-empty", "-m", msg], dir) }
}

async function testDivergedMutationIsBlocked() {
  const dir = await setupProject()
  // Current branch carries the expedition id so the guard engages.
  git(["checkout", "-b", branchName()], dir)
  await writeLog(dir, [eventLine(0)])
  commitLog(dir, "base")
  // Branch A (current): L0 + eA
  await writeLog(dir, [eventLine(0), eventLine(1)])
  commitLog(dir, "A")
  // Sibling branch, same expedition id, diverged: L0 + eA + eB
  git(["checkout", "-b", branchName("-sib")], dir)
  await writeLog(dir, [eventLine(0), eventLine(1), eventLine(2)])
  commitLog(dir, "sib")
  // Back on A, add an EXCLUSIVE event eA2 (sibling lacks it) -> true divergence.
  git(["checkout", branchName()], dir)
  await writeLog(dir, [eventLine(0), eventLine(1), eventLine(3)])
  commitLog(dir, "A2")
  // A guarded mutation must be blocked: sibling eB is exclusive to its ref.
  const blocked = runSynth(["expedition", "approve", "--draft-id", "bogus"], dir)
  assert(blocked.status !== 0, `guarded mutation must be blocked on a diverged branch, got status ${blocked.status}`)
  const out = blocked.stdout + blocked.stderr
  assert(out.includes("EVENT_LOG_DIVERGENCE"), `block must cite EVENT_LOG_DIVERGENCE, got:\n${out}`)
  git(["checkout", "main"], dir)
  await fs.rm(dir, { recursive: true, force: true })
  console.log("[PASS] diverged mutation is blocked with EVENT_LOG_DIVERGENCE")
}

async function testPrefixBranchIsAccepted() {
  const dir = await setupProject()
  git(["checkout", "-b", branchName()], dir)
  await writeLog(dir, [eventLine(0)])
  commitLog(dir, "base")
  // Branch A (current): L0 + eA
  await writeLog(dir, [eventLine(0), eventLine(1)])
  commitLog(dir, "A")
  // Sibling is a SUPERSET (L0 + eA + eB); A is a strict prefix of it.
  git(["checkout", "-b", branchName("-sib")], dir)
  await writeLog(dir, [eventLine(0), eventLine(1), eventLine(2)])
  commitLog(dir, "sib")
  git(["checkout", branchName()], dir)
  // A guarded mutation must be accepted (stale-but-safe prefix protocol).
  const ok = runSynth(["expedition", "approve", "--draft-id", "bogus"], dir)
  const out = ok.stdout + ok.stderr
  assert(!out.includes("EVENT_LOG_DIVERGENCE"), `strict-prefix branch must NOT be blocked:\n${out}`)
  git(["checkout", "main"], dir)
  await fs.rm(dir, { recursive: true, force: true })
  console.log("[PASS] strict-prefix branch is accepted")
}

async function main() {
  await testDivergedMutationIsBlocked()
  await testPrefixBranchIsAccepted()
  console.log("\nAll event-log lineage guard CLI tests passed.")
}
main().catch((err) => { console.error(err); process.exit(1) })
