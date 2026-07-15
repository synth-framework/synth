// ============================================================
// GENESIS: Intake Certification (EXP-HARDEN-003)
// ============================================================
// Genesis does not trust its callers. Before any seed event is
// committed through the ExecutionGate, Genesis validates the
// snapshot (when one is present) and the seed event graph, and
// produces a certification report describing every rule that ran.
// After a certified commit, a deterministic integrity proof is
// derived from the committed hash chain.
//
// Rules:
//   - snapshot-acceptance  required fields, duplicate identities,
//                          and proposal parent references (reuses
//                          the Mission Studio proposal graph validator)
//   - snapshot-signature   content signature self-consistency
//                          (reuses Mission Studio snapshot integrity)
//   - seed-event-graph     the mission/expedition/objective graph
//                          carried by the seed events is connected,
//                          acyclic, and free of orphans
// ============================================================

import type { ApprovedMissionModelSnapshot, Proposal } from "../mission-studio/types.js"
import { validateProposalGraph } from "../mission-studio/proposal-graph-validator.js"
import { signSnapshot, SNAPSHOT_SCHEMA_VERSION } from "../mission-studio/snapshot-integrity.js"
import { sha256 } from "../core/hash.js"

// ============================================================
// Types
// ============================================================

/** Minimal event shape the certifier needs (canonical events qualify). */
export type SeedEventLike = {
  type: string
  payload: unknown
}

export type GenesisCertificationRule = {
  rule: string
  status: "pass" | "fail"
  violations: string[]
}

export type SeedEventGraphSummary = {
  missions: number
  expeditions: number
  objectives: number
  nodes: number
  edges: number
  roots: number
}

export type GenesisCertificationReport = {
  kind: "genesis-certification-report"
  version: 1
  snapshotId?: string
  result: "certified" | "rejected"
  rules: GenesisCertificationRule[]
  counts: {
    missions: number
    expeditions: number
    objectives: number
    seedEvents: number
  }
  graph: SeedEventGraphSummary
  warnings: string[]
  violations: string[]
}

export type GenesisIntegrityProof = {
  kind: "genesis-integrity-proof"
  version: 1
  snapshotId?: string
  result: "certified" | "rejected"
  eventCount: number
  firstEventHash: string | null
  finalEventHash: string | null
  /** SHA-256 over the ordered list of committed event hashes. */
  chainDigest: string
  graph: SeedEventGraphSummary
  /** SHA-256 over the certification report content. */
  certificationDigest: string
}

// ============================================================
// Snapshot Acceptance Validator
// ============================================================

/**
 * Validate a snapshot presented for Genesis intake.
 *
 * Genesis must not trust that the snapshot passed Mission Studio
 * approval, so every check runs again here. Returns a list of
 * violations; empty means the snapshot is accepted.
 *
 * Violations:
 *   - missing or malformed required snapshot fields
 *   - proposal with missing required fields (id, name, and the
 *     kind-specific fields the snapshot bridge maps into events)
 *   - invalid parent references and duplicate identities
 *     (via the Mission Studio proposal graph validator)
 */
