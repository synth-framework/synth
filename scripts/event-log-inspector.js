#!/usr/bin/env node
// ============================================================
// Event Log Inspector
// ============================================================
// Scans a SYNTH event-log.jsonl for repetitive operational patterns
// and emits a concise self-inspecting report.
//
// Usage:
//   node scripts/event-log-inspector.js [path/to/event-log.jsonl] [--since <timestamp|offset>]
//
// Defaults to .synth/data/event-log.jsonl in the project root.
// --since <timestamp|offset> restricts the report to events at or after a
//   numeric value. The comparison is purely numeric, so pass epoch-millis for
//   real timestamps or a monotonic counter offset when the log uses those.
//   Events without a numeric timestamp are always included. The report meta
//   records the window and how many events were excluded, so re-running a
//   cumulative log over a newer window stops re-flagging resolved history.
// ============================================================

import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"

const DEFAULT_LOG_PATH = path.join(process.cwd(), ".synth", "data", "event-log.jsonl")

const DIRTY_TREE_RE = /uncommitted|dirty|working tree/i

async function inspectEventLog(logPath, since) {
  const input = logPath && fs.existsSync(logPath) ? logPath : DEFAULT_LOG_PATH
  if (!fs.existsSync(input)) {
    throw new Error(`Event log not found: ${input}`)
  }

  const stream = fs.createReadStream(input)
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const stats = {
    eventCount: 0,
    excludedCount: 0,
    byType: new Map(),
    byCapability: new Map(),
    firstTimestamp: undefined,
    lastTimestamp: undefined,
    dirtyTreeFailures: [],
    otherSnapshotFailures: [],
    repairsAccepted: 0,
    cancelled: [],
    archived: [],
    paused: [],
    missionApprovals: 0,
    expeditionApprovals: 0,
    expeditionCommits: 0,
    expeditionStarts: 0,
    expeditionCompletions: 0,
  }

  for await (const raw of rl) {
    if (!raw.trim()) continue
    let event
    try {
      event = JSON.parse(raw)
    } catch {
      continue
    }

    const type = event.type || "UNKNOWN"
    const capability = event.capability || "UNKNOWN"
    const ts = event.timestamp

    if (since !== undefined && typeof ts === "number" && Number.isFinite(ts) && ts < since) {
      stats.excludedCount += 1
      continue
    }

    stats.eventCount += 1
    increment(stats.byType, type)
    increment(stats.byCapability, capability)

    if (stats.firstTimestamp === undefined || ts < stats.firstTimestamp) {
      stats.firstTimestamp = ts
    }
    if (stats.lastTimestamp === undefined || ts > stats.lastTimestamp) {
      stats.lastTimestamp = ts
    }

    if (type === "GOVERNANCE_SNAPSHOT_FAILED") {
      const reason = event.payload?.reason || ""
      const entry = {
        snapshotId: event.payload?.snapshotId,
        expeditionId: event.payload?.expeditionId,
        reason,
        timestamp: ts,
      }
      if (DIRTY_TREE_RE.test(reason)) {
        stats.dirtyTreeFailures.push(entry)
      } else {
        stats.otherSnapshotFailures.push(entry)
      }
    }

    if (type === "REPAIR_ACCEPTED") {
      stats.repairsAccepted += 1
    }

    if (type === "EXPEDITION_CANCELLED") {
      stats.cancelled.push({
        id: event.payload?.id,
        reason: event.payload?.reason,
        timestamp: ts,
      })
    }

    if (type === "EXPEDITION_ARCHIVED") {
      stats.archived.push({
        id: event.payload?.id,
        reason: event.payload?.reason,
        timestamp: ts,
      })
    }

    if (type === "EXPEDITION_PAUSED") {
      stats.paused.push({ id: event.payload?.id, timestamp: ts })
    }

    if (type === "MISSION_APPROVED") stats.missionApprovals += 1
    if (type === "EXPEDITION_APPROVED") stats.expeditionApprovals += 1
    if (type === "EXPEDITION_COMMITTED") stats.expeditionCommits += 1
    if (type === "EXPEDITION_STARTED") stats.expeditionStarts += 1
    if (type === "EXPEDITION_COMPLETED") stats.expeditionCompletions += 1
  }

  return buildReport(input, stats, since)
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1)
}

