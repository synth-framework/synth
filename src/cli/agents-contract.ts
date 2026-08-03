// ============================================================
// AGENTS.md contract generator (EXP-AGENTS-001)
// ============================================================
//
// Generates a marked SYNTH contract block inside AGENTS.md. Everything
// outside the SYNTH markers is user-owned content and is preserved
// verbatim across regenerations.
//
// The SYNTH block is sourced from:
// - Static framework contract language (pre-flight, rules, protected assets).
// - Live canonical state (active mission, executing expedition, project phase).
// - Subdirectory AGENTS.md fragments.
// - Manifest / package metadata for provenance.

import fs from "fs/promises"
import type { Dirent } from "fs"
import path from "path"
import * as sdk from "../sdk/index.js"
import type { CanonicalState } from "../types/index.js"

export type AgentsContractOptions = {
  rootDir: string
  projectName?: string
  governanceVersion?: string
  check?: boolean
}

const CONTRACT_START = "<!-- SYNTH:contract:start -->"
const CONTRACT_END = "<!-- SYNTH:contract:end -->"

async function* walk(dir: string): AsyncGenerator<string> {
  let entries: Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue
      yield* walk(full)
    } else if (entry.isFile() && entry.name === "AGENTS.md") {
      yield full
    }
  }
}

async function collectFragments(rootDir: string): Promise<Array<{ relativePath: string; content: string; fullPath: string }>> {
  const fragments: Array<{ relativePath: string; content: string; fullPath: string }> = []
  for await (const fullPath of walk(rootDir)) {
    const relative = path.relative(rootDir, fullPath)
    if (relative === "AGENTS.md") continue
    const content = await fs.readFile(fullPath, "utf-8")
    fragments.push({ relativePath: relative.replace(/\\/g, "/"), content: content.trimEnd(), fullPath })
  }
  return fragments
}

async function newestMtime(paths: string[]): Promise<number | undefined> {
  let newest: number | undefined
  for (const p of paths) {
    try {
      const stat = await fs.stat(p)
      if (typeof stat.mtimeMs === "number" && (newest === undefined || stat.mtimeMs > newest)) {
        newest = stat.mtimeMs
      }
    } catch {
      // ignore missing files
    }
  }
  return newest
}

async function readManifest(rootDir: string): Promise<{ projectName: string; governanceVersion: string }> {
  try {
    const manifestRaw = await sdk.files.readFile(sdk.paths.manifestPath(rootDir))
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>
    return {
      projectName: typeof manifest.projectName === "string" ? manifest.projectName : (typeof manifest.name === "string" ? manifest.name : "Unknown Project"),
      governanceVersion: typeof manifest.governanceVersion === "string" ? manifest.governanceVersion : "unknown",
    }
  } catch {
    try {
      const pkgRaw = await fs.readFile(path.join(rootDir, "package.json"), "utf-8")
      const pkg = JSON.parse(pkgRaw) as Record<string, unknown>
      return {
        projectName: typeof pkg.name === "string" ? pkg.name : "Unknown Project",
        governanceVersion: "unknown",
      }
    } catch {
      return { projectName: "Unknown Project", governanceVersion: "unknown" }
    }
  }
}

function formatFooter(projectName: string, governanceVersion: string, generatedAt: string): string {
  return `## Contract Provenance

- **Project:** ${projectName}
- **Governance version:** ${governanceVersion}
- **Generated:** ${generatedAt}
- **Command:** \`synth project AGENTS.md\`

This SYNTH contract section is derived. Do not edit it directly. Update source fragments or the framework baseline instead.`
}

function findActiveMission(state: CanonicalState | null) {
  if (!state) return null
  return Object.values(state.missions).find((m) => m.status === "active") ?? null
}

function findExecutingExpeditions(state: CanonicalState | null) {
  if (!state) return []
  return Object.values(state.expeditions).filter((e) => e.status === "executing")
}

function renderRepositoryStatus(state: CanonicalState | null, manifest: { projectName: string; governanceVersion: string }): string {
  const phase = state?.lifecycle ?? "initialized"
  const activeMission = findActiveMission(state)
  const executing = findExecutingExpeditions(state)

  let lines = `- **Phase:** ${phase}`
  if (activeMission) {
    lines += `\n- **Active Mission:** \`${activeMission.id}\` — ${activeMission.name}`
  }
  if (executing.length > 0) {
    lines += executing.map((e) => `\n- **Executing Expedition:** \`${e.id}\` — ${e.name}`).join("")
  }
  lines += `\n- **Governance version:** Synth v${manifest.governanceVersion}`
  return lines
}

function renderActiveWork(state: CanonicalState | null): string {
  const executing = findExecutingExpeditions(state)
  if (executing.length === 0) return "No expeditions currently executing."
  return executing
    .map((e) => `- **Expedition \`${e.id}\` — ${e.name}**\n  - Goal: ${e.goal}`)
    .join("\n")
}

function renderFragments(fragments: Array<{ relativePath: string; content: string }>): string {
  if (fragments.length === 0) return ""
  const blocks = fragments.map((f) => `### Source: ${f.relativePath}\n\n${f.content}`)
  return `## Additional operator contracts from repository fragments\n\n${blocks.join("\n\n")}`
}

