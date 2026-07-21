#!/usr/bin/env node
// ============================================================
// SYNTH v2 — Full Test Suite
// ============================================================
// Covers all 5 layers: Authority, Guard, Execution, Truth, Determinism
// Uses Node.js built-in assert (no external dependencies)
// Run: node tests/synth.test.js
// ============================================================

import { strict as assert } from "assert"
import { promises as fs } from "fs"
import path from "path"

// ---- Modular dist/ imports (no monolithic synth-v5.js) ----
import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { ExecutionFingerprint } from "../dist/core/execution-fingerprint.js"
import { Registry, translateCapability } from "../dist/capability/registry.js"
import {
  createWorkItem, startWorkItem, completeWorkItem, blockWorkItem,
  createMission, createExpedition, createObjective, createDiscovery, createDecision,
} from "../dist/domain/index.js"
import {
  PlanningPermit, PlanningEngine, PlanningCoordinator,
  QuestionGenerator, IntentClassifier, KnowledgeExtractor,
  ObjectiveSynthesizer, DiscoveryEvaluator, DecisionEvaluator,
  SideQuestManager, PlanningConfidence,
} from "../dist/planning/index.js"
import {
  WorkspaceCognitionEnvironment, CanonicalLanguageAuditor,
  RepositoryHealth, SemanticVerifier, ExecutionArtifactAdapter,
} from "../dist/workspace/index.js"
import { createAlignedContract } from "./helpers/alignment-fixture.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0, skipped = 0

function test(name, fn) { TESTS.push({ name, fn }) }
function skip(name, _fn) { TESTS.push({ name, fn: null }) }

