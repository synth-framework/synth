// ============================================================
// SHARED EXAMPLE RUNNER
// ============================================================
// Runs a minimal Synth operator journey for an example project.
// Produces replay-verified events, generated docs, and a proof report.
//
// Usage:
//   import { runExample } from "../_shared/run-example.js"
//   await runExample({
//     name: "todo",
//     mission: { subject: "Todo Tracker", purpose: "..." },
//     expeditions: [{ subject: "Task API", goal: "...", missionSubject: "Todo Tracker" }],
//     objectives: [{ subject: "Add Task", title: "...", expeditionSubject: "Task API" }],
//   })
// ============================================================

import fs from "fs/promises"
import path from "path"
import os from "os"
import { bootstrap } from "../../dist/core/bootstrap.js"
import { createReplayVerifier } from "../../dist/core/replay-verifier.js"
import { documentFromKnowledgeBase } from "../../dist/documentation/documentation-expedition.js"

function makeObservation(type, subject, overrides = {}) {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "example-runner",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: Date.now(),
  }
}

export async function runExample({ name, mission, expeditions, objectives }) {
  const exampleDir = path.join(process.cwd())
  const dataDir = path.join(exampleDir, "data")
  const proofDir = path.join(exampleDir, "proof")
  const docsOutDir = path.join(exampleDir, "docs-generated")

  await fs.rm(dataDir, { recursive: true, force: true })
  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(proofDir, { recursive: true })

  const report = {
    schema: "synth-example-proof-v1",
    example: name,
    generatedAt: new Date().toISOString(),
    steps: [],
    artifacts: {},
  }

  const ctx = await bootstrap({
    skipGenesis: false,
    infra: {
      persistence: "memory",
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoint.json"),
    },
    genesis: { projectName: `${name} Example`, systemId: `${name}-example`, partitions: 1 },
  })

  // Mission Studio session
  const observations = [
    makeObservation("mission", mission.subject, { purpose: mission.purpose }),
    ...expeditions.map((e) => makeObservation("expedition", e.subject, { goal: e.goal, missionSubject: e.missionSubject })),
    ...objectives.map((o) => makeObservation("objective", o.subject, { title: o.title, expeditionSubject: o.expeditionSubject })),
  ]

  const sessionResult = await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations },
  })
  if (sessionResult.status !== "ok") throw new Error("Mission Studio session failed")

  const approvalResult = await ctx.api.missionStudioOperation({
    operation: "approveModel",
    params: { session: sessionResult.session },
  })
  if (approvalResult.status !== "ok") throw new Error(`Approval failed: ${approvalResult.result.error}`)

  const snapshot = approvalResult.result.data
  const missionProposal = snapshot.proposals.find((p) => p.kind === "mission")
  const expeditionProposal = snapshot.proposals.find((p) => p.kind === "expedition")
  const objectiveProposal = snapshot.proposals.find((p) => p.kind === "objective")

  if (!missionProposal || !expeditionProposal || !objectiveProposal) {
    throw new Error("Snapshot missing required proposals")
  }

  // Genesis
  const genesisResult = await ctx.api.genesisFromSnapshot({ snapshot })
  if (genesisResult.status !== "ok") throw new Error("Genesis failed")

  // Execution
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
      actor: "example-operator",
      capability: intent.capability,
      payload: intent.payload,
    })
    if (result.status !== "ok") throw new Error(`Execution intent ${intent.capability} failed`)
  }

  // Replay verification
  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const replayResult = await verifier.verify()
  if (!replayResult.consistent) throw new Error("Replay verification failed")

  // Documentation generation
  const tmpDocsDir = await fs.mkdtemp(path.join(os.tmpdir(), `synth-example-${name}-docs-`))
  const knowledgeBaseDir = path.join(exampleDir, "..", "..", "docs")
  // Links must resolve from the final published docs directory, not the
  // temporary build directory, because the files are moved after generation.
  const linkPrefix = path.relative(docsOutDir, knowledgeBaseDir).replace(/\\/g, "/")
  const projections = await documentFromKnowledgeBase(knowledgeBaseDir, tmpDocsDir, linkPrefix)
  const expectedFiles = ["README.md", "ARCHITECTURE.md", "API.md", "OPERATOR_GUIDE.md", "DEVELOPER_GUIDE.md", "ARCHITECT_GUIDE.md", "AI_CONTEXT.md"]
  for (const file of expectedFiles) {
    const content = await fs.readFile(path.join(tmpDocsDir, file), "utf-8")
    if (content.length === 0) throw new Error(`Generated doc ${file} is empty`)
  }
  await fs.rm(docsOutDir, { recursive: true, force: true })
  await fs.rename(tmpDocsDir, docsOutDir)

  // Final state
  const finalState = await ctx.runtime.getState()
  const missionCompleted = finalState.missions[missionProposal.id]?.status === "completed"
  const expeditionCompleted = finalState.expeditions[expeditionProposal.id]?.status === "completed"
  const objectiveCompleted = finalState.objectives[objectiveProposal.id]?.status === "completed"

  if (!missionCompleted || !expeditionCompleted || !objectiveCompleted) {
    throw new Error("Final state incomplete")
  }

  report.artifacts = {
    snapshotId: snapshot.id,
    genesisSystemId: genesisResult.result.systemId,
    seededEvents: genesisResult.result.seededEvents,
    executionIntents: executionIntents.length,
    replayConsistent: replayResult.consistent,
    eventCount: replayResult.eventCount,
    stateHash: replayResult.stateHash,
    documentationProjections: projections.map((p) => p.filename),
  }
  report.overall = { passed: true }

  const proofPath = path.join(proofDir, `proof-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)
  await fs.writeFile(proofPath, JSON.stringify(report, null, 2), "utf-8")

  console.log(`\n  Example '${name}' certified`)
  console.log(`  Events: ${replayResult.eventCount}`)
  console.log(`  State hash: ${replayResult.stateHash}`)
  console.log(`  Proof: ${proofPath}`)

  return report
}
