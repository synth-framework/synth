// Certification tests for EXP-RUNTIME-001 — Runtime Correctness and Recovery.
//
// These tests certify that Mission approval is atomic (runtime events precede
// snapshot persistence) and that `synth repair replay` can recover from missing
// runtime events using only public CLI commands.

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST_SYNTH = path.join(REPO_ROOT, "dist", "cli", "synth.js")

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`✓ ${message}`)
  } else {
    failed++
    console.error(`✗ ${message}`)
  }
}

function makeWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "synth-runtime-"))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

function runCli(dir, args) {
  const env = { ...process.env }
  delete env.SYNTH_GOVERN_DEPTH
  const res = spawnSync(process.execPath, [DIST_SYNTH, ...args], {
    cwd: dir,
    env,
    timeout: 30000,
    encoding: "utf8",
    killSignal: "SIGKILL",
  })
  return {
    status: res.status,
    output: `${res.stdout || ""}${res.stderr || ""}`,
    timedOut: Boolean(res.error && res.error.code === "ETIMEDOUT"),
  }
}

function createDraft(dir) {
  const r = runCli(dir, ["mission", "create", "--subject", "Fixture Mission", "--purpose", "Demonstrate runtime guarantees."])
  return r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
}

function evidenceAdd(dir, draftId, subject) {
  const r = runCli(dir, ["mission", "evidence", "add", "--draft-id", draftId, "--subject", subject])
  return r.output.match(/"draftId":\s*"([^"]+)"/)?.[1]
}

function approve(dir, draftId) {
  return runCli(dir, ["mission", "approve", "--draft-id", draftId])
}

function readEventLog(dir) {
  const file = path.join(dir, "data", "event-log.jsonl")
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function listSnapshots(dir) {
  const snapshotDir = path.join(dir, "data", "snapshots")
  try {
    return fs.readdirSync(snapshotDir).filter((f) => f.endsWith(".json"))
  } catch {
    return []
  }
}

function main() {
  if (!fs.existsSync(DIST_SYNTH)) {
    console.error("dist/cli/synth.js not found; run `npm run build` first.")
    process.exit(1)
  }

  // 1. Mission approval emits runtime events before persisting the snapshot.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      const r = approve(dir, draftId)
      assert(r.status === 0, "Approval fixture: mission approval succeeds")
      assert(/"approved": true/.test(r.output), "Approval fixture: output reports approved")

      const events = readEventLog(dir)
      const created = events.some((e) => e.type === "MISSION_CREATED")
      const approved = events.some((e) => e.type === "MISSION_APPROVED")
      assert(created, "Atomicity: MISSION_CREATED event is present in the event log")
      assert(approved, "Atomicity: MISSION_APPROVED event is present in the event log")

      const snapshots = listSnapshots(dir)
      assert(snapshots.length >= 1, "Atomicity: an approved snapshot is persisted")
    } finally {
      cleanup(dir)
    }
  }

  // 2. Repair detects missing runtime events and proposes compensating actions.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      approve(dir, draftId)

      // Simulate a runtime-side failure: the certified snapshot remains, but
      // the runtime events that should have accompanied it are lost.
      const logFile = path.join(dir, "data", "event-log.jsonl")
      const surviving = readEventLog(dir).filter(
        (e) => e.type !== "MISSION_CREATED" && e.type !== "MISSION_APPROVED",
      )
      fs.writeFileSync(logFile, surviving.map((e) => JSON.stringify(e)).join("\n") + "\n")

      const dryRun = runCli(dir, ["repair", "replay"])
      assert(dryRun.status === 0, "Repair dry-run: exits successfully")
      assert(/"kind":\s*"RepairReport"/.test(dryRun.output), "Repair dry-run: returns a RepairReport")
      assert(/"status":\s*"proposed"/.test(dryRun.output), "Repair dry-run: proposes at least one repair")
      assert(/"requiredActions"/.test(dryRun.output), "Repair dry-run: lists required actions")
      assert(!/"status":\s*"repaired"/.test(dryRun.output), "Repair dry-run: does not apply repairs")
    } finally {
      cleanup(dir)
    }
  }

  // 3. Repair --approve recovers runtime consistency using only public commands.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      approve(dir, draftId)

      const logFile = path.join(dir, "data", "event-log.jsonl")
      const surviving = readEventLog(dir).filter(
        (e) => e.type !== "MISSION_CREATED" && e.type !== "MISSION_APPROVED",
      )
      fs.writeFileSync(logFile, surviving.map((e) => JSON.stringify(e)).join("\n") + "\n")

      const apply = runCli(dir, ["repair", "replay", "--approve"])
      assert(apply.status === 0, "Repair apply: exits successfully")
      assert(/"status":\s*"repaired"/.test(apply.output), "Repair apply: reports a repaired entry")

      const events = readEventLog(dir)
      assert(events.some((e) => e.type === "MISSION_CREATED"), "Repair apply: MISSION_CREATED event restored")
      assert(events.some((e) => e.type === "MISSION_APPROVED"), "Repair apply: MISSION_APPROVED event restored")

      const replay = runCli(dir, ["explain", "replay"])
      assert(replay.status === 0, "Repair apply: replay verification passes")
      assert(/"consistent":\s*true/.test(replay.output), "Repair apply: replay reports consistent")
    } finally {
      cleanup(dir)
    }
  }

  // 4. Repair is idempotent: re-running on a consistent runtime needs no changes.
  {
    const dir = makeWorkspace()
    try {
      let draftId = createDraft(dir)
      draftId = evidenceAdd(dir, draftId, "Operator domain knowledge")
      draftId = evidenceAdd(dir, draftId, "Operational constraints")
      approve(dir, draftId)

      const rerun = runCli(dir, ["repair", "replay", "--approve"])
      assert(rerun.status === 0, "Idempotent repair: exits successfully")
      assert(/"status":\s*"consistent"/.test(rerun.output), "Idempotent repair: reports consistent snapshots")
      assert(!/"status":\s*"repaired"/.test(rerun.output), "Idempotent repair: does not re-emit events")
    } finally {
      cleanup(dir)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
