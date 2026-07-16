// ============================================================
// REPLAY GRAPH INTEGRITY TESTS (EXP-HARDEN-004)
// ============================================================
// Replay must prove correctness, not just determinism: broken parent
// references, duplicate aggregate creations, cycles, orphans, and
// broken post-replay navigation are caught and reported with clear
// messages — while the legacy `consistent` verdict stays stable.
//
// Real logs (data/event-log.jsonl, the first-contact archive) are
// read-only forensic evidence. Synthetic logs and any state writes go
// to os.tmpdir(); the repo's data/ directory must stay untouched.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"
import { EventStore } from "../dist/infra/event-store.js"
import { InMemoryStateStore } from "../dist/infra/state-store.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import {
  rebuildState,
  rebuildStateFromOffset,
  validateAggregateGraph,
} from "../dist/runtime/replay.js"

// ============================================================
// Fixtures
// ============================================================

const LEGACY_LOG = path.join(process.cwd(), "data", "event-log.jsonl")
const FIRST_CONTACT_ARCHIVE = path.join(
  process.cwd(),
  "examples",
  "first-contact",
  "recorded-journey",
  "evidence-archive",
  "events.jsonl",
)

let seq = 0
function makeEvent(type, payload) {
  seq += 1
  // No hash-chain fields: the chain verifier tolerates pre-chain logs,
  // keeping these fixtures focused on graph integrity.
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

function validLog() {
  return [
    missionCreated("m1"),
    expeditionCreated("e1", "m1"),
    objectiveAdded("o1", "e1"),
  ]
}

function writeTmpLog(events) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "replay-graph-integrity-"))
  const logPath = path.join(dir, "event-log.jsonl")
  fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return logPath
}

function makeVerifier(events, stateStore = new InMemoryStateStore()) {
  return createReplayVerifier(new EventStore(writeTmpLog(events)), stateStore)
}

function violationsOfKind(violations, kind) {
  return violations.filter((v) => v.kind === kind)
}

// ============================================================
// Synthetic logs: graph validator
// ============================================================

test("valid log produces no graph violations", () => {
  const events = validLog()
  const violations = validateAggregateGraph(events, rebuildState(events))
  assert.deepStrictEqual(violations, [])
})

test("expedition referencing an unknown mission is caught", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m-ghost")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const broken = violationsOfKind(violations, "broken-parent-reference")
  assert.strictEqual(broken.length, 1)
  assert.match(broken[0].message, /EXPEDITION_CREATED e1 references unknown mission m-ghost/)
  assert.strictEqual(broken[0].aggregateKind, "expedition")
  assert.strictEqual(broken[0].parentId, "m-ghost")
  // The orphaned expedition is also unreachable from any mission root.
  assert.strictEqual(violationsOfKind(violations, "orphan-aggregate").length, 1)
  // And the replayed state cannot navigate e1 -> m-ghost.
  const navigation = violationsOfKind(violations, "broken-navigation")
  assert.strictEqual(navigation.length, 1)
  assert.match(navigation[0].message, /expedition e1 references mission m-ghost missing from state\.missions/)
})

test("objective referencing an unknown expedition is caught", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m1"), objectiveAdded("o1", "e-ghost")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const broken = violationsOfKind(violations, "broken-parent-reference")
  assert.strictEqual(broken.length, 1)
  assert.match(broken[0].message, /OBJECTIVE_ADDED o1 references unknown expedition e-ghost/)
  const navigation = violationsOfKind(violations, "broken-navigation")
  assert.strictEqual(navigation.length, 1)
  assert.match(navigation[0].message, /objective o1 references expedition e-ghost missing from state\.expeditions/)
})

test("expedition with no mission parent is caught", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", undefined)]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const missing = violationsOfKind(violations, "missing-parent-reference")
  assert.strictEqual(missing.length, 1)
  assert.match(missing[0].message, /EXPEDITION_CREATED e1 has no mission parent/)
})

test("duplicate aggregate creation is caught per duplicate event", () => {
  const events = [missionCreated("m1"), missionCreated("m1"), missionCreated("m1")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const duplicates = violationsOfKind(violations, "duplicate-creation")
  assert.strictEqual(duplicates.length, 2)
  assert.match(duplicates[0].message, /Duplicate mission identity in event log: m1/)
})

test("identity reused across aggregate kinds is caught", () => {
  const events = [missionCreated("x1"), expeditionCreated("x1", "x1")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const duplicates = violationsOfKind(violations, "duplicate-creation")
  assert.strictEqual(duplicates.length, 1)
  assert.match(duplicates[0].message, /Event log identity x1 is used as both mission and expedition/)
})

test("parent of the wrong aggregate kind is caught", () => {
  const events = [missionCreated("m1"), objectiveAdded("o1", "m1")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const broken = violationsOfKind(violations, "broken-parent-reference")
  assert.strictEqual(broken.length, 1)
  assert.match(broken[0].message, /OBJECTIVE_ADDED o1 parent m1 is a mission, not an expedition/)
})

test("self-referencing parent chain is caught as a cycle", () => {
  const events = [objectiveAdded("o1", "o1")]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const cycles = violationsOfKind(violations, "cycle")
  assert.strictEqual(cycles.length, 1)
  assert.match(cycles[0].message, /Event log contains a cycle reaching o1/)
})

test("malformed creation payload is caught", () => {
  const events = [makeEvent("MISSION_CREATED", { mission: { name: "no id" } })]
  const violations = validateAggregateGraph(events, rebuildState(events))
  const malformed = violationsOfKind(violations, "malformed-creation")
  assert.strictEqual(malformed.length, 1)
  assert.match(malformed[0].message, /MISSION_CREATED event is missing its mission payload id/)
})

// ============================================================
// Verifier integration: graph fields vs legacy `consistent` semantics
// ============================================================

test("verifier reports graphValid on a valid log", async () => {
  const result = await makeVerifier(validLog()).verify()
  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.chainValid, true)
  assert.strictEqual(result.graphValid, true)
  assert.deepStrictEqual(result.graphViolations, [])
})

test("graph violations never feed the legacy consistent verdict", async () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m-ghost")]
  const result = await makeVerifier(events).verify()
  assert.strictEqual(result.graphValid, false)
  assert.ok(result.graphViolations.length > 0)
  // Deterministic replay of a defective log stays consistent: graph
  // correctness is reported separately, never folded into `consistent`.
  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.divergences.length, 0)
})