export function validateSnapshotAcceptance(snapshot: ApprovedMissionModelSnapshot): string[] {
  const violations: string[] = []

  if (!snapshot || typeof snapshot !== "object") {
    return ["Snapshot is not an object"]
  }
  if (typeof snapshot.id !== "string" || snapshot.id.length === 0) {
    violations.push("Snapshot id is missing or not a string")
  }
  if (snapshot.version !== SNAPSHOT_SCHEMA_VERSION) {
    violations.push(`Unknown snapshot schema version: ${String(snapshot.version)}`)
  }
  if (typeof snapshot.sessionId !== "string" || snapshot.sessionId.length === 0) {
    violations.push("Snapshot sessionId is missing or not a string")
  }
  if (typeof snapshot.timestamp !== "number" || !Number.isFinite(snapshot.timestamp)) {
    violations.push("Snapshot timestamp is missing or not a finite number")
  }
  if (!snapshot.worldModel || typeof snapshot.worldModel !== "object") {
    violations.push("Snapshot worldModel is missing or not an object")
  } else if (!(snapshot.worldModel.nodes instanceof Map)) {
    violations.push("Snapshot worldModel.nodes is missing or not a Map")
  }
  if (!Array.isArray(snapshot.proposals)) {
    violations.push("Snapshot proposals is missing or not an array")
    return violations
  }

  snapshot.proposals.forEach((proposal, index) => {
    violations.push(...validateProposalRequiredFields(proposal, index))
  })
  violations.push(...validateProposalGraph(snapshot.proposals))

  return violations
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function validateProposalRequiredFields(proposal: Proposal, index: number): string[] {
  const violations: string[] = []

  if (!proposal || typeof proposal !== "object") {
    return [`Proposal at index ${index} is not an object`]
  }

  const label = isNonEmptyString(proposal.id) ? proposal.id : `at index ${index}`
  if (!isNonEmptyString(proposal.id)) {
    violations.push(`Proposal at index ${index} is missing required field: id`)
  }
  if (!isNonEmptyString(proposal.name)) {
    violations.push(`Proposal ${label} is missing required field: name`)
  }

  // The snapshot bridge falls back to description (and to name for
  // objective titles), so a field is only missing when no fallback
  // exists either.
  switch (proposal.kind) {
    case "mission":
      if (!isNonEmptyString(proposal.purpose) && !isNonEmptyString(proposal.description)) {
        violations.push(`Mission proposal ${label} is missing required field: purpose`)
      }
      break
    case "expedition":
      if (!isNonEmptyString(proposal.goal) && !isNonEmptyString(proposal.description)) {
        violations.push(`Expedition proposal ${label} is missing required field: goal`)
      }
      break
    case "objective":
      if (!isNonEmptyString(proposal.title) && !isNonEmptyString(proposal.name)) {
        violations.push(`Objective proposal ${label} is missing required field: title`)
      }
      break
    case "discovery":
    case "decision":
      break
    default:
      violations.push(`Proposal ${label} has unknown kind: ${String((proposal as { kind?: unknown }).kind)}`)
  }

  return violations
}

// ============================================================
// Snapshot Signature Verification
// ============================================================

/**
 * Verify that a snapshot's content signature is self-consistent.
 * Works on the snapshot object itself — no stored record or planning
 * session is required, so in-memory handoffs are covered.
 *
 * A snapshot with a lineage parent mixes the parent's signature into
 * its own; without the parent snapshot the chain is unverifiable, so
 * that case is reported as a warning rather than a violation.
 */
function verifySnapshotSignature(snapshot: ApprovedMissionModelSnapshot): {
  violations: string[]
  warnings: string[]
} {
  const violations: string[] = []
  const warnings: string[] = []

  if (typeof snapshot.signature !== "string" || !/^[0-9a-f]{64}$/.test(snapshot.signature)) {
    violations.push("Snapshot signature is missing or not a SHA-256 hex digest")
    return { violations, warnings }
  }

  if (snapshot.lineage && snapshot.lineage.parentId !== undefined) {
    warnings.push(
      "Snapshot has a lineage parent; signature chain is not verifiable at intake without the parent snapshot",
    )
    return { violations, warnings }
  }

  // Recomputation is only meaningful when the covered content is
  // well-formed enough to serialize.
  if (snapshot.worldModel && typeof snapshot.worldModel === "object" && Array.isArray(snapshot.proposals)) {
    const expected = signSnapshot(snapshot)
    if (expected !== snapshot.signature) {
      violations.push("Snapshot signature does not match its content")
    }
  }

  return { violations, warnings }
}

// ============================================================
// Seed Event Graph Certification
// ============================================================

type SeedGraphNode = {
  id: string
  kind: "mission" | "expedition" | "objective"
  parentId?: string
}

function entityPayload(
  event: SeedEventLike,
  key: string,
): { id?: unknown; missionId?: unknown; expeditionId?: unknown } | undefined {
  const payload = event.payload
  if (!payload || typeof payload !== "object") return undefined
  const value = (payload as Record<string, unknown>)[key]
  if (!value || typeof value !== "object") return undefined
  return value as { id?: unknown; missionId?: unknown; expeditionId?: unknown }
}

function addGraphNode(nodes: Map<string, SeedGraphNode>, node: SeedGraphNode, violations: string[]): void {
  const existing = nodes.get(node.id)
  if (existing) {
    violations.push(
      existing.kind === node.kind
        ? `Duplicate ${node.kind} identity in seed event graph: ${node.id}`
        : `Seed event graph identity ${node.id} is used as both ${existing.kind} and ${node.kind}`,
    )
    return
  }
  nodes.set(node.id, node)
}

/**
 * Certify the mission/expedition/objective graph carried by a set of
 * seed events. Every expedition must reference a mission present in
 * the same graph, every objective must reference an expedition
 * present in the same graph, every node must be reachable from a
 * mission root, and the graph must be acyclic.
 */
export function certifySeedEventGraph(seedEvents: SeedEventLike[]): {
  violations: string[]
  graph: SeedEventGraphSummary
} {
  const violations: string[] = []
  const nodes = new Map<string, SeedGraphNode>()

  for (const event of seedEvents) {
    if (event.type === "MISSION_CREATED") {
      const id = entityPayload(event, "mission")?.id
      if (!isNonEmptyString(id)) {
        violations.push("MISSION_CREATED event is missing its mission payload id")
        continue
      }
      addGraphNode(nodes, { id, kind: "mission" }, violations)
    } else if (event.type === "EXPEDITION_CREATED") {
      const expedition = entityPayload(event, "expedition")
      const id = expedition?.id
      if (!isNonEmptyString(id)) {
        violations.push("EXPEDITION_CREATED event is missing its expedition payload id")
        continue
      }
      const missionId = expedition?.missionId
      addGraphNode(
        nodes,
        { id, kind: "expedition", parentId: isNonEmptyString(missionId) ? missionId : undefined },
        violations,
      )
    } else if (event.type === "OBJECTIVE_ADDED") {
      const objective = entityPayload(event, "objective")
      const id = objective?.id
      if (!isNonEmptyString(id)) {
        violations.push("OBJECTIVE_ADDED event is missing its objective payload id")
        continue
      }
      const expeditionId = objective?.expeditionId
      addGraphNode(
        nodes,
        { id, kind: "objective", parentId: isNonEmptyString(expeditionId) ? expeditionId : undefined },
        violations,
      )
    }
  }

  // Parent references must resolve to a node of the expected kind.
  for (const node of nodes.values()) {
    if (node.kind === "mission") continue
    const parentKind = node.kind === "expedition" ? "mission" : "expedition"
    const eventType = node.kind === "expedition" ? "EXPEDITION_CREATED" : "OBJECTIVE_ADDED"
    if (!node.parentId) {
      violations.push(`${eventType} ${node.id} has no ${parentKind} parent`)
      continue
    }
    const parent = nodes.get(node.parentId)
    if (!parent) {
      violations.push(`${eventType} ${node.id} references unknown ${parentKind} ${node.parentId}`)
    } else if (parent.kind !== parentKind) {
      violations.push(`${eventType} ${node.id} parent ${node.parentId} is a ${parent.kind}, not a ${parentKind}`)
    }
  }

  // Cycles: follow parent pointers with a seen-set.
  for (const node of nodes.values()) {
    const seen = new Set<string>([node.id])
    let current = node
    while (current.parentId) {
      const parent = nodes.get(current.parentId)
      if (!parent) break
      if (seen.has(parent.id)) {
        violations.push(`Seed event graph contains a cycle reaching ${parent.id}`)
        break
      }
      seen.add(parent.id)
      current = parent
    }
  }

  // Reachability: every node must be reachable from a mission root.
  const roots = Array.from(nodes.values()).filter((node) => node.kind === "mission")
  const children = new Map<string, string[]>()
  let edges = 0
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      edges += 1
      const siblings = children.get(node.parentId) || []
      siblings.push(node.id)
      children.set(node.parentId, siblings)
    }
  }
  const reachable = new Set<string>()
  const queue = roots.map((node) => node.id)
  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue
    reachable.add(current)
    for (const child of children.get(current) || []) {
      queue.push(child)
    }
  }
  for (const node of nodes.values()) {
    if (!reachable.has(node.id)) {
      violations.push(`Seed event graph node ${node.id} (${node.kind}) is not reachable from any mission root`)
    }
  }

  const graph: SeedEventGraphSummary = {
    missions: roots.length,
    expeditions: Array.from(nodes.values()).filter((node) => node.kind === "expedition").length,
    objectives: Array.from(nodes.values()).filter((node) => node.kind === "objective").length,
    nodes: nodes.size,
    edges,
    roots: roots.length,
  }

  return { violations, graph }
}

