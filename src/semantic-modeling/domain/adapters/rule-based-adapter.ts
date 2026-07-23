// ============================================================
// SEMANTIC MODELING: Rule-Based Domain Modeling Adapter
// ============================================================
// Derives a canonical DomainModel from an IntentModel.
// Deterministic for a fixed intent model and adapter version.
// ============================================================

import { stableId } from "../../../sdk/hashing/index.js"
import type {
  Aggregate,
  BoundedContext,
  DomainEvent,
  DomainModel,
  DomainModelingAdapter,
  DomainModelingOptions,
  DomainRelationship,
  Entity,
  IntegrityFinding,
  IntegrityFindingClass,
  Invariant,
  Policy,
  SourceOfTruth,
  UbiquitousLanguageTerm,
  ValueObject,
} from "../types.js"
import type { IntentGraph, IntentModel, IntentNode } from "../../intent/types.js"

const ADAPTER_ID = "rule-based-domain-modeler"
const ADAPTER_VERSION = "1.0.0"

function canonicalName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .join("-")
}

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "by",
  "from",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "we",
  "they",
  "it",
  "he",
  "she",
])

function extractNouns(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
  const nouns = words.filter((w) => w.length > 3 && !STOP_WORDS.has(w))
  // Deduplicate while preserving first occurrence order.
  const seen = new Set<string>()
  const result: string[] = []
  for (const noun of nouns) {
    if (!seen.has(noun)) {
      seen.add(noun)
      result.push(noun)
    }
  }
  return result
}

function extractVerbRelation(text: string): { verb?: string; object?: string } {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, "")
  const verbMap: Record<string, string> = {
    track: "tracks",
    manage: "manages",
    build: "builds",
    create: "creates",
    monitor: "monitors",
    validate: "validates",
    edit: "edits",
    view: "views",
    display: "displays",
    render: "renders",
    update: "updates",
    organize: "organizes",
    support: "supports",
  }
  for (const [verb, relation] of Object.entries(verbMap)) {
    const idx = normalized.indexOf(verb)
    if (idx !== -1) {
      const remainder = normalized.slice(idx + verb.length).trim()
      const objectWords = remainder
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
        .slice(0, 3)
      return { verb: relation, object: objectWords.join("-") }
    }
  }
  return {}
}

function inferEntities(graph: IntentGraph): Entity[] {
  const entities: Entity[] = []
  const seen = new Set<string>()

  const labels = [
    ...graph.nodes.filter((n) => n.type === "problem").map((n) => n.label),
    ...graph.nodes.filter((n) => n.type === "goal").map((n) => n.label),
    ...graph.nodes.filter((n) => n.type === "outcome").map((n) => n.label),
    ...graph.nodes.filter((n) => n.type === "success-criterion").map((n) => n.label),
    ...graph.nodes.filter((n) => n.type === "constraint").map((n) => n.label),
  ]

  for (const label of labels) {
    const nouns = extractNouns(label)
    for (const noun of nouns) {
      const name = toPascalCase(noun)
      if (seen.has(name)) continue
      seen.add(name)
      entities.push({
        id: stableId("entity", name),
        name,
        description: `Domain entity inferred from '${label}'.`,
        confidence: 0.7,
        evidence: [label],
      })
    }
  }

  return entities
}

function inferValueObjects(graph: IntentGraph, entities: Entity[]): ValueObject[] {
  const values: ValueObject[] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    if (node.type !== "constraint" && node.type !== "assumption") continue
    const nouns = extractNouns(node.label)
    for (const noun of nouns) {
      const name = toPascalCase(noun)
      if (seen.has(name)) continue
      // Skip nouns that are already entities.
      if (entities.some((e) => e.name.toLowerCase() === name.toLowerCase())) continue
      seen.add(name)
      values.push({
        id: stableId("value-object", name),
        name,
        description: `Value object inferred from '${node.label}'.`,
        confidence: 0.6,
        evidence: [node.label],
      })
    }
  }

  return values
}

function inferRelationships(graph: IntentGraph, entities: Entity[]): DomainRelationship[] {
  const relationships: DomainRelationship[] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    if (node.type !== "goal" && node.type !== "outcome") continue
    const parsed = extractVerbRelation(node.label)
    if (!parsed.verb) continue

    const sourceEntity = entities.find((e) => node.label.toLowerCase().includes(e.name.toLowerCase()))
    const targetEntity = entities.find((e) =>
      parsed.object ? parsed.object.includes(e.name.toLowerCase()) : false,
    )

    if (!sourceEntity || !targetEntity || sourceEntity.id === targetEntity.id) continue

    const id = stableId("relationship", sourceEntity.id, targetEntity.id, parsed.verb)
    if (seen.has(id)) continue
    seen.add(id)

    relationships.push({
      id,
      source: sourceEntity.id,
      target: targetEntity.id,
      type: parsed.verb,
      confidence: 0.65,
      evidence: [node.label],
    })
  }

  return relationships
}

