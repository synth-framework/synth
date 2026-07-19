// ============================================================
// KNOWLEDGE: Rule-Based Knowledge Graph Adapter
// ============================================================
// Derives a Canonical Knowledge Graph from an IntentModel and DomainModel.
// Deterministic for fixed inputs and adapter version.
// ============================================================

import crypto from "crypto"
import type {
  AdrProjection,
  DocumentationProjection,
  DriftClass,
  DriftFinding,
  ExpeditionProjection,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeLineage,
  KnowledgeModelingAdapter,
  KnowledgeModelingOptions,
  KnowledgeNode,
  KnowledgeProjections,
  MissionProjection,
  SKREdgeType,
} from "../types.js"

const ADAPTER_ID = "rule-based-knowledge-modeler"
const ADAPTER_VERSION = "1.0.0"
const GRAPH_VERSION = "1.0.0"

function stableId(...parts: string[]): string {
  const normalized = parts.map((p) => p.toLowerCase().trim()).join("|")
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16)
}

function provenance(sourceNodeId?: string, sourceField?: string) {
  return {
    adapterId: ADAPTER_ID,
    adapterVersion: ADAPTER_VERSION,
    sourceNodeId,
    sourceField,
  }
}

function createNode(
  type: KnowledgeNode["type"],
  id: string,
  label: string,
  description: string,
  confidence: number,
  sourceNodeId?: string,
  sourceField?: string,
  metadata?: Record<string, unknown>,
): KnowledgeNode {
  return {
    id,
    type,
    label,
    description,
    version: GRAPH_VERSION,
    confidence,
    provenance: provenance(sourceNodeId, sourceField),
    metadata,
  }
}

function createEdge(
  source: string,
  target: string,
  type: SKREdgeType,
  sourceNodeId?: string,
): KnowledgeEdge {
  return {
    id: stableId("edge", source, target, type),
    source,
    target,
    type,
    provenance: provenance(sourceNodeId),
  }
}

export class RuleBasedKnowledgeAdapter implements KnowledgeModelingAdapter {
  readonly id = ADAPTER_ID
  readonly version = ADAPTER_VERSION

  buildGraph(options: KnowledgeModelingOptions): KnowledgeGraph {
    const { intentModel, domainModel } = options
    const nodes: KnowledgeNode[] = []
    const edges: KnowledgeEdge[] = []

    // Mission node derived from intent.
    const missionId = stableId("mission", intentModel.derivedFrom.discoveryArtifactId ?? "unknown")
    const missionLabel = intentModel.graph.nodes.find((n) => n.type === "goal")?.label ?? "Mission"
    const missionNode = createNode(
      "Mission",
      missionId,
      missionLabel,
      `Governed mission derived from ${intentModel.derivedFrom.discoveryArtifactId ?? "unknown"}.`,
      intentModel.aggregateConfidence,
      intentModel.derivedFrom.discoveryArtifactId,
      "intent.goals",
    )
    nodes.push(missionNode)

    // Objectives from goals.
    const goalNodes = intentModel.graph.nodes.filter((n) => n.type === "goal")
    for (const goal of goalNodes) {
      const objectiveId = stableId("objective", goal.id)
      nodes.push(
        createNode("Objective", objectiveId, goal.label, `Objective derived from goal '${goal.label}'.`, goal.confidence, goal.id, "goal"),
      )
      edges.push(createEdge(missionId, objectiveId, "produces", goal.id))
    }

    // Constraints from intent.
    const constraintNodes = intentModel.graph.nodes.filter((n) => n.type === "constraint")
    for (const constraint of constraintNodes) {
      const constraintId = stableId("constraint", constraint.id)
      nodes.push(
        createNode(
          "Constraint",
          constraintId,
          constraint.label,
          `Constraint derived from intent: ${constraint.label}.`,
          constraint.confidence,
          constraint.id,
          "constraint",
        ),
      )
      edges.push(createEdge(constraintId, missionId, "restricts" as SKREdgeType, constraint.id))
    }

    // Observations from problems and unknowns.
    const observationNodes = intentModel.graph.nodes.filter((n) => n.type === "problem" || n.type === "unknown")
    for (const obs of observationNodes) {
      const obsId = stableId("observation", obs.id)
      nodes.push(
        createNode(
          "Observation",
          obsId,
          obs.label,
          `Observation derived from ${obs.type}: ${obs.label}.`,
          obs.confidence,
          obs.id,
          obs.type,
        ),
      )
      edges.push(createEdge(obsId, missionId, "relates_to", obs.id))
    }

    // Decision from selected architecture.
    const architectureName = domainModel.derivedFrom.intentModelId ?? "unknown"
    const decisionId = stableId("decision", architectureName)
    nodes.push(
      createNode(
        "Decision",
        decisionId,
        `Selected Architecture: ${architectureName}`,
        "Architecture decision recorded from the approved Genesis artifact.",
        0.9,
        architectureName,
        "selectedArchitecture",
      ),
    )
    edges.push(createEdge(decisionId, missionId, "supports", architectureName))

    // Discoveries from domain entities and events.
    for (const entity of domainModel.entities) {
      const discoveryId = stableId("discovery", entity.id)
      nodes.push(
        createNode(
          "Discovery",
          discoveryId,
          entity.name,
          `Discovered domain concept: ${entity.description}`,
          entity.confidence,
          entity.id,
          "entity",
        ),
      )
      edges.push(createEdge(discoveryId, decisionId, "derived_from", entity.id))
    }

    for (const event of domainModel.events) {
      const discoveryId = stableId("discovery", event.id)
      nodes.push(
        createNode(
          "Discovery",
          discoveryId,
          event.name,
          `Discovered domain event: ${event.description}`,
          event.confidence,
          event.id,
          "event",
        ),
      )
      edges.push(createEdge(discoveryId, decisionId, "derived_from", event.id))
    }

    // Artifacts from projections (placeholder nodes for generated docs).
    const docArtifactId = stableId("artifact", "docs", missionId)
    nodes.push(
      createNode(
        "Artifact",
        docArtifactId,
        "Project Documentation",
        "Generated documentation projection from the knowledge graph.",
        0.8,
        missionId,
        "projections",
      ),
    )
    edges.push(createEdge(missionId, docArtifactId, "produces", missionId))

    const lineage: KnowledgeLineage = {
      parentVersion: undefined,
      reason: `Initial knowledge graph derived from intent model ${intentModel.derivedFrom.discoveryArtifactId ?? "unknown"}.`,
    }

    return {
      schema: "synth-knowledge-graph-v1",
      version: GRAPH_VERSION,
      generatedAt: new Date().toISOString(),
      lineage,
      nodes,
      edges,
    }
  }