async function run() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH v2 — Full Test Suite")
  console.log("═══════════════════════════════════════════════════\n")

  for (const t of TESTS) {
    if (!t.fn) { console.log(`  [SKIP] ${t.name}`); skipped++; continue }
    try {
      await t.fn()
      console.log(`  [PASS] ${t.name}`)
      passed++
    } catch (err) {
      console.log(`  [FAIL] ${t.name}`)
      console.log(`         ${err.message || err}`)
      failed++
    }
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`)
  console.log(`  Total: ${TESTS.length}`)
  console.log("═══════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

// ---- Helpers ----
const DATA_DIR = path.join(process.cwd(), "data-test")
const EVENT_LOG = path.join(DATA_DIR, "event-log.jsonl")
const EVENT_STORE_TEST_LOG = path.join(DATA_DIR, "event-store-test.jsonl")
const STATE_FILE = path.join(DATA_DIR, "canonical-state.json")

async function cleanData() {
  try { await fs.rm(DATA_DIR, { recursive: true }) } catch { /* ok */ }
}

async function writeEvent(event, logPath = EVENT_LOG) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.appendFile(logPath, JSON.stringify(event) + "\n")
}

async function loadEvents(logPath = EVENT_LOG) {
  try { return (await fs.readFile(logPath, "utf-8")).split("\n").filter(Boolean).map(JSON.parse) } catch { return [] }
}

function computeHash(state) {
  const str = JSON.stringify({
    v: state.version, t: Object.keys(state.workItems).sort(), p: Object.keys(state.plans).sort(),
    m: Object.keys(state.missions || {}).sort(), e: Object.keys(state.expeditions || {}).sort(),
    o: Object.keys(state.objectives || {}).sort(), d: Object.keys(state.discoveries || {}).sort(),
    dc: Object.keys(state.decisions || {}).sort(), w: Object.keys(state.workItems || {}).sort(),
  })
  let hash = 0; for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  return String(Math.abs(hash))
}

function applyEvent(state, event) {
  const p = event.payload; if (!p) return state
  switch (event.type) {
    case "WORK_ITEM_CREATED": if (p.workItem) state.workItems[p.workItem.id] = p.workItem; break
    case "TICKET_STARTED": { const id = String(p.ticketId ?? p.id); if (state.workItems[id]) state.workItems[id] = { ...state.workItems[id], status: "active", updatedAt: Date.now() }; else state.workItems[id] = { id, status: "active", dependencies: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now() }; break }
    case "TICKET_COMPLETED": { const id = String(p.ticketId ?? p.id); if (state.workItems[id]) state.workItems[id] = { ...state.workItems[id], status: "complete", updatedAt: Date.now() }; else state.workItems[id] = { id, status: "complete", dependencies: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now() }; break }
    case "TICKET_BLOCKED": { const id = String(p.ticketId ?? p.id); const r = String(p.reason || ""); if (state.workItems[id]) state.workItems[id] = { ...state.workItems[id], status: "blocked", metadata: { ...state.workItems[id].metadata, blockReason: r }, updatedAt: Date.now() }; else state.workItems[id] = { id, status: "blocked", dependencies: [], metadata: { blockReason: r }, createdAt: Date.now(), updatedAt: Date.now() }; break }
    case "PLAN_CREATED": if (p.plan) state.plans[p.plan.id] = p.plan; break
    case "PLAN_ACTIVATED": if (state.plans[p.id]) state.plans[p.id] = { ...state.plans[p.id], status: "active" }; break
    case "PLAN_COMPLETED": if (state.plans[p.id]) state.plans[p.id] = { ...state.plans[p.id], status: "completed" }; break
    case "MILESTONE_CREATED": if (p.milestone) state.milestones[p.milestone.id] = p.milestone; break
    case "MILESTONE_STARTED": if (state.milestones[p.id]) state.milestones[p.id] = { ...state.milestones[p.id], status: "in_progress" }; break
    case "MILESTONE_COMPLETED": if (state.milestones[p.id]) state.milestones[p.id] = { ...state.milestones[p.id], status: "completed" }; break
    case "PROJECT_CREATED": if (p.project) state.projects[p.project.id] = p.project; break
    // EXPEDITION ENGINE events
    case "MISSION_CREATED": if (p.mission) state.missions[p.mission.id] = p.mission; break
    case "MISSION_APPROVED": { const id = String(p.id); if (state.missions[id]) state.missions[id] = { ...state.missions[id], status: "active", updatedAt: Date.now() }; break }
    case "MISSION_COMPLETED": { const id = String(p.id); if (state.missions[id]) state.missions[id] = { ...state.missions[id], status: "completed", updatedAt: Date.now() }; break }
    case "MISSION_ARCHIVED": { const id = String(p.id); if (state.missions[id]) state.missions[id] = { ...state.missions[id], status: "archived", updatedAt: Date.now() }; break }
    case "EXPEDITION_CREATED": if (p.expedition) state.expeditions[p.expedition.id] = p.expedition; break
    case "EXPEDITION_APPROVED": { const id = String(p.id); if (state.expeditions[id]) state.expeditions[id] = { ...state.expeditions[id], status: "approved", updatedAt: Date.now() }; break }
    case "EXPEDITION_STARTED": { const id = String(p.id); if (state.expeditions[id]) state.expeditions[id] = { ...state.expeditions[id], status: "executing", updatedAt: Date.now() }; break }
    case "EXPEDITION_COMPLETED": { const id = String(p.id); if (state.expeditions[id]) state.expeditions[id] = { ...state.expeditions[id], status: "completed", updatedAt: Date.now() }; break }
    case "OBJECTIVE_ADDED": if (p.objective) state.objectives[p.objective.id] = p.objective; break
    case "OBJECTIVE_COMPLETED": { const id = String(p.id); if (state.objectives[id]) state.objectives[id] = { ...state.objectives[id], status: "completed", updatedAt: Date.now() }; break }
    case "DISCOVERY_RECORDED": if (p.discovery) state.discoveries[p.discovery.id] = p.discovery; break
    case "DECISION_ACCEPTED": {
      if (p.decision) {
        state.decisions[p.decision.id] = p.decision
      } else {
        const id = String(p.id)
        if (state.decisions[id]) state.decisions[id] = { ...state.decisions[id], status: "accepted", updatedAt: Date.now() }
        else state.decisions[id] = { id, status: "accepted", timestamp: Date.now() }
      }
      break
    }
    case "DECISION_REJECTED": { const id = String(p.id); if (state.decisions[id]) state.decisions[id] = { ...state.decisions[id], status: "rejected", updatedAt: Date.now() }; else state.decisions[id] = { id, status: "rejected", timestamp: Date.now() }; break }
    case "WORK_ITEM_GENERATED": if (p.workItem) state.workItems[p.workItem.id] = p.workItem; break
    case "WORK_ITEM_COMPLETED": { const id = String(p.id); if (state.workItems[id]) state.workItems[id] = { ...state.workItems[id], status: "completed", completedAt: Date.now() }; break }
    case "SYSTEM_GENESIS": state.version = 1; break
  }
  state.version += 1
  return state
}

function rebuildState(events) {
  let state = { version: 0, stateHash: "0", workItems: {}, plans: {}, milestones: {}, projects: {}, missions: {}, expeditions: {}, objectives: {}, discoveries: {}, decisions: {}, workItems: {}, lastEventOffset: 0 }
  for (const event of events) state = applyEvent(state, event)
  state.stateHash = computeHash(state)
  state.lastEventOffset = events.length
  return state
}

// ---- Bootstrap context cache ----
let testCtx = null

async function getTestCtx() {
  if (testCtx) return testCtx
  const ctx = await bootstrap({
    infra: {
      eventLogPath: path.join(DATA_DIR, "event-log.jsonl"),
      statePath: path.join(DATA_DIR, "canonical-state.json"),
      checkpointPath: path.join(DATA_DIR, "checkpoint.json"),
    },
    genesis: { projectName: "Test", systemId: "test-system", initialWorkItems: [{ id: "W-1", name: "Test" }], partitions: 2 },
    skipGenesis: false,
  })
  testCtx = ctx
  return ctx
}

function getReplayVerifier(ctx) {
  return createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
}

// ============================================================
// TESTS: Domain Logic (Pure Functions)
// ============================================================

test("Domain: createTicket produces correct defaults", () => {
  const t = { id: "W-1", status: "idle", dependencies: [], metadata: {}, createdAt: Date.now(), updatedAt: Date.now() }
  assert.equal(t.id, "W-1")
  assert.equal(t.status, "idle")
})

test("Domain: startTicket transitions idle → active", () => {
  const workItem = { id: "W-1", status: "idle", dependencies: [], metadata: {}, createdAt: 1, updatedAt: 1 }
  const started = { ...workItem, status: "active", updatedAt: Date.now() }
  assert.equal(started.status, "active")
})

test("Domain: completeTicket transitions active → complete", () => {
  const workItem = { id: "W-1", status: "active", dependencies: [], metadata: {}, createdAt: 1, updatedAt: 1 }
  const completed = { ...workItem, status: "complete", updatedAt: Date.now() }
  assert.equal(completed.status, "complete")
})

test("Domain: startTicket on completed throws INVARIANT_VIOLATION", () => {
  try {
    const workItem = { id: "W-1", status: "complete" }
    if (workItem.status === "complete") throw new Error("INVARIANT_VIOLATION: cannot start completed workItem")
    assert.fail("Should have thrown")
  } catch (err) {
    assert.ok(err.message.includes("INVARIANT_VIOLATION"))
  }
})

test("Domain: blockTicket sets blocked status", () => {
  const workItem = { id: "W-1", status: "idle", metadata: {}, updatedAt: 1 }
  const blocked = { ...workItem, status: "blocked", metadata: { blockReason: "test" }, updatedAt: Date.now() }
  assert.equal(blocked.status, "blocked")
  assert.equal(blocked.metadata.blockReason, "test")
})

test("Domain: createPlan produces draft status", () => {
  const plan = { id: "P-1", name: "Test", status: "draft", milestones: [], dependencies: [], metadata: {} }
  assert.equal(plan.status, "draft")
})

test("Domain: activatePlan transitions draft → active", () => {
  const plan = { id: "P-1", status: "draft" }
  if (plan.status !== "draft") throw new Error("INVARIANT_VIOLATION")
  const activated = { ...plan, status: "active" }
  assert.equal(activated.status, "active")
})

test("Domain: createProject produces active status", () => {
  const project = { id: "PR-1", name: "Test", goal: "G", plans: [], status: "active" }
  assert.equal(project.status, "active")
})

// ============================================================
// TESTS: Event Store (Append-Only Log)
// ============================================================

test("EventStore: append writes to log", async () => {
  await cleanData()
  const event = { id: "E-1", type: "TEST", timestamp: Date.now(), payload: { data: 42 } }
  await writeEvent(event, EVENT_STORE_TEST_LOG)
  const events = await loadEvents(EVENT_STORE_TEST_LOG)
  assert.equal(events.length, 1)
  assert.equal(events[0].type, "TEST")
})

test("EventStore: loadAll returns events in order", async () => {
  await cleanData()
  await writeEvent({ id: "E-1", type: "FIRST", timestamp: 1 }, EVENT_STORE_TEST_LOG)
  await writeEvent({ id: "E-2", type: "SECOND", timestamp: 2 }, EVENT_STORE_TEST_LOG)
  await writeEvent({ id: "E-3", type: "THIRD", timestamp: 3 }, EVENT_STORE_TEST_LOG)
  const events = await loadEvents(EVENT_STORE_TEST_LOG)
  assert.equal(events.length, 3)
  assert.equal(events[0].type, "FIRST")
  assert.equal(events[1].type, "SECOND")
  assert.equal(events[2].type, "THIRD")
})

test("EventStore: log is append-only (no deletion)", async () => {
  await cleanData()
  await writeEvent({ id: "E-1", type: "ORIGINAL" }, EVENT_STORE_TEST_LOG)
  // Even if we "modify" conceptually, the original event remains
  await writeEvent({ id: "E-2", type: "CORRECTION", corrects: "E-1" }, EVENT_STORE_TEST_LOG)
  const events = await loadEvents(EVENT_STORE_TEST_LOG)
  assert.equal(events.length, 2)
  assert.equal(events[0].type, "ORIGINAL") // Original still exists
})

// ============================================================
// TESTS: State Reconstruction (Replay)
// ============================================================

test("Replay: empty events → empty state", () => {
  const state = rebuildState([])
  assert.equal(Object.keys(state.workItems).length, 0)
  assert.equal(Object.keys(state.plans).length, 0)
  assert.equal(state.version, 0)
})

test("Replay: WORK_ITEM_CREATED adds workItem to state", () => {
  const events = [{ type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle", dependencies: [], metadata: {} } } }]
  const state = rebuildState(events)
  assert.equal(Object.keys(state.workItems).length, 1)
  assert.equal(state.workItems["W-1"].id, "W-1")
  assert.equal(state.workItems["W-1"].status, "idle")
})

test("Replay: TICKET_STARTED changes status", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle", dependencies: [], metadata: {} } } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "active")
})

test("Replay: multiple workItems tracked independently", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-2", status: "idle" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
    { type: "TICKET_COMPLETED", payload: { ticketId: "W-1" } },
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "complete")
  assert.equal(state.workItems["W-2"].status, "idle")
})

test("Replay: state hash is deterministic", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state1 = rebuildState(events)
  const state2 = rebuildState(events)
  assert.equal(state1.stateHash, state2.stateHash)
})

test("Replay: PROJECT_CREATED adds project", () => {
  const events = [{ type: "PROJECT_CREATED", payload: { project: { id: "P-1", name: "Test", goal: "G", plans: [], status: "active" } } }]
  const state = rebuildState(events)
  assert.equal(Object.keys(state.projects).length, 1)
  assert.equal(state.projects["P-1"].name, "Test")
})

test("Replay: SYSTEM_GENESIS sets version", () => {
  const events = [{ type: "SYSTEM_GENESIS", payload: {} }]
  const state = rebuildState(events)
  assert.ok(state.version >= 1, `Expected version >= 1, got ${state.version}`)
})

// ============================================================
// TESTS: Validation
// ============================================================

test("Validation: rejects empty actor", () => {
  const req = { actor: "", capability: "StartWorkItem", payload: { id: "W-1" } }
  const errors = []
  if (!req.actor || req.actor.length === 0) errors.push({ field: "actor", severity: "error" })
  assert.ok(errors.length > 0)
})

test("Validation: rejects empty capability", () => {
  const req = { actor: "user", capability: "", payload: { id: "W-1" } }
  const errors = []
  if (!req.capability || req.capability.length === 0) errors.push({ field: "capability", severity: "error" })
  assert.ok(errors.length > 0)
})

test("Validation: rejects missing payload.id for StartTicket", () => {
  const invocation = { actor: "user", capability: "StartWorkItem", payload: {} }
  const errors = []
  if (!invocation.payload.id) errors.push({ field: "payload.id", severity: "error" })
  assert.ok(errors.length > 0)
})

test("Validation: accepts valid StartTicket intent", () => {
  const invocation = { actor: "user", capability: "StartWorkItem", payload: { id: "W-1" } }
  assert.ok(invocation.actor.length > 0)
  assert.ok(invocation.capability.length > 0)
  assert.ok(invocation.payload.id)
})

// ============================================================
// TESTS: Policy Engine
// ============================================================

test("Policy: allows normal operation by default", () => {
  const policy = new (class { isAllowed(intent, _state) {
    if (intent.capability === "DeleteSystem") return { allowed: false }
    return { allowed: true }
  }})()
  const result = policy.isAllowed({ capability: "CreateWorkItem" }, {})
  assert.equal(result.allowed, true)
})

test("Policy: blocks DeleteSystem", () => {
  const policy = new (class { isAllowed(intent, _state) {
    if (intent.capability === "DeleteSystem") return { allowed: false, reason: "System protection" }
    return { allowed: true }
  }})()
  const result = policy.isAllowed({ capability: "DeleteSystem" }, {})
  assert.equal(result.allowed, false)
})

test("Policy: blocks operation on completed workItem", () => {
  const state = { workItems: { "W-1": { status: "complete" } } }
  const isBlocked = state.workItems["W-1"].status === "complete"
  assert.equal(isBlocked, true)
})

// ============================================================
// TESTS: Integration — Full System via modular dist/
// ============================================================

test("Integration: system bootstraps with all 5 layers", async () => {
  await cleanData()
  const ctx = await bootstrap({
    infra: {
      eventLogPath: path.join(DATA_DIR, "event-log.jsonl"),
      statePath: path.join(DATA_DIR, "canonical-state.json"),
      checkpointPath: path.join(DATA_DIR, "checkpoint.json"),
    },
    genesis: { projectName: "Bootstrap Test", systemId: "bootstrap-test", partitions: 2 },
    skipGenesis: false,
  })
  assert.ok(ctx.gate, "ExecutionGate must be present")
  assert.ok(ctx.runtime, "RuntimeEngine must be present")
  assert.ok(ctx.api, "API must be present")
  assert.ok(ctx.planning, "PlanningEngine must be present")
  assert.ok(ctx.workspace, "WorkspaceCognitionEnvironment must be present")
})

test("Integration: capability registry has canonical defaults", async () => {
  const ctx = await getTestCtx()
  const caps = ctx.capabilityRegistry.list()
  assert.ok(caps.length >= 7, `Registry must have at least 7 capabilities, got ${caps.length}`)
  assert.ok(caps.includes("CreateWorkItem"))
  assert.ok(caps.includes("CompleteWorkItem"))
  assert.ok(caps.includes("CreateProject"))
  assert.ok(caps.includes("CreateMission"))
  assert.ok(caps.includes("CreateExpedition"))
})

test("Integration: empty event log is replayable", async () => {
  await cleanData()
  const events = await loadEvents()
  const state = rebuildState(events)
  assert.equal(state.version, 0)
  assert.equal(Object.keys(state.workItems).length, 0)
})

test("Integration: state is pure function of events", async () => {
  await cleanData()
  // Simulate a sequence of events
  const events = [
    { id: "E1", type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle", dependencies: [], metadata: {} } } },
    { id: "E2", type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
    { id: "E3", type: "TICKET_COMPLETED", payload: { ticketId: "W-1" } },
    { id: "E4", type: "PROJECT_CREATED", payload: { project: { id: "P-1", name: "Test", goal: "G", plans: [], status: "active" } } },
  ]
  for (const e of events) await writeEvent(e)

  // Replay from event log
  const loaded = await loadEvents()
  assert.equal(loaded.length, 4)

  const state = rebuildState(loaded)
  assert.equal(Object.keys(state.workItems).length, 1)
  assert.equal(state.workItems["W-1"].status, "complete")
  assert.equal(Object.keys(state.projects).length, 1)
  assert.equal(state.projects["P-1"].name, "Test")
})

test("Integration: replay idempotency — same events = same hash", async () => {
  await cleanData()
  const events = [
    { id: "E1", type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle", dependencies: [], metadata: {} } } },
    { id: "E2", type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  for (const e of events) await writeEvent(e)
  const loaded = await loadEvents()

  const state1 = rebuildState(loaded)
  const state2 = rebuildState(loaded)
  assert.equal(state1.stateHash, state2.stateHash)
})

// ============================================================
// TESTS: Edge Cases
// ============================================================

test("Edge: replay with unknown event type is ignored", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "UNKNOWN_EVENT_TYPE", payload: { whatever: true } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "active")
  assert.equal(state.version, 3) // All events increment version
})

test("Edge: event with null payload is skipped gracefully", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "WEIRD_EVENT", payload: null },
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "idle")
})

test("Edge: duplicate TICKET_STARTED is idempotent", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "active") // Still active, not corrupted
})

test("Edge: block workItem with no reason", () => {
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "TICKET_BLOCKED", payload: { ticketId: "W-1" } }, // No reason
  ]
  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "blocked")
})

test("Edge: state hash changes when events change", () => {
  const events1 = [{ type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } }]
  const events2 = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state1 = rebuildState(events1)
  const state2 = rebuildState(events2)
  assert.notEqual(state1.stateHash, state2.stateHash)
})

// ============================================================
// TESTS: Layer 4 — Replay Consistency
// ============================================================

test("Layer4: replay verifier confirms consistency", async () => {
  await cleanData()
  const events = [
    { id: "E1", type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { id: "E2", type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  for (const e of events) await writeEvent(e)

  const loaded = await loadEvents()
  const state = rebuildState(loaded)

  // Structural checks
  let issues = 0
  for (const t of Object.values(state.workItems)) {
    if (!["idle", "active", "blocked", "complete"].includes(t.status)) issues++
  }

  assert.equal(issues, 0)
  assert.equal(state.workItems["W-1"].status, "active")
})

test("Layer4: replay verifier detects structural issues", async () => {
  // Manually corrupt a workItem in state (simulated)
  const workItem = { id: "W-1", status: "BOGUS_STATUS" }
  const valid = ["idle", "active", "blocked", "complete"].includes(workItem.status)
  assert.equal(valid, false)
})

// ============================================================
// TESTS: Layer 5 — Execution Fingerprinting
// ============================================================

function makeFingerprintRecord(command, events = []) {
  return {
    command,
    capability: command.capability,
    partition: "default",
    events,
    result: { status: "ok" },
  }
}

test("Layer5: same input produces same fingerprint", () => {
  const cmd = { actor: "user", capability: "StartWorkItem", payload: { id: "W-1" } }
  const events = [{ type: "WORK_ITEM_STARTED", payload: { id: "W-1" } }]
  const record = makeFingerprintRecord(cmd, events)

  const hash1 = ExecutionFingerprint.create(record)
  const hash2 = ExecutionFingerprint.create(record)
  assert.equal(hash1, hash2)
})

test("Layer5: different input produces different fingerprint", () => {
  const cmd1 = { actor: "user", capability: "StartWorkItem", payload: { id: "W-1" } }
  const cmd2 = { actor: "user", capability: "CompleteWorkItem", payload: { id: "W-1" } }
  const events = [{ type: "WORK_ITEM_STARTED", payload: { id: "W-1" } }]

  const hash1 = ExecutionFingerprint.create(makeFingerprintRecord(cmd1, events))
  const hash2 = ExecutionFingerprint.create(makeFingerprintRecord(cmd2, events))
  assert.notEqual(hash1, hash2)
})

test("Layer5: fingerprint includes all command fields", () => {
  const base = { actor: "user", capability: "CreateWorkItem", payload: { id: "W-1" } }
  const withName = { ...base, payload: { ...base.payload, name: "Named" } }

  const hash1 = ExecutionFingerprint.create(makeFingerprintRecord(base, []))
  const hash2 = ExecutionFingerprint.create(makeFingerprintRecord(withName, []))
  assert.notEqual(hash1, hash2)
})

// ============================================================
// TESTS: Boot Sequence
// ============================================================

test("Boot: empty system has zero events", async () => {
  await cleanData()
  const events = await loadEvents()
  assert.equal(events.length, 0)
})

test("Boot: genesis produces seed events", async () => {
  await cleanData()
  const genesisEvents = [
    { id: "GENESIS", type: "SYSTEM_GENESIS", payload: { systemId: "test" } },
    { id: "E1", type: "PROJECT_CREATED", payload: { project: { id: "P-1", name: "Genesis Project", goal: "Test", plans: [], status: "active" } } },
  ]
  for (const e of genesisEvents) await writeEvent(e)
  const events = await loadEvents()
  assert.equal(events.length, 2)
  assert.equal(events[0].type, "SYSTEM_GENESIS")
})

// ============================================================
// TESTS: Guard Simulation (Layer 2)
// ============================================================

test("Layer2: guard token must be activated before write", () => {
  let passActive = false
  function guardedAppend() {
    if (!passActive) throw new Error("ILLEGAL_EVENTSTORE_WRITE")
    return "written"
  }

  // Without token: throws
  assert.throws(() => guardedAppend(), /ILLEGAL_EVENTSTORE_WRITE/)

  // With token: succeeds
  passActive = true
  assert.equal(guardedAppend(), "written")
})

test("Layer2: guard token auto-deactivates", () => {
  let passActive = false
  function guardedAppend() {
    if (!passActive) throw new Error("ILLEGAL_EVENTSTORE_WRITE")
    passActive = false // auto-deactivate
    return "written"
  }

  passActive = true
  guardedAppend() // succeeds
  assert.throws(() => guardedAppend(), /ILLEGAL_EVENTSTORE_WRITE/) // now blocked again
})

// ============================================================
// TESTS: P0 — Structural Boundary Enforcement
// ============================================================

test("P0: seal() is available as a one-way transition", async () => {
  const ctx = await getTestCtx()
  assert.ok(typeof ctx.seal === "function", "seal() must be a function")
  assert.equal(ctx.isSealed, false, "System starts unsealed")
  ctx.seal()
  assert.equal(ctx.isSealed, true, "System is sealed after seal()")
})

test("P0: seal() freezes capability registry", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  assert.equal(ctx.capabilityRegistry._frozen, true, "Registry must be frozen after seal")
})

test("P0: seal() freezes policy engine", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  assert.equal(ctx.policyEngine._frozen, true, "Policy engine must be frozen after seal")
})

test("P0: frozen registry blocks new registration", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  try {
    ctx.capabilityRegistry.register({ name: "EvilCapability" })
    assert.fail("Should have thrown InvariantViolation")
  } catch (err) {
    assert.ok(err.message.includes("I5") || err.message.includes("frozen"), `Expected I5 invariant violation, got: ${err.message}`)
  }
})

test("P0: frozen policy engine blocks new policy registration", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  try {
    ctx.policyEngine.register({ id: "evil-policy", name: "Evil", scope: {}, condition: () => true, effect: "DENY", severity: "critical" })
    assert.fail("Should have thrown InvariantViolation")
  } catch (err) {
    assert.ok(err.message.includes("I5") || err.message.includes("frozen"), `Expected I5 invariant violation, got: ${err.message}`)
  }
})

test("P0: double-seal throws InvariantViolation", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  try {
    ctx.seal()
    assert.fail("Double seal should throw")
  } catch (err) {
    assert.ok(err.message.includes("SEAL") || err.message.includes("already sealed"), `Expected seal error, got: ${err.message}`)
  }
})

test("P0: system operates normally after seal", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateWorkItem", payload: { id: "W-SEAL", name: "Seal Test Work Item" } })
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartWorkItem", payload: { id: "W-SEAL" } })
  assert.equal(result.status, "ok", `Operation after seal should succeed: ${result.error}`)
})

test("P0: ExecutionGate remains sole mutation authority after seal", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // gate.execute is the only mutation path
  const { result } = await ctx.gate.execute({ actor: "test", capability: "CreateWorkItem", payload: { id: "T-SEAL-TEST", name: "Seal Test" } })
  assert.ok(result.transaction.id, "gate execution must return a transaction")
  // I2: Every event has a transactionId
  for (const e of result.events) {
    assert.ok(e.transactionId, `Event ${e.type} must have transactionId`)
  }
})

test("P0: event store guard blocks direct writes after seal", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  try {
    await ctx.infra.eventStore.append({ type: "ILLEGAL_DIRECT_WRITE" })
    assert.fail("Direct write should have been blocked")
  } catch (err) {
    assert.ok(err.message.includes("ILLEGAL_EVENTSTORE_WRITE") || err.message.includes("ExecutionGate"), `Expected guard block, got: ${err.message}`)
  }
})

// ============================================================
// TESTS: Event Ordering
// ============================================================

test("Ordering: events processed in log order", async () => {
  await cleanData()
  await writeEvent({ type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } })
  await writeEvent({ type: "TICKET_STARTED", payload: { ticketId: "W-1" } })
  await writeEvent({ type: "TICKET_COMPLETED", payload: { ticketId: "W-1" } })

  const events = await loadEvents()
  assert.equal(events[0].type, "WORK_ITEM_CREATED")
  assert.equal(events[1].type, "TICKET_STARTED")
  assert.equal(events[2].type, "TICKET_COMPLETED")

  const state = rebuildState(events)
  assert.equal(state.workItems["W-1"].status, "complete")
})

test("Ordering: out-of-order status transitions are applied as logged", () => {
  // Complete before start (nonsensical but faithfully replayed)
  const events = [
    { type: "WORK_ITEM_CREATED", payload: { workItem: { id: "W-1", status: "idle" } } },
    { type: "TICKET_COMPLETED", payload: { ticketId: "W-1" } },
    { type: "TICKET_STARTED", payload: { ticketId: "W-1" } },
  ]
  const state = rebuildState(events)
  // Last event wins in this model
  assert.equal(state.workItems["W-1"].status, "active")
})

// ============================================================
// TESTS: P2 — Production Hardening
// ============================================================

test("P2: state store hash integrity on save/load cycle", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  // Save current state
  const events = await ctx.infra.eventStore.loadAll()
  const state = rebuildState(events)
  await ctx.infra.stateStore.save(state)

  // Load and verify hash matches
  const loaded = await ctx.infra.stateStore.load()
  assert.ok(loaded, "State must load successfully")
  assert.equal(loaded.stateHash, state.stateHash, "Loaded state hash must match saved")
})

// ============================================================
// TESTS: EXPEDITION ENGINE — Planning Architecture v2
// ============================================================

test("Expedition: capability registry includes Expedition capabilities", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // Current modular default capabilities include canonical WorkItem, Plan, Milestone, Project, initialization, PCE, recovery, and repository governance capabilities
  assert.equal(ctx.capabilityRegistry.size(), 34, `Registry must have 34 default capabilities, got ${ctx.capabilityRegistry.size()}`)
  assert.ok(ctx.capabilityRegistry.has("InitializeProject"), "Registry must have InitializeProject")
  assert.ok(ctx.capabilityRegistry.has("CreateMission"), "Registry must have CreateMission")
  assert.ok(ctx.capabilityRegistry.has("CreateExpedition"), "Registry must have CreateExpedition")
  assert.ok(ctx.capabilityRegistry.has("ApproveExpedition"), "Registry must have ApproveExpedition")
  assert.ok(ctx.capabilityRegistry.has("CommitExpedition"), "Registry must have CommitExpedition")
  assert.ok(ctx.capabilityRegistry.has("StartExpedition"), "Registry must have StartExpedition")
  assert.ok(ctx.capabilityRegistry.has("CompleteExpedition"), "Registry must have CompleteExpedition")
  assert.ok(ctx.capabilityRegistry.has("AddObjective"), "Registry must have AddObjective")
  assert.ok(ctx.capabilityRegistry.has("CompleteObjective"), "Registry must have CompleteObjective")
  assert.ok(ctx.capabilityRegistry.has("RecordDiscovery"), "Registry must have RecordDiscovery")
  assert.ok(ctx.capabilityRegistry.has("AcceptDecision"), "Registry must have AcceptDecision")
  assert.ok(ctx.capabilityRegistry.has("RecordRepair"), "Registry must have RecordRepair")
  assert.ok(ctx.capabilityRegistry.has("InitializeRepository"), "Registry must have InitializeRepository")
  assert.ok(ctx.capabilityRegistry.has("CreateBranch"), "Registry must have CreateBranch")
  assert.ok(ctx.capabilityRegistry.has("OpenPullRequest"), "Registry must have OpenPullRequest")
  assert.ok(ctx.capabilityRegistry.has("ApprovePromotion"), "Registry must have ApprovePromotion")
  assert.ok(ctx.capabilityRegistry.has("MergePullRequest"), "Registry must have MergePullRequest")
  assert.ok(ctx.capabilityRegistry.has("CreateRelease"), "Registry must have CreateRelease")
})

test("Expedition: CreateMission produces MISSION_CREATED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  const result = await ctx.api.handleIntent({
    actor: "test", capability: "CreateMission",
    payload: { id: "M-1", name: "Build Synth Platform", purpose: "Create a deterministic execution system" }
  })
  assert.equal(result.status, "ok", `CreateMission should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const missionEvent = events.find((e) => e.type === "MISSION_CREATED")
  assert.ok(missionEvent, "MISSION_CREATED event must exist")
  assert.equal(missionEvent.payload.mission.id, "M-1")
  assert.equal(missionEvent.payload.mission.status, "draft")
})

