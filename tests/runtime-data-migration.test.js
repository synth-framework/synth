// ============================================================
// Runtime Data Migration Tests
// ============================================================
// Regression guards for EXP-ENV-013: legacy repo-root `data/` is
// automatically migrated into `.synth/data/` for governed projects
// without data loss.
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { spawnSync } from "child_process"

const MIGRATION_MODULE_PATH = path.resolve(process.cwd(), "dist", "infra", "migrate-data-dir.js")
const HASH_MODULE_PATH = path.resolve(process.cwd(), "dist", "core", "hash.js")
const REPLAY_MODULE_PATH = path.resolve(process.cwd(), "dist", "runtime", "replay.js")
const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function pathExists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath)
  const { createHash } = await import("node:crypto")
  return createHash("sha256").update(buffer).digest("hex")
}

async function writeManifest(dir, projectName = "Migration Test") {
  const synthDir = path.join(dir, ".synth")
  await fs.mkdir(synthDir, { recursive: true })
  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.0.0",
    projectName,
    root: dir,
    generatedAt: new Date().toISOString(),
    bootstrapped: true,
    commands: [{ name: "status", description: "Report state" }],
    capabilities: [],
    layout: { data: "data/" },
    publicVocabulary: ["Mission", "Expedition", "Replay"],
  }
  await fs.writeFile(path.join(synthDir, "manifest.json"), JSON.stringify(manifest, null, 2))
}

async function writeLegacyEventLog(dir, rawEvents) {
  const { computeEventHash } = await import(HASH_MODULE_PATH)
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
  return events
}

