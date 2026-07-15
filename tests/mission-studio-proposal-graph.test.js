// ============================================================
// MISSION STUDIO PROPOSAL GRAPH TESTS (EXP-HARDEN-001)
// ============================================================
// Regression coverage for proposal parent-reference integrity.
// Expedition proposals must reference mission proposal IDs and
// objective proposals must reference expedition proposal IDs, so
// the proposal graph is fully connected from Mission Studio
// through snapshot approval to Genesis intake.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import * as missionStudio from "../dist/mission-studio/index.js"
import { snapshotToSeedEvents } from "../dist/genesis/snapshot-bridge.js"

const { createMissionStudio, validateProposalGraph } = missionStudio

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

function makeLinkedObservations() {
  return [
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makeObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ]
}

function makeValidProposalSet() {
  return [
    { id: "mission-1", kind: "mission", name: "Build CRM", purpose: "Customer success", evidenceRefs: [], observationIds: [], confidence: 1 },
    { id: "expedition-1", kind: "expedition", name: "CRM Data Model", missionId: "mission-1", goal: "Design schema", evidenceRefs: [], observationIds: [], confidence: 1 },
    { id: "objective-1", kind: "objective", name: "Design Schema", expeditionId: "expedition-1", title: "Design Schema", evidenceRefs: [], observationIds: [], confidence: 1 },
  ]
}

test("Expedition proposals reference mission proposal IDs", () => {
  const studio = createMissionStudio()
  const session = studio.startSession(makeLinkedObservations())

  const missionIds = new Set(studio.proposeMissions(session).map((p) => p.id))
  const expeditions = studio.proposeExpeditions(session)

  assert.strictEqual(expeditions.length, 1)
  for (const expedition of expeditions) {
    assert.ok(
      missionIds.has(expedition.missionId),
      `expedition proposal ${expedition.id} references ${expedition.missionId}, which is not a mission proposal id`,
    )
  }
})

test("Objective proposals reference expedition proposal IDs", () => {
  const studio = createMissionStudio()
  const session = studio.startSession(makeLinkedObservations())

  const expeditionIds = new Set(studio.proposeExpeditions(session).map((p) => p.id))
  const objectives = studio.proposeObjectives(session)

  assert.strictEqual(objectives.length, 1)
  for (const objective of objectives) {
    assert.ok(
      expeditionIds.has(objective.expeditionId),
      `objective proposal ${objective.id} references ${objective.expeditionId}, which is not an expedition proposal id`,
    )
  }
})

test("Expedition proposals reference the correct mission when several exist", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    makeObservation("mission", "Mission Alpha", { purpose: "Alpha" }),
    makeObservation("mission", "Mission Beta", { purpose: "Beta" }),
    makeObservation("expedition", "Expedition Alpha", { goal: "Alpha goal", missionSubject: "Mission Alpha" }),
    makeObservation("expedition", "Expedition Beta", { goal: "Beta goal", missionSubject: "Mission Beta" }),
  ])

  const missionIdByName = new Map(studio.proposeMissions(session).map((p) => [p.name, p.id]))

  for (const expedition of studio.proposeExpeditions(session)) {
    const expectedMissionName = expedition.name === "Expedition Alpha" ? "Mission Alpha" : "Mission Beta"
    assert.strictEqual(expedition.missionId, missionIdByName.get(expectedMissionName))
  }
})

test("Approved snapshot proposals form a fully connected graph", () => {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession(makeLinkedObservations())

  const result = studio.approve(session)
  assert.strictEqual(result.success, true, result.error)

  const proposals = result.data.proposals
  const missionIds = new Set(proposals.filter((p) => p.kind === "mission").map((p) => p.id))
  const expeditionIds = new Set(proposals.filter((p) => p.kind === "expedition").map((p) => p.id))

  for (const proposal of proposals) {
    if (proposal.kind === "expedition") {
      assert.ok(missionIds.has(proposal.missionId), `orphan expedition proposal ${proposal.id}`)
    }
    if (proposal.kind === "objective") {
      assert.ok(expeditionIds.has(proposal.expeditionId), `orphan objective proposal ${proposal.id}`)
    }
  }

  assert.deepStrictEqual(validateProposalGraph(proposals), [])
})

test("Parent references flow unchanged through the Genesis snapshot bridge", () => {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession(makeLinkedObservations())
  const snapshot = studio.approve(session).data

  const seedEvents = snapshotToSeedEvents(snapshot)
  const missionIds = new Set(
    seedEvents.filter((e) => e.type === "MISSION_CREATED").map((e) => e.payload.mission.id),
  )
  const expeditionIds = new Set(
    seedEvents.filter((e) => e.type === "EXPEDITION_CREATED").map((e) => e.payload.expedition.id),
  )

  for (const event of seedEvents.filter((e) => e.type === "EXPEDITION_CREATED")) {
    assert.ok(
      missionIds.has(event.payload.expedition.missionId),
      `EXPEDITION_CREATED ${event.payload.expedition.id} references unknown mission ${event.payload.expedition.missionId}`,
    )
  }
  for (const event of seedEvents.filter((e) => e.type === "OBJECTIVE_ADDED")) {
    assert.ok(
      expeditionIds.has(event.payload.objective.expeditionId),
      `OBJECTIVE_ADDED ${event.payload.objective.id} references unknown expedition ${event.payload.objective.expeditionId}`,
    )
  }
})

test("validateProposalGraph accepts a connected proposal graph", () => {
  assert.deepStrictEqual(validateProposalGraph(makeValidProposalSet()), [])
})

test("validateProposalGraph rejects orphan expedition proposals", () => {
  const proposals = makeValidProposalSet()
  proposals[1] = { ...proposals[1], missionId: "mission-does-not-exist" }

  const violations = validateProposalGraph(proposals)
  assert.ok(violations.some((v) => v.includes("expedition-1") && v.includes("mission-does-not-exist")))
})

test("validateProposalGraph rejects orphan objective proposals", () => {
  const proposals = makeValidProposalSet()
  proposals[2] = { ...proposals[2], expeditionId: "expedition-does-not-exist" }

  const violations = validateProposalGraph(proposals)
  assert.ok(violations.some((v) => v.includes("objective-1") && v.includes("expedition-does-not-exist")))
})

test("validateProposalGraph rejects proposals with no parent", () => {
  const noMission = makeValidProposalSet()
  noMission[1] = { ...noMission[1], missionId: "" }
  assert.ok(validateProposalGraph(noMission).some((v) => v.includes("expedition-1")))

  const noExpedition = makeValidProposalSet()
  noExpedition[2] = { ...noExpedition[2], expeditionId: "" }
  assert.ok(validateProposalGraph(noExpedition).some((v) => v.includes("objective-1")))
})

test("validateProposalGraph rejects duplicate proposal identities", () => {
  const proposals = makeValidProposalSet()
  proposals.push({ ...proposals[0] })

  const violations = validateProposalGraph(proposals)
  assert.ok(violations.some((v) => v.includes("Duplicate") && v.includes("mission-1")))
})

test("Approval rejects a malformed proposal graph loudly", () => {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession(makeLinkedObservations())

  // Tamper: point the expedition node at a mission node that does not exist.
  const nodes = new Map(session.worldModel.nodes)
  const expeditionNode = Array.from(nodes.values()).find((n) => n.kind === "expedition")
  nodes.set(expeditionNode.id, { ...expeditionNode, missionId: "node-does-not-exist" })
  const tampered = { ...session, worldModel: { ...session.worldModel, nodes } }

  const result = studio.approve(tampered)
  assert.strictEqual(result.success, false)
  assert.match(result.error, /proposal graph/i)
})
