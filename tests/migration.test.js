// ============================================================
// Legacy Synth State Migration Tests
// ============================================================
// Regression guards for EXP-MIGRATE-001:
//   1. detectLegacyState classifies legacy .synth/ and ungoverned logs.
//   2. buildMigrationPlan produces archive and import plans.
//   3. synth migrate detect/plan/archive work through the CLI.
//   4. MigrateImport capability maps legacy events and chains them.
// ============================================================

import { strict as assert } from "assert"
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const DETECT_PATH = path.resolve(process.cwd(), "dist", "migration", "detect.js")
const PLAN_PATH = path.resolve(process.cwd(), "dist", "migration", "plan.js")
const BOOTSTRAP_PATH = path.resolve(process.cwd(), "dist", "core", "bootstrap.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
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

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}

async function writeEventLog(filePath, events) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const lines = events.map((e) => JSON.stringify(e)).join("\n")
  await fs.writeFile(filePath, lines + "\n", "utf-8")
}

async function testDetectLegacySynthDir() {
  const root = await tempDir("synth-migrate-detect-")
  const manifestPath = path.join(root, ".synth", "manifest.json")
  await writeJson(manifestPath, { schema: "synth-bootstrap-manifest-v0", version: "1.0.0" })

  const { detectLegacyState } = await import(DETECT_PATH)
  const detection = await detectLegacyState(root)

  assert.equal(detection.legacyStateDetected, true, "should detect legacy state")
  assert.equal(detection.stateKind, "legacy", "should classify as legacy")
  assert.equal(detection.recommendedPath, "archive", "should recommend archive")
  assert.ok(detection.artifacts.some((a) => a.kind === "synth-dir"), "should report synth-dir artifact")

  const { stdout, status } = runSynth(["migrate", "detect", root])
  assert.equal(status, 0, "CLI migrate detect should exit 0")
  const output = parseJson(stdout)
  assert.equal(output.status, "ok", "CLI output status should be ok")
  assert.equal(output.kind, "MigrationDetection", "CLI output kind should be MigrationDetection")
  assert.equal(output.legacyStateDetected, true, "CLI should detect legacy state")

  console.log("[PASS] detectLegacyState classifies legacy .synth/")
}

async function testDetectUngovernedEventLog() {
  const root = await tempDir("synth-migrate-ungoverned-")
  const legacyDataDir = path.join(root, "data")
  const eventLogPath = path.join(legacyDataDir, "event-log.jsonl")
  await writeEventLog(eventLogPath, [
    {
      id: "evt-1",
      type: "SYSTEM_GENESIS",
      timestamp: 1,
      transactionId: "tx-1",
      capability: "Genesis",
      actor: "test",
      payload: {},
      previousHash: "genesis",
      eventHash: "legacy-hash-1",
    },
  ])

  const { detectLegacyState } = await import(DETECT_PATH)
  const detection = await detectLegacyState(root)

  assert.equal(detection.legacyStateDetected, true, "should detect ungoverned state")
  assert.equal(detection.stateKind, "ungoverned", "should classify as ungoverned")
  assert.equal(detection.recommendedPath, "archive", "should recommend archive for ungoverned log")

  console.log("[PASS] detectLegacyState classifies ungoverned event log")
}

async function testBuildMigrationPlan() {
  const root = await tempDir("synth-migrate-plan-")
  const manifestPath = path.join(root, ".synth", "manifest.json")
  await writeJson(manifestPath, { schema: "synth-bootstrap-manifest-v0", version: "1.0.0" })

  const { detectLegacyState } = await import(DETECT_PATH)
  const { buildMigrationPlan } = await import(PLAN_PATH)

  const detection = await detectLegacyState(root)
  const archivePlan = buildMigrationPlan(root, detection)

  assert.equal(archivePlan.path, "archive", "default plan should be archive")
  assert.ok(archivePlan.archiveTarget, "archive plan should have archiveTarget")
  assert.ok(archivePlan.archiveTarget.startsWith(root), "archiveTarget should be under root")
  assert.deepEqual(archivePlan.requiredApprovals, undefined, "archive plan should not require approvals")

  const importPlan = buildMigrationPlan(root, detection, { path: "import" })
  assert.equal(importPlan.path, "import", "override plan should be import")
  assert.equal(importPlan.sourcePath, path.join(root, ".synth"), "import plan should source .synth")
  assert.deepEqual(importPlan.requiredApprovals, ["migrate-import"], "import plan should require migrate-import approval")

  const { stdout, status } = runSynth(["migrate", "plan", root])
  assert.equal(status, 0, "CLI migrate plan should exit 0")
  const output = parseJson(stdout)
  assert.equal(output.status, "ok", "CLI output status should be ok")
  assert.equal(output.kind, "MigrationPlan", "CLI output kind should be MigrationPlan")
  assert.equal(output.path, "archive", "CLI plan should default to archive")

  console.log("[PASS] buildMigrationPlan produces archive and import plans")
}

