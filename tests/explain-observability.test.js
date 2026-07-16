// ============================================================
// EXPLAIN OBSERVABILITY TESTS (EXP-HARDEN-007)
// ============================================================
// The explain observability commands must let a developer inspect
// the aggregate graph, snapshot lineage, and replay diagnostics of
// any example or project with a single command — and must be
// strictly read-only: the inspected log and its directory stay
// byte-identical.
//
// Synthetic logs and snapshot fixtures live in os.tmpdir(); the
// committed first-contact archive (read-only forensic evidence)
// pins the known 36-violation profile. CLI-level assertions spawn
// dist/cli/synth.js, matching tests/replay-graph-integrity.test.js.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import fs from "fs"
import os from "os"
import path from "path"
import crypto from "crypto"
import { spawnSync } from "child_process"
import { attributeReplay } from "../dist/core/replay-attribution.js"
import {
  createMissionStudio,
  buildSnapshotLineage,
  signSnapshot,
  createFileSystemSnapshotStore,
} from "../dist/mission-studio/index.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const FIRST_CONTACT_ARCHIVE = path.join(
  process.cwd(),
  "examples",
  "first-contact",
  "recorded-journey",
  "evidence-archive",
  "events.jsonl",
)

function runExplain(args) {
  const result = spawnSync(process.execPath, [CLI_PATH, "explain", ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

// ============================================================
// Fixtures
// ============================================================

let seq = 0
function makeEvent(type, payload) {
  seq += 1
  // No hash-chain fields: the chain verifier tolerates pre-chain logs,
  // keeping these fixtures focused on observability.
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
    workItem: { id, status: "idle", dependencies: [], metadata: {}, createdAt: 1, updatedAt: 1 },
  })
}

function validLog() {
  return [
    missionCreated("m1"),
    makeEvent("MISSION_APPROVED", { id: "m1" }),
    expeditionCreated("e1", "m1"),
    objectiveAdded("o1", "e1"),
    workItemCreated("w1"),
  ]
}

function brokenLog() {
  return [
    missionCreated("m1"),
    expeditionCreated("e1", "m-ghost"),
    objectiveAdded("o1", "e1"),
    objectiveAdded("o2", undefined),
    missionCreated("m1"),
    makeEvent("MISSION_CREATED", { mission: { name: "no id" } }),
  ]
}

// Graph-broken but structurally consistent: every aggregate carries a
// valid status, so replay stays consistent and the verdict is WARN.
function warnLog() {
  return [
    missionCreated("m1"),
    expeditionCreated("e1", "m-ghost"),
    objectiveAdded("o1", "e1"),
  ]
}

function makeFixture(events) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "explain-observability-"))
  const logPath = path.join(dir, "event-log.jsonl")
  fs.writeFileSync(logPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n")
  return { dir, logPath }
}

function makeObservation(type, subject, extra, timestamp) {
  return {
    id: `obs-${type}-${subject}`,
    sourceAdapter: "test-adapter",
    type,
    payload: { subject, name: subject, ...extra },
    evidenceReference: `ev-${subject}`,
    confidence: "high",
    timestamp,
  }
}

/** Persist a certified two-version snapshot lineage into <dir>/snapshots. */
async function makeSnapshotFixture(dir) {
  const store = createFileSystemSnapshotStore(path.join(dir, "snapshots"))

  const studioA = createMissionStudio({ approvalThreshold: 0 })
  const sessionA = studioA.startSession([makeObservation("mission", "Alpha", { purpose: "P" }, 1000)])
  const approvedA = studioA.approve(sessionA)
  assert.strictEqual(approvedA.success, true)
  approvedA.data.lineage = buildSnapshotLineage(approvedA.data)
  approvedA.data.signature = signSnapshot(approvedA.data)
  await store.save({ snapshot: approvedA.data, session: approvedA.session })

  const studioB = createMissionStudio({ approvalThreshold: 0 })
  const sessionB = studioB.startSession([
    makeObservation("mission", "Alpha", { purpose: "P" }, 1000),
    makeObservation("expedition", "Beta", { goal: "G" }, 1001),
  ])
  const approvedB = studioB.approve(sessionB)
  assert.strictEqual(approvedB.success, true)
  approvedB.data.lineage = buildSnapshotLineage(approvedB.data, approvedA.data)
  approvedB.data.signature = signSnapshot(approvedB.data, approvedA.data.signature)
  await store.save({ snapshot: approvedB.data, session: approvedB.session })

  return { parentId: approvedA.data.id, childId: approvedB.data.id }
}

