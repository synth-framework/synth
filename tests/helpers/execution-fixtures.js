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