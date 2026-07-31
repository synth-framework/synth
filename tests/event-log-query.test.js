// tests/event-log-query.test.js
// EXP-EVENTLOG-001 — Event-Log Query CLI

import { describe, it, before, after } from "node:test"
import assert from "node:assert/strict"
import { promises as fs } from "fs"
import fsSync from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const synth = path.join(root, "dist", "cli", "synth.js")
const projectDir = path.join(root, "data-test-eventlog-query")
const synthDir = path.join(projectDir, ".synth")
const dataDir = path.join(synthDir, "data")
const eventLogPath = path.join(dataDir, "event-log.jsonl")

const events = [
  {
    id: "evt-001",
    type: "MISSION_CREATED",
    timestamp: new Date("2026-07-30T10:00:00Z").getTime(),
    transactionId: "tx-001",
    capability: "mission-studio",
    actor: "agent",
    payload: { missionId: "mission-abc", name: "Establish baseline" },
    eventHash: "h1",
    previousHash: "genesis",
  },
  {
    id: "evt-002",
    type: "EXPEDITION_CREATED",
    timestamp: new Date("2026-07-30T11:00:00Z").getTime(),
    transactionId: "tx-002",
    capability: "expedition-studio",
    actor: "agent",
    payload: { expeditionId: "exp-123", missionId: "mission-abc", name: "Fix onboarding" },
    eventHash: "h2",
    previousHash: "h1",
  },
  {
    id: "evt-003",
    type: "EXPEDITION_STARTED",
    timestamp: new Date("2026-07-30T12:00:00Z").getTime(),
    transactionId: "tx-003",
    capability: "expedition-studio",
    actor: "agent",
    payload: { expeditionId: "exp-123" },
    eventHash: "h3",
    previousHash: "h2",
  },
  {
    id: "evt-004",
    type: "EXPEDITION_COMPLETED",
    timestamp: new Date("2026-07-31T08:00:00Z").getTime(),
    transactionId: "tx-004",
    capability: "expedition-studio",
    actor: "agent",
    payload: { expeditionId: "exp-123", evidenceReference: "proof/exp-123.md" },
    eventHash: "h4",
    previousHash: "h3",
  },
]

async function setupProject() {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(
    path.join(synthDir, "manifest.json"),
    JSON.stringify({ name: "Event Log Query Test", version: "2.4.1" }),
  )
  await fs.writeFile(eventLogPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
}

async function cleanup() {
  try {
    await fs.rm(projectDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

function run(args, cwd = projectDir) {
  return execSync(`node ${synth} ${args}`, {
    cwd,
    env: { ...process.env, SYNTH_QUIET_LOGS: "1" },
    encoding: "utf-8",
  })
}

function runAllowError(args, cwd = projectDir) {
  try {
    return { exitCode: 0, stdout: run(args, cwd) }
  } catch (err) {
    return { exitCode: err.status, stdout: err.stdout }
  }
}

describe("event-log query CLI", () => {
  before(async () => {
    await cleanup()
    await setupProject()
  })

  after(async () => {
    await cleanup()
  })

  it("synth log returns the last events in reverse order", () => {
    const out = run(`log --limit 10`)
    const result = JSON.parse(out)
    assert.equal(result.status, "ok")
    assert.equal(result.kind, "EventLogQuery")
    assert.equal(result.total, 4)
    assert.equal(result.matched, 4)
    assert.equal(result.returned, 4)
    assert.equal(result.events[0].type, "EXPEDITION_COMPLETED")
    assert.equal(result.events[3].type, "MISSION_CREATED")
  })

  it("synth log --expedition filters by expedition id", () => {
    const out = run(`log --expedition exp-123`)
    const result = JSON.parse(out)
    assert.equal(result.matched, 3)
    assert.ok(result.events.every((e) => ["EXPEDITION_CREATED", "EXPEDITION_STARTED", "EXPEDITION_COMPLETED"].includes(e.type)))
  })

  it("synth log --mission filters by mission id", () => {
    const out = run(`log --mission mission-abc`)
    const result = JSON.parse(out)
    // Only MISSION_CREATED and EXPEDITION_CREATED carry missionId in their payloads.
    assert.equal(result.matched, 2)
    assert.ok(result.events.every((e) => e.type === "MISSION_CREATED" || e.type === "EXPEDITION_CREATED"))
  })

  it("synth log --type filters by type prefix", () => {
    const out = run(`log --type EXPEDITION`)
    const result = JSON.parse(out)
    assert.equal(result.matched, 3)
    assert.ok(result.events.every((e) => e.type.startsWith("EXPEDITION")))
  })

  it("synth log --since filters by timestamp", () => {
    const out = run(`log --since 2026-07-31T00:00:00Z`)
    const result = JSON.parse(out)
    assert.equal(result.matched, 1)
    assert.equal(result.events[0].type, "EXPEDITION_COMPLETED")
  })

  it("synth log --limit caps results", () => {
    const out = run(`log --limit 2`)
    const result = JSON.parse(out)
    assert.equal(result.returned, 2)
  })

  it("synth log --format table emits prose output", () => {
    const out = run(`log --format table --limit 2`)
    assert.ok(!out.trim().startsWith("{"))
    assert.ok(out.includes("EXPEDITION_COMPLETED") || out.includes("EXPEDITION_STARTED"))
    assert.ok(out.includes("offset"))
  })

  it("synth log --help returns namespace help", () => {
    const out = run(`log --help`)
    const result = JSON.parse(out)
    assert.equal(result.namespace, "log")
    assert.ok(result.subcommands.some((s) => s.name.includes("--expedition")))
  })

  it("synth --help includes log command", () => {
    const out = run(`--help`, root)
    const result = JSON.parse(out)
    assert.ok(result.commands.some((c) => c.name === "log"))
  })

  it("synth log reports error when event log is missing", () => {
    const emptyDir = path.join(root, "data-test-eventlog-query-empty")
    const emptySynthDir = path.join(emptyDir, ".synth")
    fsSync.mkdirSync(emptySynthDir, { recursive: true })
    fsSync.writeFileSync(path.join(emptySynthDir, "manifest.json"), JSON.stringify({ name: "Empty", version: "2.4.1" }))
    try {
      const { exitCode, stdout } = runAllowError(`log`, emptyDir)
      assert.notEqual(exitCode, 0)
      const result = JSON.parse(stdout)
      assert.equal(result.status, "error")
      assert.ok(result.error.includes("No event log found"))
    } finally {
      fsSync.rmSync(emptyDir, { recursive: true, force: true })
    }
  })
})
