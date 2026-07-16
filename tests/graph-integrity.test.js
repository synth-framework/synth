// ============================================================
// GRAPH INTEGRITY TESTS (EXP-HARDEN-005)
// ============================================================
// Graph Integrity is a first-class constitutional proof, equal in
// importance to Replay Integrity. These tests pin the acceptance
// criterion: a broken event log with orphan aggregates or invalid
// parent references fails Graph Integrity, while a valid event log
// produces a Graph Integrity proof.
//
// The CI/govern proof certifies a freshly generated reference
// execution (Mission Studio → approve → genesisFromSnapshot) sandboxed
// in os.tmpdir() — never the repo's canonical, gitignored, locally
// polluted data/event-log.jsonl. Historical logs remain checkable via
// verify-replay.js --strict-graph --log.
//
// Synthetic logs, sandboxes, and proof artifacts all live in
// os.tmpdir(); the repo's data/ and proof/ directories must stay
// untouched.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"
import { EventStore } from "../dist/infra/event-store.js"
import {
  validateGraphIntegrity,
  GRAPH_INTEGRITY_VALIDATOR_VERSION,
} from "../dist/core/graph-integrity.js"

// ============================================================
// Fixtures
// ============================================================

const FIRST_CONTACT_ARCHIVE = path.join(
  process.cwd(),
  "examples",
  "first-contact",
  "recorded-journey",
  "evidence-archive",
  "events.jsonl",
)
const LEGACY_LOG = path.join(process.cwd(), "data", "event-log.jsonl")
const REPO_PROOF_DIR = path.join(process.cwd(), "proof")

let seq = 0
function makeEvent(type, payload) {
  seq += 1
  // No hash-chain fields: graph integrity does not depend on the chain.
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

function workItemCreated(id) {
  return makeEvent("WORK_ITEM_CREATED", {
    workItem: {
      id,
      status: "idle",
      dependencies: [],
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
    },
  })
}

function workItemGenerated(id, objectiveId, overrides = {}) {
  return makeEvent("WORK_ITEM_GENERATED", {
    workItem: {
      id,
      title: `Work Item ${id}`,
      status: "generated",
      metadata: {},
      createdAt: 1,
      updatedAt: 1,
      ...overrides,
      ...(objectiveId === undefined ? {} : { objectiveId }),
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

function invariantOf(report, invariant) {
  const found = report.invariants.find((i) => i.invariant === invariant)
  assert.ok(found, `invariant ${invariant} missing from report`)
  return found
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
}

function runProofScript(outPath) {
  return spawnSync(
    process.execPath,
    ["scripts/verify-graph-integrity.js", "--out", outPath],
    { cwd: process.cwd(), encoding: "utf-8", timeout: 120000 },
  )
}

// ============================================================
// Validator: a valid event log passes Graph Integrity
// ============================================================

test("valid log produces a valid graph integrity report", () => {
  const events = validLog()
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.kind, "graph-integrity-report")
  assert.strictEqual(report.version, GRAPH_INTEGRITY_VALIDATOR_VERSION)
  assert.strictEqual(report.result, "valid")
  assert.strictEqual(report.eventCount, 3)
  assert.deepStrictEqual(report.violations, [])
  assert.deepStrictEqual(report.graph, {
    missions: 1,
    expeditions: 1,
    objectives: 1,
    workItems: 0,
    generatedWorkItems: 0,
    nodes: 3,
    edges: 2,
    roots: 1,
  })

  // Every event-provable invariant passes; the canonical Work Item →
  // Objective edge is the documented not-event-provable gap.
  const provable = report.invariants.filter((i) => i.invariant !== "work-item-objective-membership")
  assert.strictEqual(provable.length, 8)
  assert.ok(provable.every((i) => i.status === "pass"))
  assert.strictEqual(invariantOf(report, "work-item-objective-membership").status, "not-event-provable")
})

// ============================================================
// Validator: broken event logs fail Graph Integrity
// ============================================================

test("orphan expedition with invalid parent reference fails", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m-ghost")]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const resolution = invariantOf(report, "parent-resolution")
  assert.strictEqual(resolution.status, "fail")
  assert.match(resolution.violations[0], /EXPEDITION_CREATED e1 references unknown mission m-ghost/)
  // The orphaned expedition is unreachable from any mission root, and
  // the replayed state cannot navigate e1 -> m-ghost.
  assert.strictEqual(invariantOf(report, "connectivity").status, "fail")
  assert.strictEqual(invariantOf(report, "navigation").status, "fail")
  // Unrelated invariants keep passing.
  assert.strictEqual(invariantOf(report, "unique-identity").status, "pass")
  assert.strictEqual(invariantOf(report, "acyclicity").status, "pass")
})

test("orphan objective with invalid parent reference fails", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", "m1"), objectiveAdded("o1", "e-ghost")]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  assert.match(
    invariantOf(report, "parent-resolution").violations[0],
    /OBJECTIVE_ADDED o1 references unknown expedition e-ghost/,
  )
  assert.strictEqual(invariantOf(report, "connectivity").status, "fail")
  assert.strictEqual(invariantOf(report, "navigation").status, "fail")
})

test("expedition with no mission parent fails parent presence", () => {
  const events = [missionCreated("m1"), expeditionCreated("e1", undefined)]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const presence = invariantOf(report, "parent-presence")
  assert.strictEqual(presence.status, "fail")
  assert.match(presence.violations[0], /EXPEDITION_CREATED e1 has no mission parent/)
})

test("duplicate aggregate creation fails unique identity", () => {
  const events = [missionCreated("m1"), missionCreated("m1"), missionCreated("m1")]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const identity = invariantOf(report, "unique-identity")
  assert.strictEqual(identity.status, "fail")
  assert.strictEqual(identity.violations.length, 2)
  assert.match(identity.violations[0], /Duplicate mission identity in event log: m1/)
})

test("parent cycle fails acyclicity", () => {
  const events = [objectiveAdded("o1", "o1")]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const acyclicity = invariantOf(report, "acyclicity")
  assert.strictEqual(acyclicity.status, "fail")
  assert.match(acyclicity.violations[0], /Event log contains a cycle reaching o1/)
})

test("malformed creation payload fails well-formedness", () => {
  const events = [makeEvent("MISSION_CREATED", { mission: { name: "no id" } })]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const wellFormed = invariantOf(report, "well-formed-creation")
  assert.strictEqual(wellFormed.status, "fail")
  assert.match(wellFormed.violations[0], /MISSION_CREATED event is missing its mission payload id/)
})

// ============================================================
// Validator: Work Item → Objective membership
// ============================================================

test("WORK_ITEM_GENERATED referencing an unknown objective fails membership", () => {
  const events = [...validLog(), workItemGenerated("w1", "o-ghost", { expeditionId: "e1" })]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const membership = invariantOf(report, "generated-work-item-membership")
  assert.strictEqual(membership.status, "fail")
  assert.match(membership.violations[0], /WORK_ITEM_GENERATED w1 references unknown objective o-ghost/)
})

test("WORK_ITEM_GENERATED with no objective parent fails membership", () => {
  const events = [...validLog(), workItemGenerated("w1", undefined, { expeditionId: "e1" })]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const membership = invariantOf(report, "generated-work-item-membership")
  assert.strictEqual(membership.status, "fail")
  assert.match(membership.violations[0], /WORK_ITEM_GENERATED w1 has no objective parent/)
})

test("WORK_ITEM_GENERATED with a resolved objective passes and joins the graph stats", () => {
  const events = [...validLog(), workItemGenerated("w1", "o1", { expeditionId: "e1" })]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "valid")
  assert.strictEqual(invariantOf(report, "generated-work-item-membership").status, "pass")
  assert.strictEqual(report.graph.generatedWorkItems, 1)
  assert.strictEqual(report.graph.nodes, 4)
  assert.strictEqual(report.graph.edges, 3)
})

