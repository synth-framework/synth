// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import { locateEventLog } from "../infra/event-store.js"
import { printJson, printError } from "./print.js"
import * as sdk from "../sdk/index.js"
import type { SynthEvent } from "../types/index.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdLogHelp() {
  printJson(namespaceHelp("log", "Query the governance event log (read-only)", [
    { name: "synth log", description: "Show the last 50 events" },
    { name: "synth log --expedition <id>", description: "Filter events by expedition id", args: "--expedition <id>" },
    { name: "synth log --expedition-id <id>", description: "Alias for --expedition", args: "--expedition-id <id>" },
    { name: "synth log --mission <id>", description: "Filter events by mission id", args: "--mission <id>" },
    { name: "synth log --agent-id <id>", description: "Filter events by agent identity", args: "--agent-id <id>" },
    { name: "synth log --session-id <id>", description: "Filter events by session identity", args: "--session-id <id>" },
    { name: "synth log --approval-mode <mode>", description: "Filter events by approval mode", args: "--approval-mode <mode>" },
    { name: "synth log --type <prefix>", description: "Filter events by type prefix", args: "--type <prefix>" },
    { name: "synth log --since <iso>", description: "Events at or after ISO timestamp", args: "--since <iso>" },
    { name: "synth log --limit <n>", description: "Cap result count (default 50, max 1000)", args: "--limit <n>" },
    { name: "synth log --format table", description: "Human-readable table output", args: "--format table|json" },
    { name: "synth log --format json", description: "One JSON object per line (default)", args: "--format table|json" },
  ], {
    note: "synth log is read-only and never appends events or modifies state.",
  }))
}


export async function cmdLog(flags: Record<string, string | boolean>) {
  // One authority for "is there a log, and where" (EXP 2c9c6c62). This verb read
  // only the legacy monolithic file, so on any chunked project it told the
  // operator their ledger did not exist and to re-bootstrap it - while the
  // events were sitting in <data>/event-stream/.
  const located = locateEventLog(process.cwd())
  if (!located.present) {
    printError(
      `No event log found (looked for the chunked store at ${located.streamDir} and the legacy file at ${located.legacyPath}). Run 'synth init' or 'synth bootstrap' first.`,
      { nextStep: "synth bootstrap . --approve" },
    )
    return
  }
  // The legacy layout is still read line-by-line so offsets and malformed-line
  // skipping behave exactly as before. Chunked layouts must go through the
  // store: partitions are routed by aggregate key, so concatenating segment
  // files is not global log order and every `offset` would lie.
  let raw: string | null = null
  if (located.layout === "legacy-file") {
    try {
      raw = await fs.readFile(located.legacyPath, "utf-8")
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === "ENOENT") {
        printError(
          `No event log found at ${located.legacyPath}. Run 'synth init' or 'synth bootstrap' first.`,
          { nextStep: "synth bootstrap . --approve" },
        )
        return
      }
      throw err
    }
  }

  const expeditionId = typeof flags.expedition === "string" ? flags.expedition : typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : undefined
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const agentId = typeof flags["agent-id"] === "string" ? flags["agent-id"] : undefined
  const sessionId = typeof flags["session-id"] === "string" ? flags["session-id"] : undefined
  const approvalMode = typeof flags["approval-mode"] === "string" ? flags["approval-mode"] : undefined
  const typePrefix = typeof flags.type === "string" ? flags.type : undefined
  const sinceIso = typeof flags.since === "string" ? flags.since : undefined
  const limitRaw = typeof flags.limit === "string" ? parseInt(flags.limit, 10) : 50
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 50
  const format = flags.format === "table" ? "table" : "json"

  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : undefined
  if (sinceIso !== undefined && (sinceMs === undefined || Number.isNaN(sinceMs))) {
    printError(`Invalid --since timestamp: ${sinceIso}`, { nextStep: "synth log --since 2026-07-31T00:00:00Z" })
    return
  }

  const events: Array<SynthEvent & { offset: number }> = []
  if (raw !== null) {
    const lines = raw.split("\n").filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      try {
        const event = JSON.parse(lines[i]) as SynthEvent
        events.push({ ...event, offset: i + 1 })
      } catch {
        // Skip malformed lines; they cannot be attributed safely.
      }
    }
  } else {
    const all = await sdk.events.readEvents(process.cwd())
    for (let i = 0; i < all.length; i++) {
      events.push({ ...all[i], offset: i + 1 })
    }
  }

  const filtered = events.filter((event) => {
    if (expeditionId && !eventReferencesExpeditionId(event, expeditionId)) return false
    if (missionId && !eventReferencesMission(event, missionId)) return false
    if (agentId && !eventMatchesIdentity(event, "agentId", agentId)) return false
    if (sessionId && !eventMatchesIdentity(event, "sessionId", sessionId)) return false
    if (approvalMode && !eventMatchesIdentity(event, "approvalMode", approvalMode)) return false
    if (typePrefix && !event.type.startsWith(typePrefix)) return false
    if (sinceMs !== undefined && event.timestamp < sinceMs) return false
    return true
  })

  const reversed = filtered.slice().reverse()
  const page = reversed.slice(0, limit)

  if (format === "table") {
    if (page.length === 0) {
      console.log("No events match the query.")
      return
    }
    console.log("offset  timestamp                  type                aggregate    summary")
    for (const event of page) {
      const iso = new Date(event.timestamp).toISOString()
      const aggregate = eventAggregateId(event) ?? "-"
      const summary = eventSummary(event)
      console.log(
        `${String(event.offset).padEnd(7)} ${iso.padEnd(26)} ${event.type.padEnd(19)} ${aggregate.padEnd(12)} ${summary}`,
      )
    }
    return
  }

  printJson({
    status: "ok",
    kind: "EventLogQuery",
    layout: located.layout,
    total: events.length,
    matched: filtered.length,
    returned: page.length,
    events: page,
  })
}