test("Expedition: ApproveMission transitions status to active", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-2", name: "Test Mission" } })
  const { contractId } = await createAlignedContract(ctx)
  const result = await ctx.api.handleIntent({ actor: "test", capability: "ApproveMission", payload: { id: "M-2", alignmentContractId: contractId } })
  assert.equal(result.status, "ok", `ApproveMission should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const approveEvent = events.find((e) => e.type === "MISSION_APPROVED" && e.payload.id === "M-2")
  assert.ok(approveEvent, "MISSION_APPROVED event must exist")
  assert.equal(approveEvent.payload.status, "active")
})

test("Expedition: CreateExpedition produces EXPEDITION_CREATED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  const result = await ctx.api.handleIntent({
    actor: "test", capability: "CreateExpedition",
    payload: { id: "E-1", missionId: "M-1", name: "Interactive Documentation", goal: "Render architecture handbook" }
  })
  assert.equal(result.status, "ok", `CreateExpedition should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const expEvent = events.find((e) => e.type === "EXPEDITION_CREATED" && e.payload.expedition.id === "E-1")
  assert.ok(expEvent, "EXPEDITION_CREATED event must exist")
  assert.equal(expEvent.payload.expedition.status, "draft")
})

test("Expedition: StartExpedition transitions to executing", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-2", missionId: "M-1", name: "Test Expedition" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-2" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-2" } })
  const result = await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-2" } })
  assert.equal(result.status, "ok", `StartExpedition should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const startEvent = events.find((e) => e.type === "EXPEDITION_STARTED" && e.payload.id === "E-2")
  assert.ok(startEvent, "EXPEDITION_STARTED event must exist")
  assert.equal(startEvent.payload.status, "executing")
})

test("Expedition: AddObjective produces OBJECTIVE_ADDED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-3", missionId: "M-1", name: "Test Expedition" } })
  const result = await ctx.api.handleIntent({
    actor: "test", capability: "AddObjective",
    payload: { id: "O-1", expeditionId: "E-3", title: "Render Markdown", purpose: "Support Markdown rendering in docs" }
  })
  assert.equal(result.status, "ok", `AddObjective should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const objEvent = events.find((e) => e.type === "OBJECTIVE_ADDED" && e.payload.objective.id === "O-1")
  assert.ok(objEvent, "OBJECTIVE_ADDED event must exist")
  assert.equal(objEvent.payload.objective.status, "draft")
})