test("duplicate WORK_ITEM_GENERATED identity fails unique identity", () => {
  const events = [
    ...validLog(),
    workItemGenerated("w1", "o1", { expeditionId: "e1" }),
    workItemGenerated("w1", "o1", { expeditionId: "e1" }),
  ]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  const identity = invariantOf(report, "unique-identity")
  assert.strictEqual(identity.status, "fail")
  assert.match(identity.violations[0], /Duplicate generatedWorkItem identity in event log: w1/)
})

test("canonical WORK_ITEM_CREATED marks the membership invariant not-event-provable, never failing", () => {
  const events = [...validLog(), workItemCreated("wi-1")]
  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "valid")
  assert.strictEqual(report.graph.workItems, 1)
  const gap = invariantOf(report, "work-item-objective-membership")
  assert.strictEqual(gap.status, "not-event-provable")
  assert.deepStrictEqual(gap.violations, [])
  assert.match(gap.detail, /WORK_ITEM_CREATED payloads carry no objective reference/)
})

// ============================================================
// First-contact archive: expected violation profile
// ============================================================

test("first-contact archive fails graph integrity with the documented violation profile", async () => {
  const events = await new EventStore(FIRST_CONTACT_ARCHIVE).loadAll()
  assert.strictEqual(events.length, 32)

  const report = validateGraphIntegrity(events)

  assert.strictEqual(report.result, "invalid")
  assert.strictEqual(report.eventCount, 32)
  assert.strictEqual(report.violations.length, 36)
  assert.strictEqual(invariantOf(report, "parent-resolution").violations.length, 12)
  assert.strictEqual(invariantOf(report, "connectivity").violations.length, 12)
  assert.strictEqual(invariantOf(report, "navigation").violations.length, 12)
  assert.strictEqual(invariantOf(report, "parent-resolution").status, "fail")
  assert.strictEqual(invariantOf(report, "connectivity").status, "fail")
  assert.strictEqual(invariantOf(report, "navigation").status, "fail")
  assert.strictEqual(invariantOf(report, "unique-identity").status, "pass")
  assert.strictEqual(invariantOf(report, "acyclicity").status, "pass")
})

