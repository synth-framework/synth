// ============================================================
// MISSION STUDIO SNAPSHOT LINEAGE TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import {
  createMissionStudio,
  createInMemorySnapshotStore,
  createFileSystemSnapshotStore,
  buildSnapshotLineage,
  reconstructSessionFromSnapshot,
  diffSnapshots,
} from "../dist/mission-studio/index.js"

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

function makeApprovedSnapshot(name = "Build CRM", overrides = {}) {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession([
    makeObservation("mission", name, { purpose: "Customer success", ...overrides }),
  ])
  const approved = studio.approve(session)
  assert.strictEqual(approved.success, true)
  return { snapshot: approved.data, session: approved.session, studio }
}

test("InMemorySnapshotStore saves and retrieves snapshots", async () => {
  const store = createInMemorySnapshotStore()
  const { snapshot, session } = makeApprovedSnapshot()

  await store.save({ snapshot, session })
  const stored = await store.get(snapshot.id)

  assert.ok(stored)
  assert.strictEqual(stored.snapshot.id, snapshot.id)
  assert.strictEqual(stored.session.id, session.id)
})

test("InMemorySnapshotStore lists snapshots by lineage", async () => {
  const store = createInMemorySnapshotStore()
  const { snapshot: s1, session: sess1 } = makeApprovedSnapshot("Build CRM Alpha")
  const stored1 = { snapshot: s1, session: sess1 }
  stored1.snapshot.lineage = buildSnapshotLineage(stored1.snapshot)
  await store.save(stored1)

  const { snapshot: s2, session: sess2 } = makeApprovedSnapshot("Build CRM Beta")
  const stored2 = { snapshot: s2, session: sess2 }
  stored2.snapshot.lineage = buildSnapshotLineage(stored2.snapshot, s1)
  await store.save(stored2)

  const lineage = await store.list(s1.lineage.lineageId)
  assert.strictEqual(lineage.length, 2)
  assert.strictEqual(lineage[0].snapshot.id, s1.id)
  assert.strictEqual(lineage[1].snapshot.id, s2.id)
})

test("buildSnapshotLineage assigns version and parent", () => {
  const { snapshot: parent } = makeApprovedSnapshot()
  parent.lineage = buildSnapshotLineage(parent)

  assert.ok(parent.lineage.lineageId)
  assert.strictEqual(parent.lineage.version, 1)
  assert.strictEqual(parent.lineage.parentId, undefined)

  const { snapshot: child } = makeApprovedSnapshot()
  child.lineage = buildSnapshotLineage(child, parent)

  assert.strictEqual(child.lineage.lineageId, parent.lineage.lineageId)
  assert.strictEqual(child.lineage.version, 2)
  assert.strictEqual(child.lineage.parentId, parent.id)
})

test("diffSnapshots reports added and removed nodes", () => {
  // Base snapshot with a single mission.
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const sessionA = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])
  const a = studio.approve(sessionA).data

  // Extended snapshot with the same mission plus a new expedition.
  const sessionB = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema" }),
  ])
  const bWithMore = studio.approve(sessionB).data

  const diff = diffSnapshots(a, bWithMore)

  assert.ok(diff.nodes.length > 0)
  assert.ok(diff.nodes.some((d) => d.kind === "added" && d.nodeKind === "expedition"))
  assert.strictEqual(diff.nodes.filter((d) => d.kind === "removed").length, 0)
})

test("reconstructSessionFromSnapshot rebuilds the original session", async () => {
  const store = createInMemorySnapshotStore()
  const { snapshot, session } = makeApprovedSnapshot()
  await store.save({ snapshot, session })

  const reconstructed = await reconstructSessionFromSnapshot(store, snapshot.id)

  assert.ok(reconstructed)
  assert.strictEqual(reconstructed.id, session.id)
  assert.strictEqual(reconstructed.observations.length, session.observations.length)
  assert.strictEqual(reconstructed.worldModel.nodes.size, session.worldModel.nodes.size)
})

test("reconstructSessionFromSnapshot walks lineage to root", async () => {
  const store = createInMemorySnapshotStore()
  const { snapshot: parent, session: parentSession } = makeApprovedSnapshot("Build CRM Alpha")
  parent.lineage = buildSnapshotLineage(parent)
  await store.save({ snapshot: parent, session: parentSession })

  const { snapshot: child, session: childSession } = makeApprovedSnapshot("Build CRM Beta")
  child.lineage = buildSnapshotLineage(child, parent)
  await store.save({ snapshot: child, session: childSession })

  const reconstructed = await reconstructSessionFromSnapshot(store, child.id)

  assert.ok(reconstructed)
  assert.strictEqual(reconstructed.id, childSession.id)
})

test("FileSystemSnapshotStore persists snapshots across instances", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-snapshot-"))
  const store1 = createFileSystemSnapshotStore(dir)
  const { snapshot, session } = makeApprovedSnapshot()
  await store1.save({ snapshot, session })

  const store2 = createFileSystemSnapshotStore(dir)
  const stored = await store2.get(snapshot.id)

  assert.ok(stored)
  assert.strictEqual(stored.snapshot.id, snapshot.id)
  assert.strictEqual(stored.session.id, session.id)

  // Cleanup
  await fs.rm(dir, { recursive: true, force: true })
})