function inferInvariants(graph: IntentGraph, entities: Entity[]): Invariant[] {
  const invariants: Invariant[] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    if (node.type !== "constraint") continue
    const affected = entities
      .filter((e) => node.label.toLowerCase().includes(e.name.toLowerCase()))
      .map((e) => e.id)
    const name = `Invariant: ${node.label.slice(0, 60)}`
    const id = stableId("invariant", node.label)
    if (seen.has(id)) continue
    seen.add(id)
    invariants.push({
      id,
      name,
      description: node.label,
      affectedEntityIds: affected.length ? affected : entities.slice(0, 1).map((e) => e.id),
      confidence: 0.75,
      evidence: [node.label],
    })
  }

  return invariants
}

function inferPolicies(graph: IntentGraph): Policy[] {
  const policies: Policy[] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    if (node.type !== "constraint") continue
    const kind = node.evidence.includes("constraints.nonFunctional") ? "non-functional" : "functional"
    if (kind !== "non-functional") continue
    const id = stableId("policy", node.label)
    if (seen.has(id)) continue
    seen.add(id)
    policies.push({
      id,
      name: `Policy: ${node.label.slice(0, 60)}`,
      description: node.label,
      appliesTo: [],
      confidence: 0.7,
      evidence: [node.label],
    })
  }

  return policies
}

function inferBoundedContexts(graph: IntentGraph, entities: Entity[]): BoundedContext[] {
  const contexts: BoundedContext[] = []

  for (const node of graph.nodes) {
    if (node.type !== "stakeholder") continue
    const ownedGoalIds = graph.edges
      .filter((e) => e.type === "owns" && e.source === node.id)
      .map((e) => e.target)

    const goalLabels = graph.nodes
      .filter((n) => n.type === "goal" && ownedGoalIds.includes(n.id))
      .map((n) => n.label)

    const contextEntities = entities.filter((e) =>
      goalLabels.some((label) => label.toLowerCase().includes(e.name.toLowerCase())),
    )

    const contextName = toPascalCase(canonicalName(node.label)) + "Context"
    contexts.push({
      id: stableId("context", node.label),
      name: contextName,
      owner: node.label,
      entityIds: contextEntities.map((e) => e.id),
      relationships: [],
      confidence: 0.75,
      evidence: [node.label, ...goalLabels],
    })
  }

  // Always ensure at least one core context exists.
  if (contexts.length === 0 && entities.length > 0) {
    contexts.push({
      id: stableId("context", "core"),
      name: "CoreContext",
      entityIds: entities.map((e) => e.id),
      relationships: [],
      confidence: 0.6,
      evidence: ["fallback core context"],
    })
  }

  return contexts
}

function inferEvents(graph: IntentGraph, entities: Entity[]): DomainEvent[] {
  const events: DomainEvent[] = []
  const seen = new Set<string>()

  for (const node of graph.nodes) {
    if (node.type !== "outcome") continue
    const words = node.label.split(/\s+/)
    const eventName = words
      .filter((w) => w.length > 2)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") + "Event"

    const id = stableId("event", node.label)
    if (seen.has(id)) continue
    seen.add(id)

    const emittedBy = entities.find((e) => node.label.toLowerCase().includes(e.name.toLowerCase()))

    events.push({
      id,
      name: eventName,
      description: `Domain event representing '${node.label}'.`,
      emittedBy: emittedBy?.id,
      confidence: 0.65,
      evidence: [node.label],
    })
  }

  return events
}

function inferSourcesOfTruth(entities: Entity[], contexts: BoundedContext[]): SourceOfTruth[] {
  const sources: SourceOfTruth[] = []
  for (const entity of entities) {
    const owningContext = contexts.find((c) => c.entityIds.includes(entity.id))
    if (!owningContext) continue
    sources.push({
      id: stableId("source-of-truth", entity.id, owningContext.id),
      entityId: entity.id,
      contextId: owningContext.id,
      confidence: 0.7,
    })
  }
  return sources
}

function buildUbiquitousLanguage(
  entities: Entity[],
  contexts: BoundedContext[],
): UbiquitousLanguageTerm[] {
  const terms: UbiquitousLanguageTerm[] = []
  const allTerms = new Map<string, UbiquitousLanguageTerm>()

  for (const entity of entities) {
    const term: UbiquitousLanguageTerm = {
      canonicalName: entity.name,
      aliases: [entity.name.toLowerCase()],
      definition: entity.description,
      owner: contexts.find((c) => c.entityIds.includes(entity.id))?.name ?? "Unowned",
      relationships: [],
    }
    allTerms.set(entity.name.toLowerCase(), term)
  }

  for (const context of contexts) {
    const term: UbiquitousLanguageTerm = {
      canonicalName: context.name,
      aliases: [context.name.toLowerCase()],
      definition: `Bounded context owned by ${context.owner ?? "unknown"}.`,
      owner: context.name,
      relationships: context.entityIds
        .map((id) => entities.find((e) => e.id === id)?.name)
        .filter((n): n is string => !!n),
    }
    allTerms.set(context.name.toLowerCase(), term)
  }

  for (const term of allTerms.values()) {
    terms.push(term)
  }

  return terms
}

