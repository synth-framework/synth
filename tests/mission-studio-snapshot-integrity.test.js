// ============================================================
// MISSION STUDIO SNAPSHOT INTEGRITY TESTS (EXP-HARDEN-002)
// ============================================================
// ApprovedMissionModelSnapshots are permanent, immutable,
// certified artifacts. These tests cover persistence via the
// approval flow, immutability, tamper detection, lineage chain
// invalidation, certification accept/reject cases, schema
// migration, the CLI inspection command, and the expedition
// acceptance criterion: an approved Mission can be reconstructed
// from its persisted snapshot and its signature validates.
//
// All filesystem state lives in os.tmpdir() — never in the repo.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { spawnSync } from "child_process"
import {
  createMissionStudio,
  createFileSystemSnapshotStore,
  reconstructSessionFromSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
  signSnapshot,
  certifySnapshot,
  migrateStoredSnapshot,
} from "../dist/mission-studio/index.js"
import { createAPI } from "../dist/api/index.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function makeObservation(type, subject, overrides = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "test-adapter",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: 1000,
  }
}

function makeApprovedSnapshot(name = "Build CRM", parentSnapshot) {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession([
    makeObservation("mission", name, { purpose: "Customer success" }),
  ])
  const approved = studio.approve(session, parentSnapshot)
  assert.strictEqual(approved.success, true, approved.error)
  return { snapshot: approved.data, session: approved.session }
}

async function makeTmpStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-snapshot-integrity-"))
  return { dir, store: createFileSystemSnapshotStore(dir) }
}

async function rewriteSnapshotFile(dir, snapshotId, mutate) {
  const file = path.join(dir, `${snapshotId}.json`)
  const parsed = JSON.parse(await fs.readFile(file, "utf-8"))
  mutate(parsed)
  await fs.writeFile(file, JSON.stringify(parsed, null, 2), "utf-8")
}

function runSynth(args, cwd) {
  const result = spawnSync("node", [CLI_PATH, ...args], { cwd, encoding: "utf-8", timeout: 60000 })
  return { stdout: result.stdout || "", stderr: result.stderr || "", status: result.status }
}

// ============================================================
// Persistence via the approval flow
// ============================================================

