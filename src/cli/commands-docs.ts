// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"

import { printJson, printError } from "./print.js"
import { DOCUMENTATION_CAPABILITIES } from "../documentation/projections/engine.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdDocsGenerateHelp() {
  printJson(namespaceHelp("docs", "Documentation operations", [
    {
      name: "synth docs generate",
      description: "Generate documentation projections from the knowledge base",
      args: "[--out-dir <dir>] [--knowledge-base <dir>] [--link-prefix <prefix>]",
    },
    {
      name: "synth docs generate --provenance",
      description: "Explicitly regenerate projections with provenance metadata (default behavior)",
      args: "--provenance",
    },
  ], {
    note: [
      "Documentation capabilities are the kinds of documents SYNTH can produce (e.g. README, Architecture, API Reference).",
      "Generated documentation is the set of files actually written to the output directory.",
      "A capability is skipped when the knowledge base lacks the source material required to produce meaningful content for that projection.",
    ].join(" "),
  }))
}


export async function cmdDocsGenerate(flags: Record<string, string | boolean>) {
  const outDir = typeof flags["out-dir"] === "string" ? flags["out-dir"] : "./docs/generated"
  const knowledgeBaseDir = typeof flags["knowledge-base"] === "string" ? flags["knowledge-base"] : "./docs"
  const linkPrefix = typeof flags["link-prefix"] === "string" ? flags["link-prefix"] : undefined
  // EXP-DOC-008: provenance metadata is embedded by default; --provenance is
  // an explicit no-op that confirms the behavior for scripts and CI.
  const provenance = true

  const result = (await (await import("../core/bootstrap.js")).bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  }).then((ctx) =>
    ctx.api.documentationOperation({
      operation: "generateDocs",
      params: { knowledgeBaseDir, outDir, linkPrefix },
    }),
  )) as { status: string; summary?: unknown; projections?: Array<{ filename: string; title: string }>; warning?: string }

  const generatedFilenames = new Set(
    Array.isArray(result.projections) ? result.projections.map((p) => p.filename) : [],
  )
  const produced = DOCUMENTATION_CAPABILITIES
    .filter((cap) => generatedFilenames.has(cap.filename))
    .map((cap) => ({ ...cap, path: path.join(outDir, cap.filename) }))
  const skipped = DOCUMENTATION_CAPABILITIES
    .filter((cap) => !generatedFilenames.has(cap.filename))
    .map((cap) => ({ ...cap, reason: "No meaningful content could be projected from the knowledge base." }))

  printJson({
    ...result,
    kind: "DocumentationGenerated",
    provenance,
    capabilities: DOCUMENTATION_CAPABILITIES.map((cap) => ({
      id: cap.id,
      title: cap.title,
      description: cap.description,
    })),
    produced,
    skipped,
    note: [
      "capabilities = documentation types SYNTH knows how to generate",
      "produced = files written during this run",
      "skipped = capabilities not produced because source material was insufficient",
    ].join("; "),
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "generate") await cmdDocsGenerate(flags)
  else printError("Usage: synth docs generate [--out-dir <dir>] [--knowledge-base <dir>]")
}