function detectIntegrityFindings(
  entities: Entity[],
  contexts: BoundedContext[],
  relationships: DomainRelationship[],
): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []

  // Duplicated concept: same canonical name appears as multiple entities.
  const nameToEntities = new Map<string, Entity[]>()
  for (const entity of entities) {
    const key = entity.name.toLowerCase()
    const list = nameToEntities.get(key) ?? []
    list.push(entity)
    nameToEntities.set(key, list)
  }
  for (const [name, list] of nameToEntities) {
    if (list.length > 1) {
      findings.push({
        id: stableId("finding", "duplicate", name),
        class: "DUPLICATED_CONCEPT",
        message: `Concept '${name}' appears in multiple entities.`,
        entityIds: list.map((e) => e.id),
        severity: "warning",
      })
    }
  }

  // Conflicting terminology: same term owned by multiple contexts with different definitions.
  const termContexts = new Map<string, string[]>()
  for (const context of contexts) {
    for (const entityId of context.entityIds) {
      const entity = entities.find((e) => e.id === entityId)
      if (!entity) continue
      const key = entity.name.toLowerCase()
      const list = termContexts.get(key) ?? []
      if (!list.includes(context.name)) list.push(context.name)
      termContexts.set(key, list)
    }
  }
  for (const [term, ctxs] of termContexts) {
    if (ctxs.length > 1) {
      findings.push({
        id: stableId("finding", "conflict", term),
        class: "CONFLICTING_TERMINOLOGY",
        message: `Term '${term}' is used in multiple bounded contexts: ${ctxs.join(", ")}.`,
        entityIds: entities.filter((e) => e.name.toLowerCase() === term).map((e) => e.id),
        severity: "warning",
      })
    }
  }

  // Cyclic dependencies.
  const adjacency = new Map<string, string[]>()
  for (const rel of relationships) {
    const list = adjacency.get(rel.source) ?? []
    list.push(rel.target)
    adjacency.set(rel.source, list)
  }
  const visited = new Set<string>()
  const stack = new Set<string>()
  function dfs(node: string, path: string[]): boolean {
    visited.add(node)
    stack.add(node)
    const neighbors = adjacency.get(node) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, node])) return true
      } else if (stack.has(neighbor)) {
        findings.push({
          id: stableId("finding", "cycle", node, neighbor),
          class: "CYCLIC_DEPENDENCY",
          message: `Cyclic dependency detected: ${[...path, node, neighbor].join(" → ")}.`,
          entityIds: [...path, node, neighbor],
          severity: "error",
        })
        return true
      }
    }
    stack.delete(node)
    return false
  }
  for (const node of adjacency.keys()) {
    if (!visited.has(node)) dfs(node, [])
  }

  // Inconsistent ownership: entity not assigned to any context.
  for (const entity of entities) {
    const owningContexts = contexts.filter((c) => c.entityIds.includes(entity.id))
    if (owningContexts.length === 0) {
      findings.push({
        id: stableId("finding", "unowned", entity.id),
        class: "INCONSISTENT_OWNERSHIP",
        message: `Entity '${entity.name}' is not owned by any bounded context.`,
        entityIds: [entity.id],
        severity: "warning",
      })
    }
  }

  return findings
}

export class RuleBasedDomainModelingAdapter implements DomainModelingAdapter {
  readonly id = ADAPTER_ID
  readonly version = ADAPTER_VERSION

  model(options: DomainModelingOptions): DomainModel {
    const { intentModel } = options
    const graph = intentModel.graph

    const entities = inferEntities(graph)
    const valueObjects = inferValueObjects(graph, entities)
    const relationships = inferRelationships(graph, entities)
    const invariants = inferInvariants(graph, entities)
    const policies = inferPolicies(graph)
    const boundedContexts = inferBoundedContexts(graph, entities)
    const events = inferEvents(graph, entities)
    const sourcesOfTruth = inferSourcesOfTruth(entities, boundedContexts)
    const ubiquitousLanguage = buildUbiquitousLanguage(entities, boundedContexts)
    const integrityFindings = detectIntegrityFindings(entities, boundedContexts, relationships)

    const aggregates: Aggregate[] = boundedContexts.map((context) => ({
      id: stableId("aggregate", context.id),
      name: `${context.name}Aggregate`,
      rootEntityId: context.entityIds[0] ?? "",
      entityIds: context.entityIds,
      confidence: context.confidence,
      evidence: context.evidence,
    }))

    return {
      schema: "synth-domain-model-v1",
      version: "1.0.0",
      derivedFrom: {
        intentModelId: intentModel.derivedFrom.discoveryArtifactId,
        adapterId: this.id,
        adapterVersion: this.version,
      },
      entities,
      valueObjects,
      aggregates,
      relationships,
      invariants,
      policies,
      boundedContexts,
      events,
      sourcesOfTruth,
      ubiquitousLanguage,
      integrityFindings,
      generatedAt: new Date().toISOString(),
    }
  }
}
