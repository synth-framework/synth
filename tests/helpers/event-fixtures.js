export function makeGenesisEvent(overrides = {}) {
  return {
    id: "GENESIS",
    type: "SYSTEM_GENESIS",
    timestamp: 1000,
    transactionId: "genesis-tx",
    capability: "Genesis",
    actor: "system",
    payload: { projectName: "Test", systemId: "test-system", partitions: 1 },
    ...overrides,
  }
}

export function makeMissionCreatedEvent(missionId, overrides = {}) {
  return {
    id: `E-MISSION-${missionId}`,
    type: "MISSION_CREATED",
    timestamp: 1001,
    transactionId: `tx-mission-${missionId}`,
    capability: "CreateMission",
    actor: "system",
    payload: {
      mission: {
        id: missionId,
        name: "Test Mission",
        purpose: "Test purpose",
        status: "draft",
        expeditions: [],
        metadata: {},
        createdAt: 1001,
        updatedAt: 1001,
      },
    },
    ...overrides,
  }
}

export function makeMissionApprovedEvent(missionId, overrides = {}) {
  return {
    id: `E-APPROVE-${missionId}`,
    type: "MISSION_APPROVED",
    timestamp: 1002,
    transactionId: `tx-approve-${missionId}`,
    capability: "ApproveMission",
    actor: "system",
    payload: { id: missionId, status: "active" },
    ...overrides,
  }
}

export function makeExpeditionCreatedEvent(expeditionId, missionId, overrides = {}) {
  return {
    id: `E-EXP-${expeditionId}`,
    type: "EXPEDITION_CREATED",
    timestamp: 1003,
    transactionId: `tx-exp-${expeditionId}`,
    capability: "CreateExpedition",
    actor: "system",
    payload: {
      expedition: {
        id: expeditionId,
        missionId,
        name: "Test Expedition",
        goal: "Test goal",
        status: "approved",
        objectives: [],
        discoveries: [],
        decisions: [],
        metadata: {},
        createdAt: 1003,
        updatedAt: 1003,
      },
    },
    ...overrides,
  }
}

export function makeExpeditionStartedEvent(expeditionId, overrides = {}) {
  return {
    id: `E-START-${expeditionId}`,
    type: "EXPEDITION_STARTED",
    timestamp: 1004,
    transactionId: `tx-start-${expeditionId}`,
    capability: "StartExpedition",
    actor: "system",
    payload: { id: expeditionId, status: "executing" },
    ...overrides,
  }
}

export function makeApprovedMissionEvents({ systemId = "test-system", missionId = "M-1" } = {}) {
  return [
    makeGenesisEvent({ payload: { projectName: "Approved Test", systemId, partitions: 1 } }),
    makeMissionCreatedEvent(missionId, {
      payload: {
        mission: {
          id: missionId,
          name: "Approved Mission",
          purpose: "Test approved phase",
          status: "draft",
          expeditions: [],
          metadata: {},
          createdAt: 1001,
          updatedAt: 1001,
        },
      },
    }),
    makeMissionApprovedEvent(missionId),
  ]
}

export function makeExecutingExpeditionEvents({ systemId = "test-system", missionId = "M-1", expeditionId = "E-1" } = {}) {
  return [
    ...makeApprovedMissionEvents({ systemId, missionId }),
    makeExpeditionCreatedEvent(expeditionId, missionId),
    makeExpeditionStartedEvent(expeditionId),
  ]
}

export function makeBrokenDecisionRecords() {
  const now = Date.now()
  return [
    JSON.stringify({
      schema: "synth-decision-v1",
      id: "d1",
      type: "MISSION_APPROVAL_APPROVED",
      draftId: "DRAFT-WARN-1",
      previousHash: "genesis",
      timestamp: now,
    }),
    JSON.stringify({
      schema: "synth-decision-v1",
      id: "d2",
      type: "MISSION_APPROVAL_REJECTED",
      draftId: "DRAFT-WARN-2",
      previousHash: "genesis",
      timestamp: now + 1,
    }),
  ].join("\n") + "\n"
}