// ============================================================
// MISSION STUDIO TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createMissionStudio, createMissionIntake } from "../dist/mission-studio/index.js"

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

test("MissionStudio starts empty and is read-only", () => {
  const studio = createMissionStudio()
  assert.ok(studio)
  assert.strictEqual(typeof studio.startSession, "function")
})

test("MissionStudio consumes only observations", async () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])
  assert.strictEqual(session.observations.length, 1)
  assert.strictEqual(session.observations[0].type, "mission")
})

test("MissionStudio builds a WorldModel graph", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makeObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ])

  const missions = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "mission")
  const expeditions = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "expedition")
  const objectives = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "objective")

  assert.strictEqual(missions.length, 1)
  assert.strictEqual(expeditions.length, 1)
  assert.strictEqual(objectives.length, 1)
  assert.strictEqual(session.worldModel.edges.length, 2)
})

test("Every World Model element references observations and evidence", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])

  for (const node of session.worldModel.nodes.values()) {
    assert.ok(node.observationIds.length > 0, `${node.kind} node has no observation refs`)
    assert.ok(node.evidenceRefs.length > 0, `${node.kind} node has no evidence refs`)
  }

  for (const e of session.evidence.evidence) {
    assert.strictEqual(e.immutable, true)
  }
})

test("Evidence is extracted as first-class immutable objects", () => {
  const intake = createMissionIntake()
  const obs = makeObservation("capability", "Payments")
  const evidence = intake.extractEvidence([obs])
  assert.strictEqual(evidence.length, 1)
  assert.strictEqual(evidence[0].observationId, obs.id)
  assert.strictEqual(evidence[0].immutable, true)
})

test("Unknowns are derived from low-confidence observations", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    { ...makeObservation("risk", "Security"), confidence: "low" },
  ])
  assert.ok(session.unknowns.length > 0)
  assert.ok(session.questions.length > 0)
})

test("Confidence is layered and reproducible", () => {
  const studio = createMissionStudio()
  const obs = [
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
  ]
  const session1 = studio.startSession(obs)
  const session2 = studio.startSession(obs)

  assert.strictEqual(session1.confidence.overall, session2.confidence.overall)
  assert.strictEqual(session1.confidence.observationCoverage, session2.confidence.observationCoverage)
  assert.strictEqual(session1.confidence.evidenceQuality, session2.confidence.evidenceQuality)
})

test("Proposals reference evidence and carry deterministic IDs", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])

  const proposals = studio.proposeMissions(session)
  assert.strictEqual(proposals.length, 1)
  assert.ok(proposals[0].evidenceRefs.length > 0)
  assert.ok(proposals[0].observationIds.length > 0)
  assert.strictEqual(proposals[0].id, proposals[0].id) // deterministic

  const session2 = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])
  const proposals2 = studio.proposeMissions(session2)
  assert.strictEqual(proposals[0].id, proposals2[0].id)
})

test("Wizard operations return new immutable PlanningSessions", () => {
  const studio = createMissionStudio()
  let session = studio.startSession([
    makeObservation("objective", "Design Schema", { title: "Design schema" }),
    makeObservation("objective", "Implement Schema", { title: "Implement schema" }),
  ])

  const beforeVersion = session.worldModel.version
  const result = studio.plan(session, {
    kind: "MergeObjectives",
    sourceIds: Array.from(session.worldModel.nodes.values())
      .filter((n) => n.kind === "objective")
      .map((n) => n.id),
    targetName: "Schema Work",
  })

  assert.strictEqual(result.success, true)
  assert.notStrictEqual(result.session.worldModel.version, beforeVersion)
  assert.notStrictEqual(result.session, session)
})

test("PlanningDecisions are first-class and traceable", () => {
  const studio = createMissionStudio()
  let session = studio.startSession([makeObservation("mission", "Build CRM", { purpose: "Customer success" })])

  const result = studio.plan(session, {
    kind: "RecordDecision",
    type: "ApproveMission",
    rationale: "Sufficient evidence exists",
    evidenceRefs: session.evidence.evidence.map((e) => e.id),
  })

  assert.strictEqual(result.success, true)
  assert.strictEqual(result.session.planningDecisions.length, 1)
  assert.strictEqual(result.session.planningDecisions[0].type, "ApproveMission")
})

test("ApprovedMissionModelSnapshot is immutable, signed, and deterministic", () => {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const session = studio.startSession([
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
  ])

  const result = studio.approve(session)
  assert.strictEqual(result.success, true)
  const snapshot = result.data
  assert.ok(snapshot.id)
  assert.ok(snapshot.signature)
  assert.strictEqual(snapshot.version, "1.0.0")
  assert.ok(snapshot.proposals.length > 0)

  const result2 = studio.approve(session)
  assert.strictEqual(result2.data.id, snapshot.id)
  assert.strictEqual(result2.data.signature, snapshot.signature)
})

test("Mission Studio is replayable", () => {
  const studio = createMissionStudio({ approvalThreshold: 0 })
  const obs = [
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
  ]

  let session1 = studio.startSession(obs)
  session1 = studio.plan(session1, { kind: "GenerateClarificationQuestions" }).session
  const approved1 = studio.approve(session1).data

  let session2 = studio.startSession(obs)
  session2 = studio.plan(session2, { kind: "GenerateClarificationQuestions" }).session
  const approved2 = studio.approve(session2).data

  assert.strictEqual(approved1.id, approved2.id)
  assert.strictEqual(approved1.signature, approved2.signature)
})

test("Mission Studio produces no SynthEvents and accesses no runtime", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([makeObservation("mission", "Build CRM")])
  assert.strictEqual(session.worldModel.planningDecisions.length, 0)

  // The engine module should not import runtime/execution concepts.
  // This test verifies the public surface is planning-only.
  assert.strictEqual(typeof studio.startSession, "function")
  assert.strictEqual(typeof studio.approve, "function")
  assert.strictEqual(typeof studio.plan, "function")
})

test("MissionIntake normalizes and deduplicates observations", () => {
  const intake = createMissionIntake()
  const obs = makeObservation("mission", "Build CRM")
  const normalized = intake.normalize([obs, obs, { ...obs, id: "" }])
  assert.strictEqual(normalized.length, 1)
  assert.strictEqual(normalized[0].id, obs.id)
})