function hashTree(dir) {
  const entries = []
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else {
        const hash = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex")
        entries.push(`${path.relative(dir, full)}:${hash}`)
      }
    }
  }
  walk(dir)
  return entries.join("\n")
}

// ============================================================
// Core module: replay attribution
// ============================================================

test("attributeReplay attributes creations and writes per aggregate", () => {
  const report = attributeReplay(validLog())
  assert.strictEqual(report.kind, "replay-attribution-report")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.eventCount, 5)
  assert.strictEqual(report.attributedEvents, 5)
  assert.strictEqual(report.unattributedEvents, 0)

  const mission = report.attribution.find((a) => a.projection === "missions" && a.aggregateId === "m1")
  assert.strictEqual(mission.createdBy.index, 0)
  assert.strictEqual(mission.createdBy.type, "MISSION_CREATED")
  assert.strictEqual(mission.lastWrittenBy.type, "MISSION_APPROVED")
  assert.strictEqual(mission.writeCount, 2)

  const workItem = report.attribution.find((a) => a.projection === "workItems" && a.aggregateId === "w1")
  assert.strictEqual(workItem.writeCount, 1)

  const projections = Object.fromEntries(report.projections.map((p) => [p.projection, p]))
  assert.strictEqual(projections.missions.aggregates, 1)
  assert.strictEqual(projections.missions.writes, 2)
  assert.strictEqual(projections.expeditions.aggregates, 1)
  assert.strictEqual(projections.objectives.aggregates, 1)
})

test("attributeReplay counts events with no state-field effect as unattributed", () => {
  const report = attributeReplay([
    makeEvent("SYSTEM_GENESIS", { projectName: "x" }),
    makeEvent("POLICY_EVALUATED", { policyId: "p" }),
    makeEvent("MISSION_CREATED", { mission: { name: "malformed" } }),
    ...validLog(),
  ])
  assert.strictEqual(report.unattributedEvents, 3)
  assert.strictEqual(report.attributedEvents, 5)
})

test("attributeReplay mirrors DECISION_ACCEPTED create-vs-write duality", () => {
  const events = [
    makeEvent("DECISION_ACCEPTED", { decision: { id: "d1", title: "t" } }),
    makeEvent("DECISION_ACCEPTED", { id: "d1" }),
    makeEvent("DECISION_REJECTED", { id: "d1" }),
  ]
  const report = attributeReplay(events)
  const decision = report.attribution.find((a) => a.projection === "decisions" && a.aggregateId === "d1")
  assert.strictEqual(decision.createdBy.index, 0)
  assert.strictEqual(decision.lastWrittenBy.type, "DECISION_REJECTED")
  assert.strictEqual(decision.writeCount, 3)
})

// ============================================================
// synth explain lineage
// ============================================================

test("explain lineage renders the Mission → Expedition → Objective tree", () => {
  const { logPath } = makeFixture(validLog())
  const run = runExplain(["lineage", "--log", logPath])
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /Aggregate lineage — /)
  assert.match(run.stdout, /- Mission m1 "Mission m1" \[active\]/)
  assert.match(run.stdout, /- Expedition e1 "Expedition e1" \[draft\]/)
  assert.match(run.stdout, /- Objective o1 "Objective o1" \[draft\]/)
  assert.match(run.stdout, /Work Item w1 \[idle\]/)
  assert.doesNotMatch(run.stdout, /❌/)
})

