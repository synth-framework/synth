// ============================================================
// GENESIS HARDENING TESTS (EXP-HARDEN-003)
// ============================================================
// Genesis must reject snapshots with broken parent references and
// accept valid snapshots with a certification report and an
// integrity proof — regardless of whether the snapshot ever passed
// through Mission Studio approval.
//
// Bootstrap-based tests redirect the event log into os.tmpdir()
// (the repo's data/ directory must stay untouched).
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs"
import os from "os"
import path from "path"
import {
  validateSnapshotAcceptance,
  certifySeedEventGraph,
  certifyGenesisIntake,
  buildGenesisIntegrityProof,
} from "../dist/genesis/certification.js"
import { snapshotToSeedEvents } from "../dist/genesis/snapshot-bridge.js"
import { signSnapshot } from "../dist/mission-studio/snapshot-integrity.js"
import { sha256 } from "../dist/core/hash.js"
import { bootstrap } from "../dist/core/bootstrap.js"

// ============================================================
// Fixtures
// ============================================================

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
    signature: "",
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

function signed(snapshot) {
  return { ...snapshot, signature: signSnapshot(snapshot) }
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

function makeSeedEventGraph() {
  return [
    {
      type: "MISSION_CREATED",
      payload: {
        mission: {
          id: "M-1",
          name: "Mission",
          purpose: "Prove hardening",
          status: "draft",
          expeditions: [],
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
    {
      type: "EXPEDITION_CREATED",
      payload: {
        expedition: {
          id: "E-1",
          missionId: "M-1",
          name: "Expedition",
          goal: "Prove hardening",
          status: "draft",
          objectives: [],
          discoveries: [],
          decisions: [],
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
    {
      type: "OBJECTIVE_ADDED",
      payload: {
        objective: {
          id: "O-1",
          expeditionId: "E-1",
          title: "Objective",
          purpose: "Prove hardening",
          status: "draft",
          metadata: {},
          createdAt: 1,
          updatedAt: 1,
        },
      },
    },
  ]
}

async function bootIsolated() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-genesis-hardening-"))
  return bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory", eventLogPath: path.join(dir, "event-log.jsonl") },
  })
}

// ============================================================
// Snapshot acceptance validator (pure)
// ============================================================

test("validateSnapshotAcceptance accepts a well-formed snapshot", () => {
  assert.deepStrictEqual(validateSnapshotAcceptance(signed(makeSnapshot())), [])
})

test("validateSnapshotAcceptance rejects an expedition with an unknown mission parent", () => {
  const snapshot = makeSnapshot()
  snapshot.proposals[1] = { ...snapshot.proposals[1], missionId: "ghost-mission" }

  const violations = validateSnapshotAcceptance(snapshot)

  assert.ok(
    violations.some((v) => v.includes("references unknown mission proposal ghost-mission")),
    `expected unknown-mission violation, got: ${violations.join("; ")}`,
  )
})

test("validateSnapshotAcceptance rejects an objective with no expedition parent", () => {
  const snapshot = makeSnapshot()
  const objective = { ...snapshot.proposals[2] }
  delete objective.expeditionId
  snapshot.proposals[2] = objective

  const violations = validateSnapshotAcceptance(snapshot)

  assert.ok(
    violations.some((v) => v.includes("has no expedition parent")),
    `expected missing-parent violation, got: ${violations.join("; ")}`,
  )
})

test("validateSnapshotAcceptance rejects duplicate proposal identities", () => {
  const snapshot = makeSnapshot()
  snapshot.proposals = [...snapshot.proposals, { ...snapshot.proposals[0] }]

  const violations = validateSnapshotAcceptance(snapshot)

  assert.ok(
    violations.some((v) => v.includes("Duplicate proposal id: mission-1")),
    `expected duplicate-id violation, got: ${violations.join("; ")}`,
  )
})

test("validateSnapshotAcceptance rejects missing required snapshot fields", () => {
  const snapshot = makeSnapshot()
  delete snapshot.worldModel
  snapshot.id = ""
  snapshot.version = "9.9.9"

  const violations = validateSnapshotAcceptance(snapshot)

  assert.ok(violations.some((v) => v.includes("Snapshot id is missing")), violations.join("; "))
  assert.ok(violations.some((v) => v.includes("Unknown snapshot schema version: 9.9.9")), violations.join("; "))
  assert.ok(violations.some((v) => v.includes("Snapshot worldModel is missing")), violations.join("; "))

  const noProposals = makeSnapshot({ proposals: "not-an-array" })
  assert.ok(
    validateSnapshotAcceptance(noProposals).some((v) => v.includes("Snapshot proposals is missing or not an array")),
  )
})

test("validateSnapshotAcceptance rejects proposals missing kind-specific required fields", () => {
  const snapshot = makeSnapshot()
  const mission = { ...snapshot.proposals[0] }
  delete mission.purpose
  delete mission.description
  snapshot.proposals[0] = mission

  const violations = validateSnapshotAcceptance(snapshot)

  assert.ok(
    violations.some((v) => v.includes("Mission proposal mission-1 is missing required field: purpose")),
    `expected missing-purpose violation, got: ${violations.join("; ")}`,
  )
})

// ============================================================
// Certification report (pure)
// ============================================================

test("certifyGenesisIntake certifies a valid signed snapshot", () => {
  const snapshot = signed(makeSnapshot())
  const seedEvents = snapshotToSeedEvents(snapshot)

  const report = certifyGenesisIntake({ snapshot, seedEvents })

  assert.strictEqual(report.kind, "genesis-certification-report")
  assert.strictEqual(report.result, "certified")
  assert.strictEqual(report.snapshotId, "snapshot-1")
  assert.deepStrictEqual(report.violations, [])
  assert.deepStrictEqual(report.warnings, [])
  assert.deepStrictEqual(
    report.rules.map((r) => [r.rule, r.status]),
    [
      ["snapshot-acceptance", "pass"],
      ["snapshot-signature", "pass"],
      ["seed-event-graph", "pass"],
    ],
  )
  assert.deepStrictEqual(report.counts, { missions: 1, expeditions: 1, objectives: 1, seedEvents: 6 })
  assert.deepStrictEqual(report.graph, { missions: 1, expeditions: 1, objectives: 1, nodes: 3, edges: 2, roots: 1 })
})

test("certifyGenesisIntake rejects a tampered signature", () => {
  const snapshot = signed(makeSnapshot())
  snapshot.proposals = [{ ...snapshot.proposals[0], name: "Tampered Mission" }, ...snapshot.proposals.slice(1)]

  const report = certifyGenesisIntake({ snapshot, seedEvents: snapshotToSeedEvents(snapshot) })

  assert.strictEqual(report.result, "rejected")
  const signatureRule = report.rules.find((r) => r.rule === "snapshot-signature")
  assert.strictEqual(signatureRule.status, "fail")
  assert.ok(
    signatureRule.violations.some((v) => v.includes("Snapshot signature does not match its content")),
    signatureRule.violations.join("; "),
  )
})

// ============================================================
// Seed event graph certification (pure)
// ============================================================

test("certifySeedEventGraph accepts the bridge-produced graph", () => {
  const { violations, graph } = certifySeedEventGraph(snapshotToSeedEvents(makeSnapshot()))

  assert.deepStrictEqual(violations, [])
  assert.deepStrictEqual(graph, { missions: 1, expeditions: 1, objectives: 1, nodes: 3, edges: 2, roots: 1 })
})

test("certifySeedEventGraph rejects orphan expedition events", () => {
  const seedEvents = makeSeedEventGraph()
  seedEvents[1].payload.expedition.missionId = "ghost-mission"

  const { violations } = certifySeedEventGraph(seedEvents)

  assert.ok(
    violations.some((v) => v.includes("EXPEDITION_CREATED E-1 references unknown mission ghost-mission")),
    violations.join("; "),
  )
})

test("certifySeedEventGraph rejects malformed entity payloads", () => {
  const { violations } = certifySeedEventGraph([{ type: "EXPEDITION_CREATED", payload: {} }])

  assert.ok(
    violations.some((v) => v.includes("EXPEDITION_CREATED event is missing its expedition payload id")),
    violations.join("; "),
  )
})

test("certifySeedEventGraph rejects duplicate and cross-kind identities", () => {
  const duplicate = certifySeedEventGraph([...makeSeedEventGraph(), makeSeedEventGraph()[0]])
  assert.ok(
    duplicate.violations.some((v) => v.includes("Duplicate mission identity in seed event graph: M-1")),
    duplicate.violations.join("; "),
  )

  const crossKind = certifySeedEventGraph([
    makeSeedEventGraph()[0],
    {
      type: "EXPEDITION_CREATED",
      payload: { expedition: { id: "M-1", missionId: "M-1", name: "Clash", goal: "Clash" } },
    },
  ])
  assert.ok(
    crossKind.violations.some((v) => v.includes("identity M-1 is used as both mission and expedition")),
    crossKind.violations.join("; "),
  )
})

// ============================================================
// Integrity proof (pure)
// ============================================================

test("buildGenesisIntegrityProof is deterministic and binds the committed chain", () => {
  const snapshot = signed(makeSnapshot())
  const report = certifyGenesisIntake({ snapshot, seedEvents: snapshotToSeedEvents(snapshot) })
  const events = [{ eventHash: "a".repeat(64) }, { eventHash: "b".repeat(64) }]

  const proofA = buildGenesisIntegrityProof({ report, events })
  const proofB = buildGenesisIntegrityProof({ report, events })

  assert.deepStrictEqual(proofA, proofB)
  assert.strictEqual(proofA.kind, "genesis-integrity-proof")
  assert.strictEqual(proofA.eventCount, 2)
  assert.strictEqual(proofA.firstEventHash, "a".repeat(64))
  assert.strictEqual(proofA.finalEventHash, "b".repeat(64))
  assert.strictEqual(proofA.chainDigest, sha256(["a".repeat(64), "b".repeat(64)]))
  assert.match(proofA.certificationDigest, /^[0-9a-f]{64}$/)

  const tampered = buildGenesisIntegrityProof({ report, events: [events[0], { eventHash: "c".repeat(64) }] })
  assert.notStrictEqual(tampered.chainDigest, proofA.chainDigest)
})

// ============================================================
// API path: genesisFromSnapshot
// ============================================================

test("genesisFromSnapshot rejects a snapshot with broken parent references before committing", async () => {
  const ctx = await bootIsolated()
  const snapshot = signed(makeSnapshot())
  snapshot.proposals[1] = { ...snapshot.proposals[1], missionId: "ghost-mission" }
  snapshot.signature = signSnapshot(snapshot)

  const before = await ctx.infra.eventStore.count()
  const result = await ctx.api.genesisFromSnapshot({ snapshot })
  const after = await ctx.infra.eventStore.count()

  assert.strictEqual(result.status, "error")
  assert.ok(
    result.error.includes("references unknown mission proposal ghost-mission"),
    `unexpected error: ${result.error}`,
  )
  assert.strictEqual(result.meta.certification.result, "rejected")
  assert.strictEqual(after, before, "no seed event may be committed when certification rejects")
})

test("genesisFromSnapshot rejects an approved snapshot whose content was tampered with", async () => {
  const ctx = await bootIsolated()
  const session = ctx.missionStudio.startSession([
    makePlanningObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makePlanningObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makePlanningObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ])
  const approval = ctx.missionStudio.approve(session)
  assert.strictEqual(approval.success, true, approval.error)

  const snapshot = {
    ...approval.data,
    proposals: [{ ...approval.data.proposals[0], name: "Tampered Mission" }, ...approval.data.proposals.slice(1)],
  }

  const result = await ctx.api.genesisFromSnapshot({ snapshot })

  assert.strictEqual(result.status, "error")
  assert.ok(result.error.includes("Snapshot signature does not match its content"), `unexpected error: ${result.error}`)
  assert.strictEqual(await ctx.infra.eventStore.count(), 0)
})

test("genesisFromSnapshot accepts a valid snapshot with a certification report and integrity proof", async () => {
  const ctx = await bootIsolated()
  const session = ctx.missionStudio.startSession([
    makePlanningObservation("mission", "Build CRM", { purpose: "Customer success" }),
    makePlanningObservation("expedition", "CRM Data Model", { goal: "Design schema", missionSubject: "Build CRM" }),
    makePlanningObservation("objective", "Design Schema", { title: "Design CRM schema", expeditionSubject: "CRM Data Model" }),
  ])
  const approval = ctx.missionStudio.approve(session)
  assert.strictEqual(approval.success, true, approval.error)

  const result = await ctx.api.genesisFromSnapshot({ snapshot: approval.data })

  assert.strictEqual(result.status, "ok", result.error)

  const { certification, integrityProof } = result.result
  assert.strictEqual(certification.kind, "genesis-certification-report")
  assert.strictEqual(certification.result, "certified")
  assert.deepStrictEqual(certification.violations, [])
  assert.ok(certification.rules.every((rule) => rule.status === "pass"))
  assert.strictEqual(certification.counts.seedEvents, result.result.seededEvents)

  const events = await ctx.infra.eventStore.loadAll()
  assert.strictEqual(integrityProof.kind, "genesis-integrity-proof")
  assert.strictEqual(integrityProof.result, "certified")
  assert.strictEqual(integrityProof.eventCount, events.length)
  assert.strictEqual(integrityProof.snapshotId, approval.data.id)
  assert.strictEqual(integrityProof.finalEventHash, events[events.length - 1].eventHash)
  assert.strictEqual(integrityProof.chainDigest, sha256(events.map((event) => event.eventHash)))
  assert.match(integrityProof.certificationDigest, /^[0-9a-f]{64}$/)
})

// ============================================================
// Intake path: GenesisIntake.initialize
// ============================================================

test("GenesisIntake.initialize rejects an orphan seed event graph before committing", async () => {
  const ctx = await bootIsolated()
  const seedEvents = makeSeedEventGraph()
  seedEvents[1].payload.expedition.missionId = "ghost-mission"

  await assert.rejects(
    () => ctx.genesis.initialize({ projectName: "Hardening", systemId: "hardening-test", seedEvents }),
    /GENESIS_CERTIFICATION_FAILED.*references unknown mission ghost-mission/,
  )
  assert.strictEqual(await ctx.infra.eventStore.count(), 0, "no seed event may be committed when certification rejects")
})

test("GenesisIntake.initialize returns certification and integrity proof for a valid intake", async () => {
  const ctx = await bootIsolated()

  const result = await ctx.genesis.initialize({
    projectName: "Hardening",
    systemId: "hardening-test",
    seedEvents: makeSeedEventGraph(),
  })

  assert.strictEqual(result.certification.result, "certified")
  assert.deepStrictEqual(result.certification.graph, {
    missions: 1,
    expeditions: 1,
    objectives: 1,
    nodes: 3,
    edges: 2,
    roots: 1,
  })
  assert.strictEqual(result.integrityProof.eventCount, result.eventLogSeed.length)
  assert.strictEqual(
    result.integrityProof.finalEventHash,
    result.eventLogSeed[result.eventLogSeed.length - 1].eventHash,
  )
  assert.strictEqual(
    result.integrityProof.chainDigest,
    sha256(result.eventLogSeed.map((event) => event.eventHash)),
  )
})
