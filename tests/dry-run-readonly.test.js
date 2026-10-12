// Regression guard for expedition 5c2b2db1: --dry-run must be read-only.
// Snapshots governance state (event count, drafts, canonical hash), runs
// every mutating expedition subcommand with --dry-run against the live repo,
// and asserts zero state delta. A dry-run that persists anything fails.
//
// NOTE: `mission create` is intentionally excluded: it does not advertise
// --dry-run and has no dry-run branch (passing the flag would execute for
// real). That gap is tracked as follow-up work, not covered here.
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")
const ENTRY = path.join(REPO_ROOT, "dist", "cli", "entry.js")
const DATA = path.join(REPO_ROOT, ".synth", "data")

let failures = 0
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg)
    failures += 1
  } else {
    console.log("PASS:", msg)
  }
}

function countStreamEvents() {
  let count = 0
  const streamDir = path.join(DATA, "event-stream")
  if (!fs.existsSync(streamDir)) return 0
  for (const part of fs.readdirSync(streamDir).filter((p) => p.startsWith("partition-")).sort()) {
    const partDir = path.join(streamDir, part)
    if (!fs.statSync(partDir).isDirectory()) continue
    for (const seg of fs.readdirSync(partDir).filter((f) => f.endsWith(".jsonl")).sort()) {
      const raw = fs.readFileSync(path.join(partDir, seg), "utf-8")
      count += raw.split("\n").filter(Boolean).length
    }
  }
  return count
}

function snapshot() {
  const cs = JSON.parse(fs.readFileSync(path.join(DATA, "canonical-state.json"), "utf-8"))
  let porcelain = ""
  try {
    porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf-8" })
  } catch {
    porcelain = ""
  }
  return {
    events: countStreamEvents(),
    drafts: fs.existsSync(path.join(DATA, "drafts")) ? fs.readdirSync(path.join(DATA, "drafts")).sort() : [],
    offset: cs.lastEventOffset,
    hash: cs.stateHash,
    // Catches proof-artifact writes and git staging (telemetry is gitignored).
    porcelain,
  }
}

function sameState(a, b) {
  return (
    a.events === b.events &&
    a.offset === b.offset &&
    a.hash === b.hash &&
    JSON.stringify(a.drafts) === JSON.stringify(b.drafts) &&
    a.porcelain === b.porcelain
  )
}

function runDry(args) {
  try {
    execFileSync("node", [ENTRY, ...args], { cwd: REPO_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
  } catch (err) {
    // A dry-run may exit non-zero (e.g. gate BLOCK); the invariant under
    // test is read-only behavior, not the exit code.
    return { exit: err.status ?? 1 }
  }
  return { exit: 0 }
}

// 5c2b2db1 is executing (safe dry-run target); 4a3f7b93 is committed.
const EXECUTING = "5c2b2db11e77e740"
const COMMITTED = "4a3f7b93a4cc3e53"

const probes = [
  ["expedition", "create", "--mission", "Framework Maturation v2", "--subject", "DRYRUN-REGRESSION-PROBE", "--goal", "probe", "--dry-run"],
  ["expedition", "delete", "--id", COMMITTED, "--reason", "probe", "--dry-run"],
  ["expedition", "approve", "--draft-id", COMMITTED, "--dry-run"],
  ["expedition", "commit", "--proposal-id", COMMITTED, "--dry-run"],
  ["expedition", "start", "--id", COMMITTED, "--dry-run"],
  ["expedition", "complete", "--id", EXECUTING, "--dry-run"],
  ["expedition", "finish", "--id", EXECUTING, "--dry-run"],
  ["expedition", "cancel", "--id", COMMITTED, "--reason", "probe", "--dry-run"],
  ["expedition", "archive", "--id", COMMITTED, "--reason", "probe", "--dry-run"],
  ["expedition", "move", "--id", COMMITTED, "--to-mission", "9861cf62476c90ae", "--dry-run"],
  ["expedition", "evidence", "--id", EXECUTING, "--git-diff", "--note", "probe", "--dry-run"],
  ["expedition", "refine", "--id", EXECUTING, "--note", "probe", "--dry-run"],
  ["expedition", "certify", "--id", EXECUTING, "--dry-run"],
]

for (const args of probes) {
  const before = snapshot()
  runDry(args)
  const after = snapshot()
  assert(sameState(before, after), `dry-run is read-only: synth ${args.slice(0, 2).join(" ")}`)
}

console.log(failures === 0 ? "All dry-run read-only tests passed." : `${failures} dry-run read-only test(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