test("explain lineage --json is versioned and nests children", () => {
  const { logPath } = makeFixture(validLog())
  const run = runExplain(["lineage", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.status, "ok")
  assert.strictEqual(report.kind, "AggregateLineage")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.eventCount, 5)
  assert.deepStrictEqual(report.summary, {
    projects: 0,
    missions: 1,
    expeditions: 1,
    objectives: 1,
    generatedWorkItems: 0,
    workItems: 1,
    violationCount: 0,
  })
  assert.strictEqual(report.roots.length, 1)
  assert.strictEqual(report.roots[0].id, "m1")
  assert.strictEqual(report.roots[0].children[0].id, "e1")
  assert.strictEqual(report.roots[0].children[0].children[0].id, "o1")
  assert.strictEqual(report.workItems[0].id, "w1")
  assert.strictEqual(report.workItems[0].parentId, null)
})

test("explain lineage marks broken and missing parents inline", () => {
  const { logPath } = makeFixture(brokenLog())
  const run = runExplain(["lineage", "--log", logPath])
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /❌ Expedition e1 "Expedition e1"/)
  assert.match(run.stdout, /broken-parent-reference: EXPEDITION_CREATED e1 references unknown mission m-ghost/)
  assert.match(run.stdout, /❌ Objective o2 "Objective o2"/)
  assert.match(run.stdout, /missing-parent-reference/)

  const report = parseJson(runExplain(["lineage", "--log", logPath, "--json"]).stdout)
  assert.strictEqual(report.summary.violationCount, report.violations.length)
  assert.ok(report.summary.violationCount > 0)
  const kinds = new Set(report.violations.map((v) => v.kind))
  assert.ok(kinds.has("broken-parent-reference"))
  assert.ok(kinds.has("missing-parent-reference"))
  assert.ok(kinds.has("duplicate-creation"))
  assert.ok(kinds.has("malformed-creation"))
  assert.ok(kinds.has("orphan-aggregate"))
})

// ============================================================
// synth explain graph
// ============================================================

test("explain graph renders nodes, edges, and violation markers", () => {
  const { logPath } = makeFixture(validLog())
  const run = runExplain(["graph", "--log", logPath])
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /Nodes: 3 {2}Edges: 2 \(resolved: 2, broken: 0\) {2}Violations: 0/)
  assert.match(run.stdout, /✓ mission m1/)
  assert.match(run.stdout, /✓ e1 -\[parent\]-> m1/)
  assert.match(run.stdout, /Violations by kind:\n  \(none\)/)
})

test("explain graph --json reports edge resolution and per-kind rollup", () => {
  const { logPath } = makeFixture(brokenLog())
  const run = runExplain(["graph", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "AggregateGraphView")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.valid, false)
  assert.ok(report.edges.some((e) => e.from === "e1" && e.to === "m-ghost" && e.resolved === false))
  assert.ok(report.edges.some((e) => e.from === "o1" && e.to === "e1" && e.resolved === true))
  assert.strictEqual(report.violationsByKind["broken-parent-reference"], 1)
  assert.strictEqual(report.violationsByKind["missing-parent-reference"], 1)
  const violated = report.nodes.find((n) => n.id === "e1")
  assert.ok(violated.violations.includes("broken-parent-reference"))
})

// ============================================================
// synth explain diagnostics
// ============================================================

