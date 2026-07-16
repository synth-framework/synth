// ============================================================
// VALIDATION EXPANSION TESTS (EXP-HARDEN-006)
// ============================================================
// The Certification Expedition's regression suite. It fills the gaps
// left by EXP-HARDEN-001…005 and guards the defects they deferred:
//
//   1. Memory-persistence isolation — `persistence: "memory"` must
//      never touch the file-backed canonical event log (the footgun
//      that let api-adapter-integration append to data/event-log.jsonl).
//   2. Replay status-enum validation — mission/expedition/objective
//      status enums are validated on replay (deferred from HARDEN-004).
//   3. Generated-work-item cross-kind identity — a WORK_ITEM_GENERATED
//      id colliding with the mission/expedition/objective identity
//      space is flagged (deferred from HARDEN-005).
//   4. Long-running replay — 10k+-event logs replay deterministically,
//      and legacy-class duplicates-heavy logs scale near-linearly
//      (deliverable 7).
//   5. Confidence-gate drift guard — bare drafts stay below the
//      approval threshold while enriched sessions stay approvable
//      (HARDEN-002 documented behavior, guarded against silent drift).
//
// All writes go to os.tmpdir() or true memory mode; the repo's data/
// directory must stay untouched.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"
import { pathToFileURL } from "url"
import { spawnSync } from "child_process"
import { bootstrap } from "../dist/core/bootstrap.js"
import { EventStore, InMemoryEventStore } from "../dist/infra/event-store.js"
import { InMemoryStateStore } from "../dist/infra/state-store.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { rebuildState, validateAggregateGraph } from "../dist/runtime/replay.js"
import { validateGraphIntegrity } from "../dist/core/graph-integrity.js"
import { createMissionStudio } from "../dist/mission-studio/index.js"

// ============================================================
// Fixtures
// ============================================================

const LEGACY_LOG = path.join(process.cwd(), "data", "event-log.jsonl")

let seq = 0
function makeEvent(type, payload) {
  seq += 1
  // No hash-chain fields: the chain verifier tolerates pre-chain logs,
  // keeping these fixtures focused on the checks under test.
  return {
    id: `evt-${seq}`,
    type,
    timestamp: seq,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

function missionCreated(id, overrides = {}) {
  return makeEvent("MISSION_CREATED", {
    mission: {
      id,
      name: `Mission ${id}`,
      purpose: "purpose",
      status: "draft",
      expeditions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
    },
  })
}

function expeditionCreated(id, missionId, overrides = {}) {
  return makeEvent("EXPEDITION_CREATED", {
    expedition: {
      id,
      name: `Expedition ${id}`,
      goal: "goal",
      status: "draft",
      objectives: [],
      discoveries: [],
      decisions: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(missionId === undefined ? {} : { missionId }),
    },
  })
}

function objectiveAdded(id, expeditionId, overrides = {}) {
  return makeEvent("OBJECTIVE_ADDED", {
    objective: {
      id,
      title: `Objective ${id}`,
      purpose: "purpose",
      status: "draft",
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(expeditionId === undefined ? {} : { expeditionId }),
    },
  })
}

function workItemGenerated(id, objectiveId, expeditionId, overrides = {}) {
  return makeEvent("WORK_ITEM_GENERATED", {
    workItem: {
      id,
      title: `Work Item ${id}`,
      status: "generated",
      metadata: {},
      createdAt: 1,
      ...overrides,
      ...(objectiveId === undefined ? {} : { objectiveId }),
      ...(expeditionId === undefined ? {} : { expeditionId }),
    },
  })
}

function validLog() {
  return [
    missionCreated("m1"),
    expeditionCreated("e1", "m1"),
    objectiveAdded("o1", "e1"),
  ]
}

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

// The enriched mission/expedition/objective session shape the CLI and
// integration suites use to clear the Mission Studio approval gate.
function enrichedObservations() {
  return [
    makeObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makeObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makeObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ]
}

// Drive the exact write path that historically polluted the canonical
// log: Mission Studio session → approve → genesisFromSnapshot → gate.
async function approveAndGenesis(ctx) {
  const session = ctx.missionStudio.startSession(enrichedObservations())
  const approval = ctx.missionStudio.approve(session)
  assert.strictEqual(approval.success, true, approval.error)
  const result = await ctx.api.genesisFromSnapshot({ snapshot: approval.data })
  assert.strictEqual(result.status, "ok", JSON.stringify(result))
  return result
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
}

function writeTmpLog(events) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validation-expansion-"))
  const logPath = path.join(dir, "event-log.jsonl")
  fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return logPath
}

function makeVerifier(events) {
  return createReplayVerifier(new EventStore(writeTmpLog(events)), new InMemoryStateStore())
}

// ============================================================
// GAP 1 — Memory-persistence isolation
// ============================================================
// Before EXP-HARDEN-006, createInfra built the event store
// unconditionally with EventStore.createAuthorized(config.eventLogPath),
// which falls back to <cwd>/data/event-log.jsonl; only the state store
// was gated by `isFile`. Every memory-mode bootstrap that reached a
// write path appended to the repo's canonical log. The fix wires memory
// mode to a genuinely in-memory event store — the same idiom as
// InMemoryStateStore/InMemoryCheckpointStore — behind the same guard.

test("memory-mode bootstrap keeps writes in memory and leaves the canonical log byte-identical", async () => {
  const legacyExisted = fs.existsSync(LEGACY_LOG)
  const legacyHashBefore = legacyExisted ? sha256File(LEGACY_LOG) : null

  const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })
  assert.ok(
    ctx.infra.eventStore instanceof InMemoryEventStore,
    "memory persistence must use the in-memory event store",
  )

  await approveAndGenesis(ctx)
  const count = await ctx.infra.eventStore.count()
  assert.ok(count > 0, "the write path must have appended events (in memory)")

  assert.strictEqual(fs.existsSync(LEGACY_LOG), legacyExisted)
  if (legacyExisted) {
    assert.strictEqual(sha256File(LEGACY_LOG), legacyHashBefore, "data/event-log.jsonl must be byte-identical")
  }
})

