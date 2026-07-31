// ============================================================
// DOCUMENTATION EXPEDITION: Runner
// ============================================================
// High-level orchestration: sources → graph → projections → files.
// ============================================================

import fs from "fs/promises"
import { Dirent } from "fs"
import path from "path"
import type { MarkdownKnowledge, Projection } from "./types.js"
import { extractMarkdownKnowledge } from "./extractors/markdown.js"
import { buildKnowledgeGraph } from "./knowledge-graph.js"
import { normalizeGraph } from "./normalizer.js"
import { projectAll } from "./projections/engine.js"
import { sha256 } from "../core/hash.js"

export type ExtractionSummary = {
  filesScanned: number
  filesMatched: number
  conceptsExtracted: number
  projectionsGenerated: number
  zeroExtractionWarning: boolean
}

/**
 * Compute a deterministic fingerprint of the canonical markdown sources.
 * The hash is stable across runs as long as the source file set and contents
 * are unchanged.
 */
export function computeSourceStateHash(sources: MarkdownKnowledge[]): string {
  // Hash a deterministic, sorted representation of every extracted source.
  // This makes the fingerprint sensitive to content, metadata, headings,
  // list items, links, and classification changes.
  const canonical = sources.map((s) => ({
    id: s.id,
    title: s.title,
    domain: s.domain,
    audience: s.audience,
    version: s.version,
    status: s.status,
    headings: s.headings,
    listItems: s.listItems,
    links: s.links,
    summary: s.summary,
    documentClass: s.documentClass,
    adrMetadata: s.adrMetadata,
    expeditionMetadata: s.expeditionMetadata,
  }))
  return sha256(canonical)
}

/**
 * Embed deterministic provenance metadata into a projection.
 */
function embedProvenance(content: string, sourceStateHash: string, computedAt: string): string {
  const footer = `

<!--
sourceStateHash: ${sourceStateHash}
computedAt: ${computedAt}
schemaVersion: synth-documentation-expedition-v1
projection: synth-documentation-expedition-v1
-->`
  return content.trimEnd() + footer
}

/**
 * Extract knowledge from all Markdown files under a directory.
 */
export async function extractDirectoryKnowledge(dir: string): Promise<{ sources: MarkdownKnowledge[]; filesScanned: number; filesMatched: number }> {
  const sources: MarkdownKnowledge[] = []
  let filesScanned = 0
  let filesMatched = 0

  async function walk(current: string): Promise<void> {
    let entries: Dirent[]
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }

    // Deterministic traversal order regardless of filesystem return order.
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        // Skip generated output directories to avoid re-ingesting derived docs.
        if (entry.name === "generated") continue
        await walk(fullPath)
      } else if (entry.isFile()) {
        filesScanned++
        if (entry.name.endsWith(".md")) {
          filesMatched++
          const content = await fs.readFile(fullPath, "utf-8")
          const relativePath = path.relative(dir, fullPath)
          sources.push(extractMarkdownKnowledge(relativePath, content))
        }
      }
    }
  }

  await walk(dir)
  return { sources, filesScanned, filesMatched }
}

/**
 * Run the full Documentation Expedition.
 *
 * @param sources Extracted markdown knowledge sources.
 * @param outDir Directory to write generated documentation.
 * @returns The generated projections.
 */
export async function runDocumentationExpedition(
  sources: MarkdownKnowledge[],
  outDir: string,
): Promise<Projection[]> {
  const sourceStateHash = computeSourceStateHash(sources)
  const graph = normalizeGraph(buildKnowledgeGraph(sources))
  const projections = projectAll(graph, sourceStateHash)
  const computedAt = new Date().toISOString()

  await fs.mkdir(outDir, { recursive: true })
  for (const projection of projections) {
    const content = embedProvenance(projection.content, projection.sourceStateHash, computedAt)
    await fs.writeFile(path.join(outDir, projection.filename), content, "utf-8")
  }

  return projections
}

/**
 * Run the Documentation Expedition from the project knowledge base.
 *
 * @param knowledgeBaseDir Root directory containing markdown sources (e.g. ./docs).
 * @param outDir Directory to write generated documentation.
 * @param linkPrefix Optional relative prefix from the final output directory to
 *   the knowledge base. If omitted, it is computed from `outDir`. Use this when
 *   files are written to a temporary directory and then moved to their final
 *   location, so source links resolve correctly from the published docs.
 */
export async function documentFromKnowledgeBase(
  knowledgeBaseDir: string,
  outDir: string,
  linkPrefix?: string,
): Promise<{ projections: Projection[]; summary: ExtractionSummary }> {
  const { sources, filesScanned, filesMatched } = await extractDirectoryKnowledge(knowledgeBaseDir)
  // Deterministic projection requires a stable source ordering independent of
  // filesystem readdir order.
  sources.sort((a, b) => a.id.localeCompare(b.id))
  // Generated projections live in outDir; source links must resolve back to
  // the knowledge base. Compute the relative prefix once and prepend it to
  // every source identifier so links like `architecture/01-introduction.md`
  // become `../architecture/01-introduction.md` from `docs/generated/`.
  const computedPrefix = linkPrefix ?? path.relative(outDir, knowledgeBaseDir).replace(/\\/g, "/")
  const prefix = computedPrefix ? `${computedPrefix}/` : ""
  const sourcesWithLinks = sources.map((s) => ({ ...s, id: `${prefix}${s.id}` }))
  const graph = normalizeGraph(buildKnowledgeGraph(sourcesWithLinks))
  const projections = await runDocumentationExpedition(sourcesWithLinks, outDir)
  const summary: ExtractionSummary = {
    filesScanned,
    filesMatched,
    conceptsExtracted: graph.concepts.length,
    projectionsGenerated: projections.length,
    zeroExtractionWarning: filesMatched > 0 && graph.concepts.length === 0,
  }
  return { projections, summary }
}
