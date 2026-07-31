// ============================================================
// EXPLAIN STATUS ACTIONABLE TESTS (EXP-EXPLAIN-001)
// ============================================================
// Verify that `synth explain status` classifies the current situation
// and returns a concrete next command for each governance state.
//
// Each test creates a temporary SYNTH project, runs the CLI in that
// directory, and inspects the JSON output.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

let seq = 0
function makeEvent(type, payload) {
  seq += 1
  return {
    id: `evt-${seq}`,
    type,
    timestamp: seq,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

function missionCreated(id, overrides = {}) {
  return makeEvent("MISSION_CREATED", {
    mission: {
      id,
      name: `Mission ${id}`,
      purpose: "purpose",
      status: "draft",
      expeditions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
    },
  })
}

function expeditionCreated(id, missionId, overrides = {}) {
  return makeEvent("EXPEDITION_CREATED", {
    expedition: {
      id,
      name: `Expedition ${id}`,
      goal: "goal",
      status: "draft",
      objectives: [],
      discoveries: [],
      decisions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      missionId,
      ...overrides,
    },
  })
}

function workItemCreated(id) {
  return makeEvent("WORK_ITEM_CREATED", {
    workItem: { id, status: "idle", dependencies: [], metadata: {}, createdAt: 1, updatedAt: 1 },
  })
}

function runExplainStatus(cwd) {
  const result = spawnSync(process.execPath, [CLI_PATH, "explain", "status", "--json"], {
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
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

function makeProject(events, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explain-status-"))
  const synthDir = path.join(dir, ".synth")
  const dataDir = path.join(synthDir, "data")
  fs.mkdirSync(dataDir, { recursive: true })

  // Minimal manifest so the runtime routes data through .synth/data/.
  fs.writeFileSync(path.join(synthDir, "manifest.json"), "{}\n")

  fs.writeFileSync(
    path.join(dataDir, "event-log.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  )

  if (options.canonicalState) {
    fs.writeFileSync(path.join(dataDir, "canonical-state.json"), JSON.stringify(options.canonicalState, null, 2))
  }

  if (options.draft) {
    const draftsDir = path.join(dataDir, "drafts")
    fs.mkdirSync(draftsDir, { recursive: true })
    fs.writeFileSync(path.join(draftsDir, `${options.draft.id}.json`), JSON.stringify(options.draft, null, 2))
  }

  return dir
}

test("explain status: healthy project", () => {
  const events = [
    missionCreated("m1"),
    makeEvent("MISSION_APPROVED", { id: "m1" }),
    expeditionCreated("e1", "m1"),
    makeEvent("EXPEDITION_APPROVED", { id: "e1" }),
  ]
  const dir = makeProject(events)
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "ExplainStatus")
  assert.strictEqual(report.situation, "healthy")
  assert.strictEqual(report.blockers.length, 0)
  assert.ok(report.nextCommand, "expected a next command")
})

test("explain status: pending approval", () => {
  const events = [missionCreated("m1")]
  const draft = {
    id: "m1",
    confidence: { overall: 0.9 },
    unknowns: [],
    approvalState: "draft",
    createdAt: Date.now(),
  }
  const dir = makeProject(events, { draft })
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.situation, "pending-approval")
  assert.match(report.nextCommand, /synth mission approve/)
})

test("explain status: blocked by work item", () => {
  const events = [
    missionCreated("m1"),
    makeEvent("MISSION_APPROVED", { id: "m1" }),
    expeditionCreated("e1", "m1"),
    makeEvent("EXPEDITION_STARTED", { id: "e1" }),
    workItemCreated("w1"),
    makeEvent("WORK_ITEM_BLOCKED", { workItemId: "w1", reason: "dependency missing" }),
  ]
  const dir = makeProject(events)
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.situation, "blocked")
  assert.match(report.nextCommand, /synth explain diagnostics/)
})

test("explain status: missing capability during execution", () => {
  const events = [
    missionCreated("m1"),
    makeEvent("MISSION_APPROVED", { id: "m1" }),
    expeditionCreated("e1", "m1"),
    makeEvent("EXPEDITION_STARTED", { id: "e1" }),
  ]
  const dir = makeProject(events)
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.situation, "missing-capability")
  assert.match(report.nextCommand, /synth expedition certify --id e1/)
  assert.ok(report.reason.includes("convergence") || report.summary.includes("convergence"))
})

test("explain status: replay divergence from hand-edited canonical state", () => {
  const events = [
    missionCreated("m1"),
    makeEvent("MISSION_APPROVED", { id: "m1" }),
  ]
  const canonicalState = {
    lastEventOffset: events.length,
    stateHash: "deadbeef-deadbeef-deadbeef",
    missions: {},
    expeditions: {},
    objectives: {},
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    discoveries: {},
    decisions: {},
  }
  const dir = makeProject(events, { canonicalState })
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.situation, "replay-divergence")
  assert.match(report.nextCommand, /synth repair replay/)
  assert.ok(report.reason.includes("hand-edited") || report.summary.includes("edited"))
})

test("explain status: replay divergence from event-log corruption", () => {
  const events = [missionCreated("m1")]
  const canonicalState = {
    lastEventOffset: 100,
    stateHash: "deadbeef-deadbeef-deadbeef",
    missions: {},
    expeditions: {},
    objectives: {},
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    discoveries: {},
    decisions: {},
  }
  const dir = makeProject(events, { canonicalState })
  const run = runExplainStatus(dir)
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.situation, "replay-divergence")
  assert.match(report.nextCommand, /synth explain diagnostics/)
  assert.ok(report.reason.includes("incomplete") || report.summary.includes("out of sync"))
})
