// ============================================================
// GOVERNANCE: Weighted Inventory Ranking (EXP-CLI-004)
// ============================================================
// Deterministic scoring and ranking for governance programs and
// expeditions. Consumes the shared dependency-graph primitive for
// downstream-impact analysis and emits status-hygiene warnings.
// ============================================================

import fs from "fs/promises"
import path from "path"
import {
  buildGraph,
  reachableFrom,
  type Graph,
  type GraphNode,
} from "../graph/dependency-graph.js"
import {
  loadGovernanceInventory,
  filterByValues,
  type ProgramRecord,
  type ExpeditionRecord,
  type GovernanceInventory,
} from "./inventory.js"

const PRIORITY_WEIGHTS: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

const STATUS_WEIGHTS: Record<string, number> = {
  Executing: 4,
  Proposed: 2,
  Draft: 2,
  Completed: 0,
}

const EXPEDITION_ID_PATTERN = /EXP-[A-Z0-9-]+-\d+[A-Z]?/g

export type RankedProgram = ProgramRecord & {
  score: number
  rationale: string
}

export type RankedExpedition = ExpeditionRecord & {
  score: number
  rationale: string
}

export type HygieneWarning = {
  code: string
  expeditionId: string
  programId: string
  message: string
}

function priorityWeight(priority: string): number {
  return PRIORITY_WEIGHTS[priority] ?? 0
}

function statusWeight(status: string): number {
  return STATUS_WEIGHTS[status] ?? 0
}

function isOpenStatus(status: string): boolean {
  return status === "Executing" || status === "Proposed" || status === "Draft"
}

/**
 * Parse each program charter and record which expeditions the program
 * tracker marks as completed in its composition / workstream sections.
 * This is a heuristic: any line that contains an expedition id and the
 * word "completed" (but not active status words) is treated as a
 * completion claim.
 */