test("explain diagnostics --json rolls violations up per kind and attributes replay", () => {
  const { logPath } = makeFixture(brokenLog())
  const run = runExplain(["diagnostics", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "ExplainDiagnostics")
  assert.strictEqual(report.version, 1)

  assert.strictEqual(report.relationships.valid, false)
  assert.strictEqual(report.relationships.violationCount, report.relationships.violations.length)
  const byKind = report.relationships.byKind
  assert.strictEqual(byKind["broken-parent-reference"], 1)
  assert.strictEqual(byKind["missing-parent-reference"], 1)
  assert.strictEqual(byKind["duplicate-creation"], 1)
  assert.strictEqual(byKind["malformed-creation"], 1)
  const total = Object.values(byKind).reduce((sum, count) => sum + count, 0)
  assert.strictEqual(total, report.relationships.violationCount)

  assert.strictEqual(report.replay.kind, "replay-attribution-report")
  assert.strictEqual(report.replay.version, 1)
  const mission = report.replay.attribution.find((a) => a.projection === "missions" && a.aggregateId === "m1")
  assert.strictEqual(mission.createdBy.type, "MISSION_CREATED")
  assert.strictEqual(mission.writeCount, 2) // duplicate creation writes twice
})

test("explain diagnostics human output honors --summary", () => {
  const { logPath } = makeFixture(brokenLog())
  const full = runExplain(["diagnostics", "--log", logPath])
  assert.strictEqual(full.status, 0, full.stderr)
  assert.match(full.stdout, /Violations: \d+/)
  assert.match(full.stdout, /By kind:/)
  assert.match(full.stdout, /First \d+:/)
  assert.match(full.stdout, /Replay diagnostics — which events wrote which state fields/)
  assert.match(full.stdout, /Attribution \(first \d+ of \d+\):/)

  const summary = runExplain(["diagnostics", "--log", logPath, "--summary"])
  assert.strictEqual(summary.status, 0, summary.stderr)
  assert.match(summary.stdout, /By kind:/)
  assert.match(summary.stdout, /missions: \d+ aggregate\(s\), \d+ write\(s\)/)
  assert.doesNotMatch(summary.stdout, /First \d+:/)
  assert.doesNotMatch(summary.stdout, /Attribution \(first/)
})

// ============================================================
// synth explain status
// ============================================================

test("explain status dashboard passes a fully valid project", async () => {
  const { dir, logPath } = makeFixture(validLog())
  await makeSnapshotFixture(dir)
  const run = runExplain(["status", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "ExplainStatus")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.replay.consistent, true)
  assert.strictEqual(report.replay.chainValid, true)
  assert.strictEqual(report.graphIntegrity.result, "valid")
  assert.strictEqual(report.graphIntegrity.invariants.fail, 0)
  assert.strictEqual(report.graphIntegrity.invariants.notEventProvable, 1)
  assert.deepStrictEqual(report.snapshots, { present: true, snapshotCount: 2, certified: true, error: null })
  assert.strictEqual(report.verdict, "pass")
})

test("explain status warns on graph violations without failing replay", () => {
  const { logPath } = makeFixture(warnLog())
  const run = runExplain(["status", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.replay.consistent, true)
  assert.strictEqual(report.graphIntegrity.result, "invalid")
  assert.strictEqual(report.verdict, "warn")
})

test("explain status --summary is a single verdict line", () => {
  const { logPath } = makeFixture(warnLog())
  const run = runExplain(["status", "--log", logPath, "--summary"])
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout.trim(), /^WARN — replay consistent, graph invalid \(\d+ violation\(s\)\), snapshots none$/)
})

// ============================================================
// synth explain snapshots + proposals
// ============================================================

test("explain snapshots shows version history and certified parents", async () => {
  const { dir, logPath } = makeFixture(validLog())
  const fixture = await makeSnapshotFixture(dir)
  const run = runExplain(["snapshots", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "SnapshotLineageReport")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.present, true)
  assert.strictEqual(report.snapshotCount, 2)
  assert.strictEqual(report.certified, true)
  assert.strictEqual(report.lineages.length, 1)
  const versions = report.lineages[0].versions
  assert.strictEqual(versions.length, 2)
  assert.strictEqual(versions[0].id, fixture.parentId)
  assert.strictEqual(versions[0].version, 1)
  assert.strictEqual(versions[0].parentId, null)
  assert.strictEqual(versions[1].id, fixture.childId)
  assert.strictEqual(versions[1].version, 2)
  assert.strictEqual(versions[1].parentId, fixture.parentId)
  assert.ok(versions.every((v) => v.certified === true))

  const human = runExplain(["snapshots", "--log", logPath])
  assert.match(human.stdout, /all certified ✓/)
  assert.match(human.stdout, /v2 .* ← parent /)
})

test("explain proposals traces proposals to observations and evidence", async () => {
  const { dir, logPath } = makeFixture(validLog())
  const fixture = await makeSnapshotFixture(dir)
  const run = runExplain(["proposals", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.kind, "ProposalLineage")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.snapshotCount, 2)
  assert.strictEqual(report.proposalCount, 3)
  const mission = report.proposals.find((p) => p.kind === "mission")
  assert.deepStrictEqual(mission.observationIds, ["obs-mission-Alpha"])
  assert.ok(mission.evidenceRefs.length > 0)
  const expedition = report.proposals.find((p) => p.kind === "expedition")
  assert.deepStrictEqual(expedition.observationIds, ["obs-expedition-Beta"])
  assert.strictEqual(expedition.snapshotId, fixture.childId)
  assert.strictEqual(expedition.snapshotLineageVersion, 2)
})

test("explain proposals and snapshots handle no persisted snapshots gracefully", () => {
  const { logPath } = makeFixture(validLog())
  const proposals = runExplain(["proposals", "--log", logPath, "--json"])
  assert.strictEqual(proposals.status, 0, proposals.stderr)
  const proposalReport = parseJson(proposals.stdout)
  assert.strictEqual(proposalReport.status, "ok")
  assert.strictEqual(proposalReport.snapshotCount, 0)
  assert.strictEqual(proposalReport.proposalCount, 0)
  assert.deepStrictEqual(proposalReport.proposals, [])
  assert.match(proposalReport.note, /no snapshots persisted/)

  const snapshots = runExplain(["snapshots", "--log", logPath, "--json"])
  assert.strictEqual(snapshots.status, 0, snapshots.stderr)
  const snapshotReport = parseJson(snapshots.stdout)
  assert.strictEqual(snapshotReport.present, false)
  assert.strictEqual(snapshotReport.snapshotCount, 0)
  assert.match(snapshotReport.note, /no snapshots persisted/)
})

test("explain snapshots fails loudly on a tampered snapshot store", async () => {
  const { dir, logPath } = makeFixture(validLog())
  const fixture = await makeSnapshotFixture(dir)
  const snapshotFile = path.join(dir, "snapshots", `${fixture.childId}.json`)
  const stored = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"))
  stored.snapshot.proposals[0].name = "Tampered"
  fs.writeFileSync(snapshotFile, JSON.stringify(stored, null, 2))

  const run = runExplain(["snapshots", "--log", logPath])
  assert.strictEqual(run.status, 1)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.status, "error")
  assert.match(report.error, /snapshot certification failed/)
})

// ============================================================
// Umbrella: synth explain all
// ============================================================

test("explain all --json composes every section", async () => {
  const { dir, logPath } = makeFixture(validLog())
  await makeSnapshotFixture(dir)
  const run = runExplain(["all", "--log", logPath, "--json"])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.status, "ok")
  assert.strictEqual(report.kind, "ExplainOverview")
  assert.strictEqual(report.version, 1)
  assert.strictEqual(report.verdict, "pass")
  assert.strictEqual(report.statusReport.kind, "ExplainStatus")
  assert.strictEqual(report.lineage.kind, "AggregateLineage")
  assert.strictEqual(report.graph.kind, "AggregateGraphView")
  assert.strictEqual(report.snapshots.kind, "SnapshotLineageReport")
  assert.strictEqual(report.proposals.kind, "ProposalLineage")
  assert.strictEqual(report.diagnostics.kind, "ExplainDiagnostics")
})

