// ============================================================
// GOVERNANCE: Charter Report Reader
// ============================================================
// Read-only parser that surfaces the content sections of an
// expedition charter markdown file for rich reporting commands.
// ============================================================

import fs from "fs/promises"
import path from "path"

export type CharterDetails = {
  purpose: string
  goal: string
  deliverables: string[]
  acceptanceCriteria: string[]
  evidence: string[]
  outOfScope: string[]
  relatedDocuments: string[]
  expectedOutput: string
}

function normalizeHeading(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
}

function isFence(line: string): boolean {
  return line.trimStart().startsWith("```")
}

function* filterFenced(lines: string[]): Generator<string> {
  let inFence = false
  for (const raw of lines) {
    if (isFence(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    yield raw
  }
}

function isContentLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (trimmed === "---") return false
  return true
}

function stripListMarker(line: string): string {
  return line.replace(/^(?:[-*]|\d+\.)\s+/, "").trim()
}

function stripSubheading(line: string): string {
  return line.replace(/^###\s*\d*\.?\s*/, "").trim()
}

function extractListItems(lines: string[]): string[] {
  const items: string[] = []
  for (const raw of filterFenced(lines)) {
    if (!isContentLine(raw)) continue
    const trimmed = raw.trim()
    let cleaned = stripSubheading(trimmed)
    cleaned = stripListMarker(cleaned)
    if (cleaned) items.push(cleaned)
  }
  return items
}

function extractProse(lines: string[]): string {
  const prose: string[] = []
  for (const raw of filterFenced(lines)) {
    if (!isContentLine(raw)) continue
    const trimmed = raw.trim()
    if (/^###\s+/.test(trimmed)) continue
    prose.push(stripListMarker(trimmed))
  }
  return prose.join(" ").trim()
}

function extractLinks(lines: string[]): string[] {
  const links: string[] = []
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
  for (const raw of filterFenced(lines)) {
    if (!isContentLine(raw)) continue
    const trimmed = raw.trim()
    let match: RegExpExecArray | null
    while ((match = linkPattern.exec(trimmed)) !== null) {
      links.push(`${match[1]} (${match[2]})`)
    }
    const bare = stripListMarker(trimmed)
    if (bare && links.length === 0) {
      links.push(bare)
    }
  }
  return links
}

export function parseExpeditionCharterDetails(content: string): CharterDetails {
  const lines = content.split("\n")
  const sections = new Map<string, string[]>()
  let currentKey = ""

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^##\s+/.test(line)) {
      currentKey = normalizeHeading(line)
      sections.set(currentKey, [])
      continue
    }
    if (currentKey) {
      sections.get(currentKey)?.push(line)
    }
  }

  const get = (key: string): string[] => sections.get(key) || []

  const purpose = extractProse(get("purpose"))
  const goal = extractProse(get("goal")) || purpose
  const deliverables = extractListItems(get("deliverables"))
  const acceptanceCriteria = extractListItems(get("acceptance-criteria"))
  const evidence = extractListItems(get("evidence"))
  const outOfScope = extractListItems(get("out-of-scope"))
  const relatedDocuments = extractLinks(get("related-documents"))

  const expectedOutput =
    acceptanceCriteria.length > 0
      ? acceptanceCriteria.join("; ")
      : deliverables.length > 0
        ? deliverables.join("; ")
        : ""

  return {
    purpose,
    goal,
    deliverables,
    acceptanceCriteria,
    evidence,
    outOfScope,
    relatedDocuments,
    expectedOutput,
  }
}

export async function loadExpeditionCharterDetails(
  charterDir: string,
  id: string,
): Promise<CharterDetails | undefined> {
  const filePath = path.join(charterDir, `${id}.md`)
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return parseExpeditionCharterDetails(content)
  } catch {
    return undefined
  }
}