async function generateSynthBlock(
  rootDir: string,
  manifest: { projectName: string; governanceVersion: string },
  generatedAt: string,
): Promise<string> {
  const state = await sdk.state.readState(rootDir)
  const fragments = await collectFragments(rootDir)

  const parts = [
    "> **AI Operator Contract — Read before modifying this repository.**",
    ">",
    "> This section is generated by `synth project AGENTS.md`. It is a derived projection of the SYNTH governance state in `.synth/`. The canonical project knowledge lives in `knowledge/`; the machine-readable governance state lives in `.synth/data/`. If this section disagrees with either, run `synth project AGENTS.md` to regenerate it.",
    "",
    "---",
    "",
    "## Pre-flight checkpoint",
    "",
    "Run this checkpoint at the start of every agent session and before every implementation action:",
    "",
    "1. `synth status` — confirm the project phase and any active expedition.",
    "2. `synth explain replay` — confirm `consistent` is `true`.",
    "3. `synth checkpoint` — confirm an expedition is at `executing` status.",
    "4. Confirm the intended file changes are within the scope of that executing expedition.",
    "5. Only then write code or state.",
    "",
    "If any step fails, stop and ask the operator for the next step.",
    "",
    "---",
    "",
    "## Repository status",
    "",
    renderRepositoryStatus(state, manifest),
    "",
    "---",
    "",
    "## Rules for agents working in this repository",
    "",
    "1. **All governance mutations go through the SYNTH CLI.** Use `synth mission`, `synth expedition`, `synth evidence`, `synth checkpoint`, etc. Never call SDK domain functions directly for state mutations.",
    "2. **Never hand-edit derived state.** Do not modify `.synth/data/canonical-state.json`, `.synth/data/event-log.jsonl`, `.synth/data/decisions.jsonl`, or the marked SYNTH section of this `AGENTS.md` file directly.",
    "3. **Do not invent knowledge.** If a decision is not derivable from `knowledge/`, capture it as a new Mission/Expedition or open item through the CLI — never resolve it silently in code comments or docs.",
    "4. **Work only inside executing expeditions.** Before changing source code, confirm an expedition is `executing` and that the changes are within its scope.",
    "5. **Do not run the full governance pipeline.** Agents run targeted validation only (`synth validate`). The operator runs `npm run govern` before merge.",
    "",
    "---",
    "",
    "## Protected Assets",
    "",
    "The following assets SHALL NOT be modified by agent work in this repository:",
    "",
    "- Mission Studio",
    "- Genesis",
    "- Replay",
    "- ExecutionGate",
    "- Event Model",
    "- Capability Model",
    "- Constitutional Baseline",
    "- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)",
    "",
    "Any change to these assets requires an Architecture Expedition and a new ADR.",
    "",
    "---",
    "",
    "## Active work",
    "",
    renderActiveWork(state),
  ]

  const fragmentsSection = renderFragments(fragments)
  if (fragmentsSection) {
    parts.push("", "---", "", fragmentsSection)
  }

  parts.push("", "---", "", formatFooter(manifest.projectName, manifest.governanceVersion, generatedAt))

  return `${CONTRACT_START}\n${parts.join("\n")}\n${CONTRACT_END}`
}

function splitExisting(existing: string): { before: string; after: string } {
  const start = existing.indexOf(CONTRACT_START)
  const end = existing.indexOf(CONTRACT_END)
  if (start >= 0 && end >= 0 && end > start) {
    return {
      before: existing.slice(0, start).trimEnd(),
      after: existing.slice(end + CONTRACT_END.length).trimStart(),
    }
  }
  return { before: existing.trimEnd(), after: "" }
}

function buildOutput(before: string, synthBlock: string, after: string): string {
  const parts: string[] = []
  if (before) parts.push(before)
  parts.push("")
  parts.push(synthBlock)
  if (after) {
    parts.push("")
    parts.push(after)
  }
  return parts.join("\n") + "\n"
}

export async function generateAgentsContract(options: AgentsContractOptions): Promise<{
  content: string
  wrote: boolean
  stale: boolean
  fragmentCount: number
}> {
  const manifest = await readManifest(options.rootDir)
  const fragments = await collectFragments(options.rootDir)
  const fragmentPaths = fragments.map((f) => f.fullPath)
  const fallbackPaths = [sdk.paths.manifestPath(options.rootDir), path.join(options.rootDir, "package.json")]
  const mtime = (await newestMtime(fragmentPaths)) ?? (await newestMtime(fallbackPaths))
  const generatedAt = mtime ? new Date(mtime).toISOString() : new Date().toISOString()
  const synthBlock = await generateSynthBlock(options.rootDir, manifest, generatedAt)

  const outputPath = path.join(options.rootDir, "AGENTS.md")
  let existing = ""
  try {
    existing = await fs.readFile(outputPath, "utf-8")
  } catch {
    // File does not exist yet.
  }

  const { before, after } = splitExisting(existing)
  const body = buildOutput(before, synthBlock, after)
  const stale = existing !== body

  if (!options.check && stale) {
    await fs.writeFile(outputPath, body, "utf-8")
  }

  return {
    content: body,
    wrote: !options.check && stale,
    stale,
    fragmentCount: fragments.length,
  }
}
