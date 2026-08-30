export function makeSnapshot(overrides = {}) {
  const nodes = new Map()
  const evidence = { evidence: [], byObservationId: new Map() }

  nodes.set("actor-1", {
    id: "actor-1",
    kind: "actor",
    name: "Synth System",
    description: "The Synth system itself",
    observationIds: ["obs-actor-1"],
    evidenceRefs: ["ev-actor-1"],
  })

  return {
    id: "snapshot-1",
    version: "1.0.0",
    signature: "",
    sessionId: "session-1",
    timestamp: 1000,
    worldModel: {
      version: 1,
      nodes,
      edges: [],
      evidence,
      unknowns: [],
      confidence: {
        overall: 0.9,
        observationCoverage: 1,
        evidenceQuality: 1,
        consistency: 1,
        completeness: 1,
        inferenceDepth: 1,
        unknownImpact: 0,
        contradictionCount: 0,
      },
      planningDecisions: [],
    },
    proposals: [
      {
        id: "mission-1",
        kind: "mission",
        name: "Build CRM",
        purpose: "Customer success platform",
        description: "Build a CRM",
        evidenceRefs: ["ev-mission-1"],
        observationIds: ["obs-mission-1"],
        confidence: 0.9,
      },
      {
        id: "expedition-1",
        kind: "expedition",
        name: "CRM Data Model",
        missionId: "mission-1",
        goal: "Design schema",
        description: "Design the CRM data model",
        evidenceRefs: ["ev-expedition-1"],
        observationIds: ["obs-expedition-1"],
        confidence: 0.8,
      },
      {
        id: "objective-1",
        kind: "objective",
        title: "Design Schema",
        name: "Design Schema",
        expeditionId: "expedition-1",
        description: "Design the schema",
        evidenceRefs: ["ev-objective-1"],
        observationIds: ["obs-objective-1"],
        confidence: 0.8,
      },
    ],
    ...overrides,
  }
}