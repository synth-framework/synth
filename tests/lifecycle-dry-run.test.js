import { makeTempDirSync } from "./helpers/workspace.js"
import { parseJson } from "./helpers/assert.js"
import { seedEvent, seedGenesisEvents } from "./helpers/kernel-event-fixtures.js"
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
  return fs.realpathSync.native(makeTempDirSync("dry-run-test-"))
}

function seedEvents(projectRoot, overrides = {}) {
  const dataDir = path.join(projectRoot, ".synth", "data")
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(projectRoot, ".synth", "manifest.json"), "{}\n")

  const events = [
    ...seedGenesisEvents("Dry Run Test", "dry-run-test"),
    seedEvent("evt-3", "MISSION_CREATED", 3,
      {
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
      }),
    seedEvent("evt-4", "MISSION_APPROVED", 4, { id: "m1" }),
    seedEvent("evt-5", "EXPEDITION_CREATED", 5,
      {
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
      }),
  ]

  if (overrides.approved) {
    events.push(seedEvent("evt-6", "EXPEDITION_APPROVED", 6, { id: "e1" }))
  }
  if (overrides.committed) {
    events.push(seedEvent("evt-7", "EXPEDITION_COMMITTED", 7, { id: "e1" }))
  }
  if (overrides.started) {
    events.push(seedEvent("evt-8", "EXPEDITION_STARTED", 8, { id: "e1" }))
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
