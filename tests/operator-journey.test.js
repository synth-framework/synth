// ============================================================
// OPERATOR JOURNEY CERTIFICATION TEST
// ============================================================
// Automates the canonical operator journey defined in
// docs/operator/13-operator-journey.md.
//
// Journey:
//   Idea → Mission → Mission Studio → Approval → Genesis →
//   Execution → Replay → Documentation → Done
//
// This test acts as a synthetic operator and produces a certification
// report artifact under data-test/operator-journey-certification.json.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { documentFromKnowledgeBase } from "../dist/documentation/documentation-expedition.js"

function makeObservation(type, subject, overrides = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "operator-journey",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: Date.now(),
  }
}

function now() {
  return Date.now()
}

async function cleanSnapshotStore() {
  try {
    await fs.rm(path.join(process.cwd(), "data", "snapshots"), { recursive: true, force: true })
  } catch {
    /* ok */
  }
}

test("Operator Journey completes end-to-end and produces certification evidence", async () => {
  const report = {
    expedition: "EXP-PROD-003",
    title: "Operator Journey Certification",
    operator: "synthetic-operator",
    startTime: new Date().toISOString(),
    steps: [],
    artifacts: {},
    rubric: {},
  }

  const stepTimes = {}

  // ============================================================
  // Bootstrap a fresh Synth system in memory.
  // ============================================================
  await cleanSnapshotStore()
  const testDataDir = path.join(process.cwd(), "data-test", "operator-journey")
  await fs.rm(testDataDir, { recursive: true, force: true })
  await fs.mkdir(testDataDir, { recursive: true })

  const ctx = await bootstrap({
    skipGenesis: false,
    infra: {
      persistence: "memory",
      eventLogPath: path.join(testDataDir, "event-log.jsonl"),
      statePath: path.join(testDataDir, "canonical-state.json"),
      checkpointPath: path.join(testDataDir, "checkpoint.json"),
    },
    genesis: { projectName: "Operator Journey Test", systemId: "operator-journey-test", partitions: 1 },
  })

  // ============================================================
  // Step 1 — Idea
  // ============================================================
  const t1 = now()
  const idea = "Build a customer support portal for ticket tracking"
  stepTimes.idea = now() - t1
  report.steps.push({ step: "idea", description: idea, durationMs: stepTimes.idea, status: "ok" })

  // ============================================================
  // Step 2 — Mission (articulate as observation)
  // ============================================================
  const t2 = now()
  const missionObservation = makeObservation("mission", "Support Portal", {
    purpose: "Customer self-service ticket tracking",
  })
  stepTimes.mission = now() - t2
  report.steps.push({ step: "mission", durationMs: stepTimes.mission, status: "ok" })

  // ============================================================
  // Step 3 — Mission Studio
  // ============================================================
  const t3 = now()
  const sessionResult = await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: {
      observations: [
        missionObservation,
        makeObservation("expedition", "Auth Flow", {
          goal: "Secure login and session management",
          missionSubject: "Support Portal",
        }),
        makeObservation("objective", "Login Page", {
          title: "Implement login page",
          expeditionSubject: "Auth Flow",
        }),
      ],
    },
  })
  stepTimes.missionStudio = now() - t3

  assert.strictEqual(sessionResult.status, "ok", "Mission Studio session should start")
  assert.ok(sessionResult.session.worldModel, "World model should exist")

  const missions = Array.from(sessionResult.session.worldModel.nodes.values()).filter((n) => n.kind === "mission")
  const expeditions = Array.from(sessionResult.session.worldModel.nodes.values()).filter((n) => n.kind === "expedition")
  const objectives = Array.from(sessionResult.session.worldModel.nodes.values()).filter((n) => n.kind === "objective")

  assert.ok(missions.length >= 1, "World model should contain at least one mission")
  assert.ok(expeditions.length >= 1, "World model should contain at least one expedition")
  assert.ok(objectives.length >= 1, "World model should contain at least one objective")

  report.steps.push({
    step: "mission-studio",
    durationMs: stepTimes.missionStudio,
    status: "ok",
    details: { missions: missions.length, expeditions: expeditions.length, objectives: objectives.length },
  })

  // ============================================================
  // Step 4 — Approval
  // ============================================================
  const t4 = now()
  const approvalResult = await ctx.api.missionStudioOperation({
    operation: "approveModel",
    params: { session: sessionResult.session },
  })
  stepTimes.approval = now() - t4

  assert.strictEqual(approvalResult.status, "ok", "Approval should succeed")
  assert.strictEqual(approvalResult.result.success, true, approvalResult.result.error)
  assert.ok(approvalResult.result.data.signature, "Approved snapshot should be signed")

  const snapshot = approvalResult.result.data
  const missionProposal = snapshot.proposals.find((p) => p.kind === "mission")
  const expeditionProposal = snapshot.proposals.find((p) => p.kind === "expedition")
  const objectiveProposal = snapshot.proposals.find((p) => p.kind === "objective")

  assert.ok(missionProposal, "Snapshot should contain a mission proposal")
  assert.ok(expeditionProposal, "Snapshot should contain an expedition proposal")
  assert.ok(objectiveProposal, "Snapshot should contain an objective proposal")

  report.artifacts.snapshotId = snapshot.id
  report.artifacts.snapshotSignature = snapshot.signature
  report.steps.push({ step: "approval", durationMs: stepTimes.approval, status: "ok" })

  // ============================================================
  // Step 5 — Genesis
  // ============================================================
  const t5 = now()
  const genesisResult = await ctx.api.genesisFromSnapshot({ snapshot })
  stepTimes.genesis = now() - t5

  assert.strictEqual(genesisResult.status, "ok", "Genesis should succeed")
  assert.ok(genesisResult.result.seededEvents > 0, "Genesis should seed events")

  const stateAfterGenesis = await ctx.runtime.getState()
  assert.ok(stateAfterGenesis.missions[missionProposal.id], "Mission should exist after Genesis")
  assert.ok(stateAfterGenesis.expeditions[expeditionProposal.id], "Expedition should exist after Genesis")
  assert.ok(stateAfterGenesis.objectives[objectiveProposal.id], "Objective should exist after Genesis")

  report.artifacts.genesisSystemId = genesisResult.result.systemId
  report.artifacts.seededEvents = genesisResult.result.seededEvents
  report.steps.push({ step: "genesis", durationMs: stepTimes.genesis, status: "ok" })

  // ============================================================
  // Step 6 — Execution
  // ============================================================
  const t6 = now()
  const executionIntents = [
    { capability: "ApproveMission", payload: { id: missionProposal.id } },
    { capability: "ApproveExpedition", payload: { id: expeditionProposal.id } },
    { capability: "StartExpedition", payload: { id: expeditionProposal.id } },
    { capability: "CompleteObjective", payload: { id: objectiveProposal.id } },
    { capability: "CompleteExpedition", payload: { id: expeditionProposal.id } },
    { capability: "CompleteMission", payload: { id: missionProposal.id } },
  ]

  for (const intent of executionIntents) {
    const result = await ctx.api.handleIntent({
      actor: "operator",
      capability: intent.capability,
      payload: intent.payload,
    })
    assert.strictEqual(result.status, "ok", `Execution intent ${intent.capability} should succeed`)
  }
  stepTimes.execution = now() - t6

  const stateAfterExecution = await ctx.runtime.getState()
  assert.strictEqual(stateAfterExecution.missions[missionProposal.id].status, "completed", "Mission should be completed")
  assert.strictEqual(stateAfterExecution.expeditions[expeditionProposal.id].status, "completed", "Expedition should be completed")
  assert.strictEqual(stateAfterExecution.objectives[objectiveProposal.id].status, "completed", "Objective should be completed")

  report.artifacts.executionIntents = executionIntents.length
  report.steps.push({ step: "execution", durationMs: stepTimes.execution, status: "ok" })

  // ============================================================
  // Step 7 — Replay
  // ============================================================
  const t7 = now()
  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const replayResult = await verifier.verify()
  stepTimes.replay = now() - t7

  assert.strictEqual(replayResult.consistent, true, "Replay should be consistent")

  report.artifacts.replayConsistent = replayResult.consistent
  report.artifacts.eventCount = replayResult.eventCount
  report.artifacts.stateHash = replayResult.stateHash
  report.steps.push({ step: "replay", durationMs: stepTimes.replay, status: "ok" })

  // ============================================================
  // Step 8 — Documentation
  // ============================================================
  const t8 = now()
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-operator-journey-docs-"))
  const { projections, summary } = await documentFromKnowledgeBase(path.join(process.cwd(), "docs"), outDir)
  stepTimes.documentation = now() - t8

  const expectedFiles = [
    "README.md",
    "ARCHITECTURE.md",
    "API.md",
    "OPERATOR_GUIDE.md",
    "DEVELOPER_GUIDE.md",
    "ARCHITECT_GUIDE.md",
    "AI_CONTEXT.md",
  ]

  for (const file of expectedFiles) {
    const content = await fs.readFile(path.join(outDir, file), "utf-8")
    assert.ok(content.length > 0, `${file} should not be empty`)
  }

  await fs.rm(outDir, { recursive: true, force: true })

  report.artifacts.documentationProjections = projections.map((p) => p.filename)
  report.artifacts.extractionSummary = summary
  report.steps.push({ step: "documentation", durationMs: stepTimes.documentation, status: "ok" })

  // ============================================================
  // Step 9 — Done
  // ============================================================
  const t9 = now()
  const finalState = await ctx.runtime.getState()
  const journeyComplete =
    finalState.missions[missionProposal.id]?.status === "completed" &&
    replayResult.consistent === true &&
    projections.length === expectedFiles.length
  stepTimes.done = now() - t9

  assert.strictEqual(journeyComplete, true, "Journey should be complete")
  report.steps.push({ step: "done", durationMs: stepTimes.done, status: "ok" })

  // ============================================================
  // Score acceptance rubric.
  // ============================================================
  report.rubric = {
    journeyCompletion: { passed: true, threshold: "100%", note: "All 9 steps completed" },
    operatorIndependence: { passed: true, threshold: "synthetic operator", note: "Automated operator completed journey without coaching" },
    missionArtifact: { passed: true, threshold: "present", note: snapshot.id },
    genesisArtifact: { passed: true, threshold: "present", note: `${genesisResult.result.seededEvents} seed events` },
    executionArtifact: { passed: true, threshold: "present", note: `${executionIntents.length} intents executed` },
    replayArtifact: { passed: true, threshold: "consistent", note: replayResult.stateHash },
    documentationArtifact: { passed: true, threshold: "present", note: `${projections.length} documents generated` },
    frictionResolution: { passed: true, threshold: "100%", note: "No blockers encountered" },
  }

  report.endTime = new Date().toISOString()
  report.totalDurationMs = Object.values(stepTimes).reduce((a, b) => a + b, 0)
  report.certified = true

  // ============================================================
  // Write certification report.
  // ============================================================
  const reportDir = path.join(process.cwd(), "data-test")
  await fs.mkdir(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, "operator-journey-certification.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8")

  console.log(`\n  Operator Journey Certification Report: ${reportPath}`)
  console.log(`  Total duration: ${report.totalDurationMs}ms`)
  console.log(`  Certified: ${report.certified}`)
})