export async function loadProgramCompositionStatus(
  charterDir: string,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>()
  let files: string[]
  try {
    files = await fs.readdir(charterDir)
  } catch {
    return result
  }

  const programFiles = files.filter(
    (f) => f.endsWith(".md") && f.startsWith("EXP-PROGRAM-"),
  )

  for (const file of programFiles) {
    const content = await fs.readFile(path.join(charterDir, file), "utf-8")
    const programMatch = content.match(/^#\s+(EXP-PROGRAM-\d+)/m)
    if (!programMatch) continue
    const programId = programMatch[1]
    const completed = new Set<string>()

    for (const line of content.split("\n")) {
      const ids = Array.from(line.matchAll(EXPEDITION_ID_PATTERN)).map((m) => m[0])
      if (ids.length === 0) continue
      const lower = line.toLowerCase()
      const hasCompleted = /\bcompleted\b/.test(lower)
      const hasActiveStatus =
        /\b(proposed|draft|executing|active|deferred)\b/.test(lower)
      if (hasCompleted && !hasActiveStatus) {
        for (const id of ids) {
          if (!id.startsWith("EXP-PROGRAM-")) {
            completed.add(id)
          }
        }
      }
    }

    result.set(programId, completed)
  }

  return result
}

function buildDownstreamGraph(
  expeditions: ExpeditionRecord[],
): Graph<ExpeditionRecord> {
  const nodes = new Map<string, GraphNode<ExpeditionRecord>>()
  const edges: {
    from: string
    to: string
    type: "blocks"
    metadata?: Record<string, unknown>
  }[] = []

  for (const e of expeditions) {
    nodes.set(e.id, { id: e.id, payload: e })
  }

  for (const e of expeditions) {
    for (const blockedId of e.blocks) {
      if (nodes.has(blockedId)) {
        edges.push({ from: e.id, to: blockedId, type: "blocks" })
      }
    }
  }

  return { nodes, edges }
}

function computeDownstreamCount(
  graph: Graph<ExpeditionRecord>,
  id: string,
): number {
  const reachable = reachableFrom(graph, id, ["blocks"])
  return Math.max(0, reachable.size - 1)
}

export type RankExpeditionsOptions = {
  next?: boolean
  human?: boolean
}

export type RankExpeditionsResult = {
  status: "ok"
  kind: "ExpeditionRank"
  count: number
  expeditions: RankedExpedition[]
  next?: string
  warnings: HygieneWarning[]
}

export async function rankExpeditions(
  charterDir: string,
  filters: {
    status?: string
    priority?: string
    program?: string
  },
  options: RankExpeditionsOptions = {},
): Promise<RankExpeditionsResult> {
  const inventory = await loadGovernanceInventory(charterDir)
  const compositionStatus = await loadProgramCompositionStatus(charterDir)

  let expeditions = inventory.expeditions
  expeditions = filterByValues(
    expeditions,
    (e) => e.status,
    filters.status,
  )
  expeditions = filterByValues(
    expeditions,
    (e) => e.priority,
    filters.priority,
  )

  if (filters.program && filters.program.trim() !== "") {
    const allowed = new Set(
      filters.program.split(",").map((s) => s.trim()).filter(Boolean),
    )
    expeditions = expeditions.filter((e) => allowed.has(e.program))
  }

  if (!filters.status) {
    expeditions = expeditions.filter((e) => isOpenStatus(e.status))
  }

  const programById = new Map(inventory.programs.map((p) => [p.id, p]))
  const downstreamGraph = buildDownstreamGraph(inventory.expeditions)

  const warnings: HygieneWarning[] = []

  const ranked: RankedExpedition[] = expeditions.map((e) => {
    const pWeight = priorityWeight(e.priority)
    const sWeight = statusWeight(e.status)
    const program = programById.get(e.program)
    const progWeight = program ? priorityWeight(program.priority) : 0
    const downstream = computeDownstreamCount(downstreamGraph, e.id)

    const score = pWeight * 20 + sWeight * 15 + downstream * 5 + progWeight * 10

    const parts: string[] = []
    if (e.priority) parts.push(`${e.priority} priority`)
    if (e.status) parts.push(e.status)
    if (downstream > 0) parts.push(`blocks ${downstream} expedition${downstream === 1 ? "" : "s"}`)
    if (program) parts.push(`program is ${program.priority}`)

    const programCompleted = compositionStatus.get(e.program)
    if (programCompleted) {
      const trackerSaysCompleted = programCompleted.has(e.id)
      if (e.status === "Completed" && !trackerSaysCompleted) {
        warnings.push({
          code: "WARN-GOV-001",
          expeditionId: e.id,
          programId: e.program,
          message: `${e.id} is Completed in its charter but not marked completed in ${e.program} tracker.`,
        })
      }
      if (trackerSaysCompleted && e.status !== "Completed") {
        warnings.push({
          code: "WARN-GOV-001",
          expeditionId: e.id,
          programId: e.program,
          message: `${e.id} is ${e.status} in its charter but marked completed in ${e.program} tracker.`,
        })
      }
    }

    return {
      ...e,
      score,
      rationale: parts.join(", "),
    }
  })

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.id.localeCompare(b.id)
  })

  let next: string | undefined
  if (options.next && ranked.length > 0) {
    next = ranked[0].id
  }

  return {
    status: "ok",
    kind: "ExpeditionRank",
    count: ranked.length,
    expeditions: ranked,
    next,
    warnings,
  }
}

export type RankProgramsOptions = {
  next?: boolean
  human?: boolean
}

export type RankProgramsResult = {
  status: "ok"
  kind: "ProgramRank"
  count: number
  programs: RankedProgram[]
  next?: string
}

export async function rankPrograms(
  charterDir: string,
  filters: {
    status?: string
    priority?: string
  },
  options: RankProgramsOptions = {},
): Promise<RankProgramsResult> {
  const inventory = await loadGovernanceInventory(charterDir)

  let programs = inventory.programs
  programs = filterByValues(programs, (p) => p.status, filters.status)
  programs = filterByValues(programs, (p) => p.priority, filters.priority)

  if (!filters.status) {
    programs = programs.filter((p) => p.status === "Active")
  }

  const ranked: RankedProgram[] = programs.map((p) => {
    const pWeight = priorityWeight(p.priority)
    const openScore = p.openExpeditions * 10
    const score = pWeight * 15 + openScore + p.completedExpeditions * 2

    const parts: string[] = []
    if (p.priority) parts.push(`${p.priority} priority`)
    if (p.openExpeditions > 0) {
      parts.push(`${p.openExpeditions} open expedition${p.openExpeditions === 1 ? "" : "s"}`)
    }
    if (p.completedExpeditions > 0) {
      parts.push(`${p.completedExpeditions} completed expedition${p.completedExpeditions === 1 ? "" : "s"}`)
    }

    return {
      ...p,
      score,
      rationale: parts.join(", "),
    }
  })

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.id.localeCompare(b.id)
  })

  let next: string | undefined
  if (options.next && ranked.length > 0) {
    next = ranked[0].id
  }

  return {
    status: "ok",
    kind: "ProgramRank",
    count: ranked.length,
    programs: ranked,
    next,
  }
}
