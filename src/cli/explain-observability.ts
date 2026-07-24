// ============================================================
// CLI: Explain — Observability (EXP-HARDEN-007)
// ============================================================
// Lineage, visualization, and diagnostic tooling so every defect
// found during Program 010 can be explained by replay without code
// archaeology.
//
// Subcommands (all read-only; they NEVER write to the log they
// inspect, to data/, or to the snapshot store):
//
//   synth explain lineage      Project → Mission → Expedition →
//                              Objective → Work Item tree, with
//                              broken/missing parents marked inline
//   synth explain proposals    proposal → observations/evidence
//                              (persisted snapshot store)
//   synth explain snapshots    snapshot version history + parents
//                              (certified on load, EXP-HARDEN-002)
//   synth explain graph        aggregate graph with per-node status
//                              and violation markers
//   synth explain diagnostics  relationship diagnostics (per-kind
//                              violation rollup) + replay attribution
//   synth explain status       validation dashboard with one verdict
//   synth explain all          umbrella: every section above
//
// Flags:
//   --log <path>   inspect any example/project log (verify-replay.js
//                  semantics; state/checkpoint/snapshot paths derive
//                  from the log's directory)
//   --json         machine output; every report carries kind + version
//   --summary      compact output (diagnostics, status, all)
//
// Exit codes: 0 when inspection completed — findings (violations,
// divergence, verdicts) are data, not operational failures. Exit 1
// only when inspection cannot complete: unknown subcommand, a --log
// flag without a value or pointing at a missing file, or a snapshot
// store that fails certification under `snapshots`/`proposals`
// (mirroring `synth mission snapshot`).
// ============================================================

import fs from "fs/promises"
import path from "path"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { validateGraphIntegrity } from "../core/graph-integrity.js"
import { attributeReplay } from "../core/replay-attribution.js"
import { rebuildState } from "../runtime/replay.js"
import { createFileSystemSnapshotStore } from "../mission-studio/snapshot-store.js"
import { getSnapshotLineage } from "../mission-studio/snapshot-lineage.js"
import type { GraphIntegrityViolation } from "../core/graph-integrity.js"
import type { ReplayAttributionReport } from "../core/replay-attribution.js"
import type { StoredSnapshot } from "../mission-studio/types.js"
import type { CanonicalState, DerivedState, SynthEvent } from "../types/index.js"
import { buildDerivedState } from "../state/derived/index.js"
import {
  dataDir,
  ensureDataDir,
  eventLogFile,
  stateFile,
  checkpointsFile,
  snapshotsDir,
} from "../sdk/paths/index.js"
import { root } from "../sdk/workspace/index.js"
import { printJson, printError } from "./print.js"

export const EXPLAIN_OBSERVABILITY_VERSION = 1

const DEFAULT_LOG_DISPLAY = path.posix.join(
  path.relative(root(), dataDir(root())).replace(/\\/g, "/") || ".",
  "event-log.jsonl",
)

