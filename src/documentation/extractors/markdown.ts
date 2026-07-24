// ============================================================
// DOCUMENTATION EXPEDITION: Markdown Extractor
// ============================================================
// Extracts structured knowledge from Markdown source text.
// ============================================================

import type { MarkdownKnowledge } from "../types.js"

/**
 * Parse a YAML-ish metadata block at the top of a Markdown document.
 *
 * Expected format:
 *   ---
 *   Title: Document Title
 *   Domain: architecture
 *   Audience: architects
 *   Version: 1.0.0
 *   Status: stable
 *   ---
 */
function parseMetadata(content: string): {
  metadata: Record<string, string>
  body: string
} {
  const trimmed = content.trim()
  if (!trimmed.startsWith("---")) {
    return { metadata: {}, body: content }
  }

  const end = trimmed.indexOf("\n---", 3)
  if (end === -1) {
    return { metadata: {}, body: content }
  }

  const block = trimmed.slice(3, end).trim()
  const body = trimmed.slice(end + 4).trim()
  const metadata: Record<string, string> = {}

  for (const line of block.split("\n")) {
    const colon = line.indexOf(":")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim()
    if (key && value) metadata[key] = value
  }

  return { metadata, body }
}

/** Extract headings (# Heading) from body text with depth levels. */
function extractHeadings(body: string): string[] {
  const headings: string[] = []
  const headingRe = /^#{1,6}\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRe.exec(body)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

/** Extract headings with depth levels for weighting. */
function extractHeadingDetails(body: string): { text: string; level: number }[] {
  const details: { text: string; level: number }[] = []
  const headingRe = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRe.exec(body)) !== null) {
    details.push({ text: match[2].trim(), level: match[1].length })
  }
  return details
}

/** Extract bulleted list items from body text, stripping markdown links. Filters out checkbox items. */
function extractListItems(body: string): string[] {
  const items: string[] = []
  const listRe = /^[-*]\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = listRe.exec(body)) !== null) {
    const text = match[1].trim()
    if (text.startsWith("[ ]") || text.startsWith("[x]")) continue
    const stripped = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim()
    items.push(stripped)
  }
  return items
}

/** Extract markdown links [text](target). */
function extractLinks(body: string): string[] {
  const links: string[] = []
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = linkRe.exec(body)) !== null) {
    links.push(match[2].trim())
  }
  return links
}

/** Find the first paragraph of body text suitable for a summary. */
function extractSummary(body: string): string | undefined {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("*"))
  return lines[0]
}

/**
 * Parse ADR-specific metadata from bold-prefixed fields.
 * Matches:
 *   **Status:** Accepted
 *   **Date:** 2026-07-12
 *   **Deciders:** Synth Architecture
 */
export function extractADRMetadata(content: string): { status: string; date: string; deciders: string } | null {
  const statusMatch = content.match(/^\*\*Status:\*\*\s*(.+)$/m)
  const dateMatch = content.match(/^\*\*Date:\*\*\s*(.+)$/m)
  const decidersMatch = content.match(/^\*\*Deciders:\*\*\s*(.+)$/m)
  if (!statusMatch && !dateMatch && !decidersMatch) return null
  return {
    status: statusMatch ? statusMatch[1].trim() : "",
    date: dateMatch ? dateMatch[1].trim() : "",
    deciders: decidersMatch ? decidersMatch[1].trim() : "",
  }
}

/**
 * Parse Expedition-specific metadata from bold-prefixed fields.
 * Matches:
 *   **Status:** Completed
 *   **Kind:** Adoption Expedition
 *   **Priority:** Critical
 *   **Program:** EXP-PROGRAM-008
 */
export function extractExpeditionMetadata(content: string): { status: string; kind: string; priority: string; program: string } | null {
  const statusMatch = content.match(/^\*\*Status:\*\*\s*(.+)$/m)
  const kindMatch = content.match(/^\*\*Kind:\*\*\s*(.+)$/m)
  const priorityMatch = content.match(/^\*\*Priority:\*\*\s*(.+)$/m)
  const programMatch = content.match(/^\*\*Program:\*\*\s*(.+)$/m)
  if (!statusMatch && !kindMatch && !priorityMatch && !programMatch) return null
  return {
    status: statusMatch ? statusMatch[1].trim() : "",
    kind: kindMatch ? kindMatch[1].trim() : "",
    priority: priorityMatch ? priorityMatch[1].trim() : "",
    program: programMatch ? programMatch[1].trim() : "",
  }
}

/**
 * Classify a document by its file path and content metadata.
 */
export function classifyDocument(content: string, filePath: string): "adr" | "expedition" | "reference" | "other" {
  if (filePath.includes("adr/")) return "adr"
  if (filePath.includes("expeditions/")) return "expedition"
  if (filePath.includes("reference/")) return "reference"
  if (extractADRMetadata(content)) return "adr"
  if (extractExpeditionMetadata(content)) return "expedition"
  return "other"
}

/** Check if a concept candidate should be excluded from the knowledge graph. */
function isLowQualityConcept(text: string): boolean {
  if (text.includes("--")) return true
  if (/^\d+([.\s]\d+)*$/.test(text.trim())) return true
  const words = text.trim().split(/\s+/)
  if (words.length === 1 && words[0].length < 4) return true
  return false
}

/**
 * Extract structured knowledge from a Markdown document.
 */
export function extractMarkdownKnowledge(id: string, content: string): MarkdownKnowledge {
  const { metadata, body } = parseMetadata(content)
  const headingDetails = extractHeadingDetails(body)
  const headings = headingDetails.map((h) => h.text).filter((h) => !isLowQualityConcept(h))
  const listItems = extractListItems(body).filter((item) => !isLowQualityConcept(item))
  const firstHeading = headingDetails.length > 0 ? headingDetails[0].text : undefined

  const documentClass = classifyDocument(content, id)
  let adrMetadata: MarkdownKnowledge["adrMetadata"] = undefined
  let expeditionMetadata: MarkdownKnowledge["expeditionMetadata"] = undefined

  if (documentClass === "adr") {
    const parsed = extractADRMetadata(content)
    if (parsed) adrMetadata = parsed
  } else if (documentClass === "expedition") {
    const parsed = extractExpeditionMetadata(content)
    if (parsed) expeditionMetadata = parsed
  }

  return {
    id,
    title: metadata.Title || firstHeading || id,
    domain: metadata.Domain,
    audience: metadata.Audience,
    version: metadata.Version,
    status: metadata.Status,
    headings,
    headingDetails,
    listItems,
    links: extractLinks(body),
    summary: extractSummary(body),
    documentClass,
    adrMetadata,
    expeditionMetadata,
  }
}
