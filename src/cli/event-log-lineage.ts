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
  const same = current.length === other.length
  if (same) return current.every((line, i) => line === other[i]) ? "equal" : "diverged"
  if (other.length > current.length) {
    return current.every((line, i) => line === other[i]) ? "prefix" : "diverged"
  }
  return other.every((line, i) => line === current[i]) ? "superset" : "diverged"
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