  project(graph: KnowledgeGraph): KnowledgeProjections {
    const missionNode = graph.nodes.find((n) => n.type === "Mission")
    const objectiveNodes = graph.nodes.filter((n) => n.type === "Objective")
    const discoveryNodes = graph.nodes.filter((n) => n.type === "Discovery")
    const decisionNode = graph.nodes.find((n) => n.type === "Decision")

    const mission: MissionProjection | undefined = missionNode
      ? {
          id: missionNode.id,
          subject: missionNode.label.slice(0, 80),
          purpose: `Establish deterministic governance baseline for ${missionNode.label}.`,
          derivedFrom: [missionNode.id],
          objectives: objectiveNodes.map((o) => o.id),
        }
      : undefined

    const expeditions: ExpeditionProjection[] = []
    if (missionNode) {
      expeditions.push({
        id: stableId("expedition", "baseline", missionNode.id),
        missionId: missionNode.id,
        subject: "Baseline Knowledge Capture",
        goal: "Capture approved intent, domain model, and architecture decisions as governed knowledge.",
        derivedFrom: [missionNode.id, decisionNode?.id].filter((id): id is string => !!id),
      })
      expeditions.push({
        id: stableId("expedition", "validation", missionNode.id),
        missionId: missionNode.id,
        subject: "Architecture Validation",
        goal: "Validate selected architecture assumptions and produce the first working increment.",
        derivedFrom: [decisionNode?.id, ...discoveryNodes.map((d) => d.id)].filter((id): id is string => !!id),
      })
    }

    const adrs: AdrProjection[] = []
    if (decisionNode) {
      adrs.push({
        id: stableId("adr", decisionNode.id),
        title: `ADR: ${decisionNode.label}`,
        context: "Architecture selection derived from the approved Genesis artifact and domain model.",
        decision: decisionNode.label,
        consequences: ["Domain model becomes canonical.", "Projections are derived from the knowledge graph."],
        derivedFrom: [decisionNode.id, ...discoveryNodes.map((d) => d.id)],
      })
    }

    const documentation: DocumentationProjection[] = []
    if (missionNode) {
      documentation.push({
        id: stableId("doc", "overview", missionNode.id),
        title: `${missionNode.label} — Architecture Overview`,
        sections: ["Intent", "Domain Model", "Architecture Decision", "Objectives", "Constraints"],
        derivedFrom: [missionNode.id, ...objectiveNodes.map((o) => o.id)],
      })
    }

    return {
      mission,
      expeditions,
      adrs,
      documentation,
    }
  }

  detectDrift(graph: KnowledgeGraph, snapshot: KnowledgeProjections): DriftFinding[] {
    const findings: DriftFinding[] = []

    function add(id: string, cls: DriftClass, message: string, nodeIds: string[], severity: "warning" | "error") {
      findings.push({ id, class: cls, message, nodeIds, severity })
    }

    const currentMission = graph.nodes.find((n) => n.type === "Mission")
    if (currentMission && snapshot.mission && currentMission.label !== snapshot.mission.subject) {
      add(
        stableId("drift", "mission", currentMission.id),
        "ARCHITECTURE_DRIFT",
        `Mission label '${currentMission.label}' differs from projected subject '${snapshot.mission.subject}'.`,
        [currentMission.id, snapshot.mission.id],
        "warning",
      )
    }

    const currentObjectiveIds = new Set(graph.nodes.filter((n) => n.type === "Objective").map((n) => n.id))
    const projectedObjectiveIds = new Set(snapshot.mission?.objectives ?? [])
    for (const objId of projectedObjectiveIds) {
      if (!currentObjectiveIds.has(objId)) {
        add(
          stableId("drift", "missing-objective", objId),
          "REQUIREMENTS_DRIFT",
          `Projected objective ${objId} is missing from the current knowledge graph.`,
          [objId],
          "error",
        )
      }
    }

    const currentDocIds = new Set(graph.nodes.filter((n) => n.type === "Artifact").map((n) => n.id))
    for (const doc of snapshot.documentation) {
      if (!currentDocIds.has(doc.id)) {
        add(
          stableId("drift", "missing-doc", doc.id),
          "DOCUMENTATION_DRIFT",
          `Projected documentation '${doc.title}' is missing from the knowledge graph.`,
          [doc.id],
          "warning",
        )
      }
    }

    const unknownObservations = graph.nodes.filter((n) => n.type === "Observation" && n.label.toLowerCase().includes("unknown"))
    for (const unknown of unknownObservations) {
      add(
        stableId("drift", "unknown", unknown.id),
        "UNKNOWN_INTRODUCED",
        `Unrecorded unknown '${unknown.label}' appears in the knowledge graph.`,
        [unknown.id],
        "warning",
      )
    }

    return findings
  }
}
