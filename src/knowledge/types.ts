// ============================================================
// KNOWLEDGE: Canonical Knowledge Graph Types
// ============================================================
// Shared types for the Canonical Knowledge Model (EXP-KNOWLEDGE-001).
// Aligns with the Synth Knowledge Representation (SKR) defined in
// docs/architecture/decisions/ADR-0012-canonical-knowledge-representation.md.
// ============================================================

import type { DomainModel } from "../semantic-modeling/domain/types.js"
import type { IntentModel } from "../semantic-modeling/intent/types.js"

export type ConfidenceScore = number

export type SKRNodeType =
  | "Mission"
  | "Expedition"
  | "Objective"
  | "WorkItem"
  | "Discovery"
  | "Decision"
  | "Artifact"
  | "Observation"
  | "Constraint"

export type SKREdgeType =
  | "depends_on"
  | "implements"
  | "supports"
  | "derived_from"
  | "discovers"
  | "produces"
  | "invalidates"
  | "blocks"
  | "relates_to"
  | "references"

export interface KnowledgeProvenance {
  adapterId: string
  adapterVersion: string
  sourceNodeId?: string
  sourceField?: string
}

export interface KnowledgeNode {
  id: string
  type: SKRNodeType
  label: string
  description?: string
  version: string
  confidence: ConfidenceScore
  provenance: KnowledgeProvenance
  metadata?: Record<string, unknown>
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: SKREdgeType
  provenance: KnowledgeProvenance
}

export interface KnowledgeLineage {
  parentVersion?: string
  mergeVersions?: string[]
  reason?: string
}

export interface KnowledgeGraph {
  schema: "synth-knowledge-graph-v1"
  version: string
  generatedAt: string
  lineage: KnowledgeLineage
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export interface MissionProjection {
  id: string
  subject: string
  purpose: string
  derivedFrom: string[]
  objectives: string[]
}

export interface ExpeditionProjection {
  id: string
  missionId: string
  subject: string
  goal: string
  derivedFrom: string[]
}

export interface AdrProjection {
  id: string
  title: string
  context: string
  decision: string
  consequences: string[]
  derivedFrom: string[]
}

export interface DocumentationProjection {
  id: string
  title: string
  sections: string[]
  derivedFrom: string[]
}

export interface KnowledgeProjections {
  mission?: MissionProjection
  expeditions: ExpeditionProjection[]
  adrs: AdrProjection[]
  documentation: DocumentationProjection[]
}

export type DriftClass =
  | "DOCUMENTATION_DRIFT"
  | "ARCHITECTURE_DRIFT"
  | "REQUIREMENTS_DRIFT"
  | "UNKNOWN_INTRODUCED"

export interface DriftFinding {
  id: string
  class: DriftClass
  message: string
  nodeIds: string[]
  severity: "warning" | "error"
}

export interface KnowledgeModelingOptions {
  intentModel: IntentModel
  domainModel: DomainModel
}

export interface KnowledgeModelingAdapter {
  readonly id: string
  readonly version: string
  buildGraph(options: KnowledgeModelingOptions): KnowledgeGraph
  project(graph: KnowledgeGraph): KnowledgeProjections
  detectDrift(graph: KnowledgeGraph, snapshot: KnowledgeProjections): DriftFinding[]
}
