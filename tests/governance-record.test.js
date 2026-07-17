// ============================================================
// Governance Record Tests
// ============================================================
// Regression guards for EXP-GOV-002: governance records are
// deterministic projections of the replayable event log.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const PROJECTION_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "governance-record-projection.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
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

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function writeEventLog(dir, rawEvents) {
  const { computeEventHash } = await import(path.resolve(process.cwd(), "dist", "core", "hash.js"))
  const events = []
  let previousHash = "genesis"
  for (const raw of rawEvents) {
    const event = { ...raw, eventHash: "", previousHash }
    event.eventHash = computeEventHash(event)
    previousHash = event.eventHash
    events.push(event)
  }
  const dataDir = path.join(dir, "data")
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n")
}

async function writeManifest(dir, projectName = "Governance Record Test") {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "explain", description: "Explain operations" }],
    capabilities: [],
    layout: { data: "data/" },
    publicVocabulary: ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2))
}

async function testProjectionModule() {
  const mod = await import(PROJECTION_MODULE_PATH)
  const now = Date.now()
  const records = mod.deriveGovernanceRecords([
    {
      id: "genesis-1",
      type: "SYSTEM_GENESIS",
      timestamp: now,
      transactionId: "tx-0",
      capability: "Genesis",
      actor: "system",
      payload: {},
      eventHash: "h1",
      previousHash: "genesis",
    },
    {
      id: "mission-approved-1",
      type: "MISSION_APPROVED",
      timestamp: now + 1,
      transactionId: "tx-1",
      capability: "ApproveMission",
      actor: "system",
      payload: { mission: { id: "M1", name: "Test Mission" } },
      eventHash: "h2",
      previousHash: "h1",
    },
    {
      id: "expedition-completed-1",
      type: "EXPEDITION_COMPLETED",
      timestamp: now + 2,
      transactionId: "tx-2",
      capability: "CompleteExpedition",
      actor: "system",
      payload: { expedition: { id: "E1", name: "Test Expedition" } },
      eventHash: "h3",
      previousHash: "h2",
    },
  ])

  assert(records.status === "ok", "lineage status should be ok")
  assert(records.kind === "GovernanceRecordLineage", "lineage kind should be GovernanceRecordLineage")
  assert(records.recordCount === 3, `expected 3 records, got ${records.recordCount}`)

  const initialization = records.records.find((r) => r.type === "initialization")
  assert(initialization, "initialization record should exist")
  assert(initialization.eventId === "genesis-1", "initialization should reference genesis event")

  const approval = records.records.find((r) => r.type === "approval")
  assert(approval, "approval record should exist")
  assert(approval.subjectId === "M1", `approval subjectId should be M1, got ${approval.subjectId}`)
  assert(approval.subjectName === "Test Mission", `approval subjectName should be Test Mission, got ${approval.subjectName}`)

  const update = records.records.find((r) => r.type === "governance_update")
  assert(update, "governance_update record should exist")
  assert(update.subjectId === "E1", `update subjectId should be E1, got ${update.subjectId}`)

  console.log("[PASS] projection module derives records from events")
}

async function testExplainGovernanceCli() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-governance-cli-"))
  try {
    await writeManifest(tmpDir)
    const now = Date.now()
    await writeEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: now,
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Governance CLI Test", systemId: "gov-test", partitions: 1 },
      },
      {
        id: "E-MISSION-1",
        type: "MISSION_APPROVED",
        timestamp: now + 1,
        transactionId: "tx-1",
        capability: "ApproveMission",
        actor: "system",
        payload: { mission: { id: "M-GOV-1", name: "Approved Governance Mission" } },
      },
    ])

    const { stdout, status } = runSynth(["explain", "governance"], tmpDir)
    assert(status === 0, "explain governance should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", "output status should be ok")
    assert(output.kind === "GovernanceRecordLineage", `output kind should be GovernanceRecordLineage, got ${output.kind}`)
    assert(output.recordCount === 2, `expected 2 records, got ${output.recordCount}`)
    assert(output.records.some((r) => r.type === "initialization"), "should include initialization record")
    assert(output.records.some((r) => r.type === "approval"), "should include approval record")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] synth explain governance renders lineage from event log")
}

async function testEmptyLog() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-governance-empty-"))
  try {
    await writeManifest(tmpDir)
    await fs.mkdir(path.join(tmpDir, "data"), { recursive: true })
    await fs.writeFile(path.join(tmpDir, "data", "event-log.jsonl"), "")
    const { stdout, status } = runSynth(["explain", "governance"], tmpDir)
    assert(status === 0, "explain governance should exit 0 on empty log")
    const output = parseJson(stdout)
    assert(output.recordCount === 0, "empty log should produce 0 records")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] empty event log produces empty governance lineage")
}

async function main() {
  await testProjectionModule()
  await testExplainGovernanceCli()
  await testEmptyLog()
  console.log("\nAll governance record tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
