// ============================================================
// EXP-DRYRUN-001 — Pre-Flight Dry-Run for Lifecycle Commands
// ============================================================
// Verifies that lifecycle commands support --dry-run, return a
// LifecycleDryRun preview, and do not append events.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeTempProjectRoot() {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "dry-run-test-")))
}

function seedEvents(projectRoot, overrides = {}) {
  const dataDir = path.join(projectRoot, ".synth", "data")
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(projectRoot, ".synth", "manifest.json"), "{}\n")

  const events = [
    {
      id: "evt-1",
      type: "SYSTEM_GENESIS",
      timestamp: 1,
      transactionId: "tx-1",
      capability: "genesis",
      actor: "genesis",
      payload: { projectName: "Dry Run Test", systemId: "dry-run-test", partitions: 1 },
    },
    {
      id: "evt-2",
      type: "PROJECT_CREATED",
      timestamp: 2,
      transactionId: "tx-2",
      capability: "genesis",
      actor: "genesis",
      payload: { project: { id: "project-1", name: "Dry Run Test", status: "active", metadata: {}, createdAt: 2, updatedAt: 2 } },
    },
    {
      id: "evt-3",
      type: "MISSION_CREATED",
      timestamp: 3,
      transactionId: "tx-3",
      capability: "test",
      actor: "test",
      payload: {
        mission: {
          id: "m1",
          name: "Mission m1",
          purpose: "test",
          status: "active",
          expeditions: [],
          metadata: {},
          createdAt: 3,
          updatedAt: 3,
        },
      },
    },
    { id: "evt-4", type: "MISSION_APPROVED", timestamp: 4, transactionId: "tx-4", capability: "test", actor: "test", payload: { id: "m1" } },
    {
      id: "evt-5",
      type: "EXPEDITION_CREATED",
      timestamp: 5,
      transactionId: "tx-5",
      capability: "test",
      actor: "test",
      payload: {
        expedition: {
          id: "e1",
          missionId: "m1",
          name: "Expedition e1",
          goal: "test dry run",
          status: overrides.expeditionStatus ?? "draft",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: {},
          createdAt: 5,
          updatedAt: 5,
        },
      },
    },
  ]

  if (overrides.approved) {
    events.push({ id: "evt-6", type: "EXPEDITION_APPROVED", timestamp: 6, transactionId: "tx-6", capability: "test", actor: "test", payload: { id: "e1" } })
  }
  if (overrides.committed) {
    events.push({ id: "evt-7", type: "EXPEDITION_COMMITTED", timestamp: 7, transactionId: "tx-7", capability: "test", actor: "test", payload: { id: "e1" } })
  }
  if (overrides.started) {
    events.push({ id: "evt-8", type: "EXPEDITION_STARTED", timestamp: 8, transactionId: "tx-8", capability: "test", actor: "test", payload: { id: "e1" } })
  }

  fs.writeFileSync(
    path.join(dataDir, "event-log.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  )
}

function runSynth(args, cwd) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
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

function parseJson(stdout) {
  return JSON.parse(stdout.trim())
}

function eventCount(projectRoot) {
  const logPath = path.join(projectRoot, ".synth", "data", "event-log.jsonl")
  return fs.readFileSync(logPath, "utf-8").trim().split("\n").length
}

test("expedition approve --dry-run returns LifecycleDryRun without mutating event log", { concurrency: false }, () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir)
  const before = eventCount(dir)

  const result = runSynth(["expedition", "approve", "--draft-id", "e1", "--dry-run"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "LifecycleDryRun")
  assert.strictEqual(output.wouldAppend.type, "EXPEDITION_APPROVED")
  assert.strictEqual(output.stateDelta, "expedition e1 status: draft → approved")
  assert.strictEqual(eventCount(dir), before, "dry-run must not append events")
})

test("expedition commit --dry-run returns LifecycleDryRun without mutating event log", { concurrency: false }, () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir, { approved: true, expeditionStatus: "approved" })
  const before = eventCount(dir)

  const result = runSynth(["expedition", "commit", "--proposal-id", "e1", "--dry-run"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "LifecycleDryRun")
  assert.strictEqual(output.wouldAppend.type, "EXPEDITION_COMMITTED")
  assert.strictEqual(output.stateDelta, "expedition e1 status: approved → committed")
  assert.strictEqual(eventCount(dir), before, "dry-run must not append events")
})

test("expedition start --dry-run returns LifecycleDryRun without mutating event log", { concurrency: false }, () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir, { approved: true, committed: true, expeditionStatus: "committed" })
  const before = eventCount(dir)

  const result = runSynth(["expedition", "start", "--id", "e1", "--dry-run"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "LifecycleDryRun")
  assert.strictEqual(output.wouldAppend.type, "EXPEDITION_STARTED")
  assert.strictEqual(output.stateDelta, "expedition e1 status: committed → executing")
  assert.strictEqual(eventCount(dir), before, "dry-run must not append events")
})

test("expedition complete --dry-run returns LifecycleDryRun without mutating event log", { concurrency: false }, () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir, { approved: true, committed: true, started: true, expeditionStatus: "executing" })
  const before = eventCount(dir)

  const result = runSynth(["expedition", "complete", "--id", "e1", "--evidence", "proof/evidence.md", "--dry-run"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "LifecycleDryRun")
  assert.strictEqual(output.wouldAppend.type, "EXPEDITION_COMPLETED")
  assert.strictEqual(output.stateDelta, "expedition e1 status: executing → completed")
  assert.strictEqual(eventCount(dir), before, "dry-run must not append events")
})