function flagOn(flags: Record<string, string | boolean>, name: string): boolean {
  return flags[name] === true || flags[name] === "true"
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

// ============================================================
// Explain context: one read-only bootstrap shared by all sections
// ============================================================

export type ExplainPaths = {
  /** Absolute path used for IO. */
  logPath: string
  /** Path as shown to the operator (flag value or default). */
  logDisplay: string
  logDir: string
  statePath: string
  checkpointPath: string
  snapshotsDir: string
}

/**
 * Resolve the log under inspection and derive its project paths.
 * With no --log this is exactly the cmdExplainReplay path set
 * (<runtime-data-dir>/event-log.jsonl + <runtime-data-dir>/canonical-state.json +
 * <runtime-data-dir>/checkpoint.json); with --log the same files are derived next
 * to the given log, so any example or project directory works.
 */
export function resolveExplainPaths(flags: Record<string, string | boolean>): ExplainPaths {
  const logFlag = flags.log
  if (logFlag !== undefined && typeof logFlag !== "string") {
    printError("--log requires a path")
  }
  const cwd = process.cwd()
  if (logFlag) {
    const logPath = path.resolve(cwd, logFlag)
    const logDir = path.dirname(logPath)
    return {
      logPath,
      logDisplay: logFlag,
      logDir,
      statePath: path.join(logDir, "canonical-state.json"),
      checkpointPath: path.join(logDir, "checkpoint.json"),
      snapshotsDir: path.join(logDir, "snapshots"),
    }
  }

  const projectRoot = root()
  return {
    logPath: eventLogFile(projectRoot),
    logDisplay: DEFAULT_LOG_DISPLAY,
    logDir: dataDir(projectRoot),
    statePath: stateFile(projectRoot),
    checkpointPath: checkpointsFile(projectRoot),
    snapshotsDir: snapshotsDir(projectRoot),
  }
}

type ExplainContext = {
  paths: ExplainPaths
  events: SynthEvent[]
  state: CanonicalState
  graph: ReturnType<typeof validateGraphIntegrity>
  attribution: ReplayAttributionReport
  infra: Awaited<ReturnType<typeof bootstrap>>["infra"]
}

async function loadExplainContext(flags: Record<string, string | boolean>): Promise<ExplainContext> {
  const paths = resolveExplainPaths(flags)
  if (typeof flags.log === "string" && !(await pathExists(paths.logPath))) {
    printError(`event log not found: ${flags.log}`)
  }

  // File persistence is required to read real logs; bootstrap with
  // skipGenesis only mkdir -p's existing project directories and never
  // appends. The sections below read through loadAll()/load()/list()
  // exclusively.
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: paths.logPath,
      statePath: paths.statePath,
      checkpointPath: paths.checkpointPath,
    },
  })

  const events = await ctx.infra.eventStore.loadAll()
  const state = rebuildState(events)
  const graph = validateGraphIntegrity(events, state)
  const attribution = attributeReplay(events)

  return { paths, events, state, graph, attribution, infra: ctx.infra }
}

// ============================================================
// Snapshot store access (certifies on load — EXP-HARDEN-002)
// ============================================================

type SnapshotLoad =
  | { present: false; stored: null; error: null }
  | { present: true; stored: StoredSnapshot[]; error: null }
  | { present: true; stored: null; error: string }