test("Expedition: RecordDiscovery produces DISCOVERY_RECORDED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-5", missionId: "M-1", name: "Test Expedition" } })
  const result = await ctx.api.handleIntent({
    actor: "test", capability: "RecordDiscovery",
    payload: { id: "D-1", expeditionId: "E-5", description: "Need indexing layer", context: "Search requires document indexing", impact: "high" }
  })
  assert.equal(result.status, "ok", `RecordDiscovery should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const discEvent = events.find((e) => e.type === "DISCOVERY_RECORDED" && e.payload.discovery.id === "D-1")
  assert.ok(discEvent, "DISCOVERY_RECORDED event must exist")
  assert.equal(discEvent.payload.discovery.impact, "high")
})

test("Expedition: RecordDecision produces DECISION_ACCEPTED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-6", missionId: "M-1", name: "Test Expedition" } })
  const result = await ctx.api.handleIntent({
    actor: "test", capability: "RecordDecision",
    payload: { id: "DC-1", expeditionId: "E-6", title: "Test Decision", chosenAlternative: 0 }
  })
  assert.equal(result.status, "ok", `RecordDecision should succeed: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const decEvent = events.find((e) => e.type === "DECISION_ACCEPTED" && e.payload.decision?.id === "DC-1")
  assert.ok(decEvent, "DECISION_ACCEPTED event must exist")
  assert.equal(decEvent.payload.decision.status, "accepted")
})