// ============================================================
// Proof script: a valid reference execution produces the proof
// ============================================================

test("verify-graph-integrity.js certifies the fresh reference execution and writes the proof artifact", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-integrity-test-"))
  const outPath = path.join(dir, "graph-integrity-proof.json")

  const run = runProofScript(outPath)
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /GRAPH INTEGRITY PROOF ACCEPTED/)

  assert.ok(fs.existsSync(outPath), "proof artifact must exist at the --out path")
  const proof = JSON.parse(fs.readFileSync(outPath, "utf-8"))

  // Artifact shape follows proof-*.json conventions.
  assert.strictEqual(proof.schema, "synth-graph-integrity-proof-v1")
  assert.match(proof.generatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  assert.strictEqual(proof.validator.name, "graph-integrity")
  assert.strictEqual(proof.validator.version, GRAPH_INTEGRITY_VALIDATOR_VERSION)
  assert.match(proof.repository.commit, /^[0-9a-f]{40}$/)
  assert.match(proof.repository.sourceHash, /^[0-9a-f]{64}$/)
  assert.match(proof.build.distHash, /^[0-9a-f]{64}$/)

  // The certified reference execution: 1 mission, 1 expedition,
  // 2 objectives — 7 seed events through the real pipeline.
  assert.strictEqual(proof.referenceExecution.eventCount, 7)
  assert.match(proof.referenceExecution.chainDigest, /^[0-9a-f]{64}$/)
  assert.ok(proof.referenceExecution.replayHash.length > 0)
  assert.deepStrictEqual(proof.graph, {
    missions: 1,
    expeditions: 1,
    objectives: 2,
    workItems: 2,
    generatedWorkItems: 0,
    nodes: 4,
    edges: 3,
    roots: 1,
  })

  assert.deepStrictEqual(proof.violations, [])
  assert.strictEqual(proof.overall.passed, true)
  assert.strictEqual(proof.invariants.length, 9)
  const gap = proof.invariants.find((i) => i.invariant === "work-item-objective-membership")
  assert.strictEqual(gap.status, "not-event-provable")
  assert.ok(
    proof.invariants
      .filter((i) => i.invariant !== "work-item-objective-membership")
      .every((i) => i.status === "pass"),
  )
})

// ============================================================
// CI-safety: proof generation never touches the canonical log or
// the repo's proof/ directory when the output is overridden
// ============================================================

test("proof generation with --out leaves data/ and proof/ byte-identical", () => {
  const legacyExisted = fs.existsSync(LEGACY_LOG)
  const legacyHashBefore = legacyExisted ? sha256File(LEGACY_LOG) : null
  const proofDirExisted = fs.existsSync(REPO_PROOF_DIR)
  const proofListingBefore = proofDirExisted ? fs.readdirSync(REPO_PROOF_DIR).sort() : null

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-integrity-ci-safety-"))
  const outPath = path.join(dir, "proof.json")
  const run = runProofScript(outPath)
  assert.strictEqual(run.status, 0, run.stderr)

  // The artifact exists only at the overridden path...
  assert.ok(fs.existsSync(outPath))

  // ...the reference execution ran in an os.tmpdir() sandbox
  // (macOS resolves /var to /private/var, so compare both forms)...
  const proof = JSON.parse(fs.readFileSync(outPath, "utf-8"))
  const tmpdir = os.tmpdir()
  assert.ok(
    proof.referenceExecution.sandbox.startsWith(tmpdir) ||
      proof.referenceExecution.sandbox.startsWith(fs.realpathSync(tmpdir)),
    `sandbox ${proof.referenceExecution.sandbox} must live under os.tmpdir()`,
  )

  // ...the canonical legacy log is untouched...
  assert.strictEqual(fs.existsSync(LEGACY_LOG), legacyExisted)
  if (legacyExisted) {
    assert.strictEqual(sha256File(LEGACY_LOG), legacyHashBefore, "data/event-log.jsonl must be byte-identical")
  }

  // ...and no new artifact appeared in the repo's proof/ directory.
  assert.strictEqual(fs.existsSync(REPO_PROOF_DIR), proofDirExisted)
  if (proofDirExisted) {
    assert.deepStrictEqual(fs.readdirSync(REPO_PROOF_DIR).sort(), proofListingBefore)
  }
})
