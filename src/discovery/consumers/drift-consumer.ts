// ============================================================
// DISCOVERY CONSUMER: Drift
// ============================================================
// Analytical consumer that compares two DiscoverySessions and reports
// differences between their projections and findings.
// ============================================================

import type { DiscoveryConsumer, DiscoverySession } from "../types.js"
import { serializeCanonical } from "../canonical.js"

export const DRIFT_CONSUMER_ID = "discovery:drift-consumer"
export const DRIFT_CONSUMER_VERSION = "1.0.0"

export type DriftFinding = {
  kind: "added" | "removed" | "changed" | "unchanged"
  path: string
  description: string
}

export type DriftReport = {
  sessionA: { id: string; hash: string }
  sessionB: { id: string; hash: string }
  findings: DriftFinding[]
  summary: {
    added: number
    removed: number
    changed: number
    unchanged: number
  }
}

export interface DriftConsumerContext {
  sessionA: DiscoverySession
  sessionB: DiscoverySession
}

function canonicalProjections(session: DiscoverySession): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [projectionType, value] of Object.entries(session.projections)) {
    result[projectionType] = serializeCanonical(value)
  }
  return result
}

function describeDifference(kind: DriftFinding["kind"], path: string): string {
  switch (kind) {
    case "added":
      return `${path} is present in session B but not session A`
    case "removed":
      return `${path} is present in session A but not session B`
    case "changed":
      return `${path} differs between session A and session B`
    case "unchanged":
      return `${path} is identical in both sessions`
  }
}

function compareFindings(
  sessionA: DiscoverySession,
  sessionB: DiscoverySession,
  findings: DriftFinding[],
): void {
  const findingsA = sessionA.projections.findings as { items: Array<{ id: string }> } | undefined
  const findingsB = sessionB.projections.findings as { items: Array<{ id: string }> } | undefined

  if (!findingsA || !findingsB) {
    return
  }

  const itemsA = findingsA.items
  const itemsB = findingsB.items

  const idsA = new Set(itemsA.map((item) => item.id))
  const idsB = new Set(itemsB.map((item) => item.id))

  for (const item of itemsA) {
    if (!idsB.has(item.id)) {
      findings.push({
        kind: "removed",
        path: `projections.findings.items.${item.id}`,
        description: describeDifference("removed", `finding ${item.id}`),
      })
    }
  }

  for (const item of itemsB) {
    if (!idsA.has(item.id)) {
      findings.push({
        kind: "added",
        path: `projections.findings.items.${item.id}`,
        description: describeDifference("added", `finding ${item.id}`),
      })
    }
  }

  for (const itemA of itemsA) {
    const itemB = itemsB.find((item) => item.id === itemA.id)
    if (!itemB) continue

    const serializedA = serializeCanonical(itemA)
    const serializedB = serializeCanonical(itemB)

    findings.push({
      kind: serializedA === serializedB ? "unchanged" : "changed",
      path: `projections.findings.items.${itemA.id}`,
      description: describeDifference(
        serializedA === serializedB ? "unchanged" : "changed",
        `finding ${itemA.id}`,
      ),
    })
  }
}

/**
 * Create a drift comparison consumer.
 *
 * Compares the canonical projections and findings of two DiscoverySessions
 * and reports added, removed, changed, and unchanged entries.
 */
export function createDriftConsumer(): DiscoveryConsumer<DriftConsumerContext, DriftReport> {
  return {
    id: DRIFT_CONSUMER_ID,
    version: DRIFT_CONSUMER_VERSION,
    kind: "analytical",
    description: "Compares two DiscoverySessions and reports projection drift.",

    consume(_session: DiscoverySession, context?: DriftConsumerContext): DriftReport {
      if (!context) {
        throw new Error("DriftConsumer requires a context with sessionA and sessionB")
      }

      const { sessionA, sessionB } = context
      const projectionsA = canonicalProjections(sessionA)
      const projectionsB = canonicalProjections(sessionB)
      const findings: DriftFinding[] = []

      const allProjectionTypes = new Set([
        ...Object.keys(projectionsA),
        ...Object.keys(projectionsB),
      ])

      for (const projectionType of allProjectionTypes) {
        const inA = projectionType in projectionsA
        const inB = projectionType in projectionsB

        if (inA && !inB) {
          findings.push({
            kind: "removed",
            path: `projections.${projectionType}`,
            description: describeDifference("removed", `projection ${projectionType}`),
          })
        } else if (!inA && inB) {
          findings.push({
            kind: "added",
            path: `projections.${projectionType}`,
            description: describeDifference("added", `projection ${projectionType}`),
          })
        } else if (projectionsA[projectionType] !== projectionsB[projectionType]) {
          findings.push({
            kind: "changed",
            path: `projections.${projectionType}`,
            description: describeDifference("changed", `projection ${projectionType}`),
          })
        } else {
          findings.push({
            kind: "unchanged",
            path: `projections.${projectionType}`,
            description: describeDifference("unchanged", `projection ${projectionType}`),
          })
        }
      }

      compareFindings(sessionA, sessionB, findings)

      const summary = {
        added: findings.filter((f) => f.kind === "added").length,
        removed: findings.filter((f) => f.kind === "removed").length,
        changed: findings.filter((f) => f.kind === "changed").length,
        unchanged: findings.filter((f) => f.kind === "unchanged").length,
      }

      return {
        sessionA: { id: sessionA.id, hash: sessionA.hash },
        sessionB: { id: sessionB.id, hash: sessionB.hash },
        findings,
        summary,
      }
    },
  }
}