test("Approval flow persists a snapshot that round-trips through the store", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const studio = createMissionStudio({ approvalThreshold: 0 })
    const api = createAPI(undefined, undefined, studio, undefined, store)

    const observations = [makeObservation("mission", "Build CRM", { purpose: "Customer success" })]
    const started = await api.missionStudioOperation({ operation: "startSession", params: { observations } })
    assert.strictEqual(started.status, "ok")

    const approved = await api.missionStudioOperation({
      operation: "approveModel",
      params: { session: started.session },
    })
    assert.strictEqual(approved.decision.approved, true)
    const snapshot = approved.result.data

    const saved = await api.missionStudioOperation({
      operation: "saveSnapshot",
      params: { snapshot, session: approved.result.session },
    })
    assert.strictEqual(saved.status, "ok")

    // The artifact exists on disk, named by its id.
    const files = await fs.readdir(dir)
    assert.ok(files.includes(`${snapshot.id}.json`))

    // Round-trip: a fresh store instance loads and certifies it.
    const reloaded = createFileSystemSnapshotStore(dir)
    const stored = await reloaded.get(snapshot.id)
    assert.ok(stored)
    assert.strictEqual(stored.snapshot.id, snapshot.id)
    assert.strictEqual(stored.snapshot.signature, snapshot.signature)
    assert.strictEqual(stored.session.id, snapshot.sessionId)
    assert.deepStrictEqual(certifySnapshot(stored), [])
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("Snapshots are immutable: overwriting an existing id is rejected", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })
    await assert.rejects(store.save({ snapshot, session }), /already exists/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

// ============================================================
// Tamper detection
// ============================================================

test("A tampered snapshot file fails certification on load", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })

    await rewriteSnapshotFile(dir, snapshot.id, (parsed) => {
      parsed.snapshot.proposals[0].name = "Tampered Mission"
    })

    await assert.rejects(store.get(snapshot.id), /failed certification/)
    await assert.rejects(store.list(), /failed certification/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("A malformed snapshot file is rejected loudly", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })
    await fs.writeFile(path.join(dir, `${snapshot.id}.json`), "this is not json", "utf-8")

    await assert.rejects(store.get(snapshot.id), /malformed/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("A tampered ancestor invalidates its descendants", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const parent = makeApprovedSnapshot("Build CRM Alpha")
    await store.save({ snapshot: parent.snapshot, session: parent.session })

    const child = makeApprovedSnapshot("Build CRM Beta", parent.snapshot)
    assert.strictEqual(child.snapshot.lineage.parentId, parent.snapshot.id)
    await store.save({ snapshot: child.snapshot, session: child.session })

    // Baseline: the intact chain loads and certifies.
    const intactChild = await store.get(child.snapshot.id)
    assert.deepStrictEqual(certifySnapshot(intactChild, parent.snapshot), [])

    // Phase 1: tamper the ancestor's content. The ancestor's own
    // signature no longer matches, so both it and the child fail.
    await rewriteSnapshotFile(dir, parent.snapshot.id, (parsed) => {
      parsed.snapshot.proposals[0].name = "Forged Mission"
    })
    await assert.rejects(store.get(parent.snapshot.id), /failed certification/)
    await assert.rejects(store.get(child.snapshot.id), /failed certification/)

    // Phase 2: re-sign the forged ancestor so the ancestor file is
    // internally consistent again. The child's signature input mixed in
    // the ORIGINAL parent signature, so the chain still rejects it.
    const forgedParent = {
      ...parent.snapshot,
      proposals: parent.snapshot.proposals.map((p, i) => (i === 0 ? { ...p, name: "Forged Mission" } : p)),
    }
    forgedParent.signature = signSnapshot(forgedParent)
    await rewriteSnapshotFile(dir, parent.snapshot.id, (parsed) => {
      parsed.snapshot.signature = forgedParent.signature
    })

    const reloadedParent = await store.get(parent.snapshot.id)
    assert.ok(reloadedParent, "re-signed ancestor is internally consistent")
    await assert.rejects(store.get(child.snapshot.id), /signature does not match its content or ancestry/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test("A lineage cycle is rejected loudly", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })
    await rewriteSnapshotFile(dir, snapshot.id, (parsed) => {
      parsed.snapshot.lineage.parentId = parsed.snapshot.id
    })

    await assert.rejects(store.get(snapshot.id), /cycle detected/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

// ============================================================
// Certification
// ============================================================

test("certifySnapshot accepts a freshly approved snapshot and its lineage child", () => {
  const parent = makeApprovedSnapshot("Build CRM Alpha")
  assert.deepStrictEqual(certifySnapshot({ snapshot: parent.snapshot, session: parent.session }), [])

  const child = makeApprovedSnapshot("Build CRM Beta", parent.snapshot)
  assert.deepStrictEqual(
    certifySnapshot({ snapshot: child.snapshot, session: child.session }, parent.snapshot),
    [],
  )
})

test("A chained snapshot cannot be certified without its parent", () => {
  const parent = makeApprovedSnapshot("Build CRM Alpha")
  const child = makeApprovedSnapshot("Build CRM Beta", parent.snapshot)

  // The parent signature is part of the child's signature input.
  assert.strictEqual(signSnapshot(child.snapshot, parent.snapshot.signature), child.snapshot.signature)
  assert.notStrictEqual(signSnapshot(child.snapshot), child.snapshot.signature)

  const violations = certifySnapshot({ snapshot: child.snapshot, session: child.session })
  assert.ok(violations.some((v) => v.includes("signature does not match")))
})

test("certifySnapshot rejects unknown schema versions", () => {
  const { snapshot, session } = makeApprovedSnapshot()
  const stored = { snapshot: { ...snapshot, version: "9.9.9" }, session }

  const violations = certifySnapshot(stored)
  assert.ok(violations.some((v) => v.includes("Unknown snapshot schema version: 9.9.9")))
})

test("certifySnapshot rejects malformed signatures and missing fields", () => {
  const { snapshot, session } = makeApprovedSnapshot()

  const badSignature = certifySnapshot({ snapshot: { ...snapshot, signature: "sig" }, session })
  assert.ok(badSignature.some((v) => v.includes("SHA-256")))

  const noWorldModel = certifySnapshot({ snapshot: { ...snapshot, worldModel: undefined }, session })
  assert.ok(noWorldModel.some((v) => v.includes("worldModel")))
})

test("certifySnapshot rejects an invalid proposal graph", () => {
  const { snapshot, session } = makeApprovedSnapshot("Build CRM", undefined)
  const orphan = {
    id: "expedition-orphan",
    kind: "expedition",
    name: "Orphan Expedition",
    missionId: "mission-does-not-exist",
    goal: "Nowhere",
    evidenceRefs: [],
    observationIds: [],
    confidence: 1,
  }
  const stored = { snapshot: { ...snapshot, proposals: [...snapshot.proposals, orphan] }, session }

  const violations = certifySnapshot(stored)
  assert.ok(violations.some((v) => v.includes("expedition-orphan") && v.includes("mission-does-not-exist")))
})

test("certifySnapshot rejects a session that does not match the snapshot", () => {
  const { snapshot, session } = makeApprovedSnapshot()
  const stored = { snapshot, session: { ...session, id: "session-impostor" } }

  const violations = certifySnapshot(stored)
  assert.ok(violations.some((v) => v.includes("does not match snapshot sessionId")))
})

test("certifySnapshot rejects tampered content", () => {
  const { snapshot, session } = makeApprovedSnapshot()
  const tampered = {
    snapshot: { ...snapshot, proposals: snapshot.proposals.map((p, i) => (i === 0 ? { ...p, name: "Forged" } : p)) },
    session,
  }

  const violations = certifySnapshot(tampered)
  assert.ok(violations.some((v) => v.includes("signature does not match its content or ancestry")))
})

// ============================================================
// Migration
// ============================================================

test("Schema version 1.0.0 loads; unknown versions are rejected loudly", async () => {
  assert.strictEqual(SNAPSHOT_SCHEMA_VERSION, "1.0.0")

  const { snapshot, session } = makeApprovedSnapshot()
  const stored = { snapshot, session }
  assert.strictEqual(migrateStoredSnapshot(stored), stored)
  assert.throws(
    () => migrateStoredSnapshot({ snapshot: { ...snapshot, version: "2.0.0" }, session }),
    /unsupported snapshot schema version: 2.0.0/,
  )

  // The store rejects a file written at an unknown future version.
  const { dir, store } = await makeTmpStore()
  try {
    await store.save(stored)
    await rewriteSnapshotFile(dir, snapshot.id, (parsed) => {
      parsed.snapshot.version = "2.0.0"
    })
    await assert.rejects(store.get(snapshot.id), /unsupported snapshot schema version: 2.0.0/)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

// ============================================================
// Acceptance: reconstruct an approved Mission from its snapshot
// ============================================================

test("An approved Mission is reconstructed from its persisted snapshot with a valid signature", async () => {
  const { dir, store } = await makeTmpStore()
  try {
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })

    // Reload through a fresh store: certification runs on load.
    const reloaded = createFileSystemSnapshotStore(dir)
    const stored = await reloaded.get(snapshot.id)
    assert.deepStrictEqual(certifySnapshot(stored), [])
    assert.strictEqual(signSnapshot(stored.snapshot), stored.snapshot.signature)

    // The approved Mission is present in the persisted artifact.
    const mission = stored.snapshot.proposals.find((p) => p.kind === "mission")
    assert.ok(mission)
    assert.strictEqual(mission.name, "Build CRM")

    // The session is faithfully reconstructed.
    const reconstructed = await reconstructSessionFromSnapshot(reloaded, snapshot.id)
    assert.ok(reconstructed)
    assert.strictEqual(reconstructed.id, snapshot.sessionId)

    // Re-approving the reconstructed session reproduces the same
    // snapshot identity and signature — the artifact is replayable.
    const studio = createMissionStudio({ approvalThreshold: 0 })
    const reapproved = studio.approve(reconstructed)
    assert.strictEqual(reapproved.success, true, reapproved.error)
    assert.strictEqual(reapproved.data.id, snapshot.id)
    assert.strictEqual(reapproved.data.signature, snapshot.signature)
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

// ============================================================
// CLI inspection
// ============================================================

test("synth mission snapshot inspects, verifies, and lists persisted snapshots", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-cli-snapshot-"))
  try {
    const init = runSynth(["init", "--name", "Snapshot CLI Test"], tmpDir)
    assert.strictEqual(init.status, 0, init.stderr)

    // Seed the project-local snapshot store the CLI reads (.synth/data/snapshots).
    const store = createFileSystemSnapshotStore(path.join(tmpDir, ".synth", "data", "snapshots"))
    const { snapshot, session } = makeApprovedSnapshot()
    await store.save({ snapshot, session })

    const inspect = runSynth(["mission", "snapshot", snapshot.id], tmpDir)
    assert.strictEqual(inspect.status, 0, inspect.stderr)
    const inspection = JSON.parse(inspect.stdout)
    assert.strictEqual(inspection.status, "ok")
    assert.strictEqual(inspection.kind, "MissionSnapshotInspection")
    assert.strictEqual(inspection.snapshotId, snapshot.id)
    assert.strictEqual(inspection.version, "1.0.0")
    assert.strictEqual(inspection.signatureValid, true)
    assert.deepStrictEqual(inspection.certification.violations, [])
    assert.strictEqual(inspection.lineage.lineageId, snapshot.lineage.lineageId)

    const list = runSynth(["mission", "snapshot", "list"], tmpDir)
    assert.strictEqual(list.status, 0, list.stderr)
    const listing = JSON.parse(list.stdout)
    assert.strictEqual(listing.status, "ok")
    assert.strictEqual(listing.count, 1)
    assert.strictEqual(listing.snapshots[0].snapshotId, snapshot.id)
    assert.strictEqual(listing.snapshots[0].lineageId, snapshot.lineage.lineageId)

    const missing = runSynth(["mission", "snapshot", "snapshot-does-not-exist"], tmpDir)
    assert.strictEqual(missing.status, 1)
    assert.match(JSON.parse(missing.stdout).error, /not found/)

    // A tampered file makes the CLI fail loudly with the certification errors.
    await rewriteSnapshotFile(path.join(tmpDir, ".synth", "data", "snapshots"), snapshot.id, (parsed) => {
      parsed.snapshot.proposals[0].name = "Tampered Mission"
    })
    const tampered = runSynth(["mission", "snapshot", snapshot.id], tmpDir)
    assert.strictEqual(tampered.status, 1)
    const tamperedOutput = JSON.parse(tampered.stdout)
    assert.strictEqual(tamperedOutput.status, "error")
    assert.strictEqual(tamperedOutput.signatureValid, false)
    assert.match(tamperedOutput.error, /failed certification/)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})