test("memory mode creates no event-log file in an empty working directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validation-expansion-cwd-"))
  const bootstrapUrl = pathToFileURL(path.join(process.cwd(), "dist", "core", "bootstrap.js")).href
  const script = `
    const { bootstrap } = await import(${JSON.stringify(bootstrapUrl)})
    const ctx = await bootstrap({ skipGenesis: true, infra: { persistence: "memory" } })
    const observations = [
      { id: "obs-mission-build-crm", sourceAdapter: "test-adapter", type: "mission", payload: { subject: "Build CRM", name: "Build CRM", purpose: "Customer success" }, evidenceReference: "e1", confidence: "high", timestamp: 1000 },
      { id: "obs-expedition-crm-data-model", sourceAdapter: "test-adapter", type: "expedition", payload: { subject: "CRM Data Model", name: "CRM Data Model", goal: "Design schema", missionSubject: "Build CRM" }, evidenceReference: "e2", confidence: "high", timestamp: 1000 },
      { id: "obs-objective-design-schema", sourceAdapter: "test-adapter", type: "objective", payload: { subject: "Design Schema", name: "Design Schema", title: "Design CRM schema", expeditionSubject: "CRM Data Model" }, evidenceReference: "e3", confidence: "high", timestamp: 1000 },
    ]
    const session = ctx.missionStudio.startSession(observations)
    const approval = ctx.missionStudio.approve(session)
    if (!approval.success) throw new Error("approve failed: " + approval.error)
    const result = await ctx.api.genesisFromSnapshot({ snapshot: approval.data })
    if (result.status !== "ok") throw new Error("genesis failed: " + JSON.stringify(result))
    console.log("events=" + (await ctx.infra.eventStore.count()))
  `
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: dir, encoding: "utf-8" })
  assert.strictEqual(run.status, 0, run.stderr)
  const match = run.stdout.match(/events=(\d+)/)
  assert.ok(match && Number(match[1]) > 0, `write path must have appended events, got: ${run.stdout}`)
  assert.ok(
    !fs.existsSync(path.join(dir, "data", "event-log.jsonl")),
    "memory mode must not create data/event-log.jsonl, even under an empty cwd",
  )
})

test("file persistence with an explicit path still writes the log", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validation-expansion-file-"))
  const eventLogPath = path.join(dir, "event-log.jsonl")
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath,
      statePath: path.join(dir, "canonical-state.json"),
      checkpointPath: path.join(dir, "checkpoint.json"),
      streamDir: path.join(dir, "event-stream"),
      gitEnabled: false,
    },
  })

  await approveAndGenesis(ctx)

  assert.ok(!(ctx.infra.eventStore instanceof InMemoryEventStore), "file persistence must keep the file-backed store")
  assert.ok(fs.existsSync(eventLogPath), "file mode must write the explicit log path")
  const lines = fs.readFileSync(eventLogPath, "utf-8").split("\n").filter(Boolean)
  assert.strictEqual(lines.length, await ctx.infra.eventStore.count())
})