async function loadSnapshots(snapshotsDir: string): Promise<SnapshotLoad> {
  // Existence check first: FileSystemSnapshotStore.list() ensures the
  // directory, and these commands must never create it.
  if (!(await pathExists(snapshotsDir))) {
    return { present: false, stored: null, error: null }
  }
  const store = createFileSystemSnapshotStore(snapshotsDir)
  try {
    return { present: true, stored: await store.list(), error: null }
  } catch (err) {
    // The store certifies on load: a throw means tampered or malformed
    // snapshots (signature or structural verification failed).
    return { present: true, stored: null, error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================================
// Violation annotation
// ============================================================

function violationsByAggregate(violations: GraphIntegrityViolation[]): Map<string, GraphIntegrityViolation[]> {
  const map = new Map<string, GraphIntegrityViolation[]>()
  for (const violation of violations) {
    if (!violation.aggregateId) continue
    const list = map.get(violation.aggregateId) ?? []
    list.push(violation)
    map.set(violation.aggregateId, list)
  }
  return map
}

function rollupByKind(violations: GraphIntegrityViolation[]): Record<string, number> {
  const rollup: Record<string, number> = {}
  for (const violation of violations) {
    rollup[violation.kind] = (rollup[violation.kind] ?? 0) + 1
  }
  return rollup
}

// ============================================================
// Aggregate tree (shared by lineage + graph)
// ============================================================

type AggregateNode = {
  id: string
  kind: "project" | "mission" | "expedition" | "objective" | "generatedWorkItem"
  name: string
  status: string
  parentId?: string
  inState: boolean
  createdIndex: number | null
  violations: GraphIntegrityViolation[]
  children: AggregateNode[]
}

type CreationSpec = {
  eventType: string
  payloadKey: string
  kind: AggregateNode["kind"]
  parentKey?: "missionId" | "expeditionId" | "objectiveId"
  nameKey: string
}

const TREE_CREATION_SPECS: CreationSpec[] = [
  { eventType: "PROJECT_CREATED", payloadKey: "project", kind: "project", nameKey: "name" },
  { eventType: "MISSION_CREATED", payloadKey: "mission", kind: "mission", nameKey: "name" },
  { eventType: "EXPEDITION_CREATED", payloadKey: "expedition", kind: "expedition", parentKey: "missionId", nameKey: "name" },
  { eventType: "OBJECTIVE_ADDED", payloadKey: "objective", kind: "objective", parentKey: "expeditionId", nameKey: "title" },
  { eventType: "WORK_ITEM_GENERATED", payloadKey: "workItem", kind: "generatedWorkItem", parentKey: "objectiveId", nameKey: "title" },
]

const KIND_LABEL: Record<AggregateNode["kind"], string> = {
  project: "Project",
  mission: "Mission",
  expedition: "Expedition",
  objective: "Objective",
  generatedWorkItem: "Work Item (generated)",
}

function stateLookup(
  state: CanonicalState,
  derivedState: DerivedState,
  kind: AggregateNode["kind"],
  id: string,
): { status?: string; name?: string; title?: string } | undefined {
  switch (kind) {
    case "project":
      return state.projects[id]
    case "mission":
      return state.missions[id]
    case "expedition":
      return state.expeditions[id]
    case "objective":
      return state.objectives[id]
    case "generatedWorkItem":
      return derivedState.generatedWorkItems[id]
  }
}

function buildAggregateTree(ec: ExplainContext): { roots: AggregateNode[]; nodes: AggregateNode[] } {
  const annotations = violationsByAggregate(ec.graph.violations)
  const nodes = new Map<string, AggregateNode>()
  const derivedState = buildDerivedState(ec.events)

  // First registration wins, mirroring validateAggregateGraph: duplicate
  // creations are flagged through the violation annotations, not by
  // creating a second node.
  ec.events.forEach((event, index) => {
    for (const spec of TREE_CREATION_SPECS) {
      if (event.type !== spec.eventType) continue
      const payload = event.payload as Record<string, unknown> | undefined
      const entity = payload?.[spec.payloadKey] as Record<string, unknown> | undefined
      const id = entity?.id
      if (typeof id !== "string" || id.length === 0 || nodes.has(id)) break
      const parentId =
        spec.parentKey && typeof entity?.[spec.parentKey] === "string"
          ? (entity[spec.parentKey] as string)
          : undefined
      const materialized = stateLookup(ec.state, derivedState, spec.kind, id)
      const name =
        materialized?.name ??
        materialized?.title ??
        (typeof entity?.[spec.nameKey] === "string" ? (entity[spec.nameKey] as string) : "")
      nodes.set(id, {
        id,
        kind: spec.kind,
        name,
        status: materialized?.status ?? "unknown",
        parentId,
        inState: materialized !== undefined,
        createdIndex: index,
        violations: annotations.get(id) ?? [],
        children: [],
      })
      break
    }
  })

  const roots: AggregateNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const byCreation = (a: AggregateNode, b: AggregateNode) =>
    (a.createdIndex ?? Number.MAX_SAFE_INTEGER) - (b.createdIndex ?? Number.MAX_SAFE_INTEGER) ||
    a.id.localeCompare(b.id)
  roots.sort(byCreation)
  for (const node of nodes.values()) node.children.sort(byCreation)

  return { roots, nodes: Array.from(nodes.values()) }
}

function nodeToJson(node: AggregateNode): Record<string, unknown> {
  return {
    id: node.id,
    kind: node.kind,
    name: node.name,
    status: node.status,
    parentId: node.parentId ?? null,
    inState: node.inState,
    createdIndex: node.createdIndex,
    violations: node.violations.map((v) => v.kind),
    children: node.children.map(nodeToJson),
  }
}

function renderNode(node: AggregateNode, indent: string, lines: string[]) {
  const marker = node.violations.length > 0 ? "❌" : "-"
  const stateNote = node.inState ? "" : " ⚠️  not in replayed state"
  lines.push(`${indent}${marker} ${KIND_LABEL[node.kind]} ${node.id} "${node.name}" [${node.status}]${stateNote}`)
  for (const violation of node.violations) {
    lines.push(`${indent}    ↳ ${violation.kind}: ${violation.message}`)
  }
  for (const child of node.children) {
    renderNode(child, indent + "  ", lines)
  }
}

// ============================================================
// 1. Aggregate lineage
// ============================================================

type LineageBuild = {
  report: Record<string, unknown>
  roots: AggregateNode[]
}

function buildLineageReport(ec: ExplainContext): LineageBuild {
  const { roots, nodes } = buildAggregateTree(ec)
  const workItems = Object.values(ec.state.workItems)
    .map((workItem) => ({
      id: workItem.id,
      status: workItem.status,
      inState: true,
      // Canonical work items carry no parent edge (documented model gap).
      parentId: null,
      violations: [] as string[],
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const count = (kind: AggregateNode["kind"]) => nodes.filter((n) => n.kind === kind).length

  return {
    roots,
    report: {
      status: "ok",
      kind: "AggregateLineage",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      log: ec.paths.logDisplay,
      eventCount: ec.events.length,
      summary: {
        projects: count("project"),
        missions: count("mission"),
        expeditions: count("expedition"),
        objectives: count("objective"),
        generatedWorkItems: count("generatedWorkItem"),
        workItems: workItems.length,
        violationCount: ec.graph.violations.length,
      },
      roots: roots.map(nodeToJson),
      workItems,
      violations: ec.graph.violations,
    },
  }
}

function renderLineage(build: LineageBuild): string {
  const report = build.report as any
  const s = report.summary
  const nodeCount = s.projects + s.missions + s.expeditions + s.objectives + s.generatedWorkItems
  const lines = [
    `Aggregate lineage — ${report.log}`,
    `Events: ${report.eventCount}  Nodes: ${nodeCount}  Violations: ${s.violationCount}`,
    "",
  ]
  if (build.roots.length === 0) lines.push("(no aggregates in log)")
  for (const root of build.roots) {
    renderNode(root, "", lines)
  }
  if (report.workItems.length > 0) {
    lines.push("", "Work Items (canonical; no parent edge in the event model — documented gap):")
    for (const workItem of report.workItems) {
      lines.push(`  - Work Item ${workItem.id} [${workItem.status}]`)
    }
  }
  return lines.join("\n")
}

// ============================================================
// 2. Proposal lineage
// ============================================================

type ProposalEntry = {
  id: string
  kind: string
  name: string
  confidence: number
  observationIds: string[]
  evidenceRefs: string[]
  rationale: string | null
  snapshotId: string
  snapshotLineageVersion: number | null
}

async function buildProposalsReport(ec: ExplainContext): Promise<Record<string, unknown>> {
  const load = await loadSnapshots(ec.paths.snapshotsDir)
  if (!load.present) {
    return {
      status: "ok",
      kind: "ProposalLineage",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      snapshotsDir: ec.paths.snapshotsDir,
      snapshotCount: 0,
      proposalCount: 0,
      proposals: [] as ProposalEntry[],
      note: `no snapshots persisted at ${ec.paths.snapshotsDir}`,
    }
  }
  if (load.stored === null) {
    printError(`snapshot certification failed at ${ec.paths.snapshotsDir}: ${load.error ?? "unknown"}`)
  }

  const proposals: ProposalEntry[] = []
  for (const stored of load.stored) {
    for (const proposal of stored.snapshot.proposals ?? []) {
      proposals.push({
        id: proposal.id,
        kind: proposal.kind,
        name: proposal.name,
        confidence: proposal.confidence,
        observationIds: proposal.observationIds ?? [],
        evidenceRefs: proposal.evidenceRefs ?? [],
        rationale: proposal.rationale ?? null,
        snapshotId: stored.snapshot.id,
        snapshotLineageVersion: stored.snapshot.lineage?.version ?? null,
      })
    }
  }

  return {
    status: "ok",
    kind: "ProposalLineage",
    version: EXPLAIN_OBSERVABILITY_VERSION,
    snapshotsDir: ec.paths.snapshotsDir,
    snapshotCount: load.stored.length,
    proposalCount: proposals.length,
    proposals,
  }
}

function renderProposals(report: any): string {
  const lines = [
    `Proposal lineage — ${report.snapshotsDir}`,
    `Snapshots: ${report.snapshotCount}  Proposals: ${report.proposalCount}`,
    "",
  ]
  if (report.note) lines.push(report.note)
  if (report.error) lines.push(`❌ ${report.error}`)
  for (const proposal of report.proposals as ProposalEntry[]) {
    const version = proposal.snapshotLineageVersion ? ` v${proposal.snapshotLineageVersion}` : ""
    lines.push(`- ${proposal.kind} proposal ${proposal.id} "${proposal.name}" (confidence ${proposal.confidence})`)
    lines.push(`    snapshot: ${proposal.snapshotId}${version}`)
    lines.push(`    observations: ${proposal.observationIds.length > 0 ? proposal.observationIds.join(", ") : "(none)"}`)
    lines.push(`    evidence: ${proposal.evidenceRefs.length > 0 ? proposal.evidenceRefs.join(", ") : "(none)"}`)
  }
  return lines.join("\n")
}

// ============================================================
// 3. Snapshot lineage
// ============================================================

async function buildSnapshotsReport(ec: ExplainContext): Promise<Record<string, unknown>> {
  const load = await loadSnapshots(ec.paths.snapshotsDir)
  if (!load.present) {
    return {
      status: "ok",
      kind: "SnapshotLineageReport",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      snapshotsDir: ec.paths.snapshotsDir,
      present: false,
      snapshotCount: 0,
      certified: null,
      lineages: [] as unknown[],
      note: `no snapshots persisted at ${ec.paths.snapshotsDir}`,
    }
  }
  if (load.stored === null) {
    printError(`snapshot certification failed at ${ec.paths.snapshotsDir}: ${load.error ?? "unknown"}`)
  }

  const stored = load.stored
  const store = createFileSystemSnapshotStore(ec.paths.snapshotsDir)

  // Group by lineage; walk each lineage from its latest version back to
  // the root so parent relationships come from the store itself.
  const latestByLineage = new Map<string, StoredSnapshot>()
  for (const entry of stored) {
    const lineageId = entry.snapshot.lineage?.lineageId ?? `(unversioned:${entry.snapshot.id})`
    const current = latestByLineage.get(lineageId)
    if (!current || (entry.snapshot.lineage?.version ?? 0) > (current.snapshot.lineage?.version ?? 0)) {
      latestByLineage.set(lineageId, entry)
    }
  }

  const lineages = []
  for (const [, latest] of Array.from(latestByLineage.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const chain = await getSnapshotLineage(store, latest.snapshot.id)
    lineages.push({
      lineageId: latest.snapshot.lineage?.lineageId ?? null,
      latest: latest.snapshot.id,
      versions: chain.map((entry) => ({
        id: entry.snapshot.id,
        version: entry.snapshot.lineage?.version ?? null,
        parentId: entry.snapshot.lineage?.parentId ?? null,
        timestamp: entry.snapshot.timestamp,
        sessionId: entry.snapshot.sessionId,
        proposals: entry.snapshot.proposals?.length ?? 0,
        certified: true,
      })),
    })
  }

  return {
    status: "ok",
    kind: "SnapshotLineageReport",
    version: EXPLAIN_OBSERVABILITY_VERSION,
    snapshotsDir: ec.paths.snapshotsDir,
    present: true,
    snapshotCount: stored.length,
    certified: true,
    lineages,
  }
}

function renderSnapshots(report: any): string {
  const certifiedNote = report.certified === true ? " (all certified ✓)" : report.certified === false ? " (❌ certification failed)" : ""
  const lines = [
    `Snapshot lineage — ${report.snapshotsDir}`,
    `Snapshots: ${report.snapshotCount}${certifiedNote}  Lineages: ${report.lineages.length}`,
    "",
  ]
  if (report.note) lines.push(report.note)
  if (report.error) lines.push(`❌ ${report.error}`)
  for (const lineage of report.lineages as any[]) {
    lines.push(`Lineage ${lineage.lineageId ?? "(unversioned)"} — latest ${lineage.latest}`)
    for (const version of lineage.versions as any[]) {
      const parent = version.parentId ? ` ← parent ${version.parentId}` : " (root)"
      lines.push(`  - v${version.version ?? "?"} ${version.id}${parent} — ${version.proposals} proposal(s), certified ✓`)
    }
  }
  return lines.join("\n")
}

// ============================================================
// 4. Graph visualization
// ============================================================

function buildGraphReport(ec: ExplainContext): Record<string, unknown> {
  const { roots, nodes } = buildAggregateTree(ec)
  const flat: AggregateNode[] = []
  const visit = (node: AggregateNode) => {
    flat.push(node)
    node.children.forEach(visit)
  }
  roots.forEach(visit)

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const expectedParentKind: Partial<Record<AggregateNode["kind"], AggregateNode["kind"]>> = {
    expedition: "mission",
    objective: "expedition",
    generatedWorkItem: "objective",
  }
  const edges = []
  for (const node of flat) {
    if (!node.parentId) continue
    const parent = byId.get(node.parentId)
    edges.push({
      from: node.id,
      to: node.parentId,
      relation: "parent",
      resolved: parent !== undefined && parent.kind === expectedParentKind[node.kind],
    })
  }

  return {
    status: "ok",
    kind: "AggregateGraphView",
    version: EXPLAIN_OBSERVABILITY_VERSION,
    log: ec.paths.logDisplay,
    eventCount: ec.events.length,
    valid: ec.graph.result === "valid",
    nodeCount: flat.length,
    edgeCount: edges.length,
    resolvedEdges: edges.filter((e) => e.resolved).length,
    violationCount: ec.graph.violations.length,
    violationsByKind: rollupByKind(ec.graph.violations),
    nodes: flat.map((node) => ({
      id: node.id,
      kind: node.kind,
      name: node.name,
      status: node.status,
      parentId: node.parentId ?? null,
      inState: node.inState,
      violations: node.violations.map((v) => v.kind),
    })),
    edges,
    violations: ec.graph.violations,
  }
}

function renderGraph(report: any): string {
  const lines = [
    `Aggregate graph — ${report.log}`,
    `Nodes: ${report.nodeCount}  Edges: ${report.edgeCount} (resolved: ${report.resolvedEdges}, broken: ${report.edgeCount - report.resolvedEdges})  Violations: ${report.violationCount}`,
    "",
    "Nodes:",
  ]
  if (report.nodes.length === 0) lines.push("  (no aggregates in log)")
  for (const node of report.nodes as any[]) {
    const marker = node.violations.length > 0 ? "✗" : "✓"
    const parent = node.parentId ? ` → ${node.parentId}` : ""
    lines.push(`  ${marker} ${node.kind} ${node.id} "${node.name}" [${node.status}]${parent}`)
  }
  if (report.edges.length > 0) {
    lines.push("", "Edges:")
    for (const edge of report.edges as any[]) {
      lines.push(`  ${edge.resolved ? "✓" : "✗"} ${edge.from} -[parent]-> ${edge.to}${edge.resolved ? "" : " (unresolved)"}`)
    }
  }
  lines.push("", "Violations by kind:")
  const rollup = Object.entries(report.violationsByKind as Record<string, number>)
  if (rollup.length === 0) lines.push("  (none)")
  for (const [kind, count] of rollup) {
    lines.push(`  ${kind}: ${count}`)
  }
  return lines.join("\n")
}

// ============================================================
// 5+6. Relationship + replay diagnostics
// ============================================================

function buildDiagnosticsReport(ec: ExplainContext): Record<string, unknown> {
  return {
    status: "ok",
    kind: "ExplainDiagnostics",
    version: EXPLAIN_OBSERVABILITY_VERSION,
    log: ec.paths.logDisplay,
    eventCount: ec.events.length,
    relationships: {
      valid: ec.graph.violations.length === 0,
      violationCount: ec.graph.violations.length,
      byKind: rollupByKind(ec.graph.violations),
      violations: ec.graph.violations,
    },
    replay: ec.attribution,
  }
}

function renderDiagnostics(report: any, summary: boolean): string {
  const rel = report.relationships
  const lines = [
    `Relationship diagnostics — ${report.log}`,
    `Violations: ${rel.violationCount}`,
    "By kind:",
  ]
  const rollup = Object.entries(rel.byKind as Record<string, number>)
  if (rollup.length === 0) lines.push("  (none)")
  for (const [kind, count] of rollup) {
    lines.push(`  ${kind}: ${count}`)
  }
  if (!summary && rel.violations.length > 0) {
    lines.push(`First ${Math.min(10, rel.violations.length)}:`)
    for (const violation of (rel.violations as GraphIntegrityViolation[]).slice(0, 10)) {
      lines.push(`  - [${violation.kind}] ${violation.message}`)
    }
    if (rel.violations.length > 10) lines.push(`  ... and ${rel.violations.length - 10} more (--json for all)`)
  }

  const replay = report.replay as ReplayAttributionReport
  lines.push(
    "",
    "Replay diagnostics — which events wrote which state fields",
    `Events: ${replay.eventCount} (${replay.attributedEvents} attributed, ${replay.unattributedEvents} unattributed)`,
  )
  for (const projection of replay.projections) {
    lines.push(`  ${projection.projection}: ${projection.aggregates} aggregate(s), ${projection.writes} write(s)`)
  }
  if (replay.projections.length === 0) lines.push("  (no state-field writes)")
  if (!summary && replay.attribution.length > 0) {
    lines.push(`Attribution (first ${Math.min(10, replay.attribution.length)} of ${replay.attribution.length}):`)
    for (const entry of replay.attribution.slice(0, 10)) {
      const created = entry.createdBy ? `#${entry.createdBy.index} ${entry.createdBy.type}` : "(no creation event)"
      const last = entry.lastWrittenBy ? `#${entry.lastWrittenBy.index} ${entry.lastWrittenBy.type}` : "(none)"
      lines.push(`  - ${entry.projection}/${entry.aggregateId}: created by ${created}; last write ${last}; ${entry.writeCount} write(s)`)
    }
    if (replay.attribution.length > 10) lines.push(`  ... and ${replay.attribution.length - 10} more (--json for all)`)
  }
  return lines.join("\n")
}

// ============================================================
// 7. Validation dashboard
// ============================================================

async function buildStatusReport(ec: ExplainContext): Promise<Record<string, unknown>> {
  const verifier = createReplayVerifier(ec.infra.eventStore, ec.infra.stateStore)
  const replay = await verifier.verify()

  const invariants = { pass: 0, fail: 0, notEventProvable: 0 }
  for (const invariant of ec.graph.invariants) {
    if (invariant.status === "pass") invariants.pass += 1
    else if (invariant.status === "fail") invariants.fail += 1
    else invariants.notEventProvable += 1
  }

  const snapshots = await loadSnapshots(ec.paths.snapshotsDir)
  const snapshotSection = {
    present: snapshots.present,
    snapshotCount: snapshots.stored?.length ?? 0,
    certified: snapshots.present ? snapshots.error === null : null,
    error: snapshots.error ?? null,
  }

  const verdict =
    !replay.consistent || !replay.chainValid || snapshotSection.certified === false
      ? "fail"
      : ec.graph.result === "invalid"
        ? "warn"
        : "pass"

  return {
    status: "ok",
    kind: "ExplainStatus",
    version: EXPLAIN_OBSERVABILITY_VERSION,
    log: ec.paths.logDisplay,
    snapshotsDir: ec.paths.snapshotsDir,
    eventCount: ec.events.length,
    replay: {
      consistent: replay.consistent,
      chainValid: replay.chainValid,
      liveHash: replay.liveHash,
      replayHash: replay.replayHash,
      eventCount: replay.eventCount,
    },
    graphIntegrity: {
      result: ec.graph.result,
      violations: ec.graph.violations.length,
      invariants,
    },
    snapshots: snapshotSection,
    verdict,
  }
}

function renderStatus(report: any, summary: boolean): string {
  const replay = report.replay
  const graph = report.graphIntegrity
  const snapshots = report.snapshots
  if (summary) {
    return `${String(report.verdict).toUpperCase()} — replay ${replay.consistent ? "consistent" : "INCONSISTENT"}, graph ${graph.result} (${graph.violations} violation(s)), snapshots ${snapshots.present ? (snapshots.certified ? "certified" : "FAILED") : "none"}`
  }
  const replayText = replay.consistent ? "consistent ✓" : "INCONSISTENT ❌"
  const chainText = replay.chainValid ? "chain valid ✓" : "chain BROKEN ❌"
  const graphText =
    graph.result === "valid" ? "valid ✓" : `❌ ${graph.result} — ${graph.violations} violation(s)`
  const snapshotText = !snapshots.present
    ? `none persisted (${report.snapshotsDir})`
    : snapshots.certified
      ? `${snapshots.snapshotCount} snapshot(s), all certified ✓`
      : `❌ certification failed: ${snapshots.error}`
  return [
    `Validation status — ${report.log}`,
    `  Replay:          ${replayText} (${chainText}) — ${replay.eventCount} events`,
    `  Graph integrity: ${graphText}; invariants: ${graph.invariants.pass} pass / ${graph.invariants.fail} fail / ${graph.invariants.notEventProvable} not-event-provable`,
    `  Snapshots:       ${snapshotText}`,
    `  Verdict:         ${String(report.verdict).toUpperCase()}`,
  ].join("\n")
}

// ============================================================
// Umbrella: synth explain all
// ============================================================

async function explainAll(ec: ExplainContext, json: boolean, summary: boolean) {
  const lineage = buildLineageReport(ec)
  const graph = buildGraphReport(ec)
  const diagnostics = buildDiagnosticsReport(ec)
  const status = await buildStatusReport(ec)

  // Snapshot-dependent sections must not abort the umbrella when the
  // store is absent; a certification failure is embedded as a finding
  // (and already fails the status verdict).
  const snapshotsLoad = await loadSnapshots(ec.paths.snapshotsDir)
  let snapshots: any
  let proposals: any
  if (snapshotsLoad.error) {
    snapshots = {
      status: "ok",
      kind: "SnapshotLineageReport",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      snapshotsDir: ec.paths.snapshotsDir,
      present: true,
      snapshotCount: 0,
      certified: false,
      lineages: [],
      error: snapshotsLoad.error,
    }
    proposals = {
      status: "ok",
      kind: "ProposalLineage",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      snapshotsDir: ec.paths.snapshotsDir,
      snapshotCount: 0,
      proposalCount: 0,
      proposals: [],
      error: snapshotsLoad.error,
    }
  } else {
    snapshots = await buildSnapshotsReport(ec)
    proposals = await buildProposalsReport(ec)
  }

  if (json) {
    printJson({
      status: "ok",
      kind: "ExplainOverview",
      version: EXPLAIN_OBSERVABILITY_VERSION,
      log: ec.paths.logDisplay,
      eventCount: ec.events.length,
      verdict: (status as any).verdict,
      statusReport: status,
      lineage: lineage.report,
      graph,
      snapshots,
      proposals,
      diagnostics,
    })
    return
  }

  const sections = [
    renderStatus(status, summary),
    "",
    renderLineage(lineage),
    "",
    renderGraph(graph),
    "",
    renderSnapshots(snapshots),
    "",
    renderProposals(proposals),
    "",
    renderDiagnostics(diagnostics, summary),
  ]
  console.log(sections.join("\n"))
}

// ============================================================
// Dispatcher
// ============================================================

const USAGE =
  "Usage: synth explain <replay|lineage|proposals|snapshots|graph|diagnostics|status|all> [--log <path>] [--json] [--summary]"

export async function cmdExplainObservability(
  sub: string | undefined,
  flags: Record<string, string | boolean>,
): Promise<void> {
  if (!sub || !["lineage", "proposals", "snapshots", "graph", "diagnostics", "status", "all"].includes(sub)) {
    printError(USAGE)
  }

  // Migrate legacy data/ into .synth/data/ for governed projects before
  // resolving any default paths.
  await ensureDataDir(root())

  const json = flagOn(flags, "json")
  const summary = flagOn(flags, "summary")
  const ec = await loadExplainContext(flags)

  switch (sub) {
    case "lineage": {
      const build = buildLineageReport(ec)
      if (json) printJson(build.report)
      else console.log(renderLineage(build))
      break
    }
    case "proposals": {
      const report = await buildProposalsReport(ec)
      if (json) printJson(report)
      else console.log(renderProposals(report))
      break
    }
    case "snapshots": {
      const report = await buildSnapshotsReport(ec)
      if (json) printJson(report)
      else console.log(renderSnapshots(report))
      break
    }
    case "graph": {
      const report = buildGraphReport(ec)
      if (json) printJson(report)
      else console.log(renderGraph(report))
      break
    }
    case "diagnostics": {
      const report = buildDiagnosticsReport(ec)
      if (json) printJson(report)
      else console.log(renderDiagnostics(report, summary))
      break
    }
    case "status": {
      const report = await buildStatusReport(ec)
      if (json) printJson(report)
      else console.log(renderStatus(report, summary))
      break
    }
    case "all": {
      await explainAll(ec, json, summary)
      break
    }
  }
}