// ============================================================
// Legacy log: warnings by default, failure under strict mode
// ============================================================

// The legacy log is local, uncommitted runtime state (data/ is gitignored),
// so this test runs only where the file exists. Exact violation counts drift
// locally as suites append events; the pinned 206-violation profile of the
// 215-event log is documented in docs/expeditions/EXP-HARDEN-004.md. The
// environment-independent defective-log checks below use the committed
// first-contact archive instead.
test(
  "legacy data/event-log.jsonl: consistent, but graph violations reported",
  { skip: !fs.existsSync(LEGACY_LOG) && "requires local data/event-log.jsonl (gitignored runtime state)" },
  async () => {
    const verifier = createReplayVerifier(new EventStore(LEGACY_LOG), new InMemoryStateStore())
    const result = await verifier.verify()

    // The legacy determinism verdict is untouched.
    assert.strictEqual(result.consistent, true)
    assert.strictEqual(result.chainValid, true)

    // The known pre-HARDEN-001 pollution is reported, not hidden.
    assert.strictEqual(result.graphValid, false)
    assert.ok(result.graphViolations.length > 0)
    assert.ok(violationsOfKind(result.graphViolations, "duplicate-creation").length > 0)
    assert.ok(violationsOfKind(result.graphViolations, "broken-parent-reference").length > 0)
  },
)

test("verify-replay.js default mode passes a polluted log with warnings", () => {
  const run = spawnSync(process.execPath, ["scripts/verify-replay.js", "--log", FIRST_CONTACT_ARCHIVE], {
    cwd: process.cwd(),
    encoding: "utf-8",
  })
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /Graph valid:\s+⚠️\s+36 violation\(s\)/)
  assert.match(run.stdout, /Replay verification PASSED/)
})

test("verify-replay.js --strict-graph fails loudly on a polluted log", () => {
  const run = spawnSync(process.execPath, ["scripts/verify-replay.js", "--strict-graph", "--log", FIRST_CONTACT_ARCHIVE], {
    cwd: process.cwd(),
    encoding: "utf-8",
  })
  assert.strictEqual(run.status, 1)
  assert.match(run.stdout, /36 violation\(s\)/)
  assert.match(run.stdout, /Replay graph verification FAILED \(--strict-graph\)/)
})

// ============================================================
// Cross-version replay: pre-fix archive log under the current runtime
// ============================================================

test("first-contact archive replays deterministically with the current runtime", async () => {
  const store = new EventStore(FIRST_CONTACT_ARCHIVE)
  const events = await store.loadAll()
  assert.strictEqual(events.length, 32)

  const first = rebuildState(events)
  const second = rebuildState(events)
  assert.strictEqual(first.stateHash, second.stateHash)

  const verifier = createReplayVerifier(store, new InMemoryStateStore())
  const result = await verifier.verify()
  assert.strictEqual(result.chainValid, true)
  assert.strictEqual(result.consistent, true)
})

test("first-contact archive graph defects are reported as warnings, not failures", async () => {
  const verifier = createReplayVerifier(new EventStore(FIRST_CONTACT_ARCHIVE), new InMemoryStateStore())
  const result = await verifier.verify()

  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.graphValid, false)
  assert.strictEqual(result.graphViolations.length, 36)
  assert.strictEqual(violationsOfKind(result.graphViolations, "broken-parent-reference").length, 12)
  assert.strictEqual(violationsOfKind(result.graphViolations, "orphan-aggregate").length, 12)
  assert.strictEqual(violationsOfKind(result.graphViolations, "broken-navigation").length, 12)
})

// ============================================================
// Projection equivalence
// ============================================================

test("operational state-store projection is equivalent to the replay projection", async () => {
  const events = validLog()
  const stateStore = new InMemoryStateStore()
  // The operational store carries a state materialized outside the
  // verifier; the verifier must find zero divergence against its own
  // replay of the same log.
  await stateStore.save(rebuildState(events))

  const verifier = makeVerifier(events, stateStore)
  const result = await verifier.verify()
  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.divergences.length, 0)
  assert.strictEqual(result.liveHash, result.replayHash)
})

test("rebuildStateFromOffset from offset 0 equals full rebuildState", async () => {
  const store = new EventStore(FIRST_CONTACT_ARCHIVE)
  const events = await store.loadAll()
  const full = rebuildState(events)
  const fromOffset = rebuildStateFromOffset(events, 0)
  assert.strictEqual(fromOffset.stateHash, full.stateHash)
})

test("cross-version replayed state round-trips through the operational store", async () => {
  const store = new EventStore(FIRST_CONTACT_ARCHIVE)
  const events = await store.loadAll()
  const stateStore = new InMemoryStateStore()
  await stateStore.save(rebuildState(events))

  const verifier = createReplayVerifier(store, stateStore)
  const result = await verifier.verify()
  assert.strictEqual(result.consistent, true)
  assert.strictEqual(result.divergences.length, 0)
})