// ============================================================
// GAP 2 — Replay status-enum validation (deferred from EXP-HARDEN-004)
// ============================================================
// checkStructuralConsistency validated only workItem/plan status enums.
// Mission/expedition/objective enums (src/types/state.ts) are now
// validated with the same divergences idiom. Verified first: no
// committed fixture violates these enums (the first-contact archive is
// all-draft), so enforcement flips nothing that exists.

test("replay accepts valid mission/expedition/objective statuses", async () => {
  const result = await makeVerifier(validLog()).verify()
  assert.strictEqual(result.consistent, true)
  assert.deepStrictEqual(result.divergences, [])
})

test("every valid mission/expedition/objective status passes replay", async () => {
  const events = [
    missionCreated("m-draft"),
    missionCreated("m-active", { status: "active" }),
    missionCreated("m-completed", { status: "completed" }),
    missionCreated("m-archived", { status: "archived" }),
    expeditionCreated("e-draft", "m-draft"),
    expeditionCreated("e-approved", "m-draft", { status: "approved" }),
    expeditionCreated("e-executing", "m-draft", { status: "executing" }),
    expeditionCreated("e-completed", "m-draft", { status: "completed" }),
    expeditionCreated("e-cancelled", "m-draft", { status: "cancelled" }),
    objectiveAdded("o-draft", "e-draft"),
    objectiveAdded("o-completed", "e-draft", { status: "completed" }),
  ]
  const result = await makeVerifier(events).verify()
  assert.deepStrictEqual(result.divergences, [])
  assert.strictEqual(result.consistent, true)
})

test("invalid mission status on replay is a structural divergence", async () => {
  // "proposed" is legacy vocabulary from the pre-audit era, not a valid enum member.
  const events = [missionCreated("m1", { status: "proposed" }), expeditionCreated("e1", "m1")]
  const result = await makeVerifier(events).verify()
  const divergence = result.divergences.find((d) => d.key === "mission.m1.status")
  assert.ok(divergence, `expected mission.m1.status divergence, got: ${JSON.stringify(result.divergences)}`)
  assert.strictEqual(divergence.live, "proposed")
  assert.strictEqual(result.consistent, false)
})

test("invalid expedition status on replay is a structural divergence", async () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m1", { status: "planning" })]
  const result = await makeVerifier(events).verify()
  const divergence = result.divergences.find((d) => d.key === "expedition.e1.status")
  assert.ok(divergence, `expected expedition.e1.status divergence, got: ${JSON.stringify(result.divergences)}`)
  assert.strictEqual(divergence.live, "planning")
  assert.strictEqual(result.consistent, false)
})

test("invalid objective status on replay is a structural divergence", async () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m1"), objectiveAdded("o1", "e1", { status: "open" })]
  const result = await makeVerifier(events).verify()
  const divergence = result.divergences.find((d) => d.key === "objective.o1.status")
  assert.ok(divergence, `expected objective.o1.status divergence, got: ${JSON.stringify(result.divergences)}`)
  assert.strictEqual(divergence.live, "open")
  assert.strictEqual(result.consistent, false)
})

// ============================================================
// GAP 3 — Generated work items vs the m/e/o identity space
// (deferred from EXP-HARDEN-005)
// ============================================================
// The graph validators already flag duplicate and cross-kind identities
// within the mission/expedition/objective space. The same rule now
// covers generated work items: a WORK_ITEM_GENERATED id colliding with
// a mission, expedition, or objective id is a duplicate-creation
// violation bucketed under the unique-identity invariant. The check
// lives in the graph-integrity tier (validateGeneratedWorkItems), which
// is where EXP-HARDEN-005 placed all generated-work-item validation.

test("generated work item id colliding with a mission id is caught", () => {
  const events = [...validLog(), workItemGenerated("m1", "o1", "e1")]
  const report = validateGraphIntegrity(events)
  assert.strictEqual(report.result, "invalid")
  const clashes = report.violations.filter((v) => v.kind === "duplicate-creation")
  assert.strictEqual(clashes.length, 1)
  assert.match(clashes[0].message, /Event log identity m1 is used as both mission and generatedWorkItem/)
  assert.strictEqual(clashes[0].aggregateKind, "generatedWorkItem")
  const uniqueIdentity = report.invariants.find((i) => i.invariant === "unique-identity")
  assert.strictEqual(uniqueIdentity.status, "fail")
  assert.ok(uniqueIdentity.violations.some((m) => m.includes("used as both mission and generatedWorkItem")))
})