function buildReport(input, stats, since) {
  const byType = Object.fromEntries(
    [...stats.byType.entries()].sort((a, b) => b[1] - a[1]),
  )
  const byCapability = Object.fromEntries(
    [...stats.byCapability.entries()].sort((a, b) => b[1] - a[1]),
  )

  const dirtyTreeByExpedition = groupBy(stats.dirtyTreeFailures, "expeditionId")
  const dirtyTreeTotal = stats.dirtyTreeFailures.length
  const snapshotFailureTotal =
    dirtyTreeTotal + stats.otherSnapshotFailures.length

  const recommendations = []

  if (dirtyTreeTotal > 0) {
    recommendations.push({
      priority: "high",
      pattern: "dirty-tree-on-complete",
      observation: `${dirtyTreeTotal} expedition completion(s) failed because the working tree had uncommitted changes.`,
      suggestion:
        "Add a pre-check to synth expedition complete that surfaces git status and suggests/commit hints before attempting the snapshot.",
    })
  }

  if (stats.repairsAccepted > 0) {
    recommendations.push({
      priority: "medium",
      pattern: "state-repair-needed",
      observation: `${stats.repairsAccepted} repair operation(s) were accepted.`,
      suggestion:
        "Investigate why repairs were needed; recurring repairs indicate lifecycle gaps or state drift.",
    })
  }

  if (stats.cancelled.length > 0) {
    recommendations.push({
      priority: "low",
      pattern: "cancelled-expeditions",
      observation: `${stats.cancelled.length} expedition(s) were cancelled.`,
      suggestion:
        "Review cancellation reasons for scope churn or mission misalignment.",
    })
  }

  if (stats.expeditionApprovals > stats.expeditionCommits * 1.2) {
    recommendations.push({
      priority: "low",
      pattern: "approval-commit-gap",
      observation: `${stats.expeditionApprovals} approvals but only ${stats.expeditionCommits} commits.`,
      suggestion:
        "Some approved expeditions were never committed; consider a batch commit command or cleanup reminder.",
    })
  }

  return {
    meta: {
      source: input,
      generatedAt: new Date().toISOString(),
      eventCount: stats.eventCount,
      firstTimestamp: stats.firstTimestamp,
      lastTimestamp: stats.lastTimestamp,
      ...(since !== undefined
        ? { since, excludedEvents: stats.excludedCount }
        : {}),
    },
    summary: {
      missionsApproved: stats.missionApprovals,
      expeditionsApproved: stats.expeditionApprovals,
      expeditionsCommitted: stats.expeditionCommits,
      expeditionsStarted: stats.expeditionStarts,
      expeditionsCompleted: stats.expeditionCompletions,
      expeditionsCancelled: stats.cancelled.length,
      expeditionsArchived: stats.archived.length,
      expeditionsPaused: stats.paused.length,
    },
    eventCounts: byType,
    capabilityCounts: byCapability,
    friction: {
      governanceSnapshotFailures: {
        total: snapshotFailureTotal,
        dirtyTree: {
          total: dirtyTreeTotal,
          byExpedition: dirtyTreeByExpedition,
        },
        other: stats.otherSnapshotFailures,
      },
      repairsAccepted: stats.repairsAccepted,
      cancelledExpeditions: stats.cancelled,
      archivedExpeditions: stats.archived,
      pausedExpeditions: stats.paused,
    },
    recommendations,
  }
}

function groupBy(items, key) {
  const map = new Map()
  for (const item of items) {
    const value = item[key] || "unknown"
    map.set(value, (map.get(value) || 0) + 1)
  }
  return Object.fromEntries([...map.entries()])
}

function parseSince(value) {
  if (value === undefined) {
    throw new Error("--since requires a numeric <timestamp|offset> value")
  }
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error(`--since expects a numeric timestamp/offset, got "${value}"`)
  }
  return n
}

async function main() {
  try {
    const argv = process.argv.slice(2)
    let logPath
    let since
    for (let i = 0; i < argv.length; i += 1) {
      const arg = argv[i]
      if (arg === "--since") {
        i += 1
        since = parseSince(argv[i])
      } else if (arg.startsWith("--since=")) {
        since = parseSince(arg.slice("--since=".length))
      } else if (!logPath) {
        logPath = arg
      } else {
        throw new Error(`Unexpected argument: ${arg}`)
      }
    }
    const report = await inspectEventLog(logPath, since)
    console.log(JSON.stringify(report, null, 2))
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