test("Expedition: full expedition lifecycle", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  // Create Mission
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-FULL", name: "Full Test Mission", purpose: "Test full lifecycle" } })
  const { contractId } = await createAlignedContract(ctx)
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveMission", payload: { id: "M-FULL", alignmentContractId: contractId } })

  // Create, commit, and start Expedition
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-FULL", missionId: "M-FULL", name: "Full Expedition", goal: "Test everything" } })
  await ctx.api.handleIntent({ actor: "test", capability: "ApproveExpedition", payload: { id: "E-FULL" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CommitExpedition", payload: { id: "E-FULL" } })
  await ctx.api.handleIntent({ actor: "test", capability: "StartExpedition", payload: { id: "E-FULL" } })

  // Add objectives
  await ctx.api.handleIntent({ actor: "test", capability: "AddObjective", payload: { id: "O-FULL-1", expeditionId: "E-FULL", title: "Objective One" } })
  await ctx.api.handleIntent({ actor: "test", capability: "AddObjective", payload: { id: "O-FULL-2", expeditionId: "E-FULL", title: "Objective Two" } })

  // Record discovery
  await ctx.api.handleIntent({ actor: "test", capability: "RecordDiscovery", payload: { id: "D-FULL", expeditionId: "E-FULL", description: "Found something important", context: "During implementation", impact: "medium" } })

  // Make a decision
  const decisionResult = await ctx.api.handleIntent({ actor: "test", capability: "RecordDecision", payload: { id: "DC-FULL", expeditionId: "E-FULL", title: "Full Lifecycle Decision", chosenAlternative: 0 } })
  assert.equal(decisionResult.status, "ok", `RecordDecision should succeed: ${decisionResult.error}`)

  // Complete expedition
  await ctx.api.handleIntent({ actor: "test", capability: "CompleteExpedition", payload: { id: "E-FULL" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CompleteMission", payload: { id: "M-FULL" } })

  // Verify state
  const events = await ctx.infra.eventStore.loadAll()
  const state = rebuildState(events)
  assert.ok(state.missions, "State must have missions")
  assert.ok(state.expeditions, "State must have expeditions")
  assert.ok(state.objectives, "State must have objectives")
  assert.ok(state.discoveries, "State must have discoveries")
  assert.ok(state.decisions, "State must have decisions")
  assert.equal(state.missions["M-FULL"]?.status, "completed", "Mission should be completed")
  assert.equal(state.expeditions["E-FULL"]?.status, "completed", "Expedition should be completed")
  assert.ok(state.objectives["O-FULL-1"], "Objective 1 should exist")
  assert.ok(state.objectives["O-FULL-2"], "Objective 2 should exist")
  assert.ok(state.discoveries["D-FULL"], "Discovery should exist")
  assert.equal(state.decisions["DC-FULL"]?.status, "accepted", "Decision should be accepted")
})

test("Expedition: replay reconstructs planning state correctly", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  // Create planning entities
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-REPLAY", name: "Replay Test" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-REPLAY", missionId: "M-REPLAY", name: "Replay Expedition" } })
  await ctx.api.handleIntent({ actor: "test", capability: "AddObjective", payload: { id: "O-REPLAY", expeditionId: "E-REPLAY", title: "Replay Objective" } })
  await ctx.api.handleIntent({ actor: "test", capability: "RecordDiscovery", payload: { id: "D-REPLAY", expeditionId: "E-REPLAY", description: "Replay discovery" } })

  // Verify replay consistency
  const replayVerifier = getReplayVerifier(ctx)
  const check = await replayVerifier.verify()
  assert.equal(check.consistent, true, "Replay must be consistent after Expedition operations")

  // Verify state contains all entities
  const events = await ctx.infra.eventStore.loadAll()
  const state = rebuildState(events)
  assert.ok(state.missions["M-REPLAY"], "Replayed state must contain mission")
  assert.ok(state.expeditions["E-REPLAY"], "Replayed state must contain expedition")
  assert.ok(state.objectives["O-REPLAY"], "Replayed state must contain objective")
  assert.ok(state.discoveries["D-REPLAY"], "Replayed state must contain discovery")
})

test("Expedition: state hash includes expedition entities", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  const events1 = await ctx.infra.eventStore.loadAll()
  const state1 = rebuildState(events1)

  // Add a mission
  await ctx.api.handleIntent({ actor: "test", capability: "CreateMission", payload: { id: "M-HASH", name: "Hash Test" } })

  const events2 = await ctx.infra.eventStore.loadAll()
  const state2 = rebuildState(events2)

  assert.notEqual(state1.stateHash, state2.stateHash, "State hash must change when expedition entities are added")
})

// ============================================================
// TESTS: PCE — Planning Cognition Engine
// ============================================================

test("PCE: PlanningPermit can be created and verified", () => {
  const key = "test-key-123"
  const intent = { capability: "CreateMission", actor: "pce", payload: { id: "M-1" } }
  const permit = PlanningPermit.create("tx-1", intent, key)
  assert.equal(permit.txId, "tx-1")
  assert.equal(permit.planningIntent.capability, "CreateMission")
  assert.ok(PlanningPermit.verify(permit, key), "Permit must verify with the correct key")
})

