// ============================================================
// DOCUMENTATION EXPEDITION: Knowledge Normalizer
// ============================================================
// Deduplicates and canonicalizes concepts in a knowledge graph.
// ============================================================

import type { KnowledgeGraph, Concept } from "./types.js"

/**
 * Normalize a knowledge graph by merging concepts with the same canonical name.
 */
export function normalizeGraph(graph: KnowledgeGraph): KnowledgeGraph {
  const conceptMap = new Map<string, Concept>()

  for (const concept of graph.concepts) {
    const key = concept.name.toLowerCase()
    const existing = conceptMap.get(key)
    if (existing) {
      mergeConcept(existing, concept)
    } else {
      conceptMap.set(key, { ...concept, related: [...concept.related] })
    }
  }

  // Rebuild nodes and edges from canonical concepts
  const concepts = Array.from(conceptMap.values())
  const conceptNodeIds = new Set(concepts.map((c) => `concept:${c.name}`))

  const documentNodes = graph.nodes.filter((n) => n.kind !== "concept")
  const conceptNodes = concepts.map(
    (c): typeof graph.nodes[0] => ({
      id: `concept:${c.name}`,
      kind: "concept",
      label: c.name,
      description: c.description,
      sources: [...c.sources],
    }),
  )

  // Keep only edges that point to existing document or concept nodes
  const validNodeIds = new Set([...documentNodes.map((n) => n.id), ...conceptNodes.map((n) => n.id)])
  const edges = graph.edges.filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))

  // Deduplicate edges
  const edgeSet = new Set<string>()
  const dedupedEdges: typeof edges = []
  for (const edge of edges) {
    const key = `${edge.source}|${edge.relation}|${edge.target}`
    if (edgeSet.has(key)) continue
    edgeSet.add(key)
    dedupedEdges.push(edge)
  }

  return {
    sources: graph.sources,
    concepts,
    nodes: [...documentNodes, ...conceptNodes],
    edges: dedupedEdges,
  }
}

function mergeConcept(target: Concept, source: Concept): void {
  for (const s of source.sources) {
    if (!target.sources.includes(s)) {
      target.sources.push(s)
    }
  }
  for (const r of source.related) {
    if (!target.related.includes(r)) {
      target.related.push(r)
    }
  }
}
