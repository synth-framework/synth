// ============================================================
// GOVERNANCE: ADR Registry Reader
// ============================================================
// Lightweight, read-only view of ADR authority state extracted from
// docs/adr/*.md frontmatter. Used by ExecutionGate to enforce
// ADR-046 — Implementation Authority Ordering.
// ============================================================

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type AdrStatus = "Accepted" | "Proposed" | "Rejected" | "Superseded" | "Unknown"

export type AdrRegistry = Record<string, AdrStatus>

const ADR_STATUS_RE = /\*\*Status:\*\*\s*(\S+)/
const ADR_HEADING_STATUS_RE = /##\s+Status\s*\n\s*(Accepted|Proposed|Rejected|Superseded)/i
const ADR_ID_RE = /ADR-(\d{3})/

function repoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url)
  // src/governance/adr-registry.ts -> repository root
  return path.resolve(thisFile, "..", "..", "..")
}

function normalizeStatus(raw: string): AdrStatus {
  const status = raw.trim()
  if (
    status === "Accepted" ||
    status === "Proposed" ||
    status === "Rejected" ||
    status === "Superseded"
  ) {
    return status
  }
  return "Unknown"
}

/** Read a single ADR status from its markdown frontmatter or heading. */
function readAdrStatus(filePath: string): AdrStatus {
  const content = fs.readFileSync(filePath, "utf-8")

  const frontmatterMatch = ADR_STATUS_RE.exec(content)
  if (frontmatterMatch) {
    return normalizeStatus(frontmatterMatch[1])
  }

  const headingMatch = ADR_HEADING_STATUS_RE.exec(content)
  if (headingMatch) {
    return normalizeStatus(headingMatch[1])
  }

  return "Unknown"
}

/** Load the authoritative ADR registry from docs/adr/*.md */
export function loadAdrRegistry(): AdrRegistry {
  const registry: AdrRegistry = {}
  const adrDir = path.join(repoRoot(), "docs", "adr")
  const entries = fs.readdirSync(adrDir)

  for (const entry of entries) {
    if (!entry.startsWith("ADR-") || !entry.endsWith(".md")) continue
    if (entry.includes("TEMPLATE")) continue

    const idMatch = ADR_ID_RE.exec(entry)
    if (!idMatch) continue

    const id = `ADR-${idMatch[1]}`
    const filePath = path.join(adrDir, entry)
    registry[id] = readAdrStatus(filePath)
  }

  return registry
}

/** Look up an ADR status by id (e.g. "ADR-046"). */
export function getAdrStatus(id: string, registry: AdrRegistry): AdrStatus {
  return registry[id] ?? "Unknown"
}