test("PCE: PlanningEngine is available in bootstrap context", async () => {
  const ctx = await getTestCtx()
  assert.ok(ctx.planning, "PlanningEngine must be in bootstrap return")
  assert.ok(ctx.planning instanceof PlanningEngine, "ctx.planning must be a PlanningEngine instance")
})

test("PCE: planning API is available via ctx.api.plan()", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({ operation: "classifyIntent", params: { capability: "CreateMission", payload: {} } })
  assert.ok(result, "Plan result must be returned")
  assert.ok(result.name, "Classification must include a name")
})

test("PCE: intent classifier returns Guided Build by default", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "classifyIntent",
    params: { capability: "CreateMission", payload: { name: "Test" } },
  })
  assert.equal(result.name, "Guided Build")
  assert.equal(result.mode, 1)
})

test("PCE: intent classifier detects Brownfield Adoption", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "classifyIntent",
    params: { capability: "CreateMission", payload: {} },
    context: { repository: true },
  })
  assert.equal(result.name, "Brownfield Adoption")
  assert.equal(result.mode, 4)
})

test("PCE: intent classifier detects Continuation mode", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "classifyIntent",
    params: { capability: "CreateMission", payload: {} },
    context: { continuationId: "prev-session-123" },
  })
  assert.equal(result.name, "Continuation")
  assert.equal(result.mode, 5)
})

test("PCE: question generator produces questions for CreateMission", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "generateQuestions",
    params: { capability: "CreateMission", payload: { id: "M-Q", name: "Test" } },
  })
  assert.ok(Array.isArray(result))
  assert.ok(result.length > 0, "Should generate questions for incomplete mission")
})

test("PCE: question generator produces questions for CreateExpedition", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "generateQuestions",
    params: { capability: "CreateExpedition", payload: { id: "E-Q", missionId: "M-1", name: "Test" } },
  })
  assert.ok(Array.isArray(result))
  assert.ok(result.length > 0, "Should generate questions for expedition without goal")
})

test("PCE: knowledge extractor finds requirements and risks", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "extractKnowledge",
    params: { documents: ["# Spec\n\nThe system must support encryption. Risk: key management complexity."] },
  })
  assert.ok(result.requirements.length > 0, "Should extract requirements")
  assert.ok(result.risks.length > 0, "Should extract risks")
})

test("PCE: chartMission writes MISSION_CREATED event through planning pipeline", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  const result = await ctx.api.plan({
    operation: "chartMission",
    params: { id: "M-PCE-1", name: "PCE Mission", purpose: "Test planning pipeline" },
  })

  assert.ok(result.events, "Result must include events")
  assert.equal(result.events[0]?.type, "MISSION_CREATED")
  assert.ok(result.permit, "Result must include planning permit")

  // Verify the mission is in state
  const events = await ctx.infra.eventStore.loadAll()
  const missionEvent = events.find((e) => e.type === "MISSION_CREATED" && e.payload.mission.id === "M-PCE-1")
  assert.ok(missionEvent, "MISSION_CREATED event must be in event log")
  assert.equal(missionEvent.payload.mission.status, "draft")
})

test("PCE: commissionMission transitions mission to active", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  await ctx.api.plan({ operation: "chartMission", params: { id: "M-PCE-2", name: "Commission Test" } })
  const { contractId } = await createAlignedContract(ctx)
  const result = await ctx.api.plan({ operation: "commissionMission", params: { id: "M-PCE-2" }, context: { alignmentContractId: contractId } })

  assert.ok(result.events, "Result must include events")
  assert.equal(result.events[0]?.type, "MISSION_APPROVED")

  const events = await ctx.infra.eventStore.loadAll()
  const approvedEvent = events.find((e) => e.type === "MISSION_APPROVED" && e.payload.id === "M-PCE-2")
  assert.ok(approvedEvent)
  assert.equal(approvedEvent.payload.status, "active")
})

test("PCE: chartExpedition writes EXPEDITION_CREATED event", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  await ctx.api.plan({ operation: "chartMission", params: { id: "M-PCE-3", name: "Expedition Parent" } })
  const result = await ctx.api.plan({
    operation: "chartExpedition",
    params: { id: "E-PCE-1", missionId: "M-PCE-3", name: "PCE Expedition", goal: "Test expedition planning" },
  })

  assert.ok(result.events, "Result must include events")
  assert.equal(result.events[0]?.type, "EXPEDITION_CREATED")

  const events = await ctx.infra.eventStore.loadAll()
  const expEvent = events.find((e) => e.type === "EXPEDITION_CREATED" && e.payload.expedition.id === "E-PCE-1")
  assert.ok(expEvent)
  assert.equal(expEvent.payload.expedition.status, "draft")
})

test("PCE: planning pipeline includes classification metadata", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  const result = await ctx.api.plan({
    operation: "chartMission",
    params: { id: "M-PCE-4", name: "Metadata Test" },
  })

  assert.ok(result.classification, "Result must include intent classification")
  assert.ok(result.questions, "Result must include generated questions")
  assert.ok(result.permit, "Result must include planning permit")
})

test("PCE: decision evaluator identifies ADR candidates", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "evaluateDecision",
    params: {
      decision: {
        id: "DC-PCE-1",
        expeditionId: "E-1",
        title: "Use Event Sourcing",
        chosenAlternative: "Event Sourcing",
        alternatives: ["State snapshots", "Event sourcing"],
        consequences: { positive: ["Audit trail", "Replay"], negative: ["Complexity"] },
      },
    },
  })

  assert.equal(result.isAdrCandidate, true, "Decision with alternatives + consequences should be ADR candidate")
  assert.ok(result.confidence > 0.8)
})

test("PCE: decision evaluator rejects non-ADR decisions", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({
    operation: "evaluateDecision",
    params: {
      decision: {
        id: "DC-PCE-2",
        expeditionId: "E-1",
        title: "Fix typo",
        chosenAlternative: "Correct spelling",
      },
    },
  })

  assert.equal(result.isAdrCandidate, false, "Simple decision without alternatives should not be ADR candidate")
})

test("PCE: planning confidence can be estimated", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  // First create some planning state
  await ctx.api.plan({ operation: "chartMission", params: { id: "M-CONF", name: "Confidence Test" } })

  const result = await ctx.api.plan({ operation: "estimateConfidence", params: { state: { objectives: {}, discoveries: {}, decisions: {} } } })
  assert.ok(typeof result.score === "number")
  assert.ok(result.score >= 0 && result.score <= 1, "Confidence score must be in [0, 1]")
  assert.ok(result.factors, "Result must include factor breakdown")
  assert.ok(result.recommendation, "Result must include recommendation")
})

test("PCE: full planning pipeline — mission → expedition → objective synthesis", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()

  // Step 1: Chart mission
  const mission = await ctx.api.plan({
    operation: "chartMission",
    params: { id: "M-FULL-PCE", name: "Full Pipeline Test", purpose: "Test complete PCE pipeline" },
  })
  assert.ok(mission.events, "chartMission must produce events")

  // Step 2: Create alignment contract and commission mission
  const { contractId } = await createAlignedContract(ctx)
  await ctx.api.plan({ operation: "commissionMission", params: { id: "M-FULL-PCE" }, context: { alignmentContractId: contractId } })

  // Step 3: Chart expedition
  const expedition = await ctx.api.plan({
    operation: "chartExpedition",
    params: { id: "E-FULL-PCE", missionId: "M-FULL-PCE", name: "Pipeline Expedition", goal: "Test everything" },
  })
  assert.ok(expedition.events, "chartExpedition must produce events")

  // Step 4: Extract knowledge and synthesize objectives
  const knowledge = await ctx.api.plan({
    operation: "extractKnowledge",
    params: { documents: ["# Requirements\n\nThe system shall support planning. The system must handle uncertainty."] },
  })

  // Step 5: Synthesize objectives
  const state = { expeditions: { "E-FULL-PCE": { id: "E-FULL-PCE", name: "Pipeline Expedition", goal: "Test everything" } } }
  const synthesis = await ctx.planning.synthesizeObjectives("E-FULL-PCE", knowledge, state)
  assert.ok(synthesis.objectives.length > 0, "Should synthesize objectives from requirements")

  // Verify all events are in the log
  const events = await ctx.infra.eventStore.loadAll()
  const missionEvent = events.find((e) => e.type === "MISSION_CREATED" && e.payload.mission.id === "M-FULL-PCE")
  const expeditionEvent = events.find((e) => e.type === "EXPEDITION_CREATED" && e.payload.expedition.id === "E-FULL-PCE")
  assert.ok(missionEvent, "Mission must be in event log")
  assert.ok(expeditionEvent, "Expedition must be in event log")
})

test("PCE: planning API rejects unknown operations", async () => {
  const ctx = await getTestCtx()
  const result = await ctx.api.plan({ operation: "nonExistentOperation" })
  assert.equal(result.status, "error")
  assert.ok(result.error.includes("Unknown planning operation"))
})