async function testMigrateArchive() {
  const root = await tempDir("synth-migrate-archive-")
  const synthDir = path.join(root, ".synth")
  const manifestPath = path.join(synthDir, "manifest.json")
  const dataDir = path.join(synthDir, "data")
  const eventLogPath = path.join(dataDir, "event-log.jsonl")

  await writeJson(manifestPath, { schema: "synth-bootstrap-manifest-v0", version: "1.0.0" })
  await writeEventLog(eventLogPath, [
    {
      id: "evt-1",
      type: "SYSTEM_GENESIS",
      timestamp: 1,
      transactionId: "tx-1",
      capability: "Genesis",
      actor: "test",
      payload: {},
      previousHash: "genesis",
      eventHash: "legacy-hash-1",
    },
  ])

  const { stdout, status } = runSynth(["migrate", "archive", root, "--approve"])
  assert.equal(status, 0, `CLI migrate archive should exit 0, got stderr: ${stdout + runSynth(["migrate", "archive", root, "--approve"]).stderr}`)
  const output = parseJson(stdout)
  assert.equal(output.status, "ok", "archive output status should be ok")
  assert.equal(output.archived, true, "archive should report archived")
  assert.ok(output.archivePath, "archive should have archivePath")

  const archiveExists = await fs.stat(output.archivePath).then((s) => s.isDirectory()).catch(() => false)
  assert.equal(archiveExists, true, "archive directory should exist")

  const newSynthExists = await fs.stat(synthDir).then((s) => s.isDirectory()).catch(() => false)
  assert.equal(newSynthExists, true, "new .synth directory should exist")

  const newManifestPath = path.join(synthDir, "manifest.json")
  const newManifest = JSON.parse(await fs.readFile(newManifestPath, "utf-8"))
  assert.equal(newManifest.schema, "synth-bootstrap-manifest-v1", "new manifest should be v1")

  const newEventLogPath = path.join(synthDir, "data", "event-log.jsonl")
  const eventLogRaw = await fs.readFile(newEventLogPath, "utf-8")
  const events = eventLogRaw.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line))
  const archiveEvent = events.find((e) => e.type === "ARCHIVE_CREATED")
  assert.ok(archiveEvent, "ARCHIVE_CREATED event should be recorded")
  assert.equal(archiveEvent.payload.sourcePath, path.join(root, ".synth"), "archive event should record source path")

  console.log("[PASS] synth migrate archive archives legacy state and bootstraps fresh")
}

async function testMigrateImportCapability() {
  const { bootstrap } = await import(BOOTSTRAP_PATH)
  const root = await tempDir("synth-migrate-import-")

  // Initialize a fresh Synth v2 project.
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(root, ".synth", "data", "event-log.jsonl"),
      statePath: path.join(root, ".synth", "data", "canonical-state.json"),
      checkpointPath: path.join(root, ".synth", "data", "checkpoints.jsonl"),
    },
  })
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }

  const legacyDir = await tempDir("synth-migrate-legacy-")
  const legacyEventLogPath = path.join(legacyDir, "data", "event-log.jsonl")
  await writeEventLog(legacyEventLogPath, [
    {
      id: "legacy-1",
      type: "TICKET_CREATED",
      timestamp: 1000,
      transactionId: "tx-legacy-1",
      capability: "CreateTicket",
      actor: "legacy",
      payload: { ticket: { id: "ticket-1", status: "draft", dependencies: [], metadata: {}, createdAt: 1000, updatedAt: 1000 } },
      previousHash: "genesis",
      eventHash: "legacy-hash-1",
    },
    {
      id: "legacy-2",
      type: "TICKET_STARTED",
      timestamp: 1001,
      transactionId: "tx-legacy-2",
      capability: "StartTicket",
      actor: "legacy",
      payload: { ticketId: "ticket-1" },
      previousHash: "legacy-hash-1",
      eventHash: "legacy-hash-2",
    },
  ])

  const importResult = await ctx.api.handleIntent({
    capability: "MigrateImport",
    actor: "test",
    payload: {
      importId: "import-1",
      sourcePath: legacyDir,
      sourceKind: "synth-dir",
    },
  })

  assert.equal(importResult.status, "ok", `MigrateImport should succeed: ${JSON.stringify(importResult)}`)
  const output = importResult.result || {}
  assert.equal(output.importedEventCount, 2, "should import 2 events")
  assert.ok(output.mappings.some((m) => m.originalType === "TICKET_CREATED" && m.canonicalType === "WORK_ITEM_CREATED"), "should map TICKET_CREATED")
  assert.ok(output.mappings.some((m) => m.originalType === "TICKET_STARTED" && m.canonicalType === "WORK_ITEM_STARTED"), "should map TICKET_STARTED")

  const events = await ctx.infra.eventStore.loadAll()
  const importedEvents = events.filter((e) => e.type === "WORK_ITEM_CREATED" || e.type === "WORK_ITEM_STARTED")
  assert.equal(importedEvents.length, 2, "imported events should be persisted")

  const migrationEvent = events.find((e) => e.type === "MIGRATION_IMPORTED")
  assert.ok(migrationEvent, "MIGRATION_IMPORTED event should be persisted")
  assert.equal(migrationEvent.payload.importedEventCount, 2, "MIGRATION_IMPORTED should record count")

  // Verify hash chain: each imported event's previousHash matches the prior event's eventHash.
  for (let i = 1; i < events.length; i++) {
    assert.equal(events[i].previousHash, events[i - 1].eventHash, `event ${i} should chain from event ${i - 1}`)
  }

  console.log("[PASS] MigrateImport capability imports and rechains legacy events")
}

async function main() {
  await testDetectLegacySynthDir()
  await testDetectUngovernedEventLog()
  await testBuildMigrationPlan()
  await testMigrateArchive()
  await testMigrateImportCapability()
  console.log("\nAll migration tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
