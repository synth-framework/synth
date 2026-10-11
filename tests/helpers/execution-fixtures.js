import { synthesizeIntents } from "../../dist/execution/index.js"

export function makeWorkItem(id, metadata) {
  return {
    id,
    expeditionId: "EXP-1",
    objectiveId: "OBJ-1",
    title: "work item",
    status: "generated",
    metadata,
    createdAt: Date.now(),
  }
}

export function makeExpedition(id) {
  return {
    id,
    missionId: "M-1",
    name: "execution expedition",
    goal: "execute",
    status: "approved",
    objectives: ["OBJ-1"],
    discoveries: [],
    decisions: [],
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function makeObjective(id, expeditionId) {
  return {
    id,
    expeditionId,
    title: "objective",
    purpose: "purpose",
    status: "draft",
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export const EXEC_OPTIONS = {
  actor: "test",
  transactionId: "tx-1",
  timestamp: 1,
}

/** Synthesize the standard single-objective intents (OBJ-1/WI-1). */
export function synthesizeSingleObjectiveIntents() {
  return synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents
}

/**
 * Synthesize the standard two-objective intent pair (OBJ-1/WI-1 then
 * OBJ-2/WI-2 chained on r1.nextSequence). Shared arrange block for
 * multi-objective executeGraph tests.
 */
export function synthesizeTwoObjectiveIntents() {
  const r1 = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
    sequenceStart: 0,
  })
  const r2 = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-2", "EXP-1"),
    workItem: makeWorkItem("WI-2", { operation: "writeFile", target: "b.txt", content: "b" }),
    baseBranch: "main",
    sequenceStart: r1.nextSequence,
  })
  return { r1, r2 }
}

/**
 * Build a versioning handler for executeGraph tests. Default succeeds with
 * canned commits; pass onSwitchRevision/onCreateRevision to assert on or
 * override per-operation behavior (test-specific logic stays at call sites).
 */
export function makeVersioningHandler({ onSwitchRevision, onCreateRevision } = {}) {
  return async (intent) => {
    if (intent.operation === "switchRevision") {
      if (onSwitchRevision) return onSwitchRevision(intent)
      return { success: true, result: { commit: "baseabc123" } }
    }
    if (intent.operation === "createRevision") {
      if (onCreateRevision) return onCreateRevision(intent)
      return { success: true, result: { commit: "resultdef456" } }
    }
    throw new Error(`Unexpected versioning operation: ${intent.operation}`)
  }
}