test("generated work item id colliding with an expedition id is caught", () => {
  const events = [...validLog(), workItemGenerated("e1", "o1", "e1")]
  const report = validateGraphIntegrity(events)
  const clashes = report.violations.filter((v) => v.kind === "duplicate-creation")
  assert.strictEqual(clashes.length, 1)
  assert.match(clashes[0].message, /Event log identity e1 is used as both expedition and generatedWorkItem/)
})

test("generated work item id colliding with an objective id is caught", () => {
  const events = [...validLog(), workItemGenerated("o1", "o1", "e1")]
  const report = validateGraphIntegrity(events)
  const clashes = report.violations.filter((v) => v.kind === "duplicate-creation")
  assert.strictEqual(clashes.length, 1)
  assert.match(clashes[0].message, /Event log identity o1 is used as both objective and generatedWorkItem/)
})

test("generated work item with a distinct identity passes", () => {
  const events = [...validLog(), workItemGenerated("w1", "o1", "e1")]
  const report = validateGraphIntegrity(events)
  assert.strictEqual(report.result, "valid")
  assert.deepStrictEqual(report.violations, [])
})

test("m/e/o cross-kind clashes stay consistent between the replay and graph-integrity reports", () => {
  const events = [missionCreated("x1"), expeditionCreated("x1", "x1")]
  const replayViolations = validateAggregateGraph(events, rebuildState(events))
  assert.ok(
    replayViolations.some((v) => v.kind === "duplicate-creation" && v.message.includes("used as both mission and expedition")),
    "replay-tier validator must flag the m/e/o clash",
  )
  const report = validateGraphIntegrity(events)
  assert.ok(
    report.violations.some((v) => v.kind === "duplicate-creation" && v.message.includes("used as both mission and expedition")),
    "graph-integrity report must carry the same clash",
  )
})

// ============================================================
// GAP 4 — Long-running replay (deliverable 7)
// ============================================================

// Mixed valid traffic: missions, expeditions, objectives, generated
// work items, and lifecycle transitions. 80 missions × 135 events
// = 10,800 events.
function buildLargeValidLog(missions = 80) {
  const events = []
  for (let m = 0; m < missions; m++) {
    const missionId = `m-${m}`
    events.push(missionCreated(missionId))
    for (let e = 0; e < 4; e++) {
      const expeditionId = `e-${m}-${e}`
      events.push(expeditionCreated(expeditionId, missionId))
      for (let o = 0; o < 10; o++) {
        const objectiveId = `o-${m}-${e}-${o}`
        events.push(objectiveAdded(objectiveId, expeditionId))
        events.push(workItemGenerated(`w-${m}-${e}-${o}`, objectiveId, expeditionId))
        events.push(makeEvent("OBJECTIVE_COMPLETED", { id: objectiveId }))
      }
      events.push(makeEvent("EXPEDITION_STARTED", { id: expeditionId }))
      events.push(makeEvent("EXPEDITION_COMPLETED", { id: expeditionId }))
    }
    events.push(makeEvent("MISSION_APPROVED", { id: missionId }))
    events.push(makeEvent("MISSION_COMPLETED", { id: missionId }))
  }
  return events
}

test("10k+ event log replays deterministically and stays valid", async () => {
  const events = buildLargeValidLog()
  assert.ok(events.length >= 10_000, `expected 10k+ events, got ${events.length}`)

  const start = performance.now()

  const first = rebuildState(events)
  const second = rebuildState(events)
  assert.strictEqual(first.stateHash, second.stateHash, "rebuild must be deterministic")

  const stateStore = new InMemoryStateStore()
  await stateStore.save(first)
  const verifier = createReplayVerifier(new EventStore(writeTmpLog(events)), stateStore)
  const result = await verifier.verify()
  assert.strictEqual(result.chainValid, true)
  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.divergences.length, 0)
  assert.strictEqual(result.graphValid, true)

  const report = validateGraphIntegrity(events, first)
  assert.strictEqual(report.result, "valid")

  const durationMs = performance.now() - start
  console.log(`  [validation-expansion] ${events.length}-event replay + validation completed in ${durationMs.toFixed(0)}ms`)
  // Generous tripwire only — the assertion that matters is completion.
  assert.ok(durationMs < 120_000, `replay of ${events.length} events took ${durationMs.toFixed(0)}ms`)
})

