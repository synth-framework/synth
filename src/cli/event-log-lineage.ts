// ============================================================
// Event-Log Lineage Pre-Flight Guard
// ============================================================
// Before any expedition lifecycle mutation (approve, commit, start, finish,
// complete, archive, cancel) the CLI compares the current branch's derived
// event log against sibling refs. We accept when the current log is a strict
// prefix of another ref (stale-but-safe — the proven fast-forward-before-finish
// protocol from investigation 3c84f699a7c932fc) or already a superset. We
// block when another ref carries events the current log lacks and the current
// log is not a prefix of it: that is a genuine fork of the canonical history.
//
// This lives in the CLI layer on purpose — the ExecutionGate stays untouched
// (Protected Asset). It is a belt-and-suspenders check against cross-branch
// log divergence that the gate does not model.
// ============================================================

export type BranchRelation = "equal" | "prefix" | "superset" | "diverged"

export type RefLogReport = {
  ref: string
  relation: BranchRelation
  exclusiveEvents: number
}

export type EventLogLineage = {
  diverged: boolean
  branches: RefLogReport[]
  guidance?: string
}

function relationOf(current: string[], other: string[]): BranchRelation {
  // The event log is an event-stream partitioned across segments, so the
  // on-disk order is NOT the canonical append order. Lineage comparison must
  // therefore be order-independent: we compare the multiset of canonicalized
  // events. "prefix" means the current log is a subset (stale-but-safe, can be
  // fast-forwarded), "superset" means it already carries every sibling event,
  // and any symmetric difference is a genuine fork (diverged).
  const count = (arr: string[]) => {
    const m = new Map<string, number>()
    for (const line of arr) m.set(line, (m.get(line) || 0) + 1)
    return m
  }
  const c = count(current)
  const o = count(other)
  const cSubO = [...c].every(([k, v]) => (o.get(k) || 0) >= v)
  const oSubC = [...o].every(([k, v]) => (c.get(k) || 0) >= v)
  if (cSubO && oSubC) return "equal"
  if (cSubO) return "prefix"
  if (oSubC) return "superset"
  return "diverged"
}

export function analyzeEventLogLineage(
  currentLines: string[],
  refLogs: Record<string, string[]>,
): EventLogLineage {
  const branches: RefLogReport[] = []
  for (const [ref, lines] of Object.entries(refLogs)) {
    const relation = relationOf(currentLines, lines)
    if (relation === "equal") continue
    branches.push({ ref, relation, exclusiveEvents: Math.abs(lines.length - currentLines.length) })
  }
  const diverged = branches.some((b) => b.relation === "diverged")
  if (!diverged) {
    return { diverged: false, branches }
  }
  const offenders = branches
    .filter((b) => b.relation === "diverged")
    .map((b) => `${b.ref} (+${b.exclusiveEvents} exclusive event${b.exclusiveEvents === 1 ? "" : "s"})`)
    .join(", ")
  return {
    diverged: true,
    branches,
    guidance:
      `Event log divergence: ${offenders}. ` +
      `Fast-forward the current branch onto the richest ref (git merge --ff-only) ` +
      `if it is an ancestor, otherwise replay the divergent lineage through a ` +
      `single branch to avoid forking the canonical event history.`,
  }
}