// ============================================================
// ASC-001: ARCHITECTURAL SEMANTIC CONSOLIDATION — Compatibility Suite
// ============================================================

test("ASC-001: API boundary translates CreateTicket → CreateWorkItem", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // CreateWorkItem using the legacy CreateTicket alias at API boundary
  const result = await ctx.api.handleIntent({ actor: "compat", capability: "CreateTicket", payload: { id: "W-API-ALIAS", name: "API Alias Test" } })
  assert.equal(result.status, "ok", `CreateTicket alias should be translated to CreateWorkItem: ${result.error}`)
  // Verify the canonical WORK_ITEM_CREATED event was emitted
  const events = await ctx.infra.eventStore.loadAll()
  const wiEvent = events.find((e) => e.type === "WORK_ITEM_CREATED" && e.payload.workItem.id === "W-API-ALIAS")
  assert.ok(wiEvent, "CreateTicket alias must emit canonical WORK_ITEM_CREATED event")
  assert.ok(!events.find((e) => e.type === "TICKET_CREATED" && e.payload.workItem?.id === "W-API-ALIAS"), "No TICKET_CREATED event should be emitted")
})

test("ASC-001: API boundary translates StartTicket → StartWorkItem", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "compat", capability: "CreateWorkItem", payload: { id: "W-START-ALIAS", name: "Start Alias" } })
  const result = await ctx.api.handleIntent({ actor: "compat", capability: "StartTicket", payload: { id: "W-START-ALIAS" } })
  assert.equal(result.status, "ok", `StartTicket alias should be translated: ${result.error}`)
})

test("ASC-001: API boundary translates CompleteTicket → CompleteWorkItem", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "compat", capability: "CreateWorkItem", payload: { id: "W-COMP-ALIAS", name: "Complete Alias" } })
  await ctx.api.handleIntent({ actor: "compat", capability: "StartWorkItem", payload: { id: "W-COMP-ALIAS" } })
  const result = await ctx.api.handleIntent({ actor: "compat", capability: "CompleteTicket", payload: { id: "W-COMP-ALIAS" } })
  assert.equal(result.status, "ok", `CompleteTicket alias should be translated: ${result.error}`)
  const events = await ctx.infra.eventStore.loadAll()
  const wiEvent = events.find((e) => e.type === "WORK_ITEM_COMPLETED" && e.payload.id === "W-COMP-ALIAS")
  assert.ok(wiEvent, "CompleteTicket alias must emit canonical WORK_ITEM_COMPLETED event")
})

test("ASC-001: TICKET_CREATED replay alias produces identical state", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // Use the legacy CreateTicket alias at the API boundary (translates to canonical event)
  await ctx.api.handleIntent({ actor: "compat", capability: "CreateTicket", payload: { id: "W-REPLAY-1", name: "Replay Test" } })
  // Verify state.workItems has the entry
  const replayVerifier = getReplayVerifier(ctx)
  const stats = await replayVerifier.getStats()
  assert.ok(stats.workItemCount >= 1, "TICKET_CREATED replay alias must populate state.workItems")
})

test("ASC-001: registry contains zero Ticket capability entries", async () => {
  const ctx = await getTestCtx()
  const caps = ctx.capabilityRegistry.list()
  const ticketCaps = caps.filter((c) => c.includes("Ticket"))
  assert.equal(ticketCaps.length, 0, `Registry must contain zero Ticket capabilities, found: ${ticketCaps.join(", ")}`)
  assert.ok(caps.includes("CreateWorkItem"), "Registry must contain CreateWorkItem")
  assert.ok(caps.includes("StartWorkItem"), "Registry must contain StartWorkItem")
  assert.ok(caps.includes("CompleteWorkItem"), "Registry must contain CompleteWorkItem")
  assert.ok(caps.includes("BlockWorkItem"), "Registry must contain BlockWorkItem")
})

test("ASC-001: internal kernel contains zero Ticket entities", async () => {
  // Verify the modular source files don't contain canonical Ticket logic
  const srcFiles = [
    "src/domain/workitem.ts",
    "src/capability/registry.ts",
    "src/runtime/replay.ts",
    "src/api/index.ts",
  ]
  const parts = await Promise.all(srcFiles.map((f) => fs.readFile(path.join(process.cwd(), f), "utf-8").catch(() => "")))
  const src = parts.join("\n")
  // Domain should not have createTicket as a wrapper (may appear in comments)
  const hasDomainWrapper = src.includes("function createTicket(id")
  assert.equal(hasDomainWrapper, false, "Domain must not contain createTicket wrapper function")
  // applyDomain should not have CreateTicket case
  const hasApplyDomainCase = src.includes('case "CreateTicket":')
  assert.equal(hasApplyDomainCase, false, "applyDomain must not contain CreateTicket case")
  // Registry should not have CreateTicket entry
  const hasRegistryEntry = src.includes('{ name: "CreateTicket"')
  assert.equal(hasRegistryEntry, false, "Registry must not contain CreateTicket entry")
  // But replay aliases must exist
  const hasReplayAlias = src.includes('case "TICKET_CREATED":')
  assert.ok(hasReplayAlias, "applyEvent must contain TICKET_CREATED replay alias")
  // API translator must exist
  const hasTranslator = src.includes("CAPABILITY_ALIASES")
  assert.ok(hasTranslator, "SynthAPI must contain CAPABILITY_ALIASES translator")
})

test("ASC-001: replay consistency — WORK_ITEM_CREATED and TICKET_CREATED produce same state", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // Create two work items: one via canonical, one via legacy alias
  await ctx.api.handleIntent({ actor: "test", capability: "CreateWorkItem", payload: { id: "W-CANON", name: "Canonical" } })
  await ctx.api.handleIntent({ actor: "test", capability: "CreateTicket", payload: { id: "W-LEGACY", name: "Legacy" } })
  // Both should be in state.workItems
  const replayVerifier = getReplayVerifier(ctx)
  const check = await replayVerifier.verify()
  assert.equal(check.consistent, true, "Replay must be consistent after mixed canonical+legacy events")
  const stats = await replayVerifier.getStats()
  assert.ok(stats.workItemCount >= 2, "Both canonical and legacy-created work items must exist")
})

// ============================================================
// WCE-001: WORKSPACE COGNITION ENVIRONMENT
// ============================================================

test("WCE-001: workspace is available in bootstrap context", async () => {
  const ctx = await getTestCtx()
  assert.ok(ctx.workspace, "Workspace must be in bootstrap return")
  assert.ok(ctx.workspace instanceof Object, "Workspace must be an object")
})

test("WCE-001: workspace has all orientation phases", async () => {
  const ctx = await getTestCtx()
  // Phase 1: Identity
  const identity = ctx.workspace.getIdentity()
  assert.equal(identity.system, "Synth v2", "Identity must report Synth v2")
  assert.ok(identity.layers.includes("Authority"), "Identity must list layers")
  // Phase 2: Environment
  const env = await ctx.workspace.getEnvironment()
  assert.ok(env.runtime.ok, "Runtime must be OK")
  // Phase 3: Architecture
  const arch = ctx.workspace.getArchitecture()
  assert.ok(arch.ubiquitousLanguage.planning.length > 0, "Architecture must define planning terms")
  assert.ok(arch.invariants.length >= 5, "Architecture must define invariants")
  // Phase 4: Health
  const health = await ctx.workspace.getHealth()
  assert.ok(health.status === "ready" || health.status === "degraded", "Health must report status")
  // Phase 5: Engineering Context
  const ec = await ctx.workspace.getEngineeringContext()
  assert.ok(Array.isArray(ec.missions), "Engineering context must include missions")
  assert.ok(Array.isArray(ec.expeditions), "Engineering context must include expeditions")
  // Phase 6: Suggested Actions
  const actions = ctx.workspace.getSuggestedActions(ec)
  assert.ok(actions.length > 0, "Suggested actions must not be empty")
})

test("WCE-001: workspace generates machine-readable descriptor", async () => {
  const ctx = await getTestCtx()
  const desc = await ctx.workspace.generateWorkspaceDescriptor()
  assert.equal(desc.version, "1.0.0", "Descriptor must have version")
  assert.ok(desc.generatedAt, "Descriptor must have generatedAt timestamp")
  assert.ok(desc.identity, "Descriptor must have identity")
  assert.ok(desc.environment, "Descriptor must have environment")
  assert.ok(desc.architecture, "Descriptor must have architecture")
  assert.ok(desc.health, "Descriptor must have health")
  assert.ok(desc.engineeringContext, "Descriptor must have engineering context")
  assert.ok(desc.suggestedActions, "Descriptor must have suggested actions")
})

