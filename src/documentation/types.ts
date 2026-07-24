// ============================================================
// DOCUMENTATION EXPEDITION: Types
// ============================================================
// Canonical types for the Knowledge Compiler.
// ============================================================

/** A unit of knowledge extracted from a single source document. */
export type MarkdownKnowledge = {
  /** Source document identifier (usually a file path) */
  id: string

  /** Document title from metadata or first H1 */
  title: string

  /** Document domain from metadata */
  domain?: string

  /** Target audience from metadata */
  audience?: string

  /** Version from metadata */
  version?: string

  /** Status from metadata */
  status?: string

  /** Headings found in the document */
  headings: string[]

  /** Heading details with depth levels for weighting */
  headingDetails: { text: string; level: number }[]

  /** Bulleted list items found in the document */
  listItems: string[]

  /** Outgoing markdown links (target only) */
  links: string[]

  /** Raw body text (first paragraph after title) */
  summary?: string

  /** Document classification */
  documentClass?: "adr" | "expedition" | "reference" | "other"

  /** Parsed ADR metadata (Status, Date, Deciders) */
  adrMetadata?: { status: string; date: string; deciders: string }

  /** Parsed Expedition metadata (Status, Kind, Priority, Program) */
  expeditionMetadata?: { status: string; kind: string; priority: string; program: string }
}

/** A concept mined from one or more knowledge sources. */
export type Concept = {
  /** Stable canonical name */
  name: string

  /** Short description derived from context */
  description: string

  /** Source document ids where this concept appears */
  sources: string[]

  /** Related concept names */
  related: string[]
}

/** A node in the knowledge graph. */
export type KnowledgeNode = {
  id: string
  kind: "document" | "concept" | "capability" | "event" | "decision" | "expedition"
  label: string
  description?: string
  domain?: string
  audience?: string
  sources: string[]
  /** Arbitrary metadata attached to enriched document nodes (ADR status, expedition fields, etc.) */
  metadata?: Record<string, string>
}

/** A directed edge in the knowledge graph. */
export type KnowledgeEdge = {
  source: string
  target: string
  relation: "depends_on" | "references" | "uses" | "produces" | "related_to"
}

/** The compiled knowledge graph. */
export type KnowledgeGraph = {
  /** Raw extracted knowledge per source */
  sources: MarkdownKnowledge[]

  /** Mined canonical concepts */
  concepts: Concept[]

  /** Graph nodes */
  nodes: KnowledgeNode[]

  /** Graph edges */
  edges: KnowledgeEdge[]
}

/** A projected documentation output. */
export type Projection = {
  filename: string
  title: string
  content: string
}
