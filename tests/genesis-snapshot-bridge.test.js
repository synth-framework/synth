// ============================================================
// GENESIS SNAPSHOT BRIDGE TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { snapshotToGenesisInput, snapshotToSeedEvents } from "../dist/genesis/snapshot-bridge.js"
import { rebuildState } from "../dist/runtime/replay.js"

function makeSnapshot(overrides = {}) {
  const nodes = new Map()
  const evidence = { evidence: [], byObservationId: new Map() }

  nodes.set("actor-1", {
    id: "actor-1",
    kind: "actor",
    name: "Synth System",
    description: "The Synth system itself",
    observationIds: ["obs-actor-1"],
    evidenceRefs: ["ev-actor-1"],
  })

  return {
    id: "snapshot-1",
    version: "1.0.0",
    signature: "sig",
    sessionId: "session-1",
    timestamp: 1000,
    worldModel: {
      version: 1,
      nodes,
      edges: [],
      evidence,
      unknowns: [],
      confidence: {
        overall: 0.9,
        observationCoverage: 1,
        evidenceQuality: 1,
        consistency: 1,
        completeness: 1,
        inferenceDepth: 1,
        unknownImpact: 0,
        contradictionCount: 0,
      },
      planningDecisions: [],
    },
    proposals: [
      {
        id: "mission-1",
        kind: "mission",
        name: "Build CRM",
        purpose: "Customer success platform",
        description: "Build a CRM",
        evidenceRefs: ["ev-mission-1"],
        observationIds: ["obs-mission-1"],
        confidence: 0.9,
      },
      {
        id: "expedition-1",
        kind: "expedition",
        name: "CRM Data Model",
        missionId: "mission-1",
        goal: "Design schema",
        description: "Design the CRM data model",
        evidenceRefs: ["ev-expedition-1"],
        observationIds: ["obs-expedition-1"],
        confidence: 0.8,
      },
      {
        id: "objective-1",
        kind: "objective",
        title: "Design Schema",
        name: "Design Schema",
        expeditionId: "expedition-1",
        description: "Design the schema",
        evidenceRefs: ["ev-objective-1"],
        observationIds: ["obs-objective-1"],
        confidence: 0.8,
      },
    ],
    ...overrides,
  }
}

test("snapshotToGenesisInput derives projectName from actor node", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.projectName, "Synth System")
  assert.strictEqual(input.systemId, "snapshot-1")
  assert.strictEqual(input.partitions, 4)
})

test("snapshotToGenesisInput maps proposals to initial plans and work items", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.initialPlans.length, 1)
  assert.strictEqual(input.initialPlans[0].id, "expedition-1")
  assert.strictEqual(input.initialPlans[0].name, "CRM Data Model")

  assert.strictEqual(input.initialWorkItems.length, 1)
  assert.strictEqual(input.initialWorkItems[0].id, "objective-1")
  assert.strictEqual(input.initialWorkItems[0].name, "Design Schema")
  assert.strictEqual(input.initialWorkItems[0].status, "idle")
})

test("snapshotToGenesisInput produces seed events for missions and artifacts", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.ok(input.seedEvents.length > 0)
  assert.ok(input.seedEvents.some((e) => e.type === "MISSION_CREATED"))
  assert.ok(input.seedEvents.some((e) => e.type === "EXPEDITION_CREATED"))
  assert.ok(input.seedEvents.some((e) => e.type === "OBJECTIVE_ADDED"))
})

test("snapshotToSeedEvents produces replayable events", () => {
  const snapshot = makeSnapshot()
  const seedEvents = snapshotToSeedEvents(snapshot)

  // Replay through rebuildState to verify canonical shapes.
  const state = rebuildState(seedEvents)

  assert.ok(state.projects["actor-1"])
  assert.strictEqual(state.projects["actor-1"].name, "Synth System")
  assert.ok(state.missions["mission-1"])
  assert.strictEqual(state.missions["mission-1"].name, "Build CRM")
  assert.ok(state.expeditions["expedition-1"])
  assert.strictEqual(state.expeditions["expedition-1"].missionId, "mission-1")
  assert.ok(state.objectives["objective-1"])
  assert.strictEqual(state.objectives["objective-1"].title, "Design Schema")
})

test("falls back projectName when no actor or component node exists", () => {
  const snapshot = makeSnapshot()
  snapshot.worldModel.nodes = new Map()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.projectName, "Mission Model Seed")
  assert.strictEqual(input.initialProjects.length, 0)
})
