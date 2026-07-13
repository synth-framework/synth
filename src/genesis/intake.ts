// ============================================================
// GENESIS: System Initialization Layer
// ============================================================

import crypto from "crypto"
import type { SynthEvent, CanonicalState, Capability } from "../types/index.js"
import { Registry } from "../capability/registry.js"
import { ExecutionGate } from "../control/execution-gate.js"
import { rebuildState } from "../runtime/replay.js"
import { computeEventHash } from "../core/hash.js"

export type GenesisInput = {
  projectName: string
  systemId: string
  capabilities?: Capability[]
  initialWorkItems?: Array<{ id: string; name: string; status?: string }>
  initialPlans?: Array<{ id: string; name: string }>
  initialProjects?: Array<{ id: string; name: string; goal: string }>
  partitions?: number
  seedEvents?: Array<{ type: string; payload: Record<string, unknown> }>
  sourceImport?: {
    type: "repo" | "spec" | "snapshot"
    location: string
  }
}

export type GenesisResult = {
  eventLogSeed: SynthEvent[]
  canonicalState: CanonicalState
  partitionMap: Array<{
    partition: number
    leader: string
    replicas: string[]
  }>
  checkpointBaseline: Array<{ partition: number; offset: number }>
  systemId: string
  capabilitiesRegistered: number
}

export class GenesisIntake {
  constructor(
    private gate: ExecutionGate,
    private registry: Registry
  ) {}

  async initialize(input: GenesisInput): Promise<GenesisResult> {
    const timestamp = Date.now()
    const seedEvents: SynthEvent[] = []

    const genesisEvent: SynthEvent = {
      id: "GENESIS",
      type: "SYSTEM_GENESIS",
      timestamp,
      transactionId: "genesis-tx",
      capability: "Genesis",
      actor: "system",
      payload: {
        projectName: input.projectName,
        systemId: input.systemId,
        partitions: input.partitions || 4,
      },
      eventHash: "",
      previousHash: "",
    }

    seedEvents.push(genesisEvent)

    const capabilities = input.capabilities || []
    for (const cap of capabilities) {
      this.registry.register(cap)
    }

    if (input.initialProjects) {
      for (const project of input.initialProjects) {
        const event: SynthEvent = {
          id: crypto.randomUUID(),
          type: "PROJECT_CREATED",
          timestamp: Date.now(),
          transactionId: "genesis-tx",
          capability: "CreateProject",
          actor: "system",
          payload: {
            project: {
              id: project.id,
              name: project.name,
              goal: project.goal,
              plans: [],
              status: "active",
            },
          },
          eventHash: "",
          previousHash: "",
        }
        seedEvents.push(event)
      }
    }

    if (input.initialPlans) {
      for (const plan of input.initialPlans) {
        const event: SynthEvent = {
          id: crypto.randomUUID(),
          type: "PLAN_CREATED",
          timestamp: Date.now(),
          transactionId: "genesis-tx",
          capability: "CreatePlan",
          actor: "system",
          payload: {
            plan: {
              id: plan.id,
              name: plan.name,
              status: "draft",
              milestones: [],
              dependencies: [],
              metadata: {},
            },
          },
          eventHash: "",
          previousHash: "",
        }
        seedEvents.push(event)
      }
    }

    if (input.initialWorkItems) {
      for (const workItem of input.initialWorkItems) {
        const event: SynthEvent = {
          id: crypto.randomUUID(),
          type: "WORK_ITEM_CREATED",
          timestamp: Date.now(),
          transactionId: "genesis-tx",
          capability: "CreateWorkItem",
          actor: "system",
          payload: {
            workItem: {
              id: workItem.id,
              name: workItem.name,
              status: workItem.status || "idle",
              dependencies: [],
              metadata: {},
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          eventHash: "",
          previousHash: "",
        }
        seedEvents.push(event)
      }
    }

    if (input.seedEvents) {
      for (const seed of input.seedEvents) {
        const event: SynthEvent = {
          id: crypto.randomUUID(),
          type: seed.type,
          timestamp: Date.now(),
          transactionId: "genesis-tx",
          capability: "Genesis",
          actor: "system",
          payload: seed.payload,
          eventHash: "",
          previousHash: "",
        }
        seedEvents.push(event)
      }
    }

    // Compute hash chain for all seed events
    let previousHash = "genesis"
    for (const event of seedEvents) {
      event.previousHash = previousHash
      event.eventHash = computeEventHash(event)
      previousHash = event.eventHash
    }

    // Commit all seed events through the single mutation authority
    await this.gate.executeGenesis(seedEvents)

    const canonicalState = rebuildState(seedEvents)
    const partitionCount = input.partitions || 4
    const partitionMap = Array.from({ length: partitionCount }).map((_, i) => ({
      partition: i,
      leader: "node-0",
      replicas: [] as string[],
    }))
    const checkpointBaseline = Array.from({ length: partitionCount }).map((_, i) => ({
      partition: i,
      offset: 0,
    }))

    return {
      eventLogSeed: seedEvents,
      canonicalState,
      partitionMap,
      checkpointBaseline,
      systemId: input.systemId,
      capabilitiesRegistered: capabilities.length,
    }
  }

  replay(events: SynthEvent[]): CanonicalState {
    return rebuildState(events)
  }

  createPartitionMap(n: number) {
    return Array.from({ length: n }).map((_, i) => ({
      partition: i,
      leader: "node-0",
      replicas: [] as string[],
    }))
  }

  createEmptyCheckpoints(n: number) {
    return Array.from({ length: n }).map((_, i) => ({
      partition: i,
      offset: 0,
    }))
  }
}