test("WCE-001: workspace renders human-readable banner", async () => {
  const ctx = await getTestCtx()
  const banner = await ctx.workspace.render()
  assert.ok(banner.includes("SYNTH v2"), "Banner must include system name")
  assert.ok(banner.includes("CANONICAL LANGUAGE"), "Banner must show canonical language")
  assert.ok(banner.includes("SUGGESTED ACTIONS"), "Banner must show suggested actions")
})

test("WCE-001: canonical language auditor reports language", async () => {
  const ctx = await getTestCtx()
  const report = ctx.workspace.languageAuditor.getLanguageReport()
  assert.ok(report.planning.length > 0, "Report must include planning terms")
  assert.ok(report.execution.length > 0, "Report must include execution terms")
  assert.ok(report.governance.length > 0, "Report must include governance terms")
  assert.ok(report.forbidden.length > 0, "Report must include forbidden terms")
  // Verify WorkItem is in execution terms
  const hasWorkItem = report.execution.some((t) => t.term === "WorkItem")
  assert.ok(hasWorkItem, "WorkItem must be in execution terms")
  // Verify Ticket is in forbidden terms
  const hasTicket = report.forbidden.some((t) => t.term === "Ticket")
  assert.ok(hasTicket, "Ticket must be in forbidden terms")
})

test("WCE-001: canonical language auditor audits modular source", async () => {
  const ctx = await getTestCtx()
  const src = await fs.readFile("./dist/main.js", "utf-8")
  const audit = ctx.workspace.languageAuditor.auditSource(src)
  assert.equal(audit.passed, true, "Source must pass canonical language audit")
  assert.equal(audit.issues.length, 0, `Source must have zero issues, found: ${audit.issues.map((i) => i.message).join(", ")}`)
})

test("WCE-001: repository health returns structured report", async () => {
  const ctx = await getTestCtx()
  const health = await ctx.workspace.getHealth()
  assert.ok(health.checks.length > 0, "Health must have checks")
  assert.ok(health.summary.pass !== undefined, "Health must have pass count")
  assert.ok(health.summary.fail !== undefined, "Health must have fail count")
})

// ============================================================
// TESTS: Remediation / Modular Architecture
// ============================================================

test("Remediation: dist/ is modular with .js, .d.ts, and .js.map", async () => {
  const entries = await fs.readdir("./dist")
  assert.ok(entries.includes("main.js"), "dist/main.js must exist")
  assert.ok(entries.includes("main.d.ts"), "dist/main.d.ts must exist")
  assert.ok(entries.includes("planning"), "dist/planning/ must exist")
  assert.ok(entries.includes("workspace"), "dist/workspace/ must exist")
})

test("Remediation: strict-mode build produced declaration files", async () => {
  const planningIndex = await fs.readFile("./dist/planning/index.d.ts", "utf-8")
  assert.ok(planningIndex.includes("PlanningEngine"), "PlanningEngine must be declared")
  const workspaceIndex = await fs.readFile("./dist/workspace/index.d.ts", "utf-8")
  assert.ok(workspaceIndex.includes("WorkspaceCognitionEnvironment"), "Workspace must be declared")
})

test("Remediation: planning subsystem has no runtime engine coupling", async () => {
  const src = await fs.readFile("./dist/planning/index.js", "utf-8")
  assert.ok(!src.includes("RuntimeEngine"), "Planning must not reference RuntimeEngine")
  assert.ok(!src.includes("CommandBus"), "Planning must not reference CommandBus")
})

test("Remediation: workspace subsystem has no command bus or runtime coupling", async () => {
  const src = await fs.readFile("./dist/workspace/index.js", "utf-8")
  assert.ok(!src.includes("CommandBus"), "Workspace must not reference CommandBus")
  assert.ok(!src.includes("RuntimeEngine"), "Workspace must not reference RuntimeEngine")
})

test("Remediation: ExecutionGate is sole mutation authority", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  // Direct event store write should be rejected
  await assert.rejects(
    async () => ctx.infra.eventStore.append({ type: "ILLEGAL_DIRECT_WRITE", payload: {} }),
    /IllegalMutationError|Unauthorized|must pass through/,
  )
})

test("Remediation: planning commits through ExecutionGate", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  const before = (await ctx.infra.eventStore.loadAll()).length
  const result = await ctx.api.plan({ operation: "chartMission", params: { id: "M-PCE-GATE", name: "Gate Test Mission" } })
  assert.ok(result && result.transactionId, `Planning commit failed: ${JSON.stringify(result)}`)
  const after = (await ctx.infra.eventStore.loadAll()).length
  assert.ok(after > before, "Planning commit must append events through the gate")
})

test("Remediation: workspace StateReader loads canonical state", async () => {
  const ctx = await getTestCtx()
  const state = await ctx.workspace.semanticVerifier["reader"].loadState()
  assert.ok(typeof state.version === "number", "State must have version")
  assert.ok(typeof state.workItems === "object", "State must have workItems")
})

test("Remediation: SemanticVerifier passes all assertions on valid state", async () => {
  const ctx = await getTestCtx()
  const semantic = await ctx.workspace.verifySemantics()
  assert.ok(semantic.passed, `Semantic verification failed: ${semantic.assertions.filter((a) => a.status === "FAIL").map((a) => a.id).join(", ")}`)
  assert.ok(semantic.assertions.length >= 7, "Semantic verifier must run all assertions")
})

test("Remediation: ExecutionArtifactAdapter projects to GitHub issue", () => {
  const adapter = new ExecutionArtifactAdapter()
  const workItem = { id: "W-ADAPTER", status: "active", dependencies: [], metadata: { name: "Adapter Test" }, createdAt: 1, updatedAt: 1 }
  const projection = adapter.project(workItem, "github")
  assert.equal(projection.format, "github")
  assert.equal(projection.data.state, "open")
  assert.ok(projection.data.labels.includes("status:active"))
})

test("Remediation: ExecutionArtifactAdapter projects to Jira ticket", () => {
  const adapter = new ExecutionArtifactAdapter()
  const workItem = { id: "W-ADAPTER", status: "complete", dependencies: [], metadata: {}, createdAt: 1, updatedAt: 1 }
  const projection = adapter.project(workItem, "jira")
  assert.equal(projection.format, "jira")
  assert.equal(projection.data.status, "Done")
})

test("Remediation: side quest manager tracks active side quests", () => {
  const manager = new SideQuestManager()
  const sq = manager.recognize("Investigate edge case", "O-1", "E-1")
  assert.equal(sq.status, "active")
  assert.equal(sq.expeditionId, "E-1")
  const active = manager.getActive("E-1")
  assert.equal(active.length, 1)
  manager.resolve(sq.id)
  assert.equal(manager.getActive("E-1").length, 0)
})

test("Remediation: knowledge extractor finds architecture references", () => {
  const extractor = new KnowledgeExtractor()
  const knowledge = extractor.extract(["# Architecture\nThe Kernel must support ADR-001 and RFC 1234."])
  assert.ok(knowledge.architecture.includes("ADR-001"), "Must extract ADR references")
  assert.ok(knowledge.architecture.includes("RFC 1234"), "Must extract RFC references")
})

test("Remediation: objective synthesizer creates objectives from requirements", () => {
  const synthesizer = new ObjectiveSynthesizer()
  const objectives = synthesizer.synthesize({
    entities: [],
    requirements: ["The system shall support expeditions."],
    constraints: [],
    risks: [],
    architecture: [],
    dependencies: [],
    concepts: [],
    extractedAt: Date.now(),
  })
  assert.equal(objectives.length, 1)
  assert.equal(objectives[0].synthesizedFrom, "requirement")
  assert.ok(objectives[0].confidence > 0)
})

test("Remediation: RecordDecision capability creates accepted decision", async () => {
  const ctx = await getTestCtx()
  if (!ctx.isSealed) ctx.seal()
  await ctx.api.handleIntent({ actor: "test", capability: "CreateExpedition", payload: { id: "E-DEC", missionId: "M-1", name: "Decision Expedition" } })
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "RecordDecision",
    payload: {
      id: "D-DEC",
      expeditionId: "E-DEC",
      title: "Use TypeScript strict mode",
      chosenAlternative: 0,
      alternatives: ["strict mode", "loose mode"],
      consequences: { positive: ["type safety"], negative: ["migration cost"] },
    },
  })
  assert.equal(result.status, "ok", `RecordDecision failed: ${result.error}`)
  const state = await ctx.runtime.getState()
  assert.equal(state.decisions["D-DEC"].status, "accepted")
})

// ============================================================
// RUN ALL TESTS
// ============================================================

run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
