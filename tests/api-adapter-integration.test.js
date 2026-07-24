// ============================================================
// API ADAPTER / MISSION STUDIO / GENESIS INTEGRATION TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { bootstrap } from "../dist/core/bootstrap.js"
import { AdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

function createMockAdapter(name, observations = []) {
  return {
    metadata: { name, version: "1.0.0", kind: "mock", category: "integration" },
    state: "enabled",
    health: { state: "healthy", lastCheck: Date.now() },
    async discover() { return "discovered" },
    async configure() { return "configured" },
    async validate() { return "validated" },
    async enable() { return "enabled" },
    async disable() { return "disabled" },
    async healthCheck() { return "healthy" },
    async observe() {
      return { observations, errors: [] }
    },
  }
}

function makePlanningObservation(type, subject, overrides = {}) {
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

test("bootstrap exposes adapterRegistry in context", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })

  assert.ok(ctx.adapterRegistry)
  assert.ok(ctx.adapterRegistry.list().includes("conversation"))
  assert.ok(ctx.adapterRegistry.list().includes("mission-builder"))
})

test("SynthAPI.adapterOperation lists adapters", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })
  const result = await ctx.api.adapterOperation({ operation: "list" })

  assert.strictEqual(result.status, "ok")
  assert.ok(Array.isArray(result.adapters))
  assert.ok(result.adapters.includes("repository"))
})

test("SynthAPI.adapterOperation observes adapters and returns PlanningObservations", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })

  // Replace the real registry with a controlled one.
  const registry = new AdapterRegistry()
  registry.registerFactory("mock-observer", () =>
    createMockAdapter("mock-observer", [
      {
        id: "obs-1",
        source: { adapter: "mock-observer" },
        category: "intent",
        subject: "Build CRM",
        evidence: [{ description: "operator input" }],
        confidence: "high",
        timestamp: 1000,
      },
    ])
  )
  ctx.api = Object.create(ctx.api)
  ctx.api.adapterRegistry = registry

  const result = await ctx.api.adapterOperation({
    operation: "observe",
    params: { adapterNames: ["mock-observer"] },
  })

  assert.strictEqual(result.status, "ok")
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].type, "intent")
  assert.strictEqual(result.observations[0].sourceAdapter, "mock-observer")
})

test("SynthAPI.missionStudioOperation can start session from adapter observations", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })

  const registry = new AdapterRegistry()
  registry.registerFactory("mock-observer", () =>
    createMockAdapter("mock-observer", [
      {
        id: "obs-mission",
        source: { adapter: "mock-observer" },
        category: "mission",
        subject: "Build CRM",
        evidence: [{ description: "mission input" }],
        confidence: "high",
        timestamp: 1000,
      },
    ])
  )
  ctx.api = Object.create(ctx.api)
  ctx.api.adapterRegistry = registry

  const result = await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { adapterNames: ["mock-observer"] },
  })

  assert.strictEqual(result.status, "ok")
  assert.strictEqual(result.session.observations.length, 1)
  assert.strictEqual(result.session.observations[0].type, "mission")
})

test("SynthAPI.missionStudioOperation prepends adapter observations to provided observations", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })

  const registry = new AdapterRegistry()
  registry.registerFactory("mock-observer", () =>
    createMockAdapter("mock-observer", [
      {
        id: "obs-from-adapter",
        source: { adapter: "mock-observer" },
        category: "intent",
        subject: "From adapter",
        evidence: [{ description: "adapter" }],
        confidence: "high",
        timestamp: 1000,
      },
    ])
  )
  ctx.api = Object.create(ctx.api)
  ctx.api.adapterRegistry = registry

  const provided = [makePlanningObservation("mission", "Provided Mission")]
  const result = await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { adapterNames: ["mock-observer"], observations: provided },
  })

  assert.strictEqual(result.status, "ok")
  assert.strictEqual(result.session.observations.length, 2)
  assert.strictEqual(result.session.observations[0].type, "intent")
  assert.strictEqual(result.session.observations[1].type, "mission")
})

test("SynthAPI.genesisFromSnapshot commits seed events through ExecutionGate", async () => {
  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })

  const session = ctx.missionStudio.startSession([
    makePlanningObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makePlanningObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makePlanningObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ])

  const approval = ctx.missionStudio.approve(session)
  assert.strictEqual(approval.success, true, approval.error)

  const missionProposal = approval.data.proposals.find((p) => p.kind === "mission")
  const expeditionProposal = approval.data.proposals.find((p) => p.kind === "expedition")
  const objectiveProposal = approval.data.proposals.find((p) => p.kind === "objective")

  const result = await ctx.api.genesisFromSnapshot({ snapshot: approval.data })

  assert.strictEqual(result.status, "ok")
  assert.ok(result.result.seededEvents > 0)

  const state = await ctx.runtime.getState()
  assert.ok(state.missions[missionProposal.id], "mission should exist in canonical state")
  assert.ok(state.expeditions[expeditionProposal.id], "expedition should exist in canonical state")
  assert.ok(state.objectives[objectiveProposal.id], "objective should exist in canonical state")
})