test("explain all human output contains every section", () => {
  const { logPath } = makeFixture(validLog())
  const run = runExplain(["all", "--log", logPath])
  assert.strictEqual(run.status, 0, run.stderr)
  for (const section of [
    "Validation status —",
    "Aggregate lineage —",
    "Aggregate graph —",
    "Snapshot lineage —",
    "Proposal lineage —",
    "Relationship diagnostics —",
    "Replay diagnostics — which events wrote which state fields",
  ]) {
    assert.ok(run.stdout.includes(section), `missing section: ${section}`)
  }
})

// ============================================================
// Any example or project: --log against the first-contact archive
// ============================================================

test("explain all --log shows the first-contact archive's 36-violation profile", () => {
  const run = runExplain(["all", "--log", FIRST_CONTACT_ARCHIVE])
  assert.strictEqual(run.status, 0, run.stderr)
  assert.match(run.stdout, /Violations: 36/)
  assert.match(run.stdout, /broken-parent-reference: 12/)
  assert.match(run.stdout, /orphan-aggregate: 12/)
  assert.match(run.stdout, /broken-navigation: 12/)
  assert.match(run.stdout, /Verdict:         WARN/)

  const report = parseJson(runExplain(["all", "--log", FIRST_CONTACT_ARCHIVE, "--json"]).stdout)
  assert.strictEqual(report.eventCount, 32)
  assert.strictEqual(report.verdict, "warn")
  assert.deepStrictEqual(report.diagnostics.relationships.byKind, {
    "broken-parent-reference": 12,
    "orphan-aggregate": 12,
    "broken-navigation": 12,
  })
  assert.strictEqual(report.graph.violationCount, 36)
  assert.strictEqual(report.statusReport.replay.consistent, true)
  assert.strictEqual(report.statusReport.graphIntegrity.invariants.fail, 3)
  assert.strictEqual(report.snapshots.present, false)
  assert.strictEqual(report.proposals.proposalCount, 0)
})

