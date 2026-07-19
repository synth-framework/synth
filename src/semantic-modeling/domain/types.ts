// ============================================================
// SEMANTIC MODELING: Domain Model Types
// ============================================================
// Shared types for the Domain Modeling Engine (EXP-SEMANTIC-002).
// The Domain Model is a canonical, implementation-independent
// representation of the problem space derived from an Intent Model.
// ============================================================

import type { IntentModel } from "../intent/types.js"

export type ConfidenceScore = number

export interface Entity {
  id: string
  name: string
  description: string
  confidence: ConfidenceScore
  evidence: string[]
}

export interface ValueObject {
  id: string
  name: string
  description: string
  ownedBy?: string
  confidence: ConfidenceScore
  evidence: string[]
}

export interface Aggregate {
  id: string
  name: string
  rootEntityId: string
  entityIds: string[]
  confidence: ConfidenceScore
  evidence: string[]
}

export interface DomainRelationship {
  id: string
  source: string
  target: string
  type: string
  confidence: ConfidenceScore
  evidence: string[]
}

export interface Invariant {
  id: string
  name: string
  description: string
  affectedEntityIds: string[]
  confidence: ConfidenceScore
  evidence: string[]
}

export interface Policy {
  id: string
  name: string
  description: string
  appliesTo: string[]
  confidence: ConfidenceScore
  evidence: string[]
}

export interface BoundedContext {
  id: string
  name: string
  owner?: string
  entityIds: string[]
  relationships: string[]
  confidence: ConfidenceScore
  evidence: string[]
}

export interface DomainEvent {
  id: string
  name: string
  description: string
  emittedBy?: string
  confidence: ConfidenceScore
  evidence: string[]
}

export interface SourceOfTruth {
  id: string
  entityId: string
  contextId: string
  confidence: ConfidenceScore
}

export interface UbiquitousLanguageTerm {
  canonicalName: string
  aliases: string[]
  definition: string
  owner: string
  relationships: string[]
}

export type IntegrityFindingClass =
  | "DUPLICATED_CONCEPT"
  | "CONFLICTING_TERMINOLOGY"
  | "CYCLIC_DEPENDENCY"
  | "INCONSISTENT_OWNERSHIP"

export interface IntegrityFinding {
  id: string
  class: IntegrityFindingClass
  message: string
  entityIds: string[]
  severity: "warning" | "error"
}

export interface DomainModel {
  schema: "synth-domain-model-v1"
  version: string
  derivedFrom: {
    intentModelId?: string
    adapterId: string
    adapterVersion: string
  }
  entities: Entity[]
  valueObjects: ValueObject[]
  aggregates: Aggregate[]
  relationships: DomainRelationship[]
  invariants: Invariant[]
  policies: Policy[]
  boundedContexts: BoundedContext[]
  events: DomainEvent[]
  sourcesOfTruth: SourceOfTruth[]
  ubiquitousLanguage: UbiquitousLanguageTerm[]
  integrityFindings: IntegrityFinding[]
  generatedAt: string
}

export interface DomainModelingOptions {
  intentModel: IntentModel
}

/**
 * Adapter contract for domain modeling strategies.
 *
 * Implementations must be deterministic: the same IntentModel and adapter
 * version produce the same DomainModel.
 */
export interface DomainModelingAdapter {
  readonly id: string
  readonly version: string
  model(options: DomainModelingOptions): DomainModel
}
