// ============================================================
// GOVERNANCE: Expedition Authority Parser
// ============================================================
// Extracts ADR dependencies declared in an expedition charter's
// Authority section. Supports ADR-046 implementation eligibility.
// ============================================================

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ADR_REF_RE = /ADR-\d{3}/g
const AUTHORITY_SECTION_RE = /\*\*Authority:\*\*\s*(.+)(?:\n\n|\n\*\*)/s

function repoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url)
  return path.resolve(thisFile, "..", "..", "..")
}

/** Read the raw Authority line(s) from an expedition charter. */
function readAuthorityLine(expeditionId: string): string | undefined {
  const filePath = path.join(repoRoot(), "docs", "expeditions", `${expeditionId}.md`)
  if (!fs.existsSync(filePath)) return undefined

  const content = fs.readFileSync(filePath, "utf-8")
  const match = AUTHORITY_SECTION_RE.exec(content)
  if (match) {
    return match[1].replace(/\n\s+/g, " ")
  }

  // Fallback: search the whole file for any ADR references if no explicit section.
  return content
}

/** Extract all ADR ids referenced by an expedition charter. */
export function loadExpeditionAdrDependencies(expeditionId: string): string[] {
  const authority = readAuthorityLine(expeditionId)
  if (!authority) return []

  const refs = authority.match(ADR_REF_RE)
  if (!refs) return []

  // Deduplicate while preserving order.
  const seen = new Set<string>()
  const result: string[] = []
  for (const ref of refs) {
    if (!seen.has(ref)) {
      seen.add(ref)
      result.push(ref)
    }
  }
  return result
}