// ============================================================
// Certification Report
// ============================================================

/**
 * Run every Genesis intake rule and produce the certification report.
 * The report is deterministic: it contains no wall-clock fields, so
 * identical inputs always produce an identical report.
 */
export function certifyGenesisIntake(input: {
  snapshot?: ApprovedMissionModelSnapshot
  seedEvents: SeedEventLike[]
}): GenesisCertificationReport {
  const rules: GenesisCertificationRule[] = []
  const warnings: string[] = []

  if (input.snapshot !== undefined) {
    const acceptanceViolations = validateSnapshotAcceptance(input.snapshot)
    rules.push({
      rule: "snapshot-acceptance",
      status: acceptanceViolations.length === 0 ? "pass" : "fail",
      violations: acceptanceViolations,
    })

    const signature = verifySnapshotSignature(input.snapshot)
    rules.push({
      rule: "snapshot-signature",
      status: signature.violations.length === 0 ? "pass" : "fail",
      violations: signature.violations,
    })
    warnings.push(...signature.warnings)

    if (
      Array.isArray(input.snapshot.proposals) &&
      !input.snapshot.proposals.some((proposal) => proposal && proposal.kind === "mission")
    ) {
      warnings.push("Snapshot contains no mission proposals")
    }
  }

  const graphResult = certifySeedEventGraph(input.seedEvents)
  rules.push({
    rule: "seed-event-graph",
    status: graphResult.violations.length === 0 ? "pass" : "fail",
    violations: graphResult.violations,
  })

  const violations = rules.flatMap((rule) => rule.violations)
  const { graph } = graphResult

  return {
    kind: "genesis-certification-report",
    version: 1,
    snapshotId:
      input.snapshot && isNonEmptyString(input.snapshot.id) ? input.snapshot.id : undefined,
    result: violations.length === 0 ? "certified" : "rejected",
    rules,
    counts: {
      missions: graph.missions,
      expeditions: graph.expeditions,
      objectives: graph.objectives,
      seedEvents: input.seedEvents.length,
    },
    graph,
    warnings,
    violations,
  }
}

// ============================================================
// Integrity Proof
// ============================================================

/**
 * Build the integrity proof for a certified Genesis intake. The proof
 * binds the committed hash chain (via its ordered event hashes) to
 * the certification report (via its content digest), so any later
 * tampering with either is detectable by recomputation.
 */
export function buildGenesisIntegrityProof(input: {
  report: GenesisCertificationReport
  events: Array<{ eventHash: string }>
}): GenesisIntegrityProof {
  const eventHashes = input.events.map((event) => event.eventHash)
  const { report } = input

  return {
    kind: "genesis-integrity-proof",
    version: 1,
    snapshotId: report.snapshotId,
    result: report.result,
    eventCount: eventHashes.length,
    firstEventHash: eventHashes.length > 0 ? eventHashes[0] : null,
    finalEventHash: eventHashes.length > 0 ? eventHashes[eventHashes.length - 1] : null,
    chainDigest: sha256(eventHashes),
    graph: report.graph,
    certificationDigest: sha256({
      kind: report.kind,
      version: report.version,
      snapshotId: report.snapshotId,
      result: report.result,
      rules: report.rules,
      counts: report.counts,
      graph: report.graph,
      warnings: report.warnings,
      violations: report.violations,
    }),
  }
}
