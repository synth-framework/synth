// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { sha256 } from "../sdk/hashing/index.js"
import { normalizeDiscoveryRepositoryType } from "./ai-metadata.js"
import { printJson } from "./print.js"
import * as sdk from "../sdk/index.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdDiscoverHelp() {
  printJson(namespaceHelp("discover", "Produce a read-only analysis of a repository", [
    { name: "synth discover <path>", description: "Run Discovery and emit analysis as JSON to stdout (read-only, no mutation)" },
    { name: "synth discover <path> --export", description: "Export an immutable, signed discovery baseline to .synth/discovery/", args: "--export" },
  ], {
    note: "Default 'synth discover' is pure read-only and never writes files. Use --export only when durable discovery evidence is required.",
  }))
}


export interface DiscoveryBaseline {
  schema: "synth-discovery-baseline-v1"
  generatedAt: string
  targetDir: string
  discoverySessionId: string
  discoverySessionHash: string
  analysis: unknown
  signature: string
}


export function requireString(value: string | undefined, fallback: string): string {
  return value ?? fallback
}


export async function writeDiscoveryBaseline(targetDir: string, data: Omit<DiscoveryBaseline, "signature">): Promise<string> {
  const discoveryDir = sdk.paths.discoveryDir(targetDir)
  await fs.mkdir(discoveryDir, { recursive: true })

  // The signature covers only deterministic content. generatedAt and targetDir
  // are volatile across runs and must not affect replay or cross-run equality.
  const signatureInput = {
    schema: data.schema,
    discoverySessionId: data.discoverySessionId,
    discoverySessionHash: data.discoverySessionHash,
    analysis: data.analysis,
  }
  const canonical = JSON.stringify(signatureInput, Object.keys(signatureInput).sort())
  const signature = sha256(canonical)
  const baseline: DiscoveryBaseline = { ...data, signature }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `baseline-${timestamp}-${signature.slice(0, 16)}.json`
  const baselinePath = path.join(discoveryDir, filename)
  await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2), "utf-8")
  return baselinePath
}


export async function updateLifecycleRepositoryType(targetDir: string, rawRepositoryType: string): Promise<string | undefined> {
  const lifecycleDir = path.join(sdk.paths.synthDir(targetDir), "ai")
  const lifecyclePath = path.join(lifecycleDir, "lifecycle.json")
  const normalized = normalizeDiscoveryRepositoryType(rawRepositoryType)
  if (!normalized) return undefined

  let lifecycle: Record<string, unknown> = {}
  try {
    const raw = await fs.readFile(lifecyclePath, "utf-8")
    lifecycle = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // lifecycle.json may not exist yet; write a fresh one.
  }

  lifecycle.repositoryType = normalized
  await fs.mkdir(lifecycleDir, { recursive: true })
  await fs.writeFile(lifecyclePath, JSON.stringify(lifecycle, null, 2), "utf-8")
  return lifecyclePath
}


export async function cmdDiscover(args: string[], flags: Record<string, string | boolean>) {
  const exportMode = flags.export === true || flags.export === "true"
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const { analyzeRepository } = await import("./bootstrap-analyzer.js")
  const analysis = await analyzeRepository(targetDir)
  const result = {
    status: "ok" as const,
    kind: "DiscoveryResult" as const,
    targetDir,
    exported: exportMode,
    repositoryType: analysis.repositoryType,
    sourceHistory: analysis.sourceHistory,
    analysis: {
      languages: analysis.languages,
      frameworks: analysis.frameworks,
      hasTests: analysis.hasTests,
      fileCount: analysis.fileCount,
      observationCount: analysis.observations.length,
    },
    agentContext: analysis.agentContext,
    discoverySessionId: analysis.discoverySessionId,
    discoverySessionHash: analysis.discoverySessionHash,
  }

  if (exportMode) {
    const baselinePath = await writeDiscoveryBaseline(targetDir, {
      schema: "synth-discovery-baseline-v1",
      generatedAt: new Date().toISOString(),
      targetDir,
      discoverySessionId: requireString(analysis.discoverySessionId, "unknown"),
      discoverySessionHash: requireString(analysis.discoverySessionHash, "unknown"),
      analysis: result.analysis,
    })
    const lifecyclePath = await updateLifecycleRepositoryType(targetDir, analysis.repositoryType)
    printJson({
      ...result,
      baselinePath,
      lifecyclePath,
      note: "Discovery baseline exported and lifecycle.json updated with repositoryType. The baseline artifact is read-only; consumers must not mutate it.",
      nextSteps: [
        "Run 'synth validate' to see the confidence score and required checks for working-tree changes.",
        "If the score is below 1.0, follow the concrete next steps printed by synth validate.",
      ],
    })
    return
  }

  printJson(result)
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdDiscover(positional.slice(1), flags)
}