async function testMigrationMovesFiles() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-migration-files-"))
  try {
    await writeManifest(tmpDir)
    const events = await writeLegacyEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: Date.now(),
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Migration Test", systemId: "migration-test", partitions: 1 },
      },
      {
        id: "E-MISSION-1",
        type: "MISSION_CREATED",
        timestamp: Date.now() + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: "M-MIGRATION-1",
            name: "Migration Mission",
            purpose: "Test migration",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: Date.now() + 1,
            updatedAt: Date.now() + 1,
          },
        },
      },
    ])

    // Write additional legacy artifacts that should migrate.
    const legacyDataDir = path.join(tmpDir, "data")
    await fs.mkdir(path.join(legacyDataDir, "drafts"), { recursive: true })
    await fs.writeFile(path.join(legacyDataDir, "drafts", "draft-1.json"), JSON.stringify({ id: "draft-1" }))
    await fs.writeFile(path.join(legacyDataDir, "canonical-state.json"), JSON.stringify({ stateHash: "test-hash" }))
    await fs.writeFile(path.join(legacyDataDir, "checkpoints.json"), JSON.stringify({}))

    const eventLogHashBefore = await sha256File(path.join(legacyDataDir, "event-log.jsonl"))

    const { ensureRuntimeDataDir } = await import(MIGRATION_MODULE_PATH)
    const runtimeDataDir = await ensureRuntimeDataDir(tmpDir)

    assert(runtimeDataDir === path.join(tmpDir, ".synth", "data"), `runtime data dir should be .synth/data, got ${runtimeDataDir}`)
    assert(await pathExists(path.join(runtimeDataDir, "event-log.jsonl")), "event log should be under .synth/data/")
    assert(await pathExists(path.join(runtimeDataDir, "drafts", "draft-1.json")), "drafts should be under .synth/data/")
    assert(await pathExists(path.join(runtimeDataDir, "canonical-state.json")), "canonical state should be under .synth/data/")
    assert(await pathExists(path.join(runtimeDataDir, "checkpoints.json")), "checkpoints should be under .synth/data/")
    assert(await pathExists(path.join(runtimeDataDir, ".synth-data-migrated-v1")), "migration marker should be written")
    assert(!(await pathExists(path.join(legacyDataDir, "event-log.jsonl"))), "legacy event log should be moved, not copied")

    const eventLogHashAfter = await sha256File(path.join(runtimeDataDir, "event-log.jsonl"))
    assert(eventLogHashBefore === eventLogHashAfter, "event log byte-level integrity should be preserved")

    // Manifest layout.data should be updated.
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, ".synth", "manifest.json"), "utf-8"))
    assert(manifest.layout.data === ".synth/data/", `manifest layout.data should be updated to .synth/data/, got ${manifest.layout.data}`)

    console.log("[PASS] migration moves recognized files and preserves event log integrity")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testMigrationPreservesReplayState() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-migration-replay-"))
  try {
    await writeManifest(tmpDir)
    const events = await writeLegacyEventLog(tmpDir, [
      {
        id: "GENESIS",
        type: "SYSTEM_GENESIS",
        timestamp: Date.now(),
        transactionId: "genesis-tx",
        capability: "Genesis",
        actor: "system",
        payload: { projectName: "Replay Test", systemId: "replay-test", partitions: 1 },
      },
      {
        id: "E-MISSION-1",
        type: "MISSION_CREATED",
        timestamp: Date.now() + 1,
        transactionId: "tx-1",
        capability: "CreateMission",
        actor: "system",
        payload: {
          mission: {
            id: "M-REPLAY-1",
            name: "Replay Mission",
            purpose: "Test replay after migration",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: Date.now() + 1,
            updatedAt: Date.now() + 1,
          },
        },
      },
      {
        id: "E-APPROVE-1",
        type: "MISSION_APPROVED",
        timestamp: Date.now() + 2,
        transactionId: "tx-2",
        capability: "ApproveMission",
        actor: "system",
        payload: { id: "M-REPLAY-1", status: "active" },
      },
    ])

    const { rebuildState } = await import(REPLAY_MODULE_PATH)
    const stateBefore = rebuildState(events)

    // Trigger migration via the CLI `synth explain replay`.
    const result = spawnSync("node", [CLI_PATH, "explain", "replay"], {
      cwd: tmpDir,
      encoding: "utf-8",
      timeout: 30000,
    })
    assert(result.status === 0, `explain replay should succeed after migration: ${result.stderr}`)
    const output = JSON.parse(result.stdout.trim())
    assert(output.consistent === true, "replay should be consistent after migration")

    // Verify the migrated event log still reproduces the same state.
    const { ensureRuntimeDataDir } = await import(MIGRATION_MODULE_PATH)
    const runtimeDataDir = await ensureRuntimeDataDir(tmpDir)
    const migratedLog = await fs.readFile(path.join(runtimeDataDir, "event-log.jsonl"), "utf-8")
    const migratedEvents = migratedLog
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    const stateAfter = rebuildState(migratedEvents)
    assert(stateBefore.stateHash === stateAfter.stateHash, `replayed state hash should match: ${stateBefore.stateHash} vs ${stateAfter.stateHash}`)

    console.log("[PASS] migration preserves replayable state")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testNoManifestNoMigration() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-migration-ungoverned-"))
  try {
    const legacyDataDir = path.join(tmpDir, "data")
    await fs.mkdir(legacyDataDir, { recursive: true })
    await fs.writeFile(path.join(legacyDataDir, "event-log.jsonl"), "{}\n")

    const { ensureRuntimeDataDir } = await import(MIGRATION_MODULE_PATH)
    const runtimeDataDir = await ensureRuntimeDataDir(tmpDir)

    assert(runtimeDataDir === legacyDataDir, "ungoverned directory should keep legacy data/ path")
    assert(!(await pathExists(path.join(tmpDir, ".synth"))), "ungoverned directory should not create .synth/")

    console.log("[PASS] ungoverned directory keeps legacy data/ path")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function main() {
  try {
    await fs.access(MIGRATION_MODULE_PATH)
  } catch {
    console.error("[SKIP] dist not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testMigrationMovesFiles()
  await testMigrationPreservesReplayState()
  await testNoManifestNoMigration()
  console.log("\nAll runtime data migration tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
