// ============================================================
// GOVERNANCE: Inventory Reader
// ============================================================
// Read-only parser for expedition charters and the prefix registry.
// Produces normalized program and expedition records for CLI list
// commands and other read-only surfaces.
// ============================================================

import fs from "fs/promises"
import path from "path"

const SUB_ARTIFACT_SUFFIXES = [
  "evidence",
  "completion",
  "report",
  "matrix",
  "budget",
  "list",
  "map",
  "order",
  "surface",
  "audit",
  "design",
  "contract",
  "accidental-complexity",
  "essential-core",
  "kernel-boundary",
  "simplification-matrix",
  "complexity-budget",
  "canonical-infrastructure-audit",
  "infrastructure-matrix",
  "deletion-list",
  "duplication-map",
  "migration-order",
  "responsibility-matrix",
  "sdk-surface",
  "construction-canonicalization",
  "construction-matrix",
  "utility-extraction",
  "authority-resolver-design",
  "derived-state-contract",
  "incident-review",
  "inventory",
]

const EXPEDITION_ID_PATTERN = /^EXP-[A-Z0-9-]+-\d+[A-Z]?$/

export type ProgramRecord = {
  id: string
  name: string
  kind: string
  status: string
  priority: string
  openExpeditions: number
  completedExpeditions: number
}

export type ExpeditionRecord = {
  id: string
  name: string
  kind: string
  status: string
  priority: string
  program: string
  dependsOn: string[]
  blocks: string[]
}

export type GovernanceInventory = {
  programs: ProgramRecord[]
  expeditions: ExpeditionRecord[]
}

function isSubArtifact(file: string): boolean {
  const base = path.basename(file, ".md")
  const match = base.match(/^(EXP-[A-Z0-9-]+-\d+[A-Z]?)(?:-(.+))?$/)
  if (!match) return false
  const suffix = match[2]
  if (!suffix) return false
  return SUB_ARTIFACT_SUFFIXES.includes(suffix)
}

function splitIds(value: string): string[] {
  if (!value || value.trim() === "") return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => EXPEDITION_ID_PATTERN.test(s))
}

function parseCharter(content: string, file: string) {
  const lines = content.split("\n")

  const titleMatch = lines[0]?.match(/^#\s+(EXP-[A-Z0-9-]+)\s+—\s+(.+)$/)
  const statusMatch = content.match(/^\*\*Status:\*\*\s*(\w+)/m)
  const kindMatch = content.match(/^\*\*Kind:\*\*\s*(.+)/m)
  const priorityMatch = content.match(/^\*\*Priority:\*\*\s*(\w+)/m)
  const programMatch = content.match(/^\*\*Program:\*\*\s*(EXP-PROGRAM-\d+)/m)
  const dependsMatch = content.match(/^\*\*Depends On:\*\*\s*(.+)/m)
  const blocksMatch = content.match(/^\*\*Blocks:\*\*\s*(.+)/m)

  const id = titleMatch ? titleMatch[1] : file.replace(/\.md$/, "")
  const name = titleMatch ? titleMatch[2].trim() : id
  const status = statusMatch ? statusMatch[1] : "Unknown"
  const kind = kindMatch ? kindMatch[1].trim() : "Unknown"
  const priority = priorityMatch ? priorityMatch[1] : "Unknown"
  const program = programMatch ? programMatch[1] : ""
  const dependsOn = dependsMatch ? splitIds(dependsMatch[1]) : []
  const blocks = blocksMatch ? splitIds(blocksMatch[1]) : []
  const isProgram = id.startsWith("EXP-PROGRAM-")

  return { id, name, status, kind, priority, program, dependsOn, blocks, isProgram }
}

export async function loadGovernanceInventory(charterDir: string): Promise<GovernanceInventory> {
  let files: string[]
  try {
    files = await fs.readdir(charterDir)
  } catch {
    return { programs: [], expeditions: [] }
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"))
  const rawEntries = []

  for (const file of mdFiles) {
    if (isSubArtifact(file)) continue
    const content = await fs.readFile(path.join(charterDir, file), "utf-8")
    rawEntries.push(parseCharter(content, file))
  }

  const programs = rawEntries.filter((e) => e.isProgram)
  const expeditions = rawEntries.filter((e) => !e.isProgram)

  const programRecords: ProgramRecord[] = programs.map((p) => {
    const programExpeditions = expeditions.filter((e) => e.program === p.id)
    const completedExpeditions = programExpeditions.filter((e) => e.status === "Completed").length
    const openExpeditions = programExpeditions.length - completedExpeditions
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      status: p.status,
      priority: p.priority,
      openExpeditions,
      completedExpeditions,
    }
  })

  const expeditionRecords: ExpeditionRecord[] = expeditions.map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    status: e.status,
    priority: e.priority,
    program: e.program,
    dependsOn: e.dependsOn,
    blocks: e.blocks,
  }))

  return {
    programs: programRecords.sort((a, b) => a.id.localeCompare(b.id)),
    expeditions: expeditionRecords.sort((a, b) => a.id.localeCompare(b.id)),
  }
}

export function filterByValues<T>(values: T[], field: (item: T) => string, filterValue: string | undefined): T[] {
  if (!filterValue || filterValue.trim() === "") return values
  const allowed = new Set(filterValue.split(",").map((s) => s.trim()).filter(Boolean))
  return values.filter((item) => allowed.has(field(item)))
}

export async function findProgramById(charterDir: string, id: string): Promise<ProgramRecord | undefined> {
  const inventory = await loadGovernanceInventory(charterDir)
  return inventory.programs.find((p) => p.id === id)
}

export async function findExpeditionById(charterDir: string, id: string): Promise<ExpeditionRecord | undefined> {
  const inventory = await loadGovernanceInventory(charterDir)
  return inventory.expeditions.find((e) => e.id === id)
}

export async function findProgramExpeditions(charterDir: string, programId: string): Promise<ExpeditionRecord[]> {
  const inventory = await loadGovernanceInventory(charterDir)
  return inventory.expeditions.filter((e) => e.program === programId)
}

export async function findUpstreamExpeditions(
  charterDir: string,
  expedition: ExpeditionRecord,
): Promise<ExpeditionRecord[]> {
  if (!expedition.dependsOn || expedition.dependsOn.length === 0) return []
  const inventory = await loadGovernanceInventory(charterDir)
  return inventory.expeditions.filter((e) => expedition.dependsOn.includes(e.id))
}

export async function findDownstreamExpeditions(
  charterDir: string,
  expedition: ExpeditionRecord,
): Promise<ExpeditionRecord[]> {
  if (!expedition.blocks || expedition.blocks.length === 0) return []
  const inventory = await loadGovernanceInventory(charterDir)
  return inventory.expeditions.filter((e) => expedition.blocks.includes(e.id))
}