// ============================================================
// explain replay keeps its shape and gains --log
// ============================================================

test("explain replay keeps its legacy JSON shape and accepts --log", () => {
  const { logPath } = makeFixture(validLog())
  const run = runExplain(["replay", "--log", logPath])
  assert.strictEqual(run.status, 0, run.stderr)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.status, "ok")
  assert.strictEqual(report.consistent, true)
  assert.strictEqual(report.eventCount, 5)
  assert.ok("chainValid" in report)
  assert.ok("replayHash" in report)
})

// ============================================================
// Usage and operational errors
// ============================================================

test("explain with an unknown or missing subcommand prints usage and exits 1", () => {
  for (const args of [[], ["bogus"]]) {
    const run = runExplain(args)
    assert.strictEqual(run.status, 1)
    const report = parseJson(run.stdout)
    assert.strictEqual(report.status, "error")
    assert.match(report.error, /Usage: synth explain <replay\|lineage\|proposals\|snapshots\|graph\|diagnostics\|status\|all>/)
  }
})

test("explain with a missing --log target exits 1", () => {
  const run = runExplain(["lineage", "--log", path.join(os.tmpdir(), "definitely-missing-log.jsonl")])
  assert.strictEqual(run.status, 1)
  const report = parseJson(run.stdout)
  assert.strictEqual(report.status, "error")
  assert.match(report.error, /event log not found/)
})

// ============================================================
// Read-only guarantee
// ============================================================

test("explain commands never write to the inspected log or its directory", async () => {
  const { dir, logPath } = makeFixture(validLog())
  await makeSnapshotFixture(dir)
  const before = hashTree(dir)

  for (const sub of ["lineage", "proposals", "snapshots", "graph", "diagnostics", "status", "all", "replay"]) {
    for (const extra of [[], ["--json"]]) {
      const run = runExplain([sub, "--log", logPath, ...extra])
      assert.strictEqual(run.status, 0, `${sub} ${extra}: ${run.stderr}`)
    }
  }

  assert.strictEqual(hashTree(dir), before, "inspected directory changed")
})

// ============================================================
// Legacy default: repo data/ log stays byte-identical
// ============================================================

test("explain on the default data/ log leaves it byte-identical", () => {
  const defaultLog = path.join(process.cwd(), "data", "event-log.jsonl")
  if (!fs.existsSync(defaultLog)) return
  const before = crypto.createHash("sha256").update(fs.readFileSync(defaultLog)).digest("hex")
  const run = runExplain(["status"])
  assert.strictEqual(run.status, 0, run.stderr)
  const after = crypto.createHash("sha256").update(fs.readFileSync(defaultLog)).digest("hex")
  assert.strictEqual(after, before)
})