test("legacy-class duplicates-heavy log replays with no quadratic blowup", async () => {
  // The 215-event legacy-log shape: heavy duplicate creations and
  // broken parent references.
  const buildLegacyClassLog = (size) => {
    const events = []
    for (let i = 0; events.length < size; i++) {
      events.push(missionCreated(`dup-m-${i % 7}`))
      events.push(missionCreated(`dup-m-${i % 7}`))
      events.push(expeditionCreated(`dup-e-${i % 11}`, "ghost-mission"))
      events.push(objectiveAdded(`dup-o-${i % 13}`, "ghost-expedition"))
      events.push(workItemGenerated(`dup-w-${i % 5}`, "ghost-objective", "ghost-expedition"))
    }
    return events
  }

  const timed = async (size) => {
    const verifier = makeVerifier(buildLegacyClassLog(size))
    const start = performance.now()
    const result = await verifier.verify()
    return { ms: performance.now() - start, result }
  }

  const small = 215 * 20
  const large = small * 4

  // Warm up the JIT so measurements reflect steady-state cost.
  await timed(500)

  let bestSmall = Infinity
  let smallResult
  for (let r = 0; r < 3; r++) {
    const t = await timed(small)
    if (t.ms < bestSmall) bestSmall = t.ms
    smallResult = t.result
  }
  let bestLarge = Infinity
  for (let r = 0; r < 3; r++) {
    const t = await timed(large)
    if (t.ms < bestLarge) bestLarge = t.ms
  }

  // Legacy semantics hold at scale: determinism (consistent) is
  // unaffected by graph defects, which are reported as warnings.
  assert.strictEqual(smallResult.consistent, true)
  assert.strictEqual(smallResult.graphValid, false)

  const ratio = bestLarge / bestSmall
  console.log(
    `  [validation-expansion] legacy-class replay: ${bestSmall.toFixed(1)}ms @ ${small} events, ` +
      `${bestLarge.toFixed(1)}ms @ ${large} events (${ratio.toFixed(2)}x time for 4x events)`,
  )
  // Linear expectation is ~4x; quadratic would be ~16x. The margin
  // absorbs CI noise while still catching a quadratic regression.
  assert.ok(ratio < 12, `replay must scale near-linearly; 4x events took ${ratio.toFixed(2)}x time`)
})

// ============================================================
// GAP 5 — Confidence-gate drift guard (documented in EXP-HARDEN-002)
// ============================================================
// Pre-existing Mission Studio behavior, guarded — not changed: a bare
// `synth mission create` draft lands below the approval threshold
// (today: 0.67 < 0.7), so create→approve deterministically rejects
// without richer evidence, while an enriched session (today: 0.71)
// approves. The assertions pin the below/above-threshold invariants so
// silent threshold or confidence-formula drift fails this suite.

test("bare mission draft lands below the approval threshold and is rejected", () => {
  const studio = createMissionStudio()
  const session = studio.startSession([makeObservation("mission", "Solo Mission", { purpose: "Solo purpose" })])
  const approval = studio.approve(session)
  assert.strictEqual(approval.success, false)
  assert.match(approval.error, /^Confidence [\d.]+ below threshold [\d.]+$/)
  // The rejection quotes the session's own confidence, not a constant.
  assert.ok(approval.error.includes(session.confidence.overall.toFixed(2)))
})

test("enriched session clears the threshold and is approvable", () => {
  const studio = createMissionStudio()
  const bare = studio.startSession([makeObservation("mission", "Solo Mission", { purpose: "Solo purpose" })])
  const enriched = studio.startSession(enrichedObservations())
  assert.ok(
    enriched.confidence.overall > bare.confidence.overall,
    "more evidence must raise confidence above the bare draft",
  )
  const approval = studio.approve(enriched)
  assert.strictEqual(approval.success, true, approval.error)
  assert.ok(approval.data.proposals.length > 0)
})

test("blocking unknowns reject approval regardless of confidence", () => {
  const studio = createMissionStudio()
  const session = studio.startSession(enrichedObservations())
  const blocked = {
    ...session,
    unknowns: [
      ...session.unknowns,
      { id: "u-blocking", question: "q", reason: "r", requiredFor: [], blocking: true, confidenceImpact: 0.1 },
    ],
  }
  const approval = studio.approve(blocked)
  assert.strictEqual(approval.success, false)
  assert.match(approval.error, /Blocking unknowns prevent approval/)
})
