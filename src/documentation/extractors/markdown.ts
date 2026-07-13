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

/** Extract headings (# Heading) from body text. */
function extractHeadings(body: string): string[] {
  const headings: string[] = []
  const headingRe = /^#{1,6}\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRe.exec(body)) !== null) {
    headings.push(match[1].trim())
  }
  return headings
}

/** Extract bulleted list items from body text, stripping markdown links. */
function extractListItems(body: string): string[] {
  const items: string[] = []
  const listRe = /^[-*]\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = listRe.exec(body)) !== null) {
    const stripped = match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim()
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
 * Extract structured knowledge from a Markdown document.
 */
export function extractMarkdownKnowledge(id: string, content: string): MarkdownKnowledge {
  const { metadata, body } = parseMetadata(content)
  const headings = extractHeadings(body)
  const firstHeading = headings[0]

  return {
    id,
    title: metadata.Title || firstHeading || id,
    domain: metadata.Domain,
    audience: metadata.Audience,
    version: metadata.Version,
    status: metadata.Status,
    headings,
    listItems: extractListItems(body),
    links: extractLinks(body),
    summary: extractSummary(body),
  }
}
