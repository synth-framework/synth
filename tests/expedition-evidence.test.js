// ============================================================
// EXP-EVIDENCE-001 — Automatic Expedition Evidence Capture
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import os from "os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeTempProjectRoot() {
  return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "evidence-test-")))
}

function seedEvents(projectRoot) {
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
      payload: { projectName: "Evidence Test", systemId: "evidence-test", partitions: 1 },
    },
    {
      id: "evt-2",
      type: "PROJECT_CREATED",
      timestamp: 2,
      transactionId: "tx-2",
      capability: "genesis",
      actor: "genesis",
      payload: { project: { id: "project-1", name: "Evidence Test", status: "active", metadata: {}, createdAt: 2, updatedAt: 2 } },
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
    {
      id: "evt-4",
      type: "EXPEDITION_CREATED",
      timestamp: 4,
      transactionId: "tx-4",
      capability: "test",
      actor: "test",
      payload: {
        expedition: {
          id: "e1",
          missionId: "m1",
          name: "Evidence Expedition",
          goal: "capture evidence",
          status: "executing",
          objectives: [],
          discoveries: [],
          decisions: [],
          dependsOn: [],
          metadata: {},
          createdAt: 4,
          updatedAt: 4,
        },
      },
    },
  ]

  fs.writeFileSync(path.join(dataDir, "event-log.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n")
}

function runSynth(args, cwd) {
  return spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, NODE_ENV: "test" },
  })
}

function parseJson(stdout) {
  return JSON.parse(stdout.trim())
}

function eventLog(projectRoot) {
  const logPath = path.join(projectRoot, ".synth", "data", "event-log.jsonl")
  return fs.readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line))
}

test("expedition evidence --git-diff captures patch and appends EVIDENCE_ATTACHED", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir)
  fs.writeFileSync(path.join(dir, "tracked.txt"), "change")
  spawnSync("git", ["init"], { cwd: dir })
  spawnSync("git", ["config", "user.email", "test@test.com"], { cwd: dir })
  spawnSync("git", ["config", "user.name", "Test"], { cwd: dir })
  spawnSync("git", ["add", "."], { cwd: dir })
  spawnSync("git", ["commit", "-m", "initial"], { cwd: dir })
  fs.writeFileSync(path.join(dir, "tracked.txt"), "changed")

  const result = runSynth(["expedition", "evidence", "--id", "e1", "--git-diff", "--note", "git diff capture"], dir)
  assert.strictEqual(result.status, 0, result.stderr)
  const output = parseJson(result.stdout)
  assert.strictEqual(output.kind, "EvidenceAttached")
  assert.strictEqual(output.expeditionId, "e1")

  const patchPath = path.join(dir, "proof", "expeditions", "e1", "git-diff.patch")
  assert.ok(fs.existsSync(patchPath), "git-diff.patch should exist")
  const patchContent = fs.readFileSync(patchPath, "utf-8")
  assert.ok(patchContent.includes("changed"), "patch should contain diff")

  const manifestPath = path.join(dir, "proof", "expeditions", "e1", "manifest.json")
  assert.ok(fs.existsSync(manifestPath), "manifest.json should exist")
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"))
  assert.strictEqual(manifest.expeditionId, "e1")
  assert.strictEqual(manifest.note, "git diff capture")
  assert.strictEqual(manifest.attachments.length, 1)
  assert.strictEqual(manifest.attachments[0].kind, "git-diff")

  const events = eventLog(dir)
  const evidenceEvent = events.find((e) => e.type === "EVIDENCE_ATTACHED")
  assert.ok(evidenceEvent, "EVIDENCE_ATTACHED event should be appended")
  assert.strictEqual(evidenceEvent.payload.expeditionId, "e1")
  assert.strictEqual(evidenceEvent.payload.attachments[0].kind, "git-diff")
})

test("expedition evidence --attach copies explicit files", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir)
  fs.writeFileSync(path.join(dir, "artifact.txt"), "artifact content")

  const result = runSynth(["expedition", "evidence", "--id", "e1", "--attach", "artifact.txt"], dir)
  assert.strictEqual(result.status, 0, result.stderr)

  const attachedPath = path.join(dir, "proof", "expeditions", "e1", "attachments", "artifact.txt")
  assert.ok(fs.existsSync(attachedPath), "attached file should be copied")
  assert.strictEqual(fs.readFileSync(attachedPath, "utf-8"), "artifact content")
})

test("expedition evidence is idempotent across repeated invocations", { concurrency: false }, async () => {
  const dir = makeTempProjectRoot()
  seedEvents(dir)
  fs.writeFileSync(path.join(dir, "a.txt"), "a")

  runSynth(["expedition", "evidence", "--id", "e1", "--attach", "a.txt"], dir)
  runSynth(["expedition", "evidence", "--id", "e1", "--attach", "a.txt"], dir)

  const events = eventLog(dir)
  const evidenceEvents = events.filter((e) => e.type === "EVIDENCE_ATTACHED")
  assert.strictEqual(evidenceEvents.length, 2, "each invocation should append an event")
})

