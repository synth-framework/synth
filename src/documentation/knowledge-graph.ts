// ============================================================
// DOCUMENTATION EXPEDITION: Knowledge Graph Builder
// ============================================================
// Builds a canonical knowledge graph from extracted sources.
// ============================================================

import type { MarkdownKnowledge, KnowledgeGraph, KnowledgeNode, KnowledgeEdge, Concept } from "./types.js"

/** Build a knowledge graph from extracted markdown sources. */
export function buildKnowledgeGraph(sources: MarkdownKnowledge[]): KnowledgeGraph {
  const nodes: KnowledgeNode[] = []
  const edges: KnowledgeEdge[] = []
  const conceptMap = new Map<string, Concept>()

  for (const source of sources) {
    // Build enriched metadata for classified documents
    let nodeMetadata: Record<string, string> | undefined = undefined
    if (source.documentClass === "adr" && source.adrMetadata) {
      nodeMetadata = {
        documentClass: "adr",
        adrStatus: source.adrMetadata.status,
        adrDate: source.adrMetadata.date,
        adrDeciders: source.adrMetadata.deciders,
      }
    } else if (source.documentClass === "expedition" && source.expeditionMetadata) {
      nodeMetadata = {
        documentClass: "expedition",
        expeditionStatus: source.expeditionMetadata.status,
        expeditionKind: source.expeditionMetadata.kind,
        expeditionPriority: source.expeditionMetadata.priority,
        expeditionProgram: source.expeditionMetadata.program,
      }
    }

    // Document node
    nodes.push({
      id: source.id,
      kind: "document",
      label: source.title,
      description: source.summary,
      domain: source.domain,
      audience: source.audience,
      sources: [source.id],
      metadata: nodeMetadata,
    })

    // Link edges
    for (const link of source.links) {
      edges.push({
        source: source.id,
        target: link,
        relation: "references",
      })
    }

    // Mine concepts from headings and list items, weighted by heading depth
    const weightedCandidates: { text: string; level: number }[] = [
      ...source.headingDetails.map((h) => ({ text: h.text, level: h.level })),
      ...source.listItems.map((item) => ({ text: item, level: 99 })),
    ]
    weightedCandidates.sort((a, b) => a.level - b.level)
    const seenConcepts = new Set<string>()
    for (const { text: candidate } of weightedCandidates) {
      const name = normalizeConceptName(candidate)
      if (!name) continue

      if (seenConcepts.has(name)) continue
      seenConcepts.add(name)

      const existing = conceptMap.get(name)
      if (existing) {
        if (!existing.sources.includes(source.id)) {
          existing.sources.push(source.id)
        }
        continue
      }

      conceptMap.set(name, {
        name,
        description: candidate,
        sources: [source.id],
        related: [],
      })

      // Concept node
      nodes.push({
        id: `concept:${name}`,
        kind: "concept",
        label: name,
        description: candidate,
        sources: [source.id],
      })

      // Edge from document to concept
      edges.push({
        source: source.id,
        target: `concept:${name}`,
        relation: "produces",
      })
    }
  }

  return { sources, concepts: Array.from(conceptMap.values()), nodes, edges }
}

/** Normalize a heading or list item into a concept name. */
function normalizeConceptName(text: string): string {
  // Strip markdown link syntax and inline emphasis
  let cleaned = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  cleaned = cleaned.replace(/[*_`]/g, " ")
  // Remove leading section numbers:
  // - "01 - Planning"
  // - "1.2 - Subsection"
  // - "1. Brownfield Adoption"
  // Keep numeric-starting concepts like "7 Layer Model" or "202 tests passing".
  cleaned = cleaned.replace(/^\s*\d+(?:\.\d+)+(?:\s*[-.:]?\s*|\s+)|^\s*\d+\s*[-.:]\s*/, "")
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s-]/g, " ").trim()
  if (cleaned.length < 3) return ""
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return ""
  return words.slice(0, 6).join(" ")
}
