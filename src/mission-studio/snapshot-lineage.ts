// ============================================================
// MISSION STUDIO: Snapshot Lineage
// ============================================================
// Build lineage, diff snapshots, and reconstruct PlanningSessions
// from stored snapshot history.
// ============================================================

import crypto from "crypto"
import type {
  ApprovedMissionModelSnapshot,
  PlanningSession,
  SnapshotLineage,
  StoredSnapshot,
  WorldModelNode,
  WorldModelEdge,
  PlanningDecision,
} from "./types.js"
import type { SnapshotStore } from "./snapshot-store.js"

// ============================================================
// Lineage Construction
// ============================================================

/**
 * Attach lineage metadata to a snapshot.
 *
 * If a parent snapshot is provided, the child inherits the lineage id and
 * increments the version. Otherwise a new lineage is started at version 1.
 */
export function buildSnapshotLineage(
  snapshot: ApprovedMissionModelSnapshot,
  parent?: ApprovedMissionModelSnapshot,
  actor?: string,
): SnapshotLineage {
  if (parent?.lineage) {
    return {
      lineageId: parent.lineage.lineageId,
      version: parent.lineage.version + 1,
      parentId: parent.id,
      approvedAt: snapshot.timestamp,
      approvedBy: actor,
    }
  }

  return {
    lineageId: deriveLineageId(snapshot),
    version: 1,
    approvedAt: snapshot.timestamp,
    approvedBy: actor,
  }
}

function deriveLineageId(snapshot: ApprovedMissionModelSnapshot): string {
  const seed = `${snapshot.sessionId}-${snapshot.timestamp}`
  return hash(seed)
}

// ============================================================
// Diff
// ============================================================

export type NodeChange = {
  kind: "added" | "removed" | "changed"
  nodeId: string
  nodeKind: string
  name?: string
  fields?: Record<string, { before: unknown; after: unknown }>
}

export type EdgeChange = {
  kind: "added" | "removed"
  edgeId: string
  source: string
  target: string
  relation: string
}

export type DecisionChange = {
  kind: "added"
  decisionId: string
  type: string
}

export type SnapshotDiff = {
  fromId: string
  toId: string
  nodes: NodeChange[]
  edges: EdgeChange[]
  decisions: DecisionChange[]
  confidence?: { before: number; after: number }
}

/**
 * Compute a canonical diff between two snapshots.
 */
export function diffSnapshots(
  from: ApprovedMissionModelSnapshot,
  to: ApprovedMissionModelSnapshot,
): SnapshotDiff {
  const nodes: NodeChange[] = []
  const fromNodes = from.worldModel.nodes
  const toNodes = to.worldModel.nodes

  for (const [id, node] of toNodes) {
    if (!fromNodes.has(id)) {
      nodes.push({ kind: "added", nodeId: id, nodeKind: node.kind, name: node.name })
    } else {
      const before = fromNodes.get(id) as WorldModelNode
      const changedFields = diffNodeFields(before, node)
      if (Object.keys(changedFields).length > 0) {
        nodes.push({
          kind: "changed",
          nodeId: id,
          nodeKind: node.kind,
          name: node.name,
          fields: changedFields,
        })
      }
    }
  }

  for (const [id, node] of fromNodes) {
    if (!toNodes.has(id)) {
      nodes.push({ kind: "removed", nodeId: id, nodeKind: node.kind, name: node.name })
    }
  }

  const edges: EdgeChange[] = []
  const edgeId = (e: WorldModelEdge) => e.id
  const fromEdges = new Map(from.worldModel.edges.map((e) => [edgeId(e), e]))
  const toEdges = new Map(to.worldModel.edges.map((e) => [edgeId(e), e]))

  for (const [id, edge] of toEdges) {
    if (!fromEdges.has(id)) {
      edges.push({ kind: "added", edgeId: id, source: edge.source, target: edge.target, relation: edge.relation })
    }
  }

  for (const [id, edge] of fromEdges) {
    if (!toEdges.has(id)) {
      edges.push({ kind: "removed", edgeId: id, source: edge.source, target: edge.target, relation: edge.relation })
    }
  }

  const decisions: DecisionChange[] = []
  const fromDecisions = new Map(from.worldModel.planningDecisions.map((d) => [d.id, d]))

  for (const decision of to.worldModel.planningDecisions) {
    if (!fromDecisions.has(decision.id)) {
      decisions.push({ kind: "added", decisionId: decision.id, type: decision.type })
    }
  }

  const diff: SnapshotDiff = {
    fromId: from.id,
    toId: to.id,
    nodes,
    edges,
    decisions,
  }

  if (from.worldModel.confidence.overall !== to.worldModel.confidence.overall) {
    diff.confidence = {
      before: from.worldModel.confidence.overall,
      after: to.worldModel.confidence.overall,
    }
  }

  return diff
}

function diffNodeFields(
  before: WorldModelNode,
  after: WorldModelNode,
): Record<string, { before: unknown; after: unknown }> {
  const fields: Record<string, { before: unknown; after: unknown }> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of keys) {
    if (key === "metadata" && typeof before.metadata === "object" && typeof after.metadata === "object") continue
    const b = (before as any)[key]
    const a = (after as any)[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      fields[key] = { before: b, after: a }
    }
  }

  return fields
}

// ============================================================
// Reconstruction
// ============================================================

/**
 * Reconstruct a PlanningSession from a stored snapshot.
 *
 * The session that produced the snapshot is stored alongside it, so
 * reconstruction is faithful. Walking lineage ensures the snapshot exists
 * in the store.
 */
export async function reconstructSessionFromSnapshot(
  store: SnapshotStore,
  snapshotId: string,
): Promise<PlanningSession | undefined> {
  const stored = await store.get(snapshotId)
  if (!stored) return undefined
  return deepCloneSession(stored.session)
}

/**
 * Walk the lineage from a snapshot back to its root.
 */
export async function getSnapshotLineage(
  store: SnapshotStore,
  snapshotId: string,
): Promise<StoredSnapshot[]> {
  const lineage: StoredSnapshot[] = []
  let currentId: string | undefined = snapshotId

  while (currentId) {
    const stored = await store.get(currentId)
    if (!stored) break
    lineage.unshift(stored)
    currentId = stored.snapshot.lineage?.parentId
  }

  return lineage
}

function deepCloneSession(session: PlanningSession): PlanningSession {
  return JSON.parse(JSON.stringify(session, replacer), reviver) as PlanningSession
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { __type: "Map", value: Array.from(value.entries()) }
  }
  return value
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && (value as any).__type === "Map") {
    return new Map((value as any).value)
  }
  return value
}

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)
}