export function eventReferencesExpedition(event: SynthEvent, expeditionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.expeditionId === expeditionId) return true
  if (payload.id === expeditionId) return true
  if (event.partitionKey === expeditionId) return true
  return deepContains(payload, expeditionId)
}


export function eventReferencesExpeditionId(event: SynthEvent, expeditionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.expeditionId === expeditionId) return true
  if (payload.parentExpeditionId === expeditionId) return true
  return false
}


export function eventMatchesIdentity(event: SynthEvent, field: "agentId" | "sessionId" | "approvalMode", value: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const identity = (payload.metadata as Record<string, unknown> | undefined)?.identity as Record<string, unknown> | undefined
  return identity?.[field] === value
}


export function eventReferencesMission(event: SynthEvent, missionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.missionId === missionId) return true
  if (payload.id === missionId) return true
  return deepContains(payload, missionId)
}


export function eventAggregateId(event: SynthEvent): string | undefined {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const id =
    payload.expeditionId ??
    payload.missionId ??
    payload.id ??
    payload.workItemId ??
    payload.planId ??
    payload.projectId ??
    payload.intentModelId ??
    payload.contractId ??
    payload.decisionId ??
    payload.discoveryArtifactId ??
    event.partitionKey
  return typeof id === "string" ? id : undefined
}


export function eventSummary(event: SynthEvent): string {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const name =
    payload.subject ??
    payload.name ??
    payload.title ??
    payload.reason ??
    payload.decision ??
    eventAggregateId(event)
  return typeof name === "string" ? truncate(name, 48) : "-"
}


export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + "..."
}


export function deepContains(value: unknown, target: string): boolean {
  if (typeof value === "string") return value === target
  if (Array.isArray(value)) return value.some((item) => deepContains(item, target))
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => deepContains(item, target))
  }
  return false
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdLog(flags)
}